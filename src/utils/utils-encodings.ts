import { uint8ArrayToString } from "./utils-buffers";

const BASE_64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE_64_CHARCODES = BASE_64_CHARS.split('').map(c => c.charCodeAt(0));
const BASE_64_FILLER = '='.charCodeAt(0);

/**
 * Converts a Uint8Array into a base64 array
 * 
 * @param array - a Uint8Array
 * @returns a UTF8 encoded array
 */
export function uint8ArrayToBase64(array : Uint8Array) : Uint8Array {
    const len : number = array.length;
    const b64 : Uint8Array = new Uint8Array(Math.ceil(len / 3) * 4);
    for (let i = 0, j = 0; i < len; i += 3, j += 4) {
        const one   = array[i];
        const two   = array[i + 1];
        const three = array[i + 2];

        let a : number = one >> 2;
        let b : number = (one & 3) << 4; // 11 => 3
        let c : number | undefined = undefined;
        let d : number | undefined = undefined;
        if (two !== undefined) {
            b = b | (two >> 4);
            c = (two & 15) << 2; // 1111 => 15
            if (three !== undefined) {
                c = c | (three >> 6); 
                d = three & 63; // 111111 => 63
            }
        }

        b64.set([
            BASE_64_CHARCODES[a], // 6-left digits of one
            BASE_64_CHARCODES[b], // 2-right digits of one + 4-left digits of two
            (c !== undefined) ? BASE_64_CHARCODES[c] : BASE_64_FILLER, // 4-right digits of two + 2-left digits of three
            (d !== undefined) ? BASE_64_CHARCODES[d] : BASE_64_FILLER, // 6-right digits of three
        ], j);
    }
    return b64;
}

/**
 * Converts a Uint8Array into a base64 string
 * 
 * @param array - a Uint8Array
 * @returns a UTF8 encoded string
 */
export function uint8ArrayToBase64String(array : Uint8Array) : string {
    return uint8ArrayToString(uint8ArrayToBase64(array));
}

/**
 * Converts a Uint8Array into a hex string
 * 
 * @param array - a Uint8Array
 * @returns a UTF8 encoded string
 */
export function uint8ArrayToHexString(array : Uint8Array) : string {
    const b64: string[] = [];
    for (let i = 0, ilen = array.length; i < ilen; i++) {
        const int = array[i];
        if (int < 16) b64.push('0');
        b64.push(int.toString(16));
    }
    return b64.join('');
}