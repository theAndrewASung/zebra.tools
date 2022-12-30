import { ZplCommandTemplate } from './command-template';
import { Alphanumeric, AlphanumericOfLength, IntegerBetween, OneOf, ZplParameterTypeBooleanValue } from './param-types';

type DriveLocation = 'R'|'E'|'B'|'A';
type FieldOrientation = 'N'|'R'|'I'|'B';

// Common Parameter Types
const YesOrNo           = new ZplParameterTypeBooleanValue('Y', 'N');
const FieldOrientations = OneOf<FieldOrientation>('N','R','I','B');
const DriveLocations    = OneOf<DriveLocation>('R','E','B','A');

// A Class Commands (Fonts)
export const ZplScalableFont = new ZplCommandTemplate<{
	f: string,
	o?: FieldOrientation,
	h?: number,
	w?: number,
}>('^Afo,h,w', {
	f : { type : AlphanumericOfLength(1),   description : 'font name' },
	o : { type : FieldOrientations,         description : 'field orientation' },
	h : { type : IntegerBetween(10, 32000), description : 'Character Height (in dots)' },
	w : { type : IntegerBetween(10, 32000), description : 'width (in dots)' },
});
export const ZplBitmappedFont = new ZplCommandTemplate<{
	f: string,
	o?: FieldOrientation,
	h?: number,
	w?: number,
}>('^Afo,h,w', {
	f : { type : AlphanumericOfLength(1), description : 'font name' },
	o : { type : FieldOrientations,       description : 'field orientation' },
	h : { type : IntegerBetween(1, 10),   description : 'Character Height (in dots)' },
	w : { type : IntegerBetween(1, 10),   description : 'width (in dots)' },
});
export const ZplUseFontNameToCallFont = new ZplCommandTemplate<{
	o?: FieldOrientation,
	h?: number,
	w?: number,
	d?: DriveLocation,
	f?: string,
	x: 'FNT' | 'TTF' | 'TTE',
}>('^A@o,h,w,d:f.x', {
	o : { type : FieldOrientations,         description : 'field orientation' },
	h : { type : IntegerBetween(10, 32000), description : 'Character Height (in dots)' },
	w : { type : IntegerBetween(10, 32000), description : 'width (in dots)' },
	d : { type : DriveLocations,            description : 'drive location of font' },
	f : { type : 'string',                  description : 'font name' },
	x : { type : OneOf('FNT','TTF','TTE'),  description : 'extension' },
});

// B Class Commands (Barcodes)
export const ZplCode128BarCode = new ZplCommandTemplate<{
	o? : FieldOrientation,
	h? : number,
	f? : boolean,
	g? : boolean,
	e? : boolean,
	m? : 'N' | 'U' | 'A' | 'D',
}>('^BCo,h,f,g,e,m', {
	o : { type : FieldOrientations,        description : 'orientation' },
	h : { type : IntegerBetween(1, 32000), description : 'bar code height (in dots)' },
	f : { type : YesOrNo,                  description : 'print interpretation line' },
	g : { type : YesOrNo,                  description : 'print interpretation line above code' },
	e : { type : YesOrNo,                  description : 'UCC check digit' },
	m : { type : OneOf('N','U','A','D'),   description : 'mode' },
});
export const ZplQRCodeBarCode = new ZplCommandTemplate<{
	a? : 'N',
	b? : number,
	c? : number,
	d? : 'H' | 'Q' | 'M' | 'L',
	e? : number,
}>('^BQa,b,c,d,e', {
	a : { type : OneOf('N'),             description : 'field orientation' },
	b : { type : IntegerBetween(1, 2),   description : 'model' },
	c : { type : IntegerBetween(1, 10),  description : 'magnification factor' },
	d : { type : OneOf('H','Q','M','L'), description : 'error correction' },
	e : { type : IntegerBetween(0, 7),   description : 'mask value' },
});
export const ZplBarCodeFieldDefault = new ZplCommandTemplate<{
	w?: number,
	r?: number,
	h?: number,
}>('^BYw,r,h', {
	w : { type : IntegerBetween(1, 10),     description : 'module width (in dots)' },
	r : { type : IntegerBetween(2, 3),      description : 'wide bar to narrow bar width ratio' },
	h : { type : IntegerBetween(10, 32000), description : 'bar code height (in dots)' },
});

// D Class Commands (Download)
export const ZplDownloadObjects = new ZplCommandTemplate<{
	d: DriveLocation,
	f: string,
	b: 'A'|'B'|'C'|'P',
	x: 'B'|'E'|'G'|'P'|'T'|'X'|'NRD'|'PAC'|'C'|'F'|'H',
	t: number,
	w: number,
	data: Uint8Array,
}>('~DYd:f,b,x,t,w,data', {
	d    : { type : DriveLocations,            description : 'file location' },
	f    : { type : Alphanumeric(1,8),         description : 'file name' },
	b    : { type : OneOf('A', 'B', 'C', 'P'), description : 'format downloaded in data field' },
	x    : { type : OneOf('B','E','G','P','T','X','NRD','PAC','C','F','H'), description : 'extension' },
	t    : { type : IntegerBetween(0, 9999999), description : 'total number of bytes in file' },
	w    : { type : IntegerBetween(0, 9999999), description : 'total number of bytes per row (.GRF images only)' },
	data : { type : 'binary',                   description : 'data' },
});

// F Class Commands (Field)
export const ZplFieldBlock = new ZplCommandTemplate<{
	a: number,
	b: number,
	c: number,
	d: 'L'|'C'|'R'|'J',
	e: number,
}>('^FBa,b,c,d,e', {
  a : { type : IntegerBetween(0, 32000),    description : 'width of text block line (in dots)' },
  b : { type : IntegerBetween(1, 9999),     description : 'maximum number of lines in text block' },
  c : { type : IntegerBetween(-9999, 9999), description : 'add or delete space between lines (in dots)' },
  d : { type : OneOf('L','C','R','J'),      description : 'text justification' },
  e : { type : IntegerBetween(0, 9999),     description : 'hanging indent (in dots) of the second and remaining lines' },
});
export const ZplFieldData   = new ZplCommandTemplate<{ a: string }>('^FDa', {
	a : { type : 'string', description : 'data to be printed' },
});
export const ZplFieldOrigin = new ZplCommandTemplate<{
	x: number,
	y: number,
	z: number,
}>('^FOx,y,z', {
  x : { type : IntegerBetween(0, 32000), description : 'x-axis location (in dots)' },
  y : { type : IntegerBetween(0, 32000), description : 'y-axis location (in dots)' },
  z : { type : IntegerBetween(0, 2),     description : 'justification' },
});
export const ZplFieldParameter = new ZplCommandTemplate<{
	d: 'H' | 'V' | 'R',
	g: number,
}>('^FPd,g', {
  d : { type : OneOf('H','V','R'),      description : 'direction' },
  g : { type : IntegerBetween(0, 9999), description : 'additional inter-character gap (in dots)' },
});
export const ZplFieldReversePrint = new ZplCommandTemplate('^FR');
export const ZplFieldSeparator    = new ZplCommandTemplate('^FS');
export const ZplFieldVariable     = new ZplCommandTemplate<{ a: string }>('^FVa', {
	a : { type : 'string', description : 'variable field data to be printed' },
});
export const ZplFieldOrientation  = new ZplCommandTemplate<{
	r: FieldOrientation,
	z: number,
}>('^FWr,z', {
  r : { type : FieldOrientations,     description : 'rotate field' },
  z : { type : IntegerBetween(0, 2), description : 'justification' },
});
export const ZplComment = new ZplCommandTemplate<{ c: string }>('^FXc', {
	c : { type : 'string', description : 'non printing comment' },
});

// G Class Commands (Graphic)
export const ZplGraphicBox = new ZplCommandTemplate<{
	w: number,
	h: number,
	t: number,
	c: 'B'|'W',
	r: number,
}>('^GBw,h,t,c,r', {
  w : { type : IntegerBetween(1, 32000), description : 'box width (in dots)' },
  h : { type : IntegerBetween(1, 32000), description : 'box height (in dots)' },
  t : { type : IntegerBetween(1, 32000), description : 'border thickness (in dots)' },
  c : { type : OneOf('B','W'),           description : 'line color' },
  r : { type : IntegerBetween(0, 8),     description : 'degree of corner-rounding' },
});
export const ZplGraphicCircle = new ZplCommandTemplate<{
	d: number,
	t: number,
	c: 'B'|'W',
}>('^GCd,t,c', {
  d : { type : IntegerBetween(3, 4095), description : 'circle diameter (in dots)' },
  t : { type : IntegerBetween(2, 4095), description : 'border thickness (in dots)' },
  c : { type : OneOf('B','W'),          description : 'line color' },
});
export const ZplGraphicDiagonalLine = new ZplCommandTemplate<{
	w: number,
	h: number,
	t: number,
	c: 'B'|'W',
	o: 'R'|'L',
}>('^GDw,h,t,c,o', {
  w : { type : IntegerBetween(3, 32000), description : 'box width (in dots)' },
  h : { type : IntegerBetween(3, 32000), description : 'box height (in dots)' },
  t : { type : IntegerBetween(1, 32000), description : 'border thickness (in dots)' },
  c : { type : OneOf('B','W'),           description : 'line color' },
  o : { type : OneOf('R','L'),           description : 'orientation (direction of the diagonal)' },
});
export const ZplGraphicEllipse = new ZplCommandTemplate<{
	w: number,
	h: number,
	t: number,
	c: 'B'|'W',
}>('^GEw,h,t,c', {
  w : { type : IntegerBetween(3, 4095), description : 'ellipse width (in dots)' },
  h : { type : IntegerBetween(3, 4095), description : 'ellipse height (in dots)' },
  t : { type : IntegerBetween(2, 4095), description : 'border thickness (in dots)' },
  c : { type : OneOf('B','W'),          description : 'line color' },
});

// I Class Commands (Image)
export const ZplObjectDelete = new ZplCommandTemplate<{
	d?: DriveLocation,
	o?: string,
	x?: string,
}>('^IDd:o.x', {
	d : { type : DriveLocations,    description : 'location of stored object' },
	o : { type : Alphanumeric(1,8), description : 'object name' },
	x : { type : 'string',          description : 'extension' },
});
export const ZplImageLoad = new ZplCommandTemplate<{
	d?: DriveLocation,
	o?: string,
	x?: 'GRF'|'PNG',
}>('^ILd:o.x', {
	d : { type : DriveLocations,     description : 'location of stored object' },
	o : { type : Alphanumeric(1,8),  description : 'object name' },
	x : { type : OneOf('GRF','PNG'), description : 'extension' },
});
export const ZplImageMove = new ZplCommandTemplate<{
	d?: DriveLocation,
	o?: string,
	x?: 'GRF'|'PNG',
}>('^IMd:o.x', {
	d : { type : DriveLocations,     description : 'location of stored object' },
	o : { type : Alphanumeric(1,8),  description : 'object name' },
	x : { type : OneOf('GRF','PNG'), description : 'extension' },
});
export const ZplImageSave = new ZplCommandTemplate<{
	d?: DriveLocation,
	o?: string,
	x?: 'GRF'|'PNG',
	p?: boolean,
}>('^ISd:o.x,p', {
	d : { type : DriveLocations,     description : 'location of stored object' },
	o : { type : Alphanumeric(1,8),  description : 'object name' },
	x : { type : OneOf('GRF','PNG'), description : 'extension' },
	p : { type : YesOrNo,            description : 'print image after storing' },
});

// L Class Commands (Label)
export const ZplListFontLinks = new ZplCommandTemplate('^LF');
export const ZplLabelHome     = new ZplCommandTemplate<{
	x: number,
	y: number,
}>('^LHx,y', {
  x : { type : IntegerBetween(0, 32000), description : 'x-axis location (in dots)' },
  y : { type : IntegerBetween(0, 32000), description : 'y-axis location (in dots)' },
});
export const ZplLabelLength       = new ZplCommandTemplate<{ y: number }>('^LLy', {
	y : { type : IntegerBetween(1, 32000), description : 'y-axis location (in dots)' },
});
export const ZplLabelReversePrint = new ZplCommandTemplate<{ a: boolean }>('^LRa', {
	a : { type : YesOrNo, description : 'reverse print all fields' },
});
export const ZplLabelShift        = new ZplCommandTemplate<{ a: number }>('^LSa', {
	a : { type : IntegerBetween(-9999, 9999), description : 'shift left value (in dots)' },
});
export const ZplLabelTop          = new ZplCommandTemplate<{ x: number }>('^LTx', {
	x : { type : IntegerBetween(-120, 120),   description : 'label top (in dot rows)' },
});


// P Class Commands (Printing)
export const ZplSlewToHomePosition         = new ZplCommandTemplate('^PH'); // Also ~PH
export const ZplPrintingMirrorImageOfLabel = new ZplCommandTemplate<{ a: boolean }>('^PMa', {
	a : { type : YesOrNo, description : 'print mirror image of entire label' },
});
export const ZplPrintOrientation           = new ZplCommandTemplate<{ a: boolean }>('^POa', {
	a : { type : new ZplParameterTypeBooleanValue('N','I'), description : 'invert label 180 degrees'           },
});
export const ZplProgrammablePause = new ZplCommandTemplate('^PP'); // Also ~PP
export const ZplPrintQuantity     = new ZplCommandTemplate<{
	q: number,
	p: number,
	r: number,
	o: boolean,
	e: boolean,
}>('^PQq,p,r,o,e', {
	q : { type : IntegerBetween(1, 99999999),    description : 'total quantity of labels to print' },
  p : { type : IntegerBetween(0, 99999999),    description : 'pause and cut value (labels between pauses)' },
  r : { type : IntegerBetween(0, 99999999),    description : 'replicates of each serial number' },
  o : { type : YesOrNo, description : 'override pause count' },
  e : { type : YesOrNo, description : 'cut on error label (RFID void is an error label)' },
});
// TO-DO: solve typing issue for numeric + literal or alphanumeric types
// export const ZplPrintRate = new ZplCommandTemplate<{
// 	p: number | 'A' | 'B' | 'C' | 'D' | 'E',
// 	s: number | 'A' | 'B' | 'C' | 'D' | 'E',
// 	b: number | 'A' | 'B' | 'C' | 'D' | 'E',
// }>('^PRp,s,b', {
// 	p : { type : [IntegerBetween(1, 14), OneOf('A','B','C','D','E')],    description : 'print speed' },
// 	s : { type : [IntegerBetween(2, 14), OneOf('A','B','C','D','E')],    description : 'slew speed' },
// 	b : { type : [IntegerBetween(2, 14), OneOf('A','B','C','D','E')],    description : 'backfeed speed' },
// });
export const ZplPrintStart = new ZplCommandTemplate('~PS');

// W Class Commands
export const ZplPrintConfigurationLabel = new ZplCommandTemplate('~WC');
export const ZplPrintDirectoryLabel     = new ZplCommandTemplate<{
	d?: string,
	o?: string,
	x?: string,
}>('^WDd,o,x', {
	d : { type : OneOf('R','E','B','A','Z'),                  description : 'source device' },
	o : { type : [Alphanumeric(1,8), OneOf('*', '?')],        description : 'object name' },
	x : { type : OneOf('FNT','BAR','ZPL','GRF','CO','DAT','BAS','BAE','STO','PNG','TTF','TTE','*','?'), description : 'extension' },
});

// X Class Commands
export const ZplStartFormat  = new ZplCommandTemplate('^XA');
export const ZplRecallFormat = new ZplCommandTemplate<{
	d: DriveLocation,
	o: string,
	x: 'ZPL',
}>('^XFd:o.x', {
	d : { type : DriveLocations,    description : 'source device of stored image' },
	o : { type : Alphanumeric(1,8), description : 'name of stored image' },
	x : { type : OneOf('ZPL'),      description : 'extension' },
});
export const ZplRecallGraphic = new ZplCommandTemplate<{
	d: DriveLocation,
	o: string,
	x: 'GRF',
	mx: number,
	my: number,
}>('^XGd:o.x,mx,my', {
	d : {  type : DriveLocations,        description : 'source device of stored image' },
	o : {  type : Alphanumeric(1,8),     description : 'name of stored image' },
	x : {  type : OneOf('GRF'),          description : 'extension' },
	mx : { type : IntegerBetween(1, 10), description : 'magnification factor on the x-axis' },
	my : { type : IntegerBetween(1, 10), description : 'magnification factor on the y-axis' },
});
export const ZplEndFormat = new ZplCommandTemplate('^XZ');