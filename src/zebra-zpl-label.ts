import { CSSPixelsToDots, inchesToDots } from './utils/utils-units';
import { QRErrorCorrectionLevel, QRDataInputMode, QRCodeSizesByVersion, getQRCodeVersion, getQRCodeDataInputMode } from './utils/utils-qr-code';

import {
    ZplStartFormat,
    ZplEndFormat,
    
    // Generic Fields
    ZplFieldOrientation,
    ZplFieldOrigin,
    ZplFieldData,
    ZplFieldSeparator,

    // Barcodes
    ZplQRCodeBarCode,
    
    // Fonts and Text
    ZplScalableFont,
    ZplComment,
} from './zebra-zpl-commands';

type orientation = 'normal'|'top-down'|'upside-down'|'bottom-up';
const OrientationFromHumanReadable =
{
    'normal'      : 'N',
    'top-down'    : 'R',
    'upside-down' : 'I',
    'bottom-up'   : 'B',
};

export class ZplLabel
{
    private commands : string[];
    private lastOrientation : string;

    private unit : void | string;
    private dpi  : void | number;
    
    /**
     * Object representation for a ZPL label for drawing labels in ZPL.
     * 
     * @param options.unit - unit used when specifying sizes (dots, inches, CSS pixels, defaults to dots)
     * @param options.dpi  - dots per inch, used to calculate internal dots measurements when options.unit is not set to dots
     */
    constructor(options? : {
        unit?   : 'in'|'px'|'dots';
        dpi?    : number;
        width?  : number;
        height? : number;
    }) {
        this.commands = [];
        this.lastOrientation = null;

        const { unit, dpi } = options || {};
        if (unit && unit !== 'dots' && !dpi) throw new TypeError(`options.dpi is required to calculate unit ${unit}`);

        this.unit = unit || null;
        this.dpi  = dpi  || null;
    }

    private toDots(x : number) : number {
        const dpi : number = this.dpi || 300;

        switch (this.unit) {
            case 'in':
                return inchesToDots(x, dpi);

            case 'px':
                return CSSPixelsToDots(x, dpi);
            
            case 'dots':
            default:
                return x;
        }
    }

    /**
     * Adds a comment to this label.
     * 
     * @param comment - comment string
     * @returns this ZPLLabel object, for chaining
     */
    comment(comment : string) {
        this.commands.push(ZplComment.apply(comment));
        return this;
    }

    /**
     * Adds a text segment to this label.
     * 
     * @param x - x-axis location (distance from left)
     * @param y - y-axis location (distance from top)
     * @param text - text segment
     * @param options.orientation - which way to orient the text
     * @param options.font - name of a font or an object representing a font
     * 
     * @returns this ZPLLabel object, for chaining
     */
    text(x : number, y : number, text : string, options? : {
        orientation? : orientation;
        font? : string | {
            name: string;
            width: number;
            height?: number;
        };
    }) {
        const { orientation, font } = options || {};
        const orientationCode = OrientationFromHumanReadable[orientation] || 'N';

        const zpl = [];
        zpl.push(ZplFieldOrigin.apply(this.toDots(x), this.toDots(y), 0)); // align from left for ease

        if (font) {
            if (typeof font === 'string') {
                zpl.push(ZplScalableFont.apply(font, orientationCode));
            }
            else {
                zpl.push(ZplScalableFont.apply(font.name, orientationCode, this.toDots(font.width), this.toDots(font.width || font.height)));
            }
        }
        else if (this.lastOrientation !== orientationCode) {
            zpl.push(ZplFieldOrientation.apply(orientationCode));
            this.lastOrientation = orientationCode;
        }

        zpl.push(ZplFieldData.apply(text));
        zpl.push(ZplFieldSeparator.apply());

        this.commands.push(zpl.join(''));
        return this;
    }

    /**
     * Adds a QR Code to this label.
     * 
     * @param x - x-axis location (distance from left)
     * @param y - y-axis location (distance from top)
     * @param text - text segment
     * @param options.maxSize - approximates the closest smallest magnification level to fit the provided size; only applies when autoMode is not true
     * @param options.autoMode - lets printer decide the data-mode
     * @param options.errorCorrectionLevel - level of error correction to apply on the code
     * @param options.maskValue - mask level
     * 
     * @returns this ZPLLabel object, for chaining
     */
    qrcode(x : number, y : number, text : string, options? : {
        maxSize?  : number,
        autoMode? : boolean;
        errorCorrectionLevel? : QRErrorCorrectionLevel;
        maskValue? : number;
    }) {
        let { maxSize, autoMode, errorCorrectionLevel, maskValue } = options || {};

        // Defaults
        errorCorrectionLevel = errorCorrectionLevel || 'Q';

        // Calculate data-input mode 
        let dataInputMode : QRDataInputMode, fieldDataMode : string, size : number;
        if (autoMode) {
            fieldDataMode = 'A,';
        }
        else {
            ({ mode : dataInputMode, size } = getQRCodeDataInputMode(text));
            
            fieldDataMode = `M,${dataInputMode}${dataInputMode === 'B' ? `0000${size}`.slice(-4) : null }`;
        }

        // Calculation is based on magnification 10 having 3 pixels per 30dots >> 3 dots per pixel
        let magnification : number;
        if (dataInputMode && size) {
            const version : number = getQRCodeVersion(dataInputMode, errorCorrectionLevel, size);
            const pixels  : number = QRCodeSizesByVersion[version];

            const widthInDots  = this.toDots(maxSize);
            const dotsPerPixel = widthInDots / (1.0 * pixels);

            magnification = Math.min(10, Math.floor(dotsPerPixel));
        }

        const Y_PADDING = 10; // Implicit whitespace margin above the QR Code
        const zpl = [];
        zpl.push(ZplFieldOrigin.apply(this.toDots(x), this.toDots(y) - Y_PADDING, 0)); // align from left for ease
        zpl.push(ZplQRCodeBarCode.apply('', 2, magnification, errorCorrectionLevel, maskValue));
        zpl.push(ZplFieldData.apply(`${errorCorrectionLevel}${fieldDataMode}${text}`));
        zpl.push(ZplFieldSeparator.apply());

        this.commands.push(zpl.join(''));
        return this;
    }

    /**
     * Computes the command as a string.
     * 
     * @returns the ZPL label as a command
     */
    toString()
    {
        return [
            ZplStartFormat.apply(),
            ...this.commands,
            ZplEndFormat.apply(),
        ].join('\n');
    }
}