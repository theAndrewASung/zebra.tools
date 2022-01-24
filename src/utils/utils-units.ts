/**
 * Converts from number of inches to dots based on DPI
 */
export function inchesToDots(inches : number, dpi : number) : number
{
    return inches * dpi;
}

/**
 * Converts from number of dots to inches based on DPI
 */
export function dotsToInches(dots : number, dpi : number) : number
{
    return dots / dpi;
}

/**
 * Converts from number of CSS pixels to dots based on DPI
 */
export function CSSPixelsToDots(pixels : number, dpi : number ) : number
{
    return pixels * dpi / 96;
}

/**
 * Converts from number of CSS pixels to dots based on DPI
 */
export function dotsToCSSPixels(dots : number, dpi : number ) : number
{
    return dots * 96 / dpi;
}