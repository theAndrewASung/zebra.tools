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

    // Graphics
    ZplGraphicBox,
    ZplGraphicDiagonalLine,
    ZplGraphicCircle,
    ZplGraphicEllipse,
} from './zebra-zpl-commands';

type orientation = 'normal'|'top-down'|'upside-down'|'bottom-up';
const OrientationFromHumanReadable : { [key : string] : string } =
{
    'normal'      : 'N',
    'top-down'    : 'R',
    'upside-down' : 'I',
    'bottom-up'   : 'B',
};
const ColorFromHumanReadable : { [key : string] : string } =
{
    'black' : 'B',
    'white' : 'W',    
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
     * Adds a line to this label. Does the logic to determine whether the line is
     * vertical, diagonal, or horizontal
     * 
     * @param x1 - starting x-axis location (distance from left)
     * @param y1 - starting y-axis location (distance from top)
     * @param x2 - starting x-axis location (distance from left)
     * @param y2 - starting y-axis location (distance from top)
     * @param options.color     - color of the line
     * @param options.thickness - thickness of the line
     * 
     * @returns this ZPLLabel object, for chaining
     */
    line(x1 : number, y1 : number, x2 : number, y2 : number, options : {
        color?     : string;
        thickness? : number;
    } = {}) {
        const thickness = options.thickness || 1;
        const color     = ColorFromHumanReadable[options.color] || 'B';

        const zpl = [];
        zpl.push(ZplFieldOrigin.apply(this.toDots(Math.min(x1, x2)), this.toDots(Math.min(y1, y2)), 0)); // align from left for ease

        if (x1 === x2 || y1 === y2) { // vertical or horizontal lines
            zpl.push(ZplGraphicBox.apply(this.toDots(x2 - x1), this.toDots(y2 - y1), thickness, color, 0));
        }
        else { // diagonal lines
            const width  : number = x2 - x1;
            const height : number = y2 - y1;
            
            const orientation = (width < 0 && height < 0 || width > 0 && height > 0) ? 'L' : 'R';

            zpl.push(ZplGraphicDiagonalLine.apply(this.toDots(Math.abs(width)), this.toDots(Math.abs(height)), thickness, color, orientation));
        }

        zpl.push(ZplFieldSeparator.apply());

        this.commands.push(zpl.join(''));
        return this;
    }

    /**
     * Adds a box to this label.
     * 
     * @param x - x-axis location (distance from left)
     * @param y - y-axis location (distance from top)
     * @param width - width of the box
     * @param height - height of the box
     * @param options.borderThickness - thickness of the border
     * @param options.borderRadius - rounds the corners
     * 
     * @returns this ZPLLabel object, for chaining
     */
    box(x : number, y : number, width : number, height : number, options? : {
        borderThickness? : number,
        borderRadius?    : number;
    }) {
        let { borderThickness, borderRadius } = options || {};
        borderThickness = borderThickness || 1;
        borderRadius    = borderRadius || 0;

        const zpl = [];
        zpl.push(ZplFieldOrigin.apply(this.toDots(x), this.toDots(y), 0)); // align from left for ease
        zpl.push(ZplGraphicBox.apply(this.toDots(width), this.toDots(height), borderThickness, 'B', borderRadius));
        zpl.push(ZplFieldSeparator.apply());

        this.commands.push(zpl.join(''));
        return this;
    }

    /**
     * Adds a ellipse to this label.
     * 
     * @param x - x-axis location (center or distance from left, depending on options.positioning)
     * @param y - y-axis location (center or distance from top, depending on options.positioning)
     * @param width - width of the ellipse
     * @param height - height of the ellipse
     * @param options.positioning - how to position the ellipse
     * @param options.borderThickness - thickness of the border
     * 
     * @returns this ZPLLabel object, for chaining
     */
    ellipse(x : number, y : number, width : number, height : number, options? : {
        positioning?     : 'center'|'top-left',
        borderThickness? : number,
    }) {
        let { positioning, borderThickness } = options || {};
        borderThickness = borderThickness || 1;

        const left = x + (positioning === 'top-left' ? 0 : -(width  / 2));
        const top  = y + (positioning === 'top-left' ? 0 : -(height / 2));

        const zpl = [];
        zpl.push(ZplFieldOrigin.apply(this.toDots(left), this.toDots(top), 0)); // align from left for ease

        if (width === height) {
            zpl.push(ZplGraphicCircle.apply(this.toDots(width), borderThickness, 'B'));
        }
        else {
            zpl.push(ZplGraphicEllipse.apply(this.toDots(width), this.toDots(height), borderThickness, 'B'));
        }
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