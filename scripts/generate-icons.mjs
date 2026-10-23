// Renders the app icons from the logo drawing: node scripts/generate-icons.mjs
// Writes src/app/icon.svg, src/app/favicon.ico and public/icons/*.png in the nachtblauw colours.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const BG = "#142243";
const LEAF = "#9CC3F5";
const COIN = "#EEF3FB";
const mark = `<path d="M16 16.5C10 17 7.5 12.8 7.5 7.5c6-.2 8.5 3.2 8.5 9z" fill="${LEAF}"/><path d="M16 13.5c0-4.6 2.4-7.7 8.5-7.8 0 5.1-2.4 8.3-8.5 7.8z" fill="${LEAF}"/><rect x="6" y="19" width="20" height="4" rx="2" fill="${COIN}"/><rect x="6" y="24.5" width="20" height="4" rx="2" fill="${COIN}"/>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`;
// The mark scaled around the middle of the drawing (16, 17), placed on the centre of the 32 unit canvas.
const scaled = (k) => `<g transform="translate(16 16) scale(${k}) translate(-16 -17)">${mark}</g>`;

const tile = svg(`<rect width="32" height="32" rx="8" fill="${BG}"/>${mark}`); // rounded tile: icon.svg and the "any" icons
const full = (k) => svg(`<rect width="32" height="32" fill="${BG}"/>${scaled(k)}`); // full bleed: the OS applies its own mask

const png = (source, size) => sharp(Buffer.from(source), { density: (72 * size * 2) / 32 }).resize(size, size).png().toBuffer();

writeFileSync("src/app/icon.svg", tile + "\n");
writeFileSync("public/icons/icon-192.png", await png(tile, 192));
writeFileSync("public/icons/icon-512.png", await png(tile, 512));
// Maskable: Android may crop to a circle of 80% of the width, so the mark stays well inside it.
writeFileSync("public/icons/maskable-512.png", await png(full(0.62), 512));
writeFileSync("public/icons/apple-touch-icon.png", await png(full(0.8), 180));

// favicon.ico: PNG images of 16, 32 and 48 px in one ICO container.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(tile, s)));
const head = Buffer.alloc(6);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([head, ...entries, ...images]));
