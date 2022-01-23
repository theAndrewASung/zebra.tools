import * as net  from 'net';
import * as os   from 'os';
import * as fs   from 'fs';
import * as path from 'path';

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
    private _socket : net.Socket;
    private _sendQueue : Array<{
        command  : string | symbol;
        callback : (error : Error | void, output? : { status : number, message : string } ) => any;
    }>;

    private _server : net.Server;
    private _responseQueue : Array<{
        onResponse : (socket : net.Socket) => any;
        callback   : () => any;
    }>;

    private _logger  : (str? : string) => void;
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
     * @param options.keepAlive - number of milliseconds between sending NOOP's to keep the connection alive
     * @param options.connectionTimeout - number of milliseconds before timing out on the initial connection
     */
    constructor(options : {
        active?    : true;
        logger?    : (str : string) => void;
        keepAlive? : number;
        connectionTimeout? : number;
    } = {}) {

        this._reset();

        // Configuration Options
        this._logger = options.logger || (() => null);
        this._keepAliveIntervalMs = options.keepAlive         || (60 * 1000);
        this._connectionTimeoutMs = options.connectionTimeout || (5  * 1000);
    }

    /**
     * Resets object to pre-connection status.
     */
    private _reset() : void {
        if (this._server)  this._server.close();
        if (this._socket)  this._socket.destroy();
        if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
        if (this._keepAliveInterval) clearInterval(this._keepAliveInterval);

        this._socket = null;
        this._server = null;
        
        this._sendQueue     = [];
        this._responseQueue = [];

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
        this._socket = new net.Socket();
        this._socket.setTimeout(0);
        this._socket.setKeepAlive(true);
        const { status, message } = await new Promise((resolve, reject) => {
            let done = false;

            // Set connection timeout for printer
            this._connectionTimeout = setTimeout(() => {
                if (done) return;
                done = true;

                this._reset();
                return reject(new Error(`Exceed ${this._connectionTimeoutMs}ms timeout while connecting to printer.`));
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

            // Socket handlers
            this._socket.once('connect', () => {
                this._connected = true;

                if (this._connectionTimeout) clearTimeout(this._connectionTimeout);
            });
            this._socket.on('error', (error : Error) => {
                this._logger(`[FTP] ERR | ${error.message}`);

                const { command, callback } = this._sendQueue.shift() || {};
                if (!command) return;
                
                return callback(error);
            });
            this._socket.on('data', (chunk : Buffer) => {
                const status  = parseInt(chunk.slice(0,3).toString());
                const message = chunk.slice(4, chunk.byteLength - 2).toString();
            
                this._logger(`[FTP] RES | > ${status} ${message}`);

                const { command, callback } = this._sendQueue.shift() || {};
                if (!command) return;

                if (status >= 400 && status < 600) {
                    return callback(new FTPResponseError(status, message));
                }
                return callback(null, { status, message });
            });
            this._socket.once('end',   () => this._reset());
            this._socket.once('close', () => this._reset());

            // Execute commands
            this.host = host || '127.0.0.1';
            this.port = port || 21;
            this._socket.connect(this.port, this.host);
        });

        // (2) User Command
        if (username) await this._send(`USER ${username}`);

        // (3) Setup server for active FTP
        // (3a) Create server for active FTP connections
        this._server = net.createServer(async (socket : any) => {
            // Unqueue command
            const { onResponse, callback } = this._responseQueue.shift() || {};
            if (!onResponse) return socket.end();

            // Setup callback and run command
            socket.on('close', () => callback());
            await onResponse(socket);
        });

        // (3b) Send PORT command to active connection
        const serverPort = await new Promise<number>((resolve) => {
            this._server.listen(0, async () => {
                const serverPort = await this._port();
                resolve(serverPort);
            });
        });

        // (4) Setup keep-alive NOOP interval
        if (this._keepAliveIntervalMs) {
            this._keepAliveInterval = setInterval(async () => {
                if (!this._connected || this._sendQueue.length) return;

                await this._send('NOOP');
            }, this._keepAliveIntervalMs);
        }

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
        if (!fs.existsSync(filepath)) throw new Error(`File not found. (${filepath})`);

        return this.putData(fs.createReadStream(filepath), path.basename(filepath))
    }

    /**
     * Transfers data to the Zebra printer via FTP
     * 
     * @param data - data to be transferred to the printer (can come as a string, a buffer, a stream)
     * @param filename - name to transfer to the printer
     */
    async putData(data : string | Buffer | NodeJS.ReadableStream, filename? : string) : Promise<void> {
        return await new Promise(async (resolve) => {
            // Possible race condition between when the socket closes and when the command returns with a 226, wait for both to finish
            let eitherTransferOrCommandComplete = false;

            // Push reaction when Zebra Printer reaches out 
            this._responseQueue.push({
                onResponse(socket) {
                    if (typeof data === 'string' || data instanceof Buffer) {
                        return socket.end(data);
                    }
                    else {
                        data.pipe(socket);
                    }
                },
                callback : () => {
                    if (eitherTransferOrCommandComplete) return resolve(null);
                    eitherTransferOrCommandComplete = true;
                },
            });

            await this._port();
            await this._send('TYPE I');
            await this._send(`STOR ${filename || (Date.now() + '.zpl')}`);

            if (eitherTransferOrCommandComplete) return resolve(null);
            eitherTransferOrCommandComplete = true;
        });
    }

    /**
     * Sends PORT command to FTP.
     */
    private async _port() {
        if (!this._server) throw new Error('Server not connected');

        // Fetch IPv4 address of this machine that is connected to the same network as the printer
        function applyIPv4Netmask(address : string, netmask : string) {
            const ipv4   : number[] = address.split('.').map((num : string) => parseInt(num));
            const subnet : number[] = netmask.split('.').map((num : string) => parseInt(num));
            
            return ipv4.map((x : number, i : number) => (x & subnet[i]) ).join('.');
        }

        const socketAddress  = this._socket.address() as net.AddressInfo;
        const socketIp       = socketAddress.address ? socketAddress.address : null;
        const sharedNetworkInterface = Object.values<os.NetworkInterfaceInfo[]>(os.networkInterfaces())
            .map((networkInterface : os.NetworkInterfaceInfo[]) => {
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
            .find(row => row.sameSubnet);
        if (!sharedNetworkInterface) throw new Error('Unable to fetch corresponding network interface for socket.');

        // Send port command
        const serverAddress  = this._server.address() as net.AddressInfo;
        const serverPort     = Math.trunc(serverAddress.port);
        const portSixthDigit = serverPort % 256;
        const portFifthDigit = Math.trunc(serverPort / 256);
        await this._send(`PORT ${[...sharedNetworkInterface.address.split('.'), portFifthDigit, portSixthDigit].join(',')}`);

        return serverPort;
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

                    return resolve(output);
                },
            })

            if (command !== FTP_100_RETRY_SYMBOL) {
                const activeCommand = command.replace(/\s*$/, '');
                this._logger(`[FTP] CMD | ${activeCommand}`);
                this._socket.write(activeCommand + '\r\n');
            }
        });
    }
}