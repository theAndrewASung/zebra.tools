/**
 * Converts a string into an array.
 * 
 * @param string - string to convert
 * @returns - string as a buffer
 */
export function stringToUint8Array(string : string) : Uint8Array {
    const array: number[] = [];
    for (let i = 0, ilen = string.length; i < ilen; i++) {
        array.push(string.charCodeAt(i));
    }
    return new Uint8Array(array);
}

/**
 * Concatenates Uint8Arrays.
 * 
 * @param uint8arrays - accepts any number of Uint8Arrays as parameters
 * @returns a single concatenated Uint8Array
 */
export function concatUint8Arrays(...uint8arrays : Uint8Array[]) : Uint8Array {
    const size  = uint8arrays.reduce((last, arr) => last + arr.length, 0);
    const fullArray = new Uint8Array(size);

    let index = 0;
    uint8arrays.map(uint8array => {
        fullArray.set(uint8array, index);
        index += uint8array.length;
    });

    return fullArray;
}

/**
 * Converts an array into a string.
 * 
 * @param array - array to stringify
 * @returns - string
 */
 export function uint8ArrayToString(uint8array : Uint8Array) : string {
    return String.fromCharCode.apply(null, uint8array);
}

/**
 * Converts an array into a number.
 * 
 * @param array - array to make numeric
 * @returns - number
 */
 export function uint8ArrayToInteger(uint8array : Uint8Array) : number {
    const pow = uint8array.length - 1;
    return uint8array.reduce((prev, curr, index) => prev + (curr * Math.pow(256, pow - index)), 0);
}