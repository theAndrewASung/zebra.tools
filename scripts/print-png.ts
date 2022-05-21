import * as fs from 'fs';
import * as sharp from 'sharp';
import { ZplLabel } from "../src/zebra-zpl-label";
import { ZebraFTPClient } from "../src/zebra-node-ftp";
import { ZplEndFormat, ZplLabelLength, ZplStartFormat } from "../src/zebra-zpl-commands";
import { concatUint8Arrays, uint8ArrayToString } from "../src/utils/utils-buffers";
import { ZplPng } from "../src/zebra-node-zpl-png";

const ZEBRA_IP = '192.168.86.200';
const ZEBRA_DPI = 200;
const ZEBRA_WIDTH  = 2.25;
const ZEBRA_HEIGHT = 1.25;

(async function()
{
    const [,, imgPath] = process.argv;
    if (!imgPath) throw new Error(`Missing first argument (imgPath)`);
    if (!fs.existsSync(imgPath)) throw new Error(`Invalid imgPath argument: ${imgPath}`);
    
    const zebraFtpClient = new ZebraFTPClient({ logger : console.log });
    await zebraFtpClient.connect(ZEBRA_IP);
    
    // const label = new ZplLabel({ unit : 'in', dpi : 301, width : 1\ });

    // const buffer = concatUint8Arrays(ZplStartFormat.applyAsBuffer(), ZplLabelLength.applyAsBuffer(200 * 1.25), ZplEndFormat.applyAsBuffer());
    // console.log(uint8ArrayToString(buffer));

    // await zebraFtpClient.putData('^XA^LL250^FS^XZ');
    // await zebraFtpClient.putData('^XA^LL500^FS^XZ');
    // await zebraFtpClient.putData('^XA~JL^XZ');
    // return;
    
    // const FEED = () => zebraFtpClient.putData('^XA^FD ^XZ');
    // const autoLabelLength = () => zebraFtpClient.putData('^XA~JL^XZ');
    const setPrintWidth = (width : number, dpi : number) => zebraFtpClient.putData(`^XA^PW${width * dpi}^XZ`);
    // const setPrintRate  = (rate : number) => zebraFtpClient.putData(`^XA^PR${rate},,^XZ`);

    await setPrintWidth(ZEBRA_WIDTH, ZEBRA_DPI);
    // await setPrintRate(2);
    // await FEED();
    // await setPrintRate(5);
    // await FEED();

    // label.
    // const meta = await sharp(imgPath).metadata();

    const pngBuffer = await fitImageToLabel(imgPath, ZEBRA_DPI, ZEBRA_WIDTH, ZEBRA_HEIGHT);
    const png       = new ZplPng(pngBuffer);
    const importPng = await png.getImportBuffer();
    const drawPng   = png.drawBuffer;
    const deletePng = png.deleteBuffer;
    
    await zebraFtpClient.putData(importPng);

    await zebraFtpClient.putData(concatUint8Arrays(
        ZplStartFormat.applyAsBuffer(),
        drawPng,
        ZplEndFormat.applyAsBuffer(),
    ));
    
    await zebraFtpClient.putData(deletePng);
    // const label = new ZplLabel({ unit : 'in', dpi : ZEBRA_DPI, width : 2.25, height : 1.25 });
    // return [
    //     ZplStartFormat.applyAsString(),
    //     ...this.commandSets.map(zplCommandSet => zplCommandSet.toString()),
    //     ZplEndFormat.applyAsString(),
    // ].join('\n');

    await zebraFtpClient.disconnect();
})();

async function fitImageToLabel(imgPath : string, printerDpi : number, labelWidthIn : number, labelHeightIn : number) {
    const labelWidthPx  = labelWidthIn  * printerDpi;
    const labelHeightPx = labelHeightIn * printerDpi;
    const labelRatio = labelWidthPx / labelHeightPx;

    let image = sharp(imgPath);
    const meta  = await image.metadata();

    let imageWidthPx  = meta.width;
    let imageHeightPx = meta.height;
    let imageRatio  = imageWidthPx / imageHeightPx;
    
    // Rotate
    if (imageWidthPx < imageHeightPx) {
        console.log(`Rotate by 90 degrees`)
        image = image.rotate(90)

        imageWidthPx  = meta.height
        imageHeightPx = meta.width
        imageRatio  = imageWidthPx / imageHeightPx
    }

    // Resize
    const overflowingWidth  = imageWidthPx > labelWidthPx
    const overflowingHeight = imageHeightPx > labelHeightPx

    let resizeRatio = 1;
    if (overflowingWidth && overflowingHeight) {
        if (imageRatio < labelRatio) {
            resizeRatio = labelWidthPx / imageWidthPx
        }
        else {
            resizeRatio = labelHeightPx / imageHeightPx
        }
    }
    else if (overflowingWidth) {
        resizeRatio = labelWidthPx / imageWidthPx
    }
    else if (overflowingHeight) {
        resizeRatio = labelHeightPx / imageHeightPx
    }

    if (resizeRatio !== 1) {
        const resizedWidth  = imageWidthPx  * resizeRatio
        const resizedHeight = imageHeightPx * resizeRatio
        console.log(`Resize to ${resizedWidth} x ${resizedHeight}`)
        image = image.resize(resizedWidth, resizedHeight);
    }

    // Re-encode as PNG
    console.log(`Encode as PNG...`)
    return await image.png().toBuffer()
}