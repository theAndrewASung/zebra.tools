const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const [,, inpath, outpath] = process.argv;

const PX_PER_INCHES = 200;
const LABEL_WIDTH  = (2.25 * PX_PER_INCHES);
const LABEL_HEIGHT = (1.25 * PX_PER_INCHES);
const LABEL_RATIO  = (LABEL_WIDTH / LABEL_HEIGHT);

(async function() {
    if (!fs.existsSync(inpath)) throw new Error(`Invalid inpath argument: ${inpath}`)
    
    let outfile = outpath
    if (!outfile) {
        const extname = path.extname(inpath)
        outfile = inpath.replace(extname, '.png')
    }

    let   image = await sharp(inpath)
    const meta  = await image.metadata()

    console.log(inpath, meta.width, meta.height)
    
    let imageWidth  = meta.width
    let imageHeight = meta.height
    let imageRatio  = imageWidth / imageHeight
    
    // Rotate
    if (imageWidth < imageHeight) {
        image = image.rotate(90);
        imageWidth  = meta.height
        imageHeight = meta.width
        imageRatio  = imageWidth / imageHeight
    }

    // Resize
    const overflowingWidth  = imageWidth > LABEL_WIDTH
    const overflowingHeight = imageHeight > LABEL_HEIGHT

    let resizeRatio = 1;
    if (overflowingWidth && overflowingHeight) {
        if (imageRatio < LABEL_RATIO) {
            resizeRatio = LABEL_WIDTH / imageWidth
        }
        else {
            resizeRatio = LABEL_HEIGHT / imageHeight
        }
    }
    else if (overflowingWidth) {
        resizeRatio = LABEL_WIDTH / imageWidth
    }
    else if (overflowingHeight) {
        resizeRatio = LABEL_HEIGHT / imageHeight
    }

    if (resizeRatio !== 1) {
        const resizedWidth  = imageWidth  * resizeRatio
        const resizedHeight = imageHeight * resizeRatio
        console.log(`Resizing to ${resizedWidth} x ${resizedHeight}...`)
        image = image.resize(resizedWidth, resizedHeight);
    }

    console.log(`Encoding as PNG...`)
    await image.png().toFile(outfile)
    console.log(`Outputted as ${outfile}`)
})();