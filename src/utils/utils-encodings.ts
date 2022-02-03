const BASE_64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Converts a Uint8Array into a base64 string
 * 
 * @param array - a Uint8Array
 * @returns a UTF8 encoded string
 */
export function uint8ArrayToBase64String(array : Uint8Array) : string {
    const b64 = [];
    for (let i = 0, ilen = array.length; i < ilen; i += 3) {
        const one   = array[i];
        const two   = array[i + 1];
        const three = array[i + 2];

        let a : number = one >> 2;
        let b : number = (one & 3) << 4; // 11 => 3
        let c : number, d : number;
        if (two !== undefined) {
            b = b | (two >> 4);
            c = (two & 15) << 2; // 1111 => 15
        }
        if (three !== undefined) {
            c = c | (three >> 6); 
            d = three & 63; // 111111 => 63
        }

        b64.push(BASE_64_CHARS[a]);        // 6-left digits of one
        b64.push(BASE_64_CHARS[b]);        // 2-right digits of one + 4-left digits of two
        b64.push(BASE_64_CHARS[c] || '='); // 4-right digits of two + 2-left digits of three
        b64.push(BASE_64_CHARS[d] || '='); // 6-right digits of three
    }
    return b64.join('');
}

/**
 * Converts a Uint8Array into a hex string
 * 
 * @param array - a Uint8Array
 * @returns a UTF8 encoded string
 */
export function uint8ArrayToHexString(array : Uint8Array) : string {
    const b64 = [];
    for (let i = 0, ilen = array.length; i < ilen; i++) {
        const int = array[i];
        if (int < 16) b64.push('0');
        b64.push(int.toString(16));
    }
    return b64.join('');
}