export const CRC_POLYNOMIALS = {
    CRC_32       : 0xEDB88320,
    CRC_16_CCITT : 0x8408,
};

/**
 * Peforms a bitwise AND for 32-bit unsigned integers by 
 * splitting into 2 AND operations and using a hex translaction
 * 
 * This is an easy way, that may be computationally expensive.
 * 
 * @param a - first unsigned integer
 * @param b - second unsigned integer
 * @returns - AND'd unsigned integer
 */
 function bitwiseUint32AND(a : number, b : number) : number {
    const firstHex = ((a >>> 4) & (b >>> 4)).toString(16);
    const lastHex  = ((a & 0xF) & (b & 0xF)).toString(16);
    return parseInt(firstHex + lastHex, 16);
}

/**
 * Peforms a bitwise XOR for 32-bit unsigned integers by 
 * splitting into 2 XOR operations and using a hex translaction
 * 
 * This is an easy way, that may be computationally expensive.
 * 
 * @param a - first unsigned integer
 * @param b - second unsigned integer
 * @returns - XOR'd unsigned integer
 */
function bitwiseUint32XOR(a : number, b : number) : number {
    const firstHex = ((a >>> 4) ^ (b >>> 4)).toString(16);
    const lastHex  = ((a & 0xF) ^ (b & 0xF)).toString(16);
    return parseInt(firstHex + lastHex, 16);
}

/**
 * Pre-computes a table of remainders for faster computation of CRCs
 * 
 * @param polynomial - defaults to 0xEDB88320 (for the CRC-32 algorithm)
 * @returns an array of 256 unsigned remainders for CRC computation
 */
export function computeCRCTable(polynomial : number = CRC_POLYNOMIALS.CRC_32) : Uint32Array  {
    const table = new Uint32Array(256);

    // Calculate based on table[i xor j] = table[i] xor table[j];
    let rem = 1;
    for (let i = 128; i > 0; i >>>= 1) {
        if (rem & 1) {
            rem = bitwiseUint32XOR(rem >>> 1, polynomial);
        }
        else {
            rem = rem >>> 1
        }

        for (let j = 0; j < 256; j += i * 2) {
            table[i + j] = bitwiseUint32XOR(rem, table[j]);
        }
    }

    /**
     * Calculate row by row
     * 
     * for (let i = 0; i < 256; i++) {
     *     let rem = i;
     *     for (let j = 0; j < 8; j++) {
     *         if (rem & 1) {
     *             rem = bitwiseUint32XOR((rem >>> 1), polynomial);
     *         }
     *         else {
     *             rem = (rem >>> 1);
     *         }
     *     }
     *     table[i] = rem;
     * }
     */

    return table;
}

/**
 * Computes a CRC for the input data based on a table of CRC remainders
 * 
 * @param buffer - data buffer to compute over 
 * @param crcTable - table to use for CRC computation (polynomial is specified during table creation)
 * @param bits - number of bits the CRC should be
 * @returns a unsigned CRC
 */
export function computeCRCFromTable(buffer : Uint8Array, crcTable : Uint32Array, bits : number = 32) : number {
    let crc = 0xFFFFFFFF;
    for (let i = 0, ilen = buffer.length; i < ilen; i++) {
        const byte   = buffer[i];
        const tindex = (crc & 0xFF) ^ byte;
        crc = bitwiseUint32XOR((crc >>> 8), crcTable[tindex]);
    }

    const bitMask = 0xFFFFFFFF >>> (32 - bits);
    return bitwiseUint32AND(bitwiseUint32XOR(crc, 0xFFFFFFFF), bitMask);
}
