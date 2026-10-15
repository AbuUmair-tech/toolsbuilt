const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const root = path.resolve(__dirname, '..');
  const imgDir = path.join(root, 'src', 'assets', 'img');

  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }

  const faviconSvg = fs.readFileSync(path.join(root, 'assets', 'img', 'favicon.svg'));
  const ogSvg = fs.readFileSync(path.join(root, 'assets', 'img', 'og-image.svg'));

  console.log('Generating 1200x630 og-image.png...');
  await sharp(ogSvg)
    .resize(1200, 630)
    .png()
    .toFile(path.join(imgDir, 'og-image.png'));

  console.log('Generating 180x180 apple-touch-icon.png...');
  await sharp(faviconSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(imgDir, 'apple-touch-icon.png'));

  console.log('Generating 192x192 icon-192.png...');
  await sharp(faviconSvg)
    .resize(192, 192)
    .png()
    .toFile(path.join(imgDir, 'icon-192.png'));

  console.log('Generating 512x512 icon-512.png...');
  await sharp(faviconSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(imgDir, 'icon-512.png'));

  console.log('Generating 32x32 favicon.ico...');
  const png32 = await sharp(faviconSvg)
    .resize(32, 32)
    .png()
    .toBuffer();

  // Build standard ICO format wrapping 32x32 PNG
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: Icon
  icoHeader.writeUInt16LE(1, 4); // Count: 1 image

  const icoDirEntry = Buffer.alloc(16);
  icoDirEntry.writeUInt8(32, 0); // Width
  icoDirEntry.writeUInt8(32, 1); // Height
  icoDirEntry.writeUInt8(0, 2);  // Color count
  icoDirEntry.writeUInt8(0, 3);  // Reserved
  icoDirEntry.writeUInt16LE(1, 4); // Color planes
  icoDirEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoDirEntry.writeUInt32LE(png32.length, 8); // Image size in bytes
  icoDirEntry.writeUInt32LE(22, 12); // Image offset (6 + 16)

  const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, png32]);
  fs.writeFileSync(path.join(imgDir, 'favicon.ico'), icoBuffer);

  console.log('All image assets generated successfully!');
}

generate().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
