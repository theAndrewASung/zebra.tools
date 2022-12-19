import type { AddressInfo } from 'net';
import { NetworkInterfaceInfo, userInfo } from 'os';

import { Socket, createServer } from 'net';
import { networkInterfaces } from 'os';
import { existsSync, createReadStream } from 'fs';
import { basename } from 'path';

const FTP_CONNECTION_SYMBOL = Symbol('CONNECT');
const FTP_100_RETRY_SYMBOL  = Symbol('100-RETRY');

type FTPResponse = { status : number, message : string };
export class FTPResponseError extends Error {
    status : number;

    constructor(status : number, message : string) {
        super(`${status} ${message}`);
        this.status = status;
    }
}

export class ZebraFTPClient {
    private _socket : null | Socket;
    private _commandCallbackQueue : Array<{
        command  : string | symbol;
        callback : (error : Error | null, output? : FTPResponse ) => void;
    }>;

    private _logger  : (type : 'CMD' | 'RES' | 'ERR' | 'DEBUG', message : string) => void;
    private _connectionTimeoutMs : number;
    private _keepAliveIntervalMs : number;

    private _connectionTimeout : null | NodeJS.Timeout;
    private _keepAliveInterval : null | NodeJS.Timer;

    private host : string;
    private port : number;

    /**
     * Active FTP Client dedicated to connecting to a Zebra Printer.
     * 
     * @param options.active - whether to transfer files via active or passive FTP (currently, no implementation for passive FTP)
     * @param options.logger - logging function for FTP stdout
     * @param options.keepAlive - number of milliseconds between sending NOOP's to keep the connection alive (defaults to 60 seconds)
     * @param options.connectionTimeout - number of milliseconds before timing out on the initial connection (defaults to 5 seconds)
     */
    constructor(options : {
        active?    : true;
        logger?    : (str : string) => void;
        keepAlive? : number;
        connectionTimeout? : number;
    } = {}) {
        this._reset();
        
        // Configuration Options
        const { logger, keepAlive, connectionTimeout } = options;
        this._logger = (type, message) => logger?.(`[FTP] ${type} | ${message}`);
        this._keepAliveIntervalMs = keepAlive         || (60 * 1000);
        this._connectionTimeoutMs = connectionTimeout || (5  * 1000);
    }

    /**
     * Initiates FTP connection with Zebra printer.
     * 
     * @param host - host IP of the Zebra printer, defaults to 127.0.0.1 (localhost)
     * @param port - port of the FTP on Zebra printer, defaults to 21
     * @param username - optional name to provide to printer as the user
     * 
     * @returns out.status - 3-digit FTP status
     * @returns out.message - FTP status message
     * @returns out.serverPort - port this FTP client is listening for active FTP connections
     */
    async connect(host : string = '127.0.0.1', port : number = 21, username : string = userInfo().username) : Promise<FTPResponse> {
        if (this._socket) throw new Error('FTP already connected');

        // (1) Initiate FTP socket connection 
        const socket = this._socket = new Socket();
        socket.setTimeout(0);
        socket.setKeepAlive(true);

        // (1a) Initialize Socket handlers
        // Socket lifecycle handlers
        socket.once('connect', () => {
            if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
        });
        socket.once('end',   () => this._reset());
        socket.once('close', () => this._reset());

        // FTP connection response handlers
        socket.on('data', (chunk : Buffer) => {
            const status  = parseInt(chunk.slice(0,3).toString());
            const message = chunk.slice(4, chunk.byteLength - 2).toString();
        
            this._logger('RES', `> ${status} ${message}`);
                
            const lastCommand = this._commandCallbackQueue.shift();
            if (!lastCommand) return;

            const { callback } = lastCommand;
            if (status >= 400 && status < 600) {
                return callback(new FTPResponseError(status, message));
            }
            return callback(null, { status, message });
        });
        socket.on('error', (error : Error) => {
            this._logger('ERR', error.message);

            const lastCommand = this._commandCallbackQueue.shift();
            if (!lastCommand) return;

            const { callback } = lastCommand;
            return callback(error);
        });

        // (1b) Connect socket to FTP port on printer
        const connectionResponse = await new Promise<FTPResponse>((resolve, reject) => {
            let done = false;

            // Set connection timeout for printer
            this._connectionTimeout = setTimeout(() => {
                if (done) return;
                done = true;

                this._reset();
                return reject(new Error(`Exceeded ${this._connectionTimeoutMs}ms timeout while attempting to connect to printer.`));
            }, this._connectionTimeoutMs);

            // Attempt to connect to printer (expects an initial connection greeting)
            this._commandCallbackQueue.push({
                command  : FTP_CONNECTION_SYMBOL,
                callback : (error, res) => {
                    if (done) return;
                    done = true;

                    if (error || !res) {
                        this._reset();
                        return reject(error);
                    }

                    this.host = host;
                    this.port = port;

                    return resolve(res);
                },
            });

            socket.connect(port, host);
        });

        // (2) User Command
        await this._send(`USER ${username}`);

        // (3) Setup keep-alive NOOP interval
        if (this._keepAliveIntervalMs) {
            this._keepAliveInterval = setInterval(async () => {
                if (this._commandCallbackQueue.length) return;

                try {
                    await this._send('NOOP');
                }
                catch (err) {
                    this._logger('ERR', err.message);
                    this._reset();
                }
            }, this._keepAliveIntervalMs);
        }

        return connectionResponse;
    }

    /**
     * Ends an FTP session.
     */
    async disconnect() : Promise<void> {
        if (this._socket) await this._send('QUIT');
        this._reset();
    }

    /**
     * Transfers a file on disk to the Zebra printer via FTP
     * 
     * @param filepath - path to the file to transfer
     */
    async putFile(filepath : string) : Promise<void> {
        if (!existsSync(filepath)) throw new Error(`File not found. (${filepath})`);

        return this.putData(createReadStream(filepath), basename(filepath))
    }

    /**
     * Transfers data to the Zebra printer via FTP
     * 
     * @param data - data to be transferred to the printer (can come as a string, a buffer, a stream)
     * @param filename - name to transfer to the printer
     */
    async putData(data : string | Buffer | NodeJS.ReadableStream, filename : string = `${Date.now()}.zpl`) : Promise<void> {
        await this._send('TYPE I');
        await this._sendActiveCommand(`STOR ${filename}`, (socket : Socket) => {
            if (typeof data === 'string' || data instanceof Buffer) {
                socket.end(data);
            }
            else {
                data.pipe(socket);
            }
        });
    }

    /**
     * Resets object to pre-connection status.
     */
     private _reset() : void {
        if (this._socket)  this._socket.destroy();
        if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
        if (this._keepAliveInterval) clearInterval(this._keepAliveInterval);

        this._socket = null;
        this._connectionTimeout = null;
        this._keepAliveInterval = null;

        this._commandCallbackQueue = [];
    }

    /**
     * Sends an FTP command to the Zebra printer.
     * 
     * @param command - FTP command to send to the printer
     * @param onIntermediateResponse - callback for when 1xx responses are received. 1xx responses do not resolve the promise returned from this function, but will call this function if it is available
     */
    private async _send(command : string | typeof FTP_100_RETRY_SYMBOL, onIntermediateResponse? : (response: FTPResponse) => void ) : Promise<FTPResponse> {
        return new Promise<FTPResponse>((resolve, reject) => {
            if (!this._socket) throw new Error('Socket is not connected');

            // Setup response callback
            let done = false;
            this._commandCallbackQueue.push({
                command,
                callback : (error, output) => {
                    if (done) return;
                    done = true;

                    if (error || !output) return reject(error);
                    
                    // If status is in the 100 range, we should expect another reply (1xx)
                    if (output.status >= 100 && output.status < 200) {
                        if (onIntermediateResponse) onIntermediateResponse(output);

                        return resolve(this._send(FTP_100_RETRY_SYMBOL, onIntermediateResponse));
                    }

                    // Other statuses are final response
                    return resolve(output);
                },
            })

            // Send the command through the socket.
            // If command is the FTP_100_RETRY_SYMBOL, we just waiting for next reply instead of sending a command
            if (command !== FTP_100_RETRY_SYMBOL) {
                const activeCommand = command.replace(/\s*$/, '');
                this._logger('CMD', activeCommand);
                this._socket.write(activeCommand + '\r\n');
            }
        });
    }

    /**
     * Sends an FTP command to the Zebra printer that expects an active FTP connection made from the printer.
     * 
     * @param command - FTP command to send to the printer
     * @param onServerConnection - passed the socket when the printer reaches back out on the active command
     */
    private async _sendActiveCommand(command : string, onServerConnection : (socket : Socket) => Promise<void> | void) {
        if (!this._socket) throw new Error('Socket is not connected');

        // (A) Create a server to listen for active FTP responses
        let serverListener : (socket: Socket) => void = () => null;
        const serverClosedPromise = new Promise<null>(async (resolve) => {
            serverListener = async (socket) => {
                socket.on('close', () => {
                    server.close(() => resolve(null))
                });

                // (D) Respond to server connection
                await onServerConnection(socket);
            }
        });
        const server = createServer(serverListener);
        await new Promise(resolve => server.listen(0, () => resolve(null))); // listening on 0 tells system to assign a port
        const serverPort = (server.address() as AddressInfo).port;

        // (B) Send PORT command to printer socket to establish active connection
        // Fetch IPv4 address of this machine that is connected to the same network as the printer
        const socketAddress  = this._socket.address() as AddressInfo;
        const socketIp       = socketAddress?.address;
        const sharedNetworkInterfaceIp = Object.values(networkInterfaces())
            .map((networkInterface : NetworkInterfaceInfo[] | undefined) => {
                const address = networkInterface?.find(address => address.family === 'IPv4');
                if (!address) return null;

                const { address: interfaceIp, netmask } = address;
                const interfaceSubnet = applyIPv4Netmask(interfaceIp, netmask);
                const socketSubnet    = applyIPv4Netmask(socketIp, netmask);
                if (interfaceSubnet !== socketSubnet) return null;

                return interfaceIp;
            })
            .find(ip => ip);
        if (!sharedNetworkInterfaceIp) throw new Error('Unable to fetch corresponding network interface for socket.');
        
        // Send PORT command
        const portSixthDigit = serverPort % 256;
        const portFifthDigit = Math.trunc(serverPort / 256);
        await this._send(`PORT ${[...sharedNetworkInterfaceIp.split('.'), portFifthDigit, portSixthDigit].join(',')}`);

        // (C) Send active command
        const commandCompletedPromise = this._send(command);

        await Promise.all([ serverClosedPromise, commandCompletedPromise ]);
        return;
    }
}

// IPV4 Utils
function applyIPv4Netmask(address : string, netmask : string) {
    const ipv4   : number[] = address.split('.').map((num : string) => parseInt(num));
    const subnet : number[] = netmask.split('.').map((num : string) => parseInt(num));

    return ipv4.map((x : number, i : number) => (x & subnet[i]) ).join('.');
}