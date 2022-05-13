import type { Server, AddressInfo } from 'net';
import type { NetworkInterfaceInfo } from 'os';

import { Socket, createServer } from 'net';
import { networkInterfaces } from 'os';
import { existsSync, createReadStream } from 'fs';
import { basename } from 'path';

const FTP_CONNECTION_SYMBOL = Symbol('CONNECT');
const FTP_100_RETRY_SYMBOL  = Symbol('100-RETRY');

export class FTPResponseError extends Error {
    status : number;

    constructor(status : number, message : string) {
        super(`${status} ${message}`);
        this.status = status;
    }
}

export class ZebraFTPClient {
    private _socket : Socket;
    private _sendQueue : Array<{
        command  : string | symbol;
        callback : (error : Error | void, output? : { status : number, message : string } ) => any;
    }>;

    private _logger  : (type : 'CMD' | 'RES' | 'ERR' | 'DEBUG', message : string) => void;
    private _connectionTimeoutMs : number;
    private _keepAliveIntervalMs : number;

    private _connected : boolean;
    private _connectionTimeout : NodeJS.Timeout;
    private _keepAliveInterval : NodeJS.Timer;

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
        this._logger = (type, message) => options.logger ? options.logger(`[FTP] ${type} | ${message}`) : null;
        this._keepAliveIntervalMs = options.keepAlive         || (60 * 1000);
        this._connectionTimeoutMs = options.connectionTimeout || (5  * 1000);
    }

    /**
     * Resets object to pre-connection status.
     */
    private _reset() : void {
        if (this._socket)  this._socket.destroy();
        if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
        if (this._keepAliveInterval) clearInterval(this._keepAliveInterval);

        this._socket = null;
        
        this._sendQueue     = [];

        this._connected = false;
        this._connectionTimeout = null;
        this._keepAliveInterval = null;
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
    async connect(host : string, port? : number, username? : string) : Promise<{ status : number, message : string, serverPort : number }> {
        if (this._connected) throw new Error('FTP already connected');

        // (1) Initiate FTP socket connection 
        this._socket = new Socket();
        this._socket.setTimeout(0);
        this._socket.setKeepAlive(true);

        // (1a) Initialize Socket handlers
        this._socket.once('connect', () => {
            this._connected = true;

            if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
        });
        this._socket.on('error', (error : Error) => {
            this._logger('ERR', error.message);

            const { command, callback } = this._sendQueue.shift() || {};
            if (!command || !callback) return;
            
            return callback(error);
        });
        this._socket.on('data', (chunk : Buffer) => {
            const status  = parseInt(chunk.slice(0,3).toString());
            const message = chunk.slice(4, chunk.byteLength - 2).toString();
        
            this._logger('RES', `> ${status} ${message}`);

            const { command, callback } = this._sendQueue.shift() || {};
            if (!command || !callback) return;

            if (status >= 400 && status < 600) {
                return callback(new FTPResponseError(status, message));
            }
            return callback(null, { status, message });
        });
        this._socket.once('end',   () => this._reset());
        this._socket.once('close', () => this._reset());

        const { status, message } = await new Promise((resolve, reject) => {
            let done = false;

            // Set connection timeout for printer
            this._connectionTimeout = setTimeout(() => {
                if (done) return;
                done = true;

                this._reset();
                return reject(new Error(`Exceeded ${this._connectionTimeoutMs}ms timeout while attempting to connect to printer.`));
            }, this._connectionTimeoutMs);

            // Queue connection greeting response
            this._sendQueue.push({
                command : FTP_CONNECTION_SYMBOL,
                callback(error, status) {
                    if (done) return;
                    done = true;

                    if (error) {
                        this._reset();
                        return reject(error);
                    }

                    return resolve(status);
                },
            });

            // Execute commands
            this.host = host || '127.0.0.1';
            this.port = port || 21;
            this._socket.connect(this.port, this.host);
        });

        // (2) User Command
        if (username) await this._send(`USER ${username}`);

        // (3) Setup keep-alive NOOP interval
        if (this._keepAliveIntervalMs) {
            this._keepAliveInterval = setInterval(async () => {
                if (!this._connected || this._sendQueue.length) return;

                try
                {
                    await this._send('NOOP');
                }
                catch (err)
                {
                    this._logger('ERR', err.message);
                    this._reset();
                }
            }, this._keepAliveIntervalMs);
        }

        const serverPort = 0;
        return { status, message, serverPort };
    }

    /**
     * Ends an FTP session.
     */
    async disconnect() : Promise<void> {
        if (this._connected) await this._send('QUIT');
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
    async putData(data : string | Uint8Array | NodeJS.ReadableStream, filename? : string) : Promise<void> {

        await this._send('TYPE I');
        await this._sendActiveCommand(`STOR ${filename || (Date.now() + '.zpl')}`, (socket : Socket) => {
            if (typeof data === 'string' || data instanceof Uint8Array) {
                socket.end(data);
            }
            else {
                data.pipe(socket);
            }
        });
    }

    /**
     * Sends an FTP command to the Zebra printer.
     * 
     * @param command - FTP command to send to the printer
     * @param onIntermediateResponse - callback for when 1xx responses are received. 1xx responses do not resolve the promise returned from this function, but will call this function if it is available
     */
    private async _send(command? : string | typeof FTP_100_RETRY_SYMBOL, onIntermediateResponse? : (status : number, message : string) => any ) : Promise<{ status : number, message :string }> {
        if (!this._connected) throw new Error('FTP not connected');

        return new Promise((resolve, reject) => {
            let done = false;

            // Await the response
            this._sendQueue.push({
                command,
                callback : (error, output) => {
                    if (done) return;
                    done =true;

                    if (error) return reject(error);
                    
                    // Expect another reply (1xx)
                    if (output.status >= 100 && output.status < 200) {
                        if (onIntermediateResponse) onIntermediateResponse(output.status, output.message);

                        return resolve(this._send(FTP_100_RETRY_SYMBOL));
                    }

                    // Final response
                    return resolve(output);
                },
            })

            // Send the command through the socket. If command is the FTP_100_RETRY_SYMBOL, just waiting for another response so we don't need to send them it again.
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
    private async _sendActiveCommand(command : string, onServerConnection : (socket : Socket) => Promise<void> | void)
    {
        // (A) Create a server to listen for active FTP responses
        let server : Server;
        const serverClosedPromise = new Promise(async (resolve) => {
            server = createServer(async (socket : any) => {
                socket.on('close', () => {
                    server.close(() => resolve(null))
                });

                // (D) Respond to server connection
                await onServerConnection(socket);
            });
        });
        await new Promise(resolve => server.listen(0, () => resolve(null)));
        const serverPort = (server.address() as AddressInfo).port;

        // (B) Send PORT command to establish active connection
        // Fetch IPv4 address of this machine that is connected to the same network as the printer
        function applyIPv4Netmask(address : string, netmask : string) {
            const ipv4   : number[] = address.split('.').map((num : string) => parseInt(num));
            const subnet : number[] = netmask.split('.').map((num : string) => parseInt(num));
            
            return ipv4.map((x : number, i : number) => (x & subnet[i]) ).join('.');
        }

        const socketAddress  = this._socket.address() as AddressInfo;
        const socketIp       = socketAddress.address ? socketAddress.address : null;
        const sharedNetworkInterface = Object.values<NetworkInterfaceInfo[]>(networkInterfaces())
            .map((networkInterface : NetworkInterfaceInfo[]) => {
                const { address, netmask } = networkInterface.find(address => address.family === 'IPv4') || {};
                if (!address) return null;

                const interfaceSubnet = applyIPv4Netmask(address, netmask);
                const socketSubnet    = applyIPv4Netmask(socketIp, netmask);

                return {
                    address,
                    subnet     : interfaceSubnet,
                    sameSubnet : interfaceSubnet === socketSubnet,
                };
            })
            .find(row => row && row.sameSubnet);
        if (!sharedNetworkInterface) throw new Error('Unable to fetch corresponding network interface for socket.');

        const portSixthDigit = serverPort % 256;
        const portFifthDigit = Math.trunc(serverPort / 256);
        await this._send(`PORT ${[...sharedNetworkInterface.address.split('.'), portFifthDigit, portSixthDigit].join(',')}`);

        // (C) Send command
        const commandCompletedPromise = this._send(command);

        return await Promise.all([ serverClosedPromise, commandCompletedPromise ]);
    }
}