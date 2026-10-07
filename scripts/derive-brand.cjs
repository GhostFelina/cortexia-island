const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app
  .whenReady()
  .then(() => {
    const assets = path.join(__dirname, '..', 'assets');
    const source = nativeImage.createFromPath(path.join(assets, 'brand', 'app-icon-master.png'));
    if (source.isEmpty()) throw new Error('Brand master is missing');
    fs.writeFileSync(
      path.join(assets, 'icon.png'),
      source.resize({ width: 512, height: 512, quality: 'best' }).toPNG(),
    );
    fs.writeFileSync(
      path.join(assets, 'mark.png'),
      source.resize({ width: 96, height: 96, quality: 'best' }).toPNG(),
    );
    fs.writeFileSync(
      path.join(assets, 'tray.png'),
      source.resize({ width: 32, height: 32, quality: 'best' }).toPNG(),
    );
    fs.writeFileSync(
      path.join(assets, 'brand', 'icon-preview.png'),
      source.resize({ width: 256, height: 256, quality: 'best' }).toPNG(),
    );
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = sizes.map((size) =>
      source.resize({ width: size, height: size, quality: 'best' }).toPNG(),
    );
    const header = Buffer.alloc(6 + sizes.length * 16);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, i) => {
      const pos = 6 + i * 16;
      header[pos] = size === 256 ? 0 : size;
      header[pos + 1] = header[pos];
      header.writeUInt16LE(1, pos + 4);
      header.writeUInt16LE(32, pos + 6);
      header.writeUInt32LE(images[i].length, pos + 8);
      header.writeUInt32LE(offset, pos + 12);
      offset += images[i].length;
    });
    fs.writeFileSync(path.join(assets, 'icon.ico'), Buffer.concat([header, ...images]));
    console.log('Cortexia generated brand resized to desktop/installer/tray/UI assets.');
    app.quit();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
