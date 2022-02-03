import { ZplCommandSchema  } from './zebra-zpl-schema';
import { TypeAlphanumericString, TypeIntegerInRange, TypeOneOf } from './zebra-zpl-types';

// Common Parameter Types
const TypeYesNo = TypeOneOf('N', 'Y');
const TypeFieldOrientation = TypeOneOf('N','R','I','B');
const TypeDriveLocations   = TypeOneOf('R','E','B','A');

// A Class Commands (Fonts)
export const ZplScalableFont = new ZplCommandSchema('^A', [
	{ key : 'f', optional : false, type : TypeAlphanumericString(1, 1),  delimiter : '', description : 'font name' },
	{ key : 'o', optional : true,  type : TypeFieldOrientation,          description : 'field orientation' },
	{ key : 'h', optional : true,  type : TypeIntegerInRange(10, 32000), description : 'Character Height (in dots)' },
	{ key : 'w', optional : true,  type : TypeIntegerInRange(10, 32000), description : 'width (in dots)' },
]);
export const ZplBitmappedFont = new ZplCommandSchema('^A', [
	{ key : 'f', optional : false, type : TypeAlphanumericString(1, 1), delimiter : '', description : 'font name' },
	{ key : 'o', optional : true,  type : TypeFieldOrientation,        description : 'field orientation' },
	{ key : 'h', optional : true,  type : TypeIntegerInRange(1, 10),   description : 'Character Height (in dots)' },
	{ key : 'w', optional : true,  type : TypeIntegerInRange(1, 10),   description : 'width (in dots)' },
]);
export const ZplUseFontNameToCallFont = new ZplCommandSchema('^A@', [
	{ key : 'o', optional : false, type : TypeFieldOrientation,                description : 'field orientation' },
	{ key : 'h', optional : false, type : TypeIntegerInRange(10, 32000),       description : 'Character Height (in dots)' },
	{ key : 'w', optional : false, type : TypeIntegerInRange(10, 32000),       description : 'width (in dots)' },
	{ key : 'd', optional : false, type : TypeDriveLocations, delimiter : ':', description : 'drive location of font' },
	{ key : 'f', optional : false, type : 'string',           delimiter : '.', description : 'font name' },
	{ key : 'x', optional : false, type : TypeOneOf('FNT','TTF','TTE'),        description : 'extension' },
]);

// B Class Commands (Barcodes)
export const ZplCode128BarCode = new ZplCommandSchema('^BC', [
	{ key : 'o', optional : true, type : TypeFieldOrientation,         description : 'orientation' },
	{ key : 'h', optional : true, type : TypeIntegerInRange(1, 32000), description : 'bar code height (in dots)' },
	{ key : 'f', optional : true, type : TypeYesNo,                    description : 'print interpretation line' },
	{ key : 'g', optional : true, type : TypeYesNo,                    description : 'print interpretation line above code' },
	{ key : 'e', optional : true, type : TypeYesNo,                    description : 'UCC check digit' },
	{ key : 'm', optional : true, type : TypeOneOf('N','U','A','D'),   description : 'mode' },
]);
export const ZplQRCodeBarCode = new ZplCommandSchema('^BQ', [
	{ key : 'a', optional : true, type : TypeOneOf(''),              description : 'field orientation' },
	{ key : 'b', optional : true, type : TypeIntegerInRange(1, 2),   description : 'model' },
	{ key : 'c', optional : true, type : TypeIntegerInRange(1, 10),  description : 'magnification factor' },
	{ key : 'd', optional : true, type : TypeOneOf('H','Q','M','L'), description : 'error correction' },
	{ key : 'e', optional : true, type : TypeIntegerInRange(0, 7),   description : 'mask value' },
]);
export const ZplBarCodeFieldDefault = new ZplCommandSchema('^BY', [
	{ key : 'w', optional : true, type : TypeIntegerInRange(1, 10),     description : 'module width (in dots)' },
	{ key : 'r', optional : true, type : TypeIntegerInRange(2, 3),      description : 'wide bar to narrow bar width ratio' },
	{ key : 'h', optional : true, type : TypeIntegerInRange(10, 32000), description : 'wide bar to narrow bar width ratio' },
]);

// D Class Commands (Download)
export const ZplDownloadObjects = new ZplCommandSchema('~DY', [
	{ key : 'd',    optional : false, type : TypeDriveLocations,            delimiter : ':', description : 'file location' },
	{ key : 'f',    optional : false, type : TypeAlphanumericString(1,8),   description : 'file name' },
	{ key : 'b',    optional : false, type : TypeOneOf('A', 'B', 'C', 'P'), description : 'format downloaded in data field' },
	{ key : 'x',    optional : false, type : TypeOneOf('B','E','G','P','T','X','NRD','PAC','C','F','H'), description : 'extension' },
	{ key : 't',    optional : false, type : TypeIntegerInRange(0, 9999999), description : 'total number of bytes in file' },
	{ key : 'w',    optional : false, type : TypeIntegerInRange(0, 9999999), description : 'total number of bytes per row (.GRF images only)' },
	{ key : 'data', optional : false, type : 'binary',                       description : 'data' },
]);

// F Class Commands (Field)
export const ZplFieldBlock = new ZplCommandSchema('^FB', [
    { key : 'a', optional : false, type : TypeIntegerInRange(0, 32000),    description : 'width of text block line (in dots)' },
    { key : 'b', optional : false, type : TypeIntegerInRange(1, 9999),     description : 'maximum number of lines in text block' },
    { key : 'c', optional : false, type : TypeIntegerInRange(-9999, 9999), description : 'add or delete space between lines (in dots)' },
    { key : 'd', optional : false, type : TypeOneOf('L','C','R','J'),      description : 'text justification' },
    { key : 'e', optional : false, type : TypeIntegerInRange(0, 9999),     description : 'hanging indent (in dots) of the second and remaining lines' },
]);
export const ZplFieldData   = new ZplCommandSchema('^FD', [ { key : 'a', optional : false, type : 'string', description : 'data to be printed' } ]);
export const ZplFieldOrigin = new ZplCommandSchema('^FO', [
    { key : 'x', optional : false, type : TypeIntegerInRange(0, 32000), description : 'x-axis location (in dots)' },
    { key : 'y', optional : false, type : TypeIntegerInRange(0, 32000), description : 'y-axis location (in dots)' },
    { key : 'z', optional : false, type : TypeIntegerInRange(0, 2),     description : 'justification' },
]);
export const ZplFieldParameter = new ZplCommandSchema('^FP', [
    { key : 'd', optional : false, type : TypeOneOf('H','V','R'),      description : 'direction' },
    { key : 'g', optional : false, type : TypeIntegerInRange(0, 9999), description : 'additional inter-character gap (in dots)' },
]);
export const ZplFieldReversePrint = new ZplCommandSchema('^FR');
export const ZplFieldSeparator    = new ZplCommandSchema('^FS');
export const ZplFieldVariable     = new ZplCommandSchema('^FV', [ { key : 'a', optional : false, type : 'string', description : 'variable field data to be printed' } ]);
export const ZplFieldOrientation  = new ZplCommandSchema('^FW', [
    { key : 'r', optional : false, type : TypeFieldOrientation,     description : 'rotate field' },
    { key : 'z', optional : false, type : TypeIntegerInRange(0, 2), description : 'justification' },
]);
export const ZplComment = new ZplCommandSchema('^FX', [ { key : 'c', optional : false, type : 'string', description : 'non printing comment' } ]);

// G Class Commands (Graphic)
export const ZplGraphicBox = new ZplCommandSchema('^GB', [
    { key : 'w', optional : false, type : TypeIntegerInRange(1, 32000), description : 'box width (in dots)' },
    { key : 'h', optional : false, type : TypeIntegerInRange(1, 32000), description : 'box height (in dots)' },
    { key : 't', optional : false, type : TypeIntegerInRange(1, 32000), description : 'border thickness (in dots)' },
    { key : 'c', optional : false, type : TypeOneOf('B','W'),           description : 'line color' },
    { key : 'r', optional : false, type : TypeIntegerInRange(0, 8),     description : 'degree of corner-rounding' },
]);
export const ZplGraphicCircle = new ZplCommandSchema('^GC', [
    { key : 'd', optional : false, type : TypeIntegerInRange(3, 4095), description : 'circle diameter (in dots)' },
    { key : 't', optional : false, type : TypeIntegerInRange(2, 4095), description : 'border thickness (in dots)' },
    { key : 'c', optional : false, type : TypeOneOf('B','W'),          description : 'line color' },
]);
export const ZplGraphicDiagonalLine = new ZplCommandSchema('^GD', [
    { key : 'w', optional : false, type : TypeIntegerInRange(3, 32000), description : 'box width (in dots)' },
    { key : 'h', optional : false, type : TypeIntegerInRange(3, 32000), description : 'box height (in dots)' },
    { key : 't', optional : false, type : TypeIntegerInRange(1, 32000), description : 'border thickness (in dots)' },
    { key : 'c', optional : false, type : TypeOneOf('B','W'),           description : 'line color' },
    { key : 'o', optional : false, type : TypeOneOf('R','L'),           description : 'orientation (direction of the diagonal)' },
]);
export const ZplGraphicEllipse = new ZplCommandSchema('^GE', [
    { key : 'w', optional : false, type : TypeIntegerInRange(3, 4095), description : 'ellipse width (in dots)' },
    { key : 'h', optional : false, type : TypeIntegerInRange(3, 4095), description : 'ellipse height (in dots)' },
    { key : 't', optional : false, type : TypeIntegerInRange(2, 4095), description : 'border thickness (in dots)' },
    { key : 'c', optional : false, type : TypeOneOf('B','W'),          description : 'line color' },
]);

// I Class Commands (Image)
export const ZplObjectDelete = new ZplCommandSchema('^ID', [
	{ key : 'd', optional : true, type : TypeDriveLocations,          delimiter : ':', description : 'location of stored object' },
	{ key : 'o', optional : true, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'object name' },
	{ key : 'x', optional : true, type : 'string', description : 'extension' },
]);
export const ZplImageLoad = new ZplCommandSchema('^IL', [
	{ key : 'd', optional : true, type : TypeDriveLocations,          delimiter : ':', description : 'location of stored object' },
	{ key : 'o', optional : true, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'object name' },
	{ key : 'x', optional : true, type : TypeOneOf('GRF','PNG'), description : 'extension' },
]);
export const ZplImageMove = new ZplCommandSchema('^IM', [
	{ key : 'd', optional : true, type : TypeDriveLocations,          delimiter : ':', description : 'location of stored object' },
	{ key : 'o', optional : true, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'object name' },
	{ key : 'x', optional : true, type : TypeOneOf('GRF','PNG'), description : 'extension' },
]);
export const ZplImageSave = new ZplCommandSchema('^IS', [
	{ key : 'd', optional : true, type : TypeDriveLocations,          delimiter : ':', description : 'location of stored object' },
	{ key : 'o', optional : true, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'object name' },
	{ key : 'x', optional : true, type : TypeOneOf('GRF','PNG'), description : 'extension' },
	{ key : 'p', optional : true, type : TypeYesNo,              description : 'print image after storing' },
]);

// L Class Commands (Label)
export const ZplListFontLinks = new ZplCommandSchema('^LF');
export const ZplLabelHome     = new ZplCommandSchema('^LH', [
    { key : 'x', optional : false, type : TypeIntegerInRange(0, 32000), description : 'x-axis location (in dots)' },
    { key : 'y', optional : false, type : TypeIntegerInRange(0, 32000), description : 'y-axis location (in dots)' },
]);
export const ZplLabelLength       = new ZplCommandSchema('^LL', [ { key : 'y', optional : false, type : TypeIntegerInRange(1, 32000), description : 'y-axis location (in dots)' } ]);
export const ZplLabelReversePrint = new ZplCommandSchema('^LR', [ { key : 'a', optional : false, type : TypeYesNo, description : 'reverse print all fields' } ]);
export const ZplLabelShift        = new ZplCommandSchema('^LS', [ { key : 'a', optional : false, type : TypeIntegerInRange(-9999, 9999), description : 'shift left value (in dots)' } ]);
export const ZplLabelTop          = new ZplCommandSchema('^LT', [ { key : 'x', optional : false, type : TypeIntegerInRange(-120, 120),   description : 'label top (in dot rows)' } ]);


// P Class Commands (Printing)
export const ZplSlewToHomePosition         = new ZplCommandSchema('^PH'); // Also ~PH
export const ZplPrintingMirrorImageOfLabel = new ZplCommandSchema('^PM', [ { key : 'a', optional : false, type : TypeYesNo,          description : 'print mirror image of entire label' } ]);
export const ZplPrintOrientation           = new ZplCommandSchema('^PO', [ { key : 'a', optional : false, type : TypeOneOf('N','I'), description : 'invert label 180 degrees'           } ]);
export const ZplProgrammablePause          = new ZplCommandSchema('^PP'); // Also ~PP
export const ZplPrintQuantity              = new ZplCommandSchema('^PQ', [
	{ key : 'q', optional : false, type : TypeIntegerInRange(1, 99999999),    description : 'total quantity of labels to print' },
    { key : 'p', optional : false, type : TypeIntegerInRange(0, 99999999),    description : 'pause and cut value (labels between pauses)' },
    { key : 'r', optional : false, type : TypeIntegerInRange(0, 99999999),    description : 'replicates of each serial number' },
    { key : 'o', optional : false, type : TypeYesNo, description : 'override pause count' },
    { key : 'e', optional : false, type : TypeYesNo, description : 'cut on error label (RFID void is an error label)' },
]);
export const ZplPrintRate = new ZplCommandSchema('^PR', [
	{ key : 'p', optional : false, type : [TypeIntegerInRange(1, 14), TypeOneOf('A','B','C','D','E')],    description : 'print speed' },
	{ key : 's', optional : false, type : [TypeIntegerInRange(2, 14), TypeOneOf('A','B','C','D','E')],    description : 'slew speed' },
	{ key : 'b', optional : false, type : [TypeIntegerInRange(2, 14), TypeOneOf('A','B','C','D','E')],    description : 'backfeed speed' },
]);
export const ZplPrintStart = new ZplCommandSchema('~PS');

// W Class Commands
export const ZplPrintConfigurationLabel = new ZplCommandSchema('~WC');
export const ZplPrintDirectoryLabel     = new ZplCommandSchema('^WD', [
	{ key : 'd', optional : true, type : TypeOneOf('R','E','B','A','Z'), delimiter : ':', description : 'source device' },
	{ key : 'o', optional : true, type : [TypeAlphanumericString(1,8), TypeOneOf('*', '?')], delimiter : '.', description : 'object name' },
	{ key : 'x', optional : true, type : TypeOneOf('FNT','BAR','ZPL','GRF','CO','DAT','BAS','BAE','STO','PNG','TTF','TTE','*','?'), description : 'extension' },
]);

// X Class Commands
export const ZplStartFormat  = new ZplCommandSchema('^XA');
export const ZplRecallFormat = new ZplCommandSchema('^XF', [
	{ key : 'd', optional : false, type : TypeDriveLocations,          delimiter : ':', description : 'source device of stored image' },
	{ key : 'o', optional : false, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'name of stored image' },
	{ key : 'x', optional : false, type : TypeOneOf('ZPL'), description : 'extension' },
]);
export const ZplRecallGraphic = new ZplCommandSchema('^XG', [
	{ key : 'd',  optional : false, type : TypeDriveLocations,          delimiter : ':', description : 'source device of stored image' },
	{ key : 'o',  optional : false, type : TypeAlphanumericString(1,8), delimiter : '.', description : 'name of stored image' },
	{ key : 'x',  optional : false, type : TypeOneOf('GRF'), description : 'extension' },
	{ key : 'mx', optional : false, type : TypeIntegerInRange(1, 10), description : 'magnification factor on the x-axis' },
	{ key : 'my', optional : false, type : TypeIntegerInRange(1, 10), description : 'magnification factor on the y-axis' },
]);
export const ZplEndFormat    = new ZplCommandSchema('^XZ');