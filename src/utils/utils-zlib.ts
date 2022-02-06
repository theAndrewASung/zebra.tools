// zlib specification
// Bits are specified as [76543210]

import { join } from "path/posix";
import { concatUint8Arrays, uint8ArrayToInteger } from "./utils-buffers";

// https://www.ietf.org/rfc/rfc1950.txt
export function zlibDeflate(buffer : Uint8Array) : Uint8Array {
    console.log('zlibDeflate');
    console.log(buffer);

    const CMF = buffer[0]; // Compression Method and Flags
    const CM    = (CMF & 0x0F); // [bits 0-3] compression method
    const CINFO = (CMF >>> 4);  // [bits 4-7] compression info;
    // console.log(CMF.toString(2), CM.toString(2), CINFO.toString(2));

    const FLG = buffer[1]; // Flags
    const FCHECK = (FLG & 0x0F);    // [bits 0-4] check bits for CMF and FLG
    const FDICT  = (FLG >>> 5) & 1; // [bit 5]    preset dictionary
    const FLEVEL = (FLG >>> 6) & 3; // [bits 6-7] compression level
    console.log(FLG.toString(2), FCHECK.toString(2), FDICT.toString(2), FLEVEL.toString(2));
    // 0 - compressor used fastest algorithm
    // 1 - compressor used fast algorithm
    // 2 - compressor used default algorithm
    // 3 - compressor used maximum compression, slowest algorithm

    const data    = buffer.slice(2, buffer.length - 4);
    const ALDER32 = buffer.slice(buffer.length - 4);
    // console.log(uint8ArrayToInteger(ALDER32).toString(16));
    // console.log(computeAlder32Checksum(data).toString(16));
    console.log(data);

    parseDeflatedData(data);

    console.log({
        compressionMethod : CM, // 8 = "deflate" w/ window up to 32K, 15 = reserved
        compressionInfo   : CINFO, // base-2 log of LZ77 window size, minus 8
        lz77Window : Math.pow(2, CINFO) - 8,
        // passedCheck : (CMF*256 + FLG) % 31 === 0, 
        data,
        ALDER32,
    })

    return new Uint8Array();
}

const Ob = (num : number) : string => `0000000${num.toString(2)}`.slice(-8);

/**
 * Trims bits from a byte. Takes range [start, end).
 * 
 * @param byte  - 8-bit information
 * @param start - 0 - 7 starting bit (inclusive, big endian)
 * @param end   - 0 - 7 ending bit   (exclusive, big endian)
 * @returns number
 */
function getBitsFromByte(byte : number, start : number, end? : number) : number {
    if (end) {
        if (start === 0) {
            return byte >>> (8 - end);
        }
        else {
            return byte & (0xFF >>> start) >>> (end - start);
        }
    }
    else {
        return byte & (0xFF >>> start);
    }
}


export function parseDeflatedData(buffer : Uint8Array) : number {
    let byteIndex = 0;
    let bitIndex  = 0; // 0 - 7 
    const getNextBits = (n : number, e? : string) : string => {
        if (n <= 0) return '';

        const numBytes = Math.floor((n + bitIndex) / 8);

        const bitStart = bitIndex;
        bitIndex = (bitIndex + n) % 8; // start of next run
        
        const byteStart = byteIndex;
        byteIndex += numBytes; // start of next run

        const firstByte = buffer[byteStart];
        
        if (byteStart === byteIndex) {
            const res = Ob(getBitsFromByte(firstByte, bitStart, bitIndex)).slice(-n);
            // console.log('A', n, '|', bitStart, bitIndex, byteStart, byteIndex, res, e, res === e);
            return res;
            // const res = Ob((buffer[byteStart] >>> (8 - bitIndex)) & (0xFF >>> (8 - n))).slice(-n);
        }
        else {
            const bits : string[] = [];
            bits.push(Ob(getBitsFromByte(firstByte, bitStart))); // Bits from first byte

            // Add any full bytes in the middle or at the end of the segment 
            if (numBytes > 1) {
                buffer.slice(byteStart + 1, byteIndex).map(num => {
                    bits.push(Ob(num));
                    return 0;
                });
                // console.log('B ', bits);
            }
            // Add any parts of the last byte
            if (bitIndex > 0) {
                bits.push(Ob(getBitsFromByte(buffer[byteIndex], 0, bitIndex)).slice(-bitIndex));
                // console.log('C ', bits);
            }


            const res = bits.join('').slice(-n);
            // console.log('D', bits.join(''), res);
            // console.log('D', n, '|', bitStart, bitIndex, byteStart, byteIndex, res, e, res === e);
            return res;
        }
    };

    // console.log('here');

    // console.log(buffer.length);
    // const n = 21, m = 2;
    // const expected = [...buffer.slice(0, n * m)]
    //     .map(num => Ob(num))
    //     .join('')
    //     .match(new RegExp(`[01]{${n}}`, 'g'));

    // // `0000000${uint8ArrayToInteger(buffer.slice(0,n)).toString(2)}`.slice(-8 * n).match(new RegExp(`[01]{${n}}`, 'g'));
    // for (let i = 0; i < 8 * m; i++) {
    //     getNextBits(n, expected[i]);
    //     // console.log(getNextBits(n));
    // }

    // return 0;

    const blocks = [];

    let bfinal = null;
    let btype  = null;

    while(byteIndex < buffer.length) {
        if (bfinal === null) {
            bfinal = parseInt(getNextBits(1));
            console.log('BFINAL', bfinal);
        }
        else if (btype === null) {
            btype = parseInt(getNextBits(2));
            console.log('BTYPE', btype);
        }
        else if (btype === 0) { // 00 - (3.2.4) no compression
            const LEN  = parseInt(getNextBits(2));
            const NLEN = parseInt(getNextBits(2));
            const DATA = new Uint8Array(getNextBits(LEN * 8).match(/[0-1]{8}/g).map(str => parseInt(str, 2)));

            blocks.push({ LEN, NLEN, DATA });
            bfinal = null;
            btype  = null;
            console.log(blocks[blocks.length - 1]);
        }
        else if (btype === 1) { // 01 - (3.2.6) compressed with fixed Huffman codes
            return 0;
        }
        else if (btype === 2) { // 10 - compressed with dynamic Huffman codes
            return 0;
        }
        else if (btype === 3) { // 11 - reserved (error)
            return 0;
        }
        else {
            return 0;
        }
    }
    return 0;
}

export function computeAlder32Checksum(buffer : Uint8Array) : number {
    const BASE = 65521; // Largest prime smaller than Math.pow(2, 16);

    const adler = 1;
    let s1 = adler & 0xFFFF;
    let s2 = (adler >>> 16) & 0xFFFF;
    for (let i = 0, ilen = buffer.length; i < ilen; i++) {
        s1 = (s1 + buffer[i]) % BASE;
        s2 = (s2 + s1)        % BASE;
    }

    // s2 << 16 is done with toString because of 32 bit signed overflow
    return parseInt(s2.toString(16) + s1.toString(16), 16);
}