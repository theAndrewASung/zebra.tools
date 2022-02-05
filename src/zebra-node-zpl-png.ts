import { basename, extname } from 'path';
import { existsSync, promises as fsPromises } from 'fs';

import { concatUint8Arrays, stringToUint8Array } from './utils/utils-buffers';
import { ZplDownloadObjects, ZplImageLoad, ZplObjectDelete } from './zebra-zpl-commands';
import { uint8ArrayToHexString } from './utils/utils-encodings';

export class ZplPng {
    private _filepath : string;
    private _name     : string;
    private _drive    : string;

    /**
     * Object representation of a ZPL PNG (for Node)
     * @param filepath - path to the PNG file (should be absolute)
     * @param nameOnPrinter - name of the file on the printer, otherwise is the first 8 alphanumeric characters of the file
     */
    constructor(filepath : string, nameOnPrinter? : string) {
        const ext = extname(filepath);

        if (ext.toLowerCase() !== '.png') throw new TypeError(`File should be a PNG, got a ${ext}`);
        if (!existsSync(filepath))        throw new TypeError(`PNG file not found at ${filepath}`);
        if (nameOnPrinter) {
            if (/[^A-Z0-9]/i.test(nameOnPrinter)) throw new TypeError('nameOnPrinter argument should be alphanumeric');
            if (nameOnPrinter.length > 8)         throw new TypeError('nameOnPrinter argument should be 8 characters or less');
        }

        this._filepath = filepath;
        this._name     = nameOnPrinter ? nameOnPrinter : (basename(filepath, ext).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8));
        this._drive    = 'R';
    }

    /**
     * @returns import statement as a buffer
     */
    async getImportBuffer() : Promise<Uint8Array> {
        let zplBuffer : Uint8Array;

        const pngBuffer = await fsPromises.readFile(this._filepath);

        const pngSize = pngBuffer.byteLength;
        const pngData = uint8ArrayToHexString(pngBuffer);

        zplBuffer = ZplDownloadObjects.applyAsBuffer(this._drive, this._name, 'P', 'P', pngSize, null, pngData);

        /** ================================
         * Base 64 Implementation - Note this not viable because the 16-bit CRC is proprietary according the Zebra website:
         * https://www.zebra.com/us/en/support-downloads/knowledge-articles/ait/crc-algorithm-used-with-the-dy-command.html
         *
         * const pngSize    = pngBuffer.byteLength;
         *
         * const crc32Table = computeCRCTable(CRC_POLYNOMIALS.CRC_16_CCITT);
         * const delimiter  = stringToUint8Array(':');
         * const pngId      = stringToUint8Array('B64');
         * const pngEncoded = uint8ArrayToBase64(pngBuffer);
         * const pngCrc     = stringToUint8Array(computeCRCFromTable(pngEncoded, crc32Table, 16).toString(16));
         * const pngData    = concatUint8Arrays(delimiter, pngId, delimiter, pngEncoded, delimiter, pngCrc);
        
         * zplBuffer = ZplDownloadObjects.applyAsBuffer(this._drive, this._name, 'P', 'P', pngSize, null, pngData);
         * ================================ **/

        return concatUint8Arrays(
            stringToUint8Array('^XA'),
            zplBuffer,
            stringToUint8Array('^XZ')
        );
    }

    /**
     * Command to draw image on the sticker (as a string)
     */
    get drawString() : string {
        return ZplImageLoad.applyAsString(this._drive, this._name, 'PNG');
    }

    /**
     * Command to draw image on the sticker (as a buffer)
     */
    get drawBuffer() : Uint8Array {
        return ZplImageLoad.applyAsBuffer(this._drive, this._name, 'PNG');
    }

    /**
     * Command to delete image from printer memory (as a string)
     */
    get deleteString() : string {
        return ZplObjectDelete.applyAsString(this._drive, this._name, 'PNG');
    }

    /**
     * Command to delete image from printer memory (as a buffer)
     */
    get deleteBuffer() : Uint8Array {
        return ZplObjectDelete.applyAsBuffer(this._drive, this._name, 'PNG');
    }
}