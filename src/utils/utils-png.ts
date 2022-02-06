import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { computeCRCFromTable, computeCRCTable } from './utils-crc';
import { uint8ArrayToInteger, uint8ArrayToString } from './utils-buffers';
import { zlibDeflate } from './utils-zlib';

interface pngChunk {
    type   : string;
    length : number;
    data   : Uint8Array;
    crc    : string;
    crcExpected : string;
    crcMatched  : boolean;

    critical?     : boolean;
    public?       : boolean;
    safeToCopy? : boolean;

    recognized?   : boolean;
    details?    : object;
}

async function __main__() {

    // uses sRGB
    // const pngPath = path.resolve(__dirname, './images/cry.png');
    // const pngPath = path.resolve(__dirname, './images/peeky.png');
    // const pngPath = path.resolve(__dirname, './images/mousey - og png.png');

    // uses iCCP
    const pngPath = path.resolve(__dirname, './images/mousey.png');
    const pngBuff = await fsPromises.readFile(pngPath);

    if (isPng(pngBuff)) {
        console.log(pngBuff);
        parsePng(pngBuff);
    }
    else if (isJpeg(pngBuff)) {
        console.log('File is a JPEG');
    }
    else {
        console.log('Incorrect filetype.');
    }


    // const INTERVAL = 100;
    // const printBuffer = [];
    // for (let i = 0, ilen = pngBuff.length; i < ilen; i++) {
    //     const digit = pngBuff[i];
    //     printBuffer.push(digit < 128 ? String.fromCharCode(digit) : '-');

    //     if (i % INTERVAL === 0) {
    //         console.log(printBuffer.join(''));
    //         printBuffer.splice(0, INTERVAL);
    //     }
    // }

    // if (printBuffer.length) {
    //     console.log(printBuffer.join(''));
    //     printBuffer.splice(0, INTERVAL);
    // }
}
if (require.main === module) __main__();


const PNG_NO_DETAILS = () => ({});
const PNG_CHUNK_DETAILS : { [ key : string ] : (chunk : pngChunk) => object } = {
    // Critical Chunks
    IHDR, // first chunk, image data
    PLTE, // palette
    IDAT : PNG_NO_DETAILS, // image data
    IEND : PNG_NO_DETAILS, // image end

    // Ancillary Chunks
    iCCP, // ICC color profile
    gAMA, // gamma
    pHYs, // intended pixel size
    sRGB, // standard sRGB colorspace
};

/**
 * Checks buffer for JPEG signature (FF D8 FF E0)
 * 
 * @params jpegBuffer - buffer to check
 * @returns - true if the file is a JPEG
 */
function isJpeg(jpegBuffer : Uint8Array) : boolean {
    const header = jpegBuffer.slice(0, 4);
    return header[0] === 0xFF
        && header[1] === 0xD8
        && header[2] === 0xFF
        && header[3] === 0xE0;
}

/**
 * Checks buffer for PNG signature (89 50 4E 47 0D 0A 1A 0A)
 * 
 * @params pngBuffer - buffer to check
 * @returns - true if the file is a PNG
 */
function isPng(pngBuffer : Uint8Array) : boolean {
    const header = pngBuffer.slice(0,8);
    return header[0] === 0x89
        && header[1] === 0x50
        && header[2] === 0x4E
        && header[3] === 0x47
        && header[4] === 0x0D
        && header[5] === 0x0A
        && header[6] === 0x1A
        && header[7] === 0x0A;
}

function parsePng(pngBuffer : Uint8Array) {   
    const pngHeader = pngBuffer.slice(0,8);
    const isPngHeader = isPng(pngBuffer);
        
    console.log(String.fromCharCode.apply(null, pngHeader));
    console.log(pngHeader, isPngHeader);

    // Extract chunks
    const crc32Table = computeCRCTable();
    const chunks = [];

    let i = 8, ilen = pngBuffer.length;
    while (i < ilen) {
        // 4 bytes, with each byte (8-bits) as unsigned integer from 0-(2^8 - 1) = 255 >>> 0 to (256^4 - 1);
        const chunkLength = uint8ArrayToInteger(pngBuffer.slice(i, i+4));
        i += 4;

        const chunkType   = String.fromCharCode(...pngBuffer.slice(i, i+4));
        i += 4;
    
        const chunkData    = pngBuffer.slice(i, i+chunkLength);
        const chunkCRCData = pngBuffer.slice(i-4, i+chunkLength);
        i += chunkLength;
        
        const chunkCRC    = uint8ArrayToInteger(pngBuffer.slice(i, i+4));
        i += 4;

        if (chunkType !== 'iCCP') continue;
        
        // Calculated properties
        const chunkTypeUppercase = chunkType.split('').map(char => (char === char.toUpperCase()));
        const getChunkDetails = PNG_CHUNK_DETAILS[chunkType];
        const crcExpected = computeCRCFromTable(chunkCRCData, crc32Table);

        const chunk : pngChunk = {
            length : chunkLength,
            type   : chunkType,
            data   : chunkData,
            crc    : chunkCRC.toString(16),
            crcExpected : crcExpected.toString(16),
            crcMatched  : (chunkCRC === crcExpected),

            // about the chunk
            critical : chunkTypeUppercase[0], // false = ancillary
            public   : chunkTypeUppercase[1], // false = private
            // chunkTypeUppercase[2] should always be true, otherwise considered an "unrecognized" chunk
            safeToCopy : !chunkTypeUppercase[3], // false = only safe to be copied if no modification to critical chunks

            // if chunk is recognized
            recognized : (
                chunkTypeUppercase[2] && !!getChunkDetails
            ),
            details : null,
        };

        // Calculate chunk details
        if (getChunkDetails) {
            chunk.details = getChunkDetails(chunk);
        }

        console.log(chunk);
        chunks.push(chunk);
        // console.log(chunkLength, chunkType, chunkData, chunkCRC);
    }
}

interface pngChunkDetailField {
    key        : string;
    bytes      : number;
    transform? : (subchunk : Uint8Array) => number;
    iterate?   : (subchunk : Uint8Array, index : number) => { loop : boolean, value : Uint8Array };
};

function parseDetailsFromFields(fields : pngChunkDetailField[], data : Uint8Array) {
    const details : { [ key : string ] : number | Uint8Array | Array<any> } = {};

    let i = 0;
    for (const { key, bytes, transform, iterate } of fields) {
        if (iterate) {
            const detailsArray = [];
            let loop = true;
            let chunkIndex = 0;
            while(loop) {
                const subchunk = data.slice(i, i + bytes);
                const out = iterate(subchunk, chunkIndex);
                loop = out.loop;
                detailsArray.push(out.value);

                chunkIndex += 1;
                i += bytes;
            }
            details[key] = detailsArray;
        }
        else if (bytes === 1) {
            details[key] = data[i];
        }
        else {
            const subchunk = data.slice(i, i + bytes);
            details[key] = transform ? transform(subchunk) : subchunk;
        }

        i+= bytes;
    }

    return details;
}

function IHDR(chunk : pngChunk) {
    const data = chunk.data;
    if (data.length !== 13) console.warn('IHDR chunk should be 13 bytes');

    return parseDetailsFromFields([
        { key : 'width',  bytes : 4, transform : uint8ArrayToInteger },
        { key : 'height', bytes : 4, transform : uint8ArrayToInteger },
        { key : 'bitDepth',          bytes : 1 }, // values 1, 2, 4, 8, or 16
        { key : 'colorType',         bytes : 1 }, // values 0, 2, 3, 4, or 6
        { key : 'compressionMethod', bytes : 1 }, // value 0
        { key : 'filterMethod',      bytes : 1 }, // value 0
        { key : 'interlaceMethod',   bytes : 1 }, // values 0 "no interlace" or 1 "Adam7 interlace"
    ], data);
}

function PLTE(chunk : pngChunk) {
    const data   = chunk.data;
    const length = chunk.length;
    if (length % 3 !== 0) console.warn('PLTE chunk should be divisible by 3 bytes');

    return parseDetailsFromFields([
        { key : 'palette', bytes : 3, iterate(subchunk : Uint8Array, index : number) {
            const loop  = (index * 3) <= length;
            const value = subchunk;
            return { loop, value };
        }},
    ], data);
}

function pHYs(chunk : pngChunk) {
    const data = chunk.data;
    if (data.length !== 9) console.warn('pHYs chunk should be 9 bytes');

    // Intended pixel size / pixel aspect ratio
    return parseDetailsFromFields([
        { key : 'pixelsPerUnitX', bytes : 4, transform : uint8ArrayToInteger },
        { key : 'pixelsPerUnitY', bytes : 4, transform : uint8ArrayToInteger },
        { key : 'unitSpecifier',  bytes : 1 },
    ], data);
}

function sRGB(chunk : pngChunk) {
    const data = chunk.data;
    if (data.length !== 1) console.warn('sRGB chunk should be 1 byte');

    return parseDetailsFromFields([
        { key : 'renderingIntent',  bytes : 1 }, // values 0, 1, 2, and 3
    ], data);
}

function gAMA(chunk : pngChunk) {
    const data = chunk.data;
    if (data.length !== 4) console.warn('gAMA chunk should be 4 bytes');

    return parseDetailsFromFields([
        { key : 'gamma',  bytes : 4, transform : uint8ArrayToInteger },
    ], data);
}

function iCCP(chunk : pngChunk) {
    const data = chunk.data;

    // color type 2, 3, 6 - ICC RGB colour space
    // color type 0, 4 - ICC greyscale colour space

    let i = 0, loop = true;
    while (i < 79 && loop) {
        loop = (data[i] !== 0x00);
        if (loop) i += 1;
    }
    const profileName = uint8ArrayToString(data.slice(0, i));
    i += 1;

    const compressionMethod = data[i];
    if (compressionMethod !== 0) console.warn(`Invalid compression method ${compressionMethod} in iCCP chunk`)// No other defined compression method
    i += 1;

    const compressedProfile = data.slice(i);
    zlibDeflate(compressedProfile);

    return {
        profileName,
        compressionMethod,
        compressedProfile,
    };
}
