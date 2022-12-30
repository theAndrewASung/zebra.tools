import { QRErrorCorrectionLevel, QRDataInputMode, QRCodeSizesByVersion, getQRCodeVersion, getQRCodeDataInputMode } from './utils/utils-qr-code';
import { CSSPixelsToDots, inchesToDots } from './utils/utils-units';

import { ZplCommandSet } from './commands/command-set';
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
    ZplFieldReversePrint,
} from './commands';

const OrientationFromHumanReadable = {
    'normal'      : 'N',
    'top-down'    : 'R',
    'upside-down' : 'I',
    'bottom-up'   : 'B',
} as const;
const ColorFromHumanReadable = {
    'black' : 'B',
    'white' : 'W',    
} as const;

type orientation = keyof typeof OrientationFromHumanReadable;
type color       = keyof typeof ColorFromHumanReadable;

export class ZplLabel
{
    private _commandSet     : ZplCommandSet;
    private lastOrientation : void | string;

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
        this._commandSet = new ZplCommandSet();
        this._commandSet.runCommand(ZplStartFormat);

        const { unit, dpi } = options || {};
        if (unit && unit !== 'dots' && !dpi) throw new TypeError(`options.dpi is required to calculate unit ${unit}`);

        this.unit = unit;
        this.dpi  = dpi;
    }

    /**
     * Private helper to convert from the specific units to dots
     * 
     * @param x - a number
     * @returns - number in dots
     */
    private _toDots(x : number) : number {
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
        this._commandSet.runCommand(ZplComment, { c: comment });
        return this;
    }

    /**
     * Adds a text segment to this label.
     * 
     * @param x - x-axis location (distance from left)
     * @param y - y-axis location (distance from top)
     * @param text - text segment
     * @param options.orientation - which way to orient the text
     * @param options.invertColor - chooses opposite color of background
     * @param options.font        - name of a font or an object representing a font
     * 
     * @returns this ZPLLabel object, for chaining
     */
    text(x : number, y : number, text : string, options : {
        orientation? : orientation;
        invertColor? : boolean;
        font? : string | {
            name: string;
            width: number;
            height?: number;
        };
    } = {}) {
        const orientation = options.orientation ? OrientationFromHumanReadable[options.orientation] : 'N';
        const font = options.font;
        const invertColor = options.invertColor;

        this._commandSet.runCommand(ZplFieldOrigin, {
            x : this._toDots(x),
            y : this._toDots(y),
            z : 0 // align from left for ease
        });
        if (invertColor) this._commandSet.runCommand(ZplFieldReversePrint);
        if (font) {
            if (typeof font === 'string') {
                this._commandSet.runCommand(ZplScalableFont, { f : font, o : orientation });
            }
            else {
                this._commandSet.runCommand(ZplScalableFont, {
                    f : font.name,
                    o : orientation,
                    w : this._toDots(font.width),
                    h : this._toDots(font.height ?? font.width)
                });
            }
        }
        else if (this.lastOrientation !== orientation) {
            this._commandSet.runCommand(ZplFieldOrientation, { r : orientation, z: 0 });
            this.lastOrientation = orientation;
        }

        this._commandSet
            .runCommand(ZplFieldData, { a: text })
            .runCommand(ZplFieldSeparator)

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
     * @param options.color       - color of the line
     * @param options.invertColor - chooses opposite color of background
     * @param options.thickness   - thickness of the line
     * 
     * @returns this ZPLLabel object, for chaining
     */
    line(x1 : number, y1 : number, x2 : number, y2 : number, options : {
        color?       : color;
        invertColor? : boolean;
        thickness?   : number;
    } = {}) {
        const color       = options.color ? ColorFromHumanReadable[options.color] : 'B';
        const invertColor = options.invertColor;
        const thickness   = options.thickness || 1;

        this._commandSet.runCommand(ZplFieldOrigin, {
            x : this._toDots(Math.min(x1, x2)),
            y : this._toDots(Math.min(y1, y2)),
            z : 0 // align from left for ease
        });
        if (invertColor) this._commandSet.runCommand(ZplFieldReversePrint);

        if (x1 === x2 || y1 === y2) { // vertical or horizontal lines
            this._commandSet.runCommand(ZplGraphicBox, {
                w : this._toDots(x2 - x1),
                h : this._toDots(y2 - y1),
                t : thickness, 
                c : color,
                r : 0,
            });
        }
        else { // diagonal lines
            const width  : number = x2 - x1;
            const height : number = y2 - y1;
            
            const orientation = (width < 0 && height < 0 || width > 0 && height > 0) ? 'L' : 'R';

            this._commandSet.runCommand(ZplGraphicDiagonalLine, {
                w : this._toDots(Math.abs(width)),
                h : this._toDots(Math.abs(height)),
                t : thickness,
                c : color,
                o : orientation
            });
        }
        this._commandSet.runCommand(ZplFieldSeparator);
        return this;
    }

    /**
     * Adds a box to this label.
     * 
     * @param x - x-axis location (distance from left)
     * @param y - y-axis location (distance from top)
     * @param width - width of the box
     * @param height - height of the box
     * @param options.filled          - fills the box with a solid color
     * @param options.color           - box or border color
     * @param options.invertColor     - chooses opposite color of background
     * @param options.borderThickness - thickness of the border
     * @param options.borderRadius    - rounds the corners
     * 
     * @returns this ZPLLabel object, for chaining
     */
    box(x : number, y : number, width : number, height : number, options : {
        filled?          : boolean;
        color?           : color;
        invertColor?     : boolean;
        borderThickness? : number;
        borderRadius?    : number;
    } = {}) {
        const invertColor     = options.invertColor;
        const borderThickness = options.filled ? this._toDots(Math.min(width, height)) : (options.borderThickness || 1);
        const borderRadius    = options.borderRadius || 0;
        const borderColor     = options.color ? ColorFromHumanReadable[options.color] : 'B';
        
        this._commandSet.runCommand(ZplFieldOrigin, {
            x : this._toDots(x),
            y : this._toDots(y),
            z : 0, // align from left for ease
        });
        if (invertColor) this._commandSet.runCommand(ZplFieldReversePrint);
        this._commandSet
            .runCommand(ZplGraphicBox, {
                w : this._toDots(width),
                h : this._toDots(height),
                t : borderThickness,
                c : borderColor,
                r : borderRadius,
            })
            .runCommand(ZplFieldSeparator);
        return this;
    }

    /**
     * Adds a ellipse to this label.
     * 
     * @param x - x-axis location (center or distance from left, depending on options.positioning)
     * @param y - y-axis location (center or distance from top, depending on options.positioning)
     * @param width - width of the ellipse
     * @param height - height of the ellipse
     * @param options.filled          - fills the ellipse with a solid color
     * @param options.color           - ellipse or border color
     * @param options.invertColor     - chooses opposite color of background
     * @param options.positioning     - how to position the ellipse
     * @param options.borderThickness - thickness of the border
     * 
     * @returns this ZPLLabel object, for chaining
     */
    ellipse(x : number, y : number, width : number, height : number, options : {
        filled?          : boolean;
        color?           : color;
        invertColor?     : boolean;
        positioning?     : 'center'|'top-left',
        borderThickness? : number,
    } = {}) {
        const invertColor     = options.invertColor;
        const borderThickness = options.filled ? this._toDots(Math.min(width, height)) : (options.borderThickness || 1);
        const borderColor     = options.color ? ColorFromHumanReadable[options.color] : 'B';

        const centerAlign = (options.positioning !== 'top-left');
        const left = x + (centerAlign ? -(width  / 2) : 0);
        const top  = y + (centerAlign ? -(height / 2) : 0);

        this._commandSet.runCommand(ZplFieldOrigin, {
            x : this._toDots(left),
            y : this._toDots(top),
            z : 0 // align from left for ease
        });
        if (invertColor) this._commandSet.runCommand(ZplFieldReversePrint);
        if (width === height) {
            this._commandSet.runCommand(ZplGraphicCircle, {
                d : this._toDots(width), 
                t : borderThickness, 
                c : borderColor
            });
        }
        else {
            this._commandSet.runCommand(ZplGraphicEllipse, {
                w : this._toDots(width),
                h : this._toDots(height),
                t : borderThickness,
                c : borderColor
            });
        }
        this._commandSet.runCommand(ZplFieldSeparator);

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
        let fieldDataMode : string;
        let dataInputMode : QRDataInputMode | void = undefined;
        let size : number | void = undefined;
        if (autoMode) {
            fieldDataMode = 'A,';
        }
        else {
            ({ mode : dataInputMode, size } = getQRCodeDataInputMode(text));
            
            fieldDataMode = `M,${dataInputMode}${dataInputMode === 'B' ? `0000${size}`.slice(-4) : null }`;
        }

        // Calculation is based on magnification 10 having 3 pixels per 30dots >> 3 dots per pixel
        let magnification : number | undefined = undefined;
        if (dataInputMode && size && maxSize) {
            const version : number = getQRCodeVersion(dataInputMode, errorCorrectionLevel, size);
            const pixels  : number = QRCodeSizesByVersion[version] ?? 0;

            const widthInDots  = this._toDots(maxSize);
            const dotsPerPixel = widthInDots / (1.0 * pixels);

            magnification = Math.min(10, Math.floor(dotsPerPixel));
        }

        const Y_PADDING = 10; // Implicit whitespace margin above the QR Code
        this._commandSet
            .runCommand(ZplFieldOrigin, {
                x : this._toDots(x),
                y : this._toDots(y) - Y_PADDING,
                z : 0 // align from left for ease
            })
            .runCommand(ZplQRCodeBarCode, {
                b: 2,
                c: magnification,
                d: errorCorrectionLevel,
                e: maskValue
            })
            .runCommand(ZplFieldData, {
                a : `${errorCorrectionLevel}${fieldDataMode}${text}`,
            })
            .runCommand(ZplFieldSeparator);
        return this;
    }

    /**
     * Computes the command as a buffer.
     * 
     * @returns the ZPL label as a command
     */
     getCommandBuffer() : Uint8Array {
        const withEndFormat = new ZplCommandSet(this._commandSet);
        withEndFormat.runCommand(ZplEndFormat);
        return withEndFormat.getCommandBuffer();
    }

    /**
     * Computes the command as a string.
     * 
     * @returns the ZPL label as a command
     */
    getCommandString() : string {
        const withEndFormat = new ZplCommandSet(this._commandSet);
        withEndFormat.runCommand(ZplEndFormat);
        return withEndFormat.getCommandString();
    }
}