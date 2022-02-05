import { basename, extname } from 'path';
import { existsSync, promises as fsPromises } from 'fs';
import { concatUint8Arrays, stringToUint8Array } from './utils/utils-buffers';
import { ZplDownloadObjects, ZplObjectDelete, ZplUseFontNameToCallFont } from './zebra-zpl-commands';

const ACCEPTED_EXTENSIONS = new Set([ '.ttf', '.tte' ]);

class ZplFont {
    private _filepath : string;
    private _name     : string;
    private _drive    : string;
    private _ext      : string;

    constructor(filepath : string, nameOnPrinter? : string) {
        const ext = extname(filepath);

        if (ACCEPTED_EXTENSIONS.has(ext.toLowerCase())) throw new TypeError(`File should be a TTF or TTE, got a ${ext}`);
        if (!existsSync(filepath)) throw new TypeError(`${ext.substring(1).toUpperCase()} file not found at ${filepath}`);
        if (nameOnPrinter) {
            if (/[^A-Z0-9]/i.test(nameOnPrinter)) throw new TypeError('nameOnPrinter argument should be alphanumeric');
            if (nameOnPrinter.length > 8)         throw new TypeError('nameOnPrinter argument should be 8 characters or less');
        }

        this._filepath = filepath;
        this._name     = nameOnPrinter ? nameOnPrinter : (basename(filepath, ext).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8));
        this._drive    = 'R';
        this._ext      = (ext === '.tte') ? 'TTE' : 'TTF';
    }

    /**
     * @returns import statement as a buffer
     */
     async getImportBuffer() : Promise<Uint8Array> {
        const fontBuffer = await fsPromises.readFile(this._filepath);
        const fontSize   = fontBuffer.byteLength;

        return concatUint8Arrays(
            stringToUint8Array('^XA'),
            ZplDownloadObjects.applyAsBuffer(this._drive, this._name, 'B', (this._ext === 'TTE' ? 'E' : 'T'), fontSize, null, fontBuffer),
            stringToUint8Array('^XZ')
        );
    }

    getCallFontString(sizeInDots : number) : string {
        return ZplUseFontNameToCallFont.applyAsString('N', sizeInDots, sizeInDots, this._drive, this._name, this._ext);
    }

    getCallFontBuffer(sizeInDots : number) : Uint8Array {
        return ZplUseFontNameToCallFont.applyAsBuffer('N', sizeInDots, sizeInDots, this._drive, this._name, this._ext);
    }

    /**
     * Command to delete image from printer memory (as a string)
     */
    get deleteString() : string {
        return ZplObjectDelete.applyAsString(this._drive, this._name, this._ext);
    }

    /**
     * Command to delete image from printer memory (as a buffer)
     */
    get deleteBuffer() : Uint8Array {
        return ZplObjectDelete.applyAsBuffer(this._drive, this._name, this._ext);
    }
}