// 生成 manifest.json 引用的占位图标(品牌蓝底白色菱形)。正式图标就绪后直接替换 icons/*.png。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = [...Array(256)].map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); };

function png(size, path) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const rows = []; const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = Math.abs(x - c) + Math.abs(y - c) <= c ? [255, 255, 255] : [37, 99, 235];
      row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

mkdirSync('icons', { recursive: true });
for (const s of [16, 32, 48, 128]) png(s, `icons/icon${s}.png`);
console.log('占位图标已写入 icons/icon{16,32,48,128}.png');
