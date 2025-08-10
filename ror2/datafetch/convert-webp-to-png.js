// convert-webp-to-png.js
// Usage: node convert-webp-to-png.js items/common

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertFolder(folderPath) {
  const files = await fs.promises.readdir(folderPath);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.webp') {
      const webpPath = path.join(folderPath, file);
      const pngPath = path.join(
        folderPath,
        path.basename(file, ext) + '.png'
      );

      try {
        console.log(`Converting ${file} -> ${path.basename(pngPath)}`);
        await sharp(webpPath).png().toFile(pngPath);
      } catch (err) {
        console.error(`Error converting ${file}:`, err);
      }
    }
  }
}

const targetFolder = process.argv[2];
if (!targetFolder) {
  console.error('Usage: node convert-webp-to-png.js <folderPath>');
  process.exit(1);
}

convertFolder(targetFolder)
  .then(() => console.log('Conversion complete.'))
  .catch(err => console.error('Error:', err));
