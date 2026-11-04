// Procedural pixel art. Everything is drawn from code so the game has no image assets.
import { TILE, T } from './maps.js';
import { CROPS, ANIMALS } from './data.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

function hash(x, y, salt = 0) {
  let h = (x * 374761393 + y * 668265263 + salt * 69069) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function pixelEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -ry; y <= ry; y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

function shadow(ctx, cx, by, rx, ry = 3, alpha = 0.22) {
  ctx.save();
  ctx.globalAlpha = alpha;
  pixelEllipse(ctx, cx, by, rx, ry, '#14200e');
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Ground tiles                                                       */
/* ------------------------------------------------------------------ */
export function drawTile(ctx, type, tx, ty) {
  const x = tx * TILE, y = ty * TILE;
  const r = hash(tx, ty);
  const r2 = hash(tx, ty, 7);
  switch (type) {
    case T.GRASS:
      rect(ctx, x, y, TILE, TILE, '#6faf4c');
      if (r < 0.14) rect(ctx, x + 4 + Math.floor(r2 * 6), y + 5 + Math.floor(r * 8), 2, 1, '#5c9a3e');
      if (r > 0.86) rect(ctx, x + 7, y + 9, 1, 2, '#7fc35a');
      if (r2 < 0.05) {
        rect(ctx, x + 5, y + 6, 1, 1, '#f7e27a');
        rect(ctx, x + 8, y + 7, 1, 1, '#f7e27a');
        rect(ctx, x + 6, y + 8, 3, 1, '#5c9a3e');
      }
      break;
    case T.FOREST:
      rect(ctx, x, y, TILE, TILE, '#5b8d42');
      if (r < 0.3) rect(ctx, x + 3 + Math.floor(r * 8), y + 4 + Math.floor(r2 * 8), 3, 2, '#4c7c37');
      if (r2 < 0.18) {
        const ox = x + 4 + Math.floor(r * 8), oy = y + 4 + Math.floor(r2 * 30) % 8;
        rect(ctx, ox, oy, 3, 1, '#d7a35b');
        rect(ctx, ox + 1, oy - 1, 1, 1, '#c08a44');
      }
      if (r2 > 0.93) rect(ctx, x + 6, y + 10, 1, 1, '#e7d48b');
      break;
    case T.PATH:
      rect(ctx, x, y, TILE, TILE, '#c8a46c');
      rect(ctx, x, y, TILE, 1, '#b48f58');
      if (r < 0.35) rect(ctx, x + 3 + Math.floor(r * 9), y + 5 + Math.floor(r2 * 8), 2, 1, '#b18c56');
      if (r2 < 0.25) rect(ctx, x + 5 + Math.floor(r * 8), y + 10, 1, 1, '#e0c48f');
      break;
    case T.DIRT:
      rect(ctx, x, y, TILE, TILE, '#8a6441');
      rect(ctx, x, y + 3, TILE, 2, '#7b5738');
      rect(ctx, x, y + 10, TILE, 2, '#7b5738');
      if (r < 0.4) rect(ctx, x + 3 + Math.floor(r * 9), y + 6, 2, 1, '#9c744d');
      if (r2 < 0.2) rect(ctx, x + 6, y + 12, 1, 1, '#6b4a2f');
      break;
    case T.WATER:
      rect(ctx, x, y, TILE, TILE, '#357fae');
      rect(ctx, x, y + 3, TILE, 1, '#4a96c2');
      rect(ctx, x, y + 11, TILE, 1, '#2b6b96');
      if (r < 0.3) rect(ctx, x + 3 + Math.floor(r * 8), y + 6, 4, 1, '#6db6d9');
      break;
    case T.SEA:
      rect(ctx, x, y, TILE, TILE, '#2d6f9f');
      rect(ctx, x, y + 2, TILE, 1, '#4388b8');
      if (r < 0.35) rect(ctx, x + 2 + Math.floor(r * 8), y + 8, 5, 1, '#62a9cd');
      if (r2 < 0.2) rect(ctx, x + 5, y + 13, 3, 1, '#256089');
      break;
    case T.SAND:
      rect(ctx, x, y, TILE, TILE, '#ead49b');
      if (r < 0.3) rect(ctx, x + 3 + Math.floor(r * 8), y + 4 + Math.floor(r2 * 8), 1, 1, '#d8bc7c');
      if (r2 < 0.18) rect(ctx, x + 5 + Math.floor(r * 8), y + 10, 2, 1, '#f5e6b8');
      break;
    case T.PLAZA:
      rect(ctx, x, y, TILE, TILE, '#bcb6a7');
      rect(ctx, x, y, TILE, 1, '#a8a294');
      rect(ctx, x, y, 1, TILE, '#a8a294');
      rect(ctx, x + 1, y + 1, TILE - 1, 1, '#cfc9ba');
      if (r < 0.12) rect(ctx, x + 4, y + 7, 2, 1, '#999385');
      break;
    case T.BRIDGE:
      rect(ctx, x, y, TILE, TILE, '#a9773f');
      for (let i = 0; i < 4; i++) rect(ctx, x, y + i * 4, TILE, 3, i % 2 ? '#b68449' : '#9c6b37');
      rect(ctx, x, y, TILE, 1, '#c99a5f');
      if (r < 0.5) rect(ctx, x + 2 + Math.floor(r * 10), y + 6, 3, 1, '#7d5229');
      break;
    default:
      rect(ctx, x, y, TILE, TILE, '#6faf4c');
  }
}

export function buildMapCache(map) {
  const c = makeCanvas(map.w * TILE, map.h * TILE);
  const ctx = c.getContext('2d');
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      drawTile(ctx, map.tiles[y * map.w + x], x, y);
    }
  }
  // Little foam lines where water meets land or a sandbar.
  const at = (x, y) => (x < 0 || y < 0 || x >= map.w || y >= map.h) ? -1 : map.tiles[y * map.w + x];
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const t = at(x, y);
      if (t !== T.WATER && t !== T.SEA) continue;
      const px = x * TILE, py = y * TILE;
      const land = (n) => n !== T.WATER && n !== T.SEA && n !== T.BRIDGE && n !== -1;
      if (land(at(x - 1, y))) {
        rect(ctx, px, py + 1, 1, TILE - 2, '#8fc9da');
        if (hash(x, y) < 0.5) rect(ctx, px + 1, py + 3, 1, 2, '#d3eff3');
      }
      if (land(at(x + 1, y))) {
        rect(ctx, px + TILE - 1, py + 1, 1, TILE - 2, '#8fc9da');
        if (hash(x, y) < 0.5) rect(ctx, px + TILE - 2, py + 9, 1, 2, '#d3eff3');
      }
      if (land(at(x, y - 1))) {
        rect(ctx, px + 1, py, TILE - 2, 1, '#8fc9da');
        if (hash(x, y) < 0.5) rect(ctx, px + 4, py + 1, 3, 1, '#d3eff3');
      }
      if (land(at(x, y + 1))) {
        rect(ctx, px + 1, py + TILE - 1, TILE - 2, 1, '#8fc9da');
        if (hash(x, y) < 0.5) rect(ctx, px + 9, py + TILE - 2, 3, 1, '#d3eff3');
      }
    }
  }
  return c;
}

/* ------------------------------------------------------------------ */
/* Environment objects                                                */
/* ------------------------------------------------------------------ */
const BUILDING_STYLES = {
  house:       { wall: '#efd9a2', wallDark: '#d3b877', roof: '#b8503c', roofDark: '#8b372b', trim: '#7b4a2e', sign: '#f2c14f', awning: null },
  supermarket: { wall: '#e4efe3', wallDark: '#c3d5c3', roof: '#2f8f88', roofDark: '#226b66', trim: '#1e615d', sign: '#f2c14f', awning: ['#4aa79e', '#f4ecd2'] },
  carpenter:   { wall: '#e8c88c', wallDark: '#cbaa6e', roof: '#9c5a2f', roofDark: '#713f20', trim: '#603a1e', sign: '#f2c14f', awning: ['#b9723d', '#efdcb2'] },
  ranch:       { wall: '#f0d6ad', wallDark: '#d2b487', roof: '#b34a3c', roofDark: '#843228', trim: '#74372a', sign: '#f2c14f', awning: ['#bd5847', '#f3e3c4'] },
  clinic:      { wall: '#f2f4ee', wallDark: '#d3d9cf', roof: '#c75050', roofDark: '#963a3a', trim: '#8d3737', sign: '#c75050', awning: ['#f2f4ee', '#dbe3d8'] },
  bar:         { wall: '#d7c6a5', wallDark: '#b5a382', roof: '#5e4a7a', roofDark: '#423252', trim: '#3d3054', sign: '#f2c14f', awning: ['#6a5488', '#e6d8b5'] },
  restaurant:  { wall: '#f0d6a8', wallDark: '#d0b47f', roof: '#c47032', roofDark: '#955024', trim: '#8a4a24', sign: '#f2c14f', awning: ['#d5803e', '#f7e7c5'] },
  blacksmith:  { wall: '#b9b0a0', wallDark: '#999181', roof: '#5b5d63', roofDark: '#3d3f45', trim: '#333338', sign: '#f0b04a', awning: ['#6c6e75', '#c9c2b4'] },
  townhall:    { wall: '#e8dfc0', wallDark: '#c9bf9d', roof: '#4f6190', roofDark: '#394667', trim: '#334166', sign: '#f2c14f', awning: null },
  barn:        { wall: '#b4533c', wallDark: '#8f3f2e', roof: '#6d3d2f', roofDark: '#4f2b21', trim: '#43251c', sign: '#e8c88c', awning: null },
  cabin:       { wall: '#b98a56', wallDark: '#956a3e', roof: '#5c4a38', roofDark: '#423426', trim: '#3d2c1e', sign: '#d8a75b', awning: null },
};

function drawSignIcon(ctx, style, cx, cy) {
  switch (style) {
    case 'supermarket':
      rect(ctx, cx - 4, cy - 2, 8, 5, '#3f7d3a');
      rect(ctx, cx - 3, cy - 4, 6, 2, '#5ea14e');
      rect(ctx, cx - 1, cy - 5, 2, 2, '#8b5a2b');
      break;
    case 'ranch':
      pixelEllipse(ctx, cx, cy, 4, 3, '#f4f0e4');
      rect(ctx, cx - 3, cy - 3, 2, 2, '#2c2a2a');
      rect(ctx, cx + 1, cy - 3, 2, 2, '#2c2a2a');
      rect(ctx, cx - 2, cy + 2, 4, 2, '#e0a1a1');
      break;
    case 'bar':
      rect(ctx, cx - 3, cy - 4, 5, 7, '#e8b23b');
      rect(ctx, cx - 2, cy - 3, 3, 5, '#f6df8a');
      rect(ctx, cx + 2, cy - 2, 2, 4, '#e8b23b');
      rect(ctx, cx - 3, cy - 5, 5, 2, '#f6f0dc');
      break;
    case 'clinic':
      rect(ctx, cx - 1, cy - 4, 3, 8, '#f4f0e4');
      rect(ctx, cx - 4, cy - 1, 8, 3, '#f4f0e4');
      break;
    case 'restaurant':
      rect(ctx, cx - 3, cy - 4, 1, 8, '#f4f0e4');
      rect(ctx, cx - 4, cy - 4, 3, 2, '#f4f0e4');
      rect(ctx, cx + 1, cy - 4, 1, 8, '#f4f0e4');
      rect(ctx, cx + 1, cy - 4, 3, 3, '#f4f0e4');
      break;
    case 'blacksmith':
      rect(ctx, cx - 4, cy - 3, 7, 2, '#4a4a50');
      rect(ctx, cx - 3, cy - 4, 4, 3, '#6a6a72');
      rect(ctx, cx + 2, cy - 1, 1, 5, '#8b5a2b');
      break;
    case 'carpenter':
      rect(ctx, cx - 4, cy - 1, 8, 2, '#7b4a2e');
      rect(ctx, cx - 4, cy + 1, 2, 2, '#7b4a2e');
      rect(ctx, cx + 2, cy + 1, 2, 2, '#7b4a2e');
      rect(ctx, cx - 5, cy - 4, 2, 4, '#c9a26a');
      break;
    case 'townhall':
      rect(ctx, cx - 4, cy - 4, 1, 8, '#7b5a2a');
      rect(ctx, cx - 3, cy - 4, 6, 4, '#d94b4b');
      rect(ctx, cx - 3, cy - 4, 3, 4, '#f0d9a0');
      break;
    case 'house':
      rect(ctx, cx - 4, cy - 1, 8, 5, '#b8503c');
      rect(ctx, cx - 6, cy - 1, 12, 2, '#8b372b');
      rect(ctx, cx - 1, cy + 2, 2, 2, '#6b3d26');
      break;
    case 'barn':
      rect(ctx, cx - 4, cy - 4, 8, 8, '#e8c88c');
      rect(ctx, cx - 4, cy - 1, 8, 2, '#9c5a2f');
      rect(ctx, cx - 1, cy - 4, 2, 8, '#9c5a2f');
      break;
    case 'cabin':
      pixelEllipse(ctx, cx, cy - 1, 4, 3, '#6f9a4c');
      rect(ctx, cx - 1, cy + 1, 2, 3, '#6b4a2f');
      break;
    default:
      rect(ctx, cx - 2, cy - 2, 4, 4, '#f4f0e4');
  }
}

export function drawBuilding(ctx, o, time, isNight) {
  const s = BUILDING_STYLES[o.style] || BUILDING_STYLES.house;
  const x = o.x * TILE, y = o.y * TILE, w = o.w * TILE, h = o.h * TILE;
  const base = y + h;
  const top = y + 2;
  const wallTop = top + Math.floor(h * 0.42);
  shadow(ctx, x + w / 2, base - 2, w / 2 + 3, 4, 0.24);

  // walls
  rect(ctx, x + 2, wallTop, w - 4, base - wallTop - 3, s.wallDark);
  rect(ctx, x + 3, wallTop, w - 6, base - wallTop - 6, s.wall);
  // plank / siding lines
  for (let yy = wallTop + 8; yy < base - 6; yy += 7) rect(ctx, x + 4, yy, w - 8, 1, s.wallDark);

  // roof (pitched, pixel stepped)
  const roofH = Math.floor(h * 0.46) + 6;
  const ridgeW = Math.floor(w * 0.34);
  for (let row = 0; row < roofH; row++) {
    const t = row / roofH;
    const half = Math.round((w / 2 + 6) * (0.25 + 0.75 * t));
    const yy = top - 4 + row;
    rect(ctx, x + w / 2 - half, yy, half * 2, 1, s.roof);
    if (row % 6 === 0) rect(ctx, x + w / 2 - half, yy, half * 2, 1, s.roofDark);
  }
  rect(ctx, x + w / 2 - ridgeW / 2, top - 7, ridgeW, 4, s.roofDark);
  rect(ctx, x + w / 2 - ridgeW / 2 + 2, top - 6, ridgeW - 4, 1, s.roof);
  rect(ctx, x - 2, top + roofH - 8, w + 4, 4, s.roofDark);
  rect(ctx, x - 1, top + roofH - 7, w + 2, 1, s.roof);

  // awning stripes over the lower wall
  if (s.awning) {
    const awY = wallTop + 2;
    for (let i = 0; i < 14; i++) {
      rect(ctx, x + 4 + i * ((w - 8) / 14), awY, Math.ceil((w - 8) / 14), 5, i % 2 ? s.awning[0] : s.awning[1]);
    }
    rect(ctx, x + 3, awY + 5, w - 6, 1, s.roofDark);
  }

  // windows
  const winY = wallTop + 12;
  for (const wx of [x + 12, x + w - 26]) {
    if (w < 80 && wx === x + w - 26) continue;
    rect(ctx, wx - 1, winY - 1, 14, 12, s.trim);
    rect(ctx, wx, winY, 12, 10, isNight ? '#f7d977' : '#9fd3df');
    rect(ctx, wx + 5, winY, 1, 10, s.trim);
    rect(ctx, wx, winY + 4, 12, 1, s.trim);
    if (!isNight) { rect(ctx, wx + 1, winY + 1, 3, 3, '#d8f0f5'); }
    if (isNight) { rect(ctx, wx + 2, winY + 2, 3, 2, '#fff3ba'); }
  }

  // door
  const doorX = o.door ? o.door.x * TILE + 8 : x + w / 2;
  const doorW = o.style === 'barn' ? 18 : 14;
  const doorH = o.style === 'barn' ? 20 : 18;
  rect(ctx, doorX - doorW / 2 - 1, base - doorH - 1, doorW + 2, doorH + 1, s.trim);
  rect(ctx, doorX - doorW / 2, base - doorH, doorW, doorH, o.style === 'barn' ? '#7a3a2c' : '#7b4a2e');
  if (o.style === 'barn') {
    rect(ctx, doorX - 1, base - doorH, 2, doorH, '#a05a3c');
    rect(ctx, doorX - doorW / 2, base - doorH + 6, doorW, 2, '#5a2a20');
  } else {
    rect(ctx, doorX + doorW / 2 - 4, base - doorH / 2 - 1, 2, 2, '#f2c14f');
    rect(ctx, doorX - doorW / 2 + 2, base - doorH + 2, doorW - 4, 4, '#9c623a');
  }

  // sign board & icon
  const signY = wallTop - 10;
  const signW = Math.min(w - 20, 34);
  rect(ctx, x + w / 2 - signW / 2, signY, signW, 12, s.trim);
  rect(ctx, x + w / 2 - signW / 2 + 1, signY + 1, signW - 2, 10, s.sign);
  drawSignIcon(ctx, o.style, x + w / 2, signY + 6);

  // foundation
  rect(ctx, x, base - 4, w, 4, '#8b8274');
  for (let bx = 0; bx < w; bx += 8) rect(ctx, x + bx + 1, base - 3, 6, 2, '#a39a8b');

  // chimney
  if (o.style === 'house' || o.style === 'cabin' || o.style === 'barn') {
    rect(ctx, x + w - 22, top - 12, 8, 14, '#8b4b38');
    rect(ctx, x + w - 23, top - 13, 10, 3, '#6b3a2c');
    if (isNight && o.style === 'house') {
      ctx.save(); ctx.globalAlpha = 0.25; pixelEllipse(ctx, x + w - 18, top - 18, 7, 5, '#d8d2c4'); ctx.restore();
    }
  }

  // hanging lantern by the door
  rect(ctx, doorX + doorW / 2 + 2, base - doorH - 6, 1, 5, '#4a3a2a');
  rect(ctx, doorX + doorW / 2 + 1, base - doorH - 2, 4, 4, isNight ? '#ffd867' : '#d5b56a');
  if (isNight) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    pixelEllipse(ctx, doorX + doorW / 2 + 2, base - doorH, 16, 12, '#ffd867');
    ctx.restore();
  }
}

function drawTree(ctx, o, time) {
  const cx = o.x * TILE + 8;
  const by = (o.y + 1) * TILE;
  const v = o.variant || 0;
  const tall = v === 2 ? 1.18 : v === 1 ? 0.94 : 1.08;
  const sway = Math.round(Math.sin(time * 1.3 + o.x * 0.7) * 1);
  shadow(ctx, cx, by - 1, 11 * tall, 3, 0.25);
  const trunkH = Math.round(16 * tall);
  rect(ctx, cx - 2, by - trunkH, 4, trunkH, '#6b4a2f');
  rect(ctx, cx - 2, by - trunkH, 1, trunkH, '#8a623c');
  rect(ctx, cx + 2, by - 5, 3, 3, '#6b4a2f');
  // canopy
  const cy = by - trunkH - 8;
  pixelEllipse(ctx, cx + sway, cy, 13 * tall, 10 * tall, '#3f7d36');
  pixelEllipse(ctx, cx + sway - 2, cy - 2, 10 * tall, 8 * tall, '#4f9a3f');
  pixelEllipse(ctx, cx + sway - 4, cy - 4, 6 * tall, 5 * tall, '#64b44a');
  if (o.fruit) {
    for (const [dx, dy] of [[-5, -2], [3, -5], [6, 2], [-2, 4]]) {
      rect(ctx, cx + sway + dx, cy + dy, 2, 2, '#d94343');
      rect(ctx, cx + sway + dx, cy + dy, 1, 1, '#f28a7c');
    }
  }
}

function drawBush(ctx, o) {
  const cx = o.x * TILE + 8;
  const by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 8, 3, 0.18);
  pixelEllipse(ctx, cx, by - 7, 9, 7, '#3f7d36');
  pixelEllipse(ctx, cx - 2, by - 9, 6, 5, '#4f9a3f');
  pixelEllipse(ctx, cx + 3, by - 6, 4, 4, '#64b44a');
  if (o.forage === 'berry' && !o.picked) {
    for (const [dx, dy] of [[-4, -8], [0, -5], [4, -9], [2, -3]]) rect(ctx, cx + dx, by + dy, 2, 2, '#5a4a9e');
  }
}

function drawRock(ctx, o) {
  const cx = o.x * TILE + 8;
  const by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 8, 3, 0.2);
  pixelEllipse(ctx, cx, by - 6, 8, 6, '#6e6e72');
  pixelEllipse(ctx, cx - 1, by - 7, 6, 4, '#8b8b90');
  rect(ctx, cx - 5, by - 6, 3, 2, '#a8a8ad');
  rect(ctx, cx + 2, by - 4, 2, 1, '#59595e');
}

function drawStump(ctx, o) {
  const cx = o.x * TILE + 8, by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 7, 2, 0.2);
  rect(ctx, cx - 6, by - 6, 12, 6, '#6b4a2f');
  rect(ctx, cx - 6, by - 6, 12, 2, '#8a623c');
  rect(ctx, cx - 4, by - 5, 8, 3, '#a87a4a');
  rect(ctx, cx - 2, by - 5, 4, 1, '#c99a5f');
}

function drawLog(ctx, o) {
  const x = o.x * TILE, y = (o.y + 1) * TILE;
  shadow(ctx, x + 8, y - 1, 12, 3, 0.18);
  if (o.dir === 'v') {
    rect(ctx, x + 4, y - 22, 8, 22, '#7b5230');
    rect(ctx, x + 4, y - 22, 2, 22, '#96663a');
    pixelEllipse(ctx, x + 8, y - 22, 4, 2, '#c99a5f');
  } else {
    rect(ctx, x - 6, y - 8, 28, 8, '#7b5230');
    rect(ctx, x - 6, y - 8, 28, 2, '#96663a');
    pixelEllipse(ctx, x - 6, y - 4, 2, 4, '#c99a5f');
  }
}

function drawFence(ctx, o) {
  const x = o.x * TILE, y = o.y * TILE;
  if (o.orient === 'v') {
    rect(ctx, x + 6, y, 2, TILE, '#8a623c');
    rect(ctx, x + 5, y + 1, 5, 3, '#b98a56');
    rect(ctx, x + 5, y + TILE - 4, 5, 3, '#b98a56');
    rect(ctx, x + 1, y + 6, 12, 2, '#9c7447');
  } else {
    rect(ctx, x, y + 6, TILE, 2, '#8a623c');
    rect(ctx, x + 1, y + 4, 3, 8, '#b98a56');
    rect(ctx, x + TILE - 4, y + 4, 3, 8, '#b98a56');
    rect(ctx, x, y + 4, TILE, 1, '#9c7447');
  }
}

function drawSign(ctx, o) {
  const cx = o.x * TILE + 8, by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 6, 2, 0.18);
  rect(ctx, cx - 1, by - 12, 2, 12, '#7b5230');
  rect(ctx, cx - 9, by - 22, 18, 11, '#8a5a34');
  rect(ctx, cx - 8, by - 21, 16, 9, '#c99a5f');
  rect(ctx, cx - 6, by - 19, 12, 1, '#8a5a34');
  rect(ctx, cx - 6, by - 16, 9, 1, '#8a5a34');
}

function drawLamp(ctx, o, isNight) {
  const cx = o.x * TILE + 8, by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 5, 2, 0.2);
  rect(ctx, cx - 1, by - 26, 2, 26, '#3d3a36');
  rect(ctx, cx - 4, by - 32, 8, 7, '#4a463f');
  rect(ctx, cx - 3, by - 31, 6, 5, isNight ? '#ffd867' : '#d5b56a');
  if (isNight) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    pixelEllipse(ctx, cx, by - 28, 20, 16, '#ffd867');
    ctx.restore();
  }
}

function drawFountain(ctx, o, time) {
  const cx = o.x * TILE + 24, by = (o.y + 3) * TILE - 2;
  shadow(ctx, cx, by, 26, 5, 0.2);
  pixelEllipse(ctx, cx, by - 12, 24, 14, '#9a9487');
  pixelEllipse(ctx, cx, by - 14, 21, 11, '#c9c2b4');
  pixelEllipse(ctx, cx, by - 15, 17, 8, '#3d8ab5');
  pixelEllipse(ctx, cx, by - 16, 14, 6, '#5aa6ca');
  rect(ctx, cx - 2, by - 24, 4, 12, '#b7b0a2');
  rect(ctx, cx - 4, by - 26, 8, 3, '#d3ccbe');
  for (let i = 0; i < 5; i++) {
    const px = cx - 12 + i * 6 + Math.round(Math.sin(time * 2 + i) * 1);
    const py = by - 20 - ((time * 8 + i * 5) % 10);
    rect(ctx, px, py, 1, 2, '#d8f2ff');
  }
  rect(ctx, cx - 16, by - 30, 2, 18, '#9a9487');
  rect(ctx, cx - 15, by - 30, 4, 2, '#c9c2b4');
}

function drawWell(ctx, o, isNight) {
  const cx = o.x * TILE + 16, by = (o.y + 2) * TILE;
  shadow(ctx, cx, by - 1, 16, 4, 0.2);
  pixelEllipse(ctx, cx, by - 6, 14, 8, '#8b8274');
  pixelEllipse(ctx, cx, by - 8, 11, 6, '#b7b0a2');
  pixelEllipse(ctx, cx, by - 8, 8, 4, '#3d8ab5');
  rect(ctx, cx - 14, by - 30, 3, 24, '#7b5230');
  rect(ctx, cx + 11, by - 30, 3, 24, '#7b5230');
  rect(ctx, cx - 17, by - 34, 34, 5, '#9c5a2f');
  rect(ctx, cx - 15, by - 33, 30, 2, '#b9723d');
  rect(ctx, cx - 2, by - 29, 4, 3, '#6b4a2f');
  rect(ctx, cx - 1, by - 26, 2, 8, '#d8d0bc');
  rect(ctx, cx - 3, by - 19, 6, 5, '#8a623c');
}

function drawBin(ctx, o, time) {
  const x = o.x * TILE, by = (o.y + 1) * TILE;
  shadow(ctx, x + 16, by - 1, 16, 3, 0.2);
  rect(ctx, x + 2, by - 18, 28, 18, '#3f6b45');
  rect(ctx, x + 3, by - 17, 26, 15, '#4f8a56');
  rect(ctx, x + 2, by - 19, 28, 4, '#2f5636');
  rect(ctx, x + 5, by - 15, 22, 10, '#5fa066');
  rect(ctx, x + 12, by - 12, 8, 2, '#f2c14f');
  rect(ctx, x + 15, by - 14, 2, 6, '#f2c14f');
  // open lid
  rect(ctx, x + 2, by - 25, 28, 6, '#3f6b45');
  rect(ctx, x + 3, by - 24, 26, 4, '#5fa066');
  for (let i = 0; i < 4; i++) rect(ctx, x + 6 + i * 6, by - 23, 2, 1, '#2f5636');
}

function drawDoormat(ctx, o) {
  const x = o.x * TILE + 2, y = o.y * TILE + 5;
  rect(ctx, x, y, 12, 7, '#8a5a34');
  rect(ctx, x + 1, y + 1, 10, 5, '#b98a56');
}

function drawGate(ctx, o) {
  const x = o.x * TILE, y = o.y * TILE;
  rect(ctx, x, y + 5, 4, 9, '#8a623c');
  rect(ctx, x + 12, y + 5, 4, 9, '#8a623c');
  rect(ctx, x + 4, y + 8, 8, 2, '#b98a56');
  rect(ctx, x + 4, y + 11, 8, 1, '#9c7447');
}

function drawReeds(ctx, o) {
  const x = o.x * TILE + 8, by = (o.y + 1) * TILE;
  for (let i = 0; i < 3; i++) {
    const dx = -5 + i * 4;
    rect(ctx, x + dx, by - 12 - i * 2, 1, 12 + i * 2, '#4c7c37');
    rect(ctx, x + dx - 1, by - 13 - i * 2, 3, 2, '#7a9a4c');
  }
}

function drawDockpost(ctx, o) {
  const x = o.x * TILE + 4, y = o.y * TILE;
  rect(ctx, x, y - 4, 5, 22, '#6b4a2f');
  rect(ctx, x, y - 4, 5, 4, '#8a623c');
}

function drawUmbrella(ctx, o) {
  const cx = o.x * TILE + 8, by = (o.y + 1) * TILE;
  shadow(ctx, cx, by - 1, 14, 4, 0.18);
  rect(ctx, cx - 1, by - 26, 2, 26, '#c9a26a');
  pixelEllipse(ctx, cx, by - 28, 18, 6, '#e05a4f');
  pixelEllipse(ctx, cx, by - 29, 14, 4, '#f2e6cc');
  rect(ctx, cx - 17, by - 27, 6, 4, '#e05a4f');
  rect(ctx, cx + 11, by - 27, 6, 4, '#e05a4f');
  rect(ctx, cx + 6, by - 12, 4, 2, '#e8c88c');
}

function drawSandcastle(ctx, o) {
  const x = o.x * TILE + 2, by = (o.y + 1) * TILE;
  rect(ctx, x + 2, by - 10, 20, 10, '#d8bc7c');
  rect(ctx, x + 2, by - 14, 4, 5, '#e8d29a');
  rect(ctx, x + 18, by - 14, 4, 5, '#e8d29a');
  rect(ctx, x + 10, by - 17, 4, 8, '#e8d29a');
  rect(ctx, x + 11, by - 20, 1, 4, '#f2e6b8');
  rect(ctx, x + 11, by - 20, 4, 2, '#e05a4f');
}

function drawFlower(ctx, o) {
  const x = o.x * TILE + 8, y = (o.y + 1) * TILE;
  const colors = [['#f28ab2', '#f7d85e'], ['#f2d35e', '#f28a4a'], ['#dcd8f0', '#f2c14f']][o.variant % 3];
  rect(ctx, x, y - 5, 1, 5, '#4c7c37');
  rect(ctx, x - 2, y - 4, 2, 1, '#5c9a3e');
  rect(ctx, x + 1, y - 3, 2, 1, '#5c9a3e');
  rect(ctx, x - 2, y - 8, 5, 3, colors[0]);
  rect(ctx, x - 1, y - 9, 3, 5, colors[0]);
  rect(ctx, x, y - 7, 1, 1, colors[1]);
}

function drawMushroom(ctx, o) {
  const x = o.x * TILE + 8, y = (o.y + 1) * TILE;
  rect(ctx, x - 1, y - 5, 3, 5, '#e8dcc0');
  rect(ctx, x - 5, y - 9, 11, 4, '#c8433b');
  rect(ctx, x - 4, y - 10, 9, 2, '#e05a4f');
  rect(ctx, x - 3, y - 8, 2, 1, '#f4e8d0');
  rect(ctx, x + 2, y - 9, 2, 1, '#f4e8d0');
  rect(ctx, x - 1, y - 7, 1, 1, '#f4e8d0');
}

function drawShell(ctx, o) {
  const x = o.x * TILE + 8, y = (o.y + 1) * TILE;
  pixelEllipse(ctx, x, y - 3, 4, 3, '#f0c7b5');
  rect(ctx, x - 3, y - 4, 6, 1, '#d98f86');
  rect(ctx, x - 1, y - 5, 2, 3, '#d98f86');
}

function drawBench(ctx, o) {
  const x = o.x * TILE, y = o.y * TILE;
  rect(ctx, x + 1, y + 7, 14, 3, '#9c5a2f');
  rect(ctx, x + 1, y + 3, 14, 3, '#b9723d');
  rect(ctx, x + 2, y + 10, 2, 5, '#6b4a2f');
  rect(ctx, x + 12, y + 10, 2, 5, '#6b4a2f');
}

export function drawObject(ctx, o, time, isNight) {
  switch (o.type) {
    case 'tree': drawTree(ctx, o, time); break;
    case 'bush': drawBush(ctx, o); break;
    case 'rock': drawRock(ctx, o); break;
    case 'stump': drawStump(ctx, o); break;
    case 'log': drawLog(ctx, o); break;
    case 'fence': drawFence(ctx, o); break;
    case 'sign': drawSign(ctx, o); break;
    case 'lamp': drawLamp(ctx, o, isNight); break;
    case 'fountain': drawFountain(ctx, o, time); break;
    case 'well': drawWell(ctx, o, isNight); break;
    case 'bin': drawBin(ctx, o, time); break;
    case 'doormat': drawDoormat(ctx, o); break;
    case 'gate': drawGate(ctx, o); break;
    case 'reeds': drawReeds(ctx, o); break;
    case 'dockpost': drawDockpost(ctx, o); break;
    case 'umbrella': drawUmbrella(ctx, o); break;
    case 'sandcastle': drawSandcastle(ctx, o); break;
    case 'flower': drawFlower(ctx, o); break;
    case 'mushroom': if (!o.picked) drawMushroom(ctx, o); break;
    case 'shell': if (!o.picked) drawShell(ctx, o); break;
    case 'bench': drawBench(ctx, o); break;
    case 'building': drawBuilding(ctx, o, time, isNight); break;
    default: break;
  }
}

/* ------------------------------------------------------------------ */
/* Crops & animals                                                    */
/* ------------------------------------------------------------------ */
export function drawPlot(ctx, plot, tx, ty, time) {
  const x = tx * TILE, y = ty * TILE;
  rect(ctx, x, y, TILE, TILE, plot.watered ? '#4c3523' : '#6f4c31');
  for (let i = 0; i < 3; i++) {
    rect(ctx, x + 1, y + 3 + i * 5, TILE - 2, 2, plot.watered ? '#3d2a1b' : '#5a3b24');
    rect(ctx, x + 1, y + 3 + i * 5, TILE - 2, 1, plot.watered ? '#5a4129' : '#855c3b');
  }
  if (plot.watered) {
    for (let i = 0; i < 3; i++) {
      const spark = (time * 2 + i * 0.7 + tx) % 2;
      if (spark < 1) rect(ctx, x + 3 + i * 4, y + 4 + i * 4, 1, 1, '#7fb7d9');
    }
  }
  if (!plot.crop) return;
  const crop = CROPS[plot.crop];
  if (!crop) return;
  const ready = plot.ready;
  const progress = Math.min(1, plot.days / crop.days);
  const cx = x + 8, by = y + 15;
  if (crop.tree) {
    const stage = plot.days === 0 ? 0 : progress;
    if (stage < 0.4) {
      rect(ctx, cx - 1, by - 5, 2, 5, '#7b5230');
      rect(ctx, cx - 4, by - 7, 4, 3, '#4f9a3f');
      rect(ctx, cx + 1, by - 8, 4, 3, '#64b44a');
    } else {
      const scale = 0.55 + stage * 0.6;
      const trunkH = 8 * scale;
      rect(ctx, cx - 1, by - trunkH - 2, 3, trunkH + 2, '#7b5230');
      pixelEllipse(ctx, cx, by - trunkH - 7, 7 * scale, 5 * scale, '#3f7d36');
      pixelEllipse(ctx, cx - 1, by - trunkH - 8, 5 * scale, 4 * scale, '#64b44a');
      if (ready) {
        for (const [dx, dy] of [[-3, -7], [2, -9], [4, -5]]) rect(ctx, cx + dx, by - trunkH + dy, 2, 2, '#d94343');
      }
    }
    return;
  }
  const stemH = 3 + Math.round(progress * 8);
  rect(ctx, cx, by - stemH, 1, stemH, crop.stem);
  rect(ctx, cx - 3, by - stemH + 2, 3, 1, crop.leaf);
  rect(ctx, cx + 1, by - stemH + 3, 3, 1, crop.leaf);
  rect(ctx, cx - 2, by - stemH + 5, 2, 1, crop.stem);
  if (plot.crop === 'turnip') {
    if (ready) {
      pixelEllipse(ctx, cx, by - 2, 3, 3, '#f4f0dc');
      rect(ctx, cx - 1, by - 4, 1, 1, '#c8c0a6');
      rect(ctx, cx, by - 7, 1, 3, crop.leaf);
    }
  } else if (plot.crop === 'strawberry') {
    if (ready) {
      pixelEllipse(ctx, cx - 2, by - 3, 2, 2, '#e64444');
      pixelEllipse(ctx, cx + 2, by - 5, 2, 2, '#e64444');
      rect(ctx, cx - 2, by - 6, 1, 1, '#ffd85e');
      rect(ctx, cx + 2, by - 8, 1, 1, '#ffd85e');
    } else {
      rect(ctx, cx - 1, by - 4, 2, 2, '#e64444');
    }
  } else if (plot.crop === 'pumpkin') {
    if (ready) {
      pixelEllipse(ctx, cx, by - 3, 4, 3, '#e8892c');
      rect(ctx, cx - 2, by - 5, 1, 4, '#b95d14');
      rect(ctx, cx + 1, by - 5, 1, 4, '#b95d14');
      rect(ctx, cx, by - 7, 1, 2, '#4f9a3d');
    } else {
      rect(ctx, cx - 1, by - 3, 3, 2, '#8ab84a');
    }
  }
}

export function drawAnimal(ctx, a, time) {
  const def = ANIMALS[a.type] || ANIMALS.chicken;
  const cx = Math.round(a.px);
  const by = Math.round(a.py);
  const bob = Math.round(Math.sin(time * 3 + a.phase) * 1);
  const walk = a.moving ? Math.round(Math.sin(time * 9 + a.phase) * 1) : 0;
  const dir = a.dir === 'left' ? -1 : 1;
  shadow(ctx, cx, by - 1, def.size / 2 + 2, 3, 0.2);

  if (a.type === 'chicken') {
    rect(ctx, cx - 2 + walk, by - 3, 1, 3, '#e8912c');
    rect(ctx, cx + 2 - walk, by - 3, 1, 3, '#e8912c');
    pixelEllipse(ctx, cx, by - 7 + bob, 5, 4, '#f7f2df');
    rect(ctx, cx + dir * 3, by - 10 + bob, 4, 4, '#f7f2df');
    rect(ctx, cx + dir * 6, by - 9 + bob, 2, 1, '#e8912c');
    rect(ctx, cx + dir * 4, by - 12 + bob, 2, 2, '#e04b3d');
    rect(ctx, cx + dir * 5, by - 10 + bob, 1, 1, '#2a211d');
    rect(ctx, cx - 3, by - 9 + bob, 2, 2, '#e8e0cb');
  } else if (a.type === 'duck') {
    rect(ctx, cx - 2 + walk, by - 3, 1, 3, '#e8912c');
    rect(ctx, cx + 2 - walk, by - 3, 1, 3, '#e8912c');
    pixelEllipse(ctx, cx, by - 6 + bob, 6, 4, '#f7d55c');
    rect(ctx, cx + dir * 4, by - 10 + bob, 4, 4, '#e8c14a');
    rect(ctx, cx + dir * 7, by - 9 + bob, 3, 2, '#e8912c');
    rect(ctx, cx + dir * 5, by - 10 + bob, 1, 1, '#2a211d');
    rect(ctx, cx - 4, by - 8 + bob, 3, 2, '#e8c14a');
  } else if (a.type === 'cow') {
    rect(ctx, cx - 7 + walk, by - 6, 3, 6, '#d8d2c4');
    rect(ctx, cx + 4 - walk, by - 6, 3, 6, '#d8d2c4');
    pixelEllipse(ctx, cx, by - 12 + bob, 10, 6, '#f4f0e4');
    rect(ctx, cx - 7, by - 14 + bob, 5, 4, '#2c2a2a');
    rect(ctx, cx + 2, by - 16 + bob, 4, 5, '#2c2a2a');
    rect(ctx, cx - 8, by - 18 + bob, 5, 5, '#f4f0e4');
    rect(ctx, cx - 8, by - 16 + bob, 2, 2, '#2c2a2a');
    rect(ctx, cx - 10, by - 19 + bob, 2, 2, '#d8d2c4');
    rect(ctx, cx - 3, by - 20 + bob, 2, 2, '#d8d2c4');
    rect(ctx, cx + 3, by - 13 + bob, 2, 2, '#e8a0a0');
    rect(ctx, cx - 2, by - 14 + bob, 1, 1, '#2c2a2a');
    rect(ctx, cx + 1, by - 14 + bob, 1, 1, '#2c2a2a');
  } else if (a.type === 'sheep') {
    rect(ctx, cx - 5 + walk, by - 5, 2, 5, '#4a3b38');
    rect(ctx, cx + 3 - walk, by - 5, 2, 5, '#4a3b38');
    pixelEllipse(ctx, cx, by - 11 + bob, 10, 7, '#d8d2c4');
    pixelEllipse(ctx, cx - 3, by - 14 + bob, 6, 4, '#f4f0e6');
    pixelEllipse(ctx, cx + 4, by - 12 + bob, 5, 4, '#f4f0e6');
    rect(ctx, cx + 7, by - 13 + bob, 4, 4, '#4a3b38');
    rect(ctx, cx + 9, by - 14 + bob, 3, 3, '#f4f0e6');
    rect(ctx, cx + 10, by - 13 + bob, 1, 1, '#f4f0e6');
  }

  if (a.productReady) {
    const bx = cx, by2 = by - 28 + bob;
    rect(ctx, bx - 6, by2 - 6, 13, 10, '#f4f0e4');
    rect(ctx, bx - 5, by2 - 7, 11, 1, '#f4f0e4');
    rect(ctx, bx - 2, by2 + 4, 3, 2, '#f4f0e4');
    rect(ctx, bx - 5, by2 - 5, 11, 8, '#fffaf0');
    rect(ctx, bx - 1, by2 - 2, 3, 3, '#f2c14f');
    rect(ctx, bx, by2 - 1, 1, 1, '#b98a2a');
  }
}

/* ------------------------------------------------------------------ */
/* Characters                                                         */
/* ------------------------------------------------------------------ */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function drawCharacter(ctx, px, py, dir, frame, p, opts = {}) {
  const x = Math.round(px) - 7;
  const y = Math.round(py) - 20;
  const skin = p.skin || '#f3cfa6';
  const hair = p.hair || '#2a211d';
  const shirt = p.shirt || '#d9554f';
  const pants = p.pants || '#4a5a7a';
  const style = p.style || opts.style || 'overalls';
  const gender = p.gender || opts.gender || 'neutral';
  const acc = p.accessory || null;
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const bob = frame ? 1 : 0;
  const longHair = gender === 'feminine';

  // back hair for long styles
  if (longHair && dir !== 'up') {
    rect(ctx, x + 2, y + 5, 10, 10, shade(hair, -18));
    rect(ctx, x + 3, y + 13, 8, 4, shade(hair, -12));
  }

  // legs
  if (style === 'dress') {
    rect(ctx, x + 4, y + 14, 2, 4 + step, skin);
    rect(ctx, x + 8, y + 14, 2, 4 - step, skin);
    rect(ctx, x + 3, y + 18 + step, 3, 2, '#5a3b2a');
    rect(ctx, x + 8, y + 18 - step, 3, 2, '#5a3b2a');
  } else {
    rect(ctx, x + 4, y + 14, 3, 5 + step, pants);
    rect(ctx, x + 7, y + 14, 3, 5 - step, pants);
    rect(ctx, x + 3, y + 18 + step, 4, 2, '#4a3728');
    rect(ctx, x + 7, y + 18 - step, 4, 2, '#4a3728');
  }

  // torso
  if (style === 'dress') {
    rect(ctx, x + 4, y + 8, 6, 6, shirt);
    rect(ctx, x + 2, y + 13, 10, 4, shirt);
    rect(ctx, x + 2, y + 15, 10, 2, shade(shirt, -22));
    rect(ctx, x + 3, y + 18, 8, 1, shade(shirt, -22));
  } else {
    rect(ctx, x + 3, y + 8, 8, 7, shirt);
    rect(ctx, x + 3, y + 8, 1, 7, shade(shirt, 18));
    rect(ctx, x + 10, y + 8, 1, 7, shade(shirt, -20));
    if (style === 'overalls') {
      rect(ctx, x + 4, y + 9, 6, 6, pants);
      rect(ctx, x + 4, y + 8, 1, 3, pants);
      rect(ctx, x + 9, y + 8, 1, 3, pants);
      rect(ctx, x + 6, y + 10, 2, 2, shade(pants, 24));
    } else if (style === 'jacket') {
      rect(ctx, x + 3, y + 8, 2, 7, shade(shirt, -28));
      rect(ctx, x + 9, y + 8, 2, 7, shade(shirt, -28));
      rect(ctx, x + 6, y + 8, 1, 4, shade(shirt, 35));
    }
  }

  // arms
  const armY = y + 9 + bob;
  rect(ctx, x + 1, armY + step, 2, 5, skin);
  rect(ctx, x + 11, armY - step, 2, 5, skin);
  rect(ctx, x + 1, armY + step, 2, 2, shade(shirt, -5));
  rect(ctx, x + 11, armY - step, 2, 2, shade(shirt, -5));

  // head
  rect(ctx, x + 4, y + 2, 6, 7, skin);
  rect(ctx, x + 4, y + 2, 6, 2, shade(skin, 18));
  rect(ctx, x + 10, y + 4, 1, 3, shade(skin, -20));
  // hair
  if (dir === 'up') {
    rect(ctx, x + 3, y + 1, 8, 7, hair);
    rect(ctx, x + 4, y + 8, 6, 2, shade(hair, -14));
  } else if (dir === 'left' || dir === 'right') {
    const faceShift = dir === 'left' ? -1 : 1;
    rect(ctx, x + 3 + (dir === 'left' ? 2 : 0), y + 1, 8, 5, hair);
    rect(ctx, x + 3 + (dir === 'left' ? 2 : 0), y + 5, 2, 3, hair);
    if (longHair) rect(ctx, x + (dir === 'left' ? 1 : 10), y + 5, 2, 6, hair);
    rect(ctx, x + 7 + faceShift, y + 5, 1, 1, '#2a211d');
    rect(ctx, x + 9 + faceShift, y + 6, 1, 1, shade(skin, -18));
  } else {
    rect(ctx, x + 3, y + 1, 8, 4, hair);
    rect(ctx, x + 3, y + 4, 2, 4, hair);
    rect(ctx, x + 9, y + 4, 2, 4, hair);
    if (longHair) {
      rect(ctx, x + 2, y + 5, 2, 8, hair);
      rect(ctx, x + 10, y + 5, 2, 8, hair);
    }
    rect(ctx, x + 5, y + 6, 1, 1, '#2a211d');
    rect(ctx, x + 8, y + 6, 1, 1, '#2a211d');
    rect(ctx, x + 6, y + 8, 2, 1, shade(skin, -24));
  }

  // accessories
  if (acc === 'strawhat') {
    rect(ctx, x + 1, y + 0, 12, 2, '#d8b45a');
    rect(ctx, x + 3, y - 3, 8, 4, '#e0c06a');
    rect(ctx, x + 3, y - 1, 8, 1, '#b4893f');
  } else if (acc === 'cap') {
    rect(ctx, x + 2, y - 1, 10, 3, '#3c6b8f');
    rect(ctx, x + 8, y + 1, 5, 1, '#2c506b');
    rect(ctx, x + 3, y - 2, 6, 1, '#4f83ad');
  } else if (acc === 'chef') {
    rect(ctx, x + 2, y - 4, 10, 4, '#f4f0e4');
    rect(ctx, x + 3, y - 6, 3, 3, '#f4f0e4');
    rect(ctx, x + 8, y - 6, 3, 3, '#f4f0e4');
    rect(ctx, x + 2, y + 1, 10, 1, '#d8d0bc');
  } else if (acc === 'sunhat') {
    rect(ctx, x + 0, y + 1, 14, 2, '#d8b45a');
    rect(ctx, x + 4, y - 2, 6, 4, '#e8c88c');
    rect(ctx, x + 9, y + 0, 2, 2, '#f28ab2');
  } else if (acc === 'hood') {
    rect(ctx, x + 2, y - 2, 10, 5, '#5d6b45');
    rect(ctx, x + 3, y + 2, 2, 5, '#5d6b45');
    rect(ctx, x + 9, y + 2, 2, 5, '#5d6b45');
  }
  if (acc === 'apron') {
    rect(ctx, x + 4, y + 10, 6, 6, '#f0e6d0');
    rect(ctx, x + 5, y + 11, 4, 2, '#d8c8a8');
  }
  if (acc === 'doctor') {
    rect(ctx, x + 3, y + 8, 8, 8, '#f4f4ee');
    rect(ctx, x + 6, y + 10, 2, 4, '#c75050');
    rect(ctx, x + 5, y + 11, 4, 1, '#c75050');
  }
  if (acc === 'sash') {
    rect(ctx, x + 3, y + 8, 8, 2, '#f2c14f');
    rect(ctx, x + 9, y + 12, 2, 2, '#f2c14f');
  }
  if (acc === 'shawl') {
    rect(ctx, x + 2, y + 8, 10, 4, '#b46a8a');
    rect(ctx, x + 2, y + 8, 10, 1, '#d18aa6');
  }
}

export function drawCharacterShadow(ctx, px, py) {
  shadow(ctx, px, py - 1, 6, 2, 0.22);
}

export function drawPortrait(ctx, w, h, p, accessory) {
  ctx.clearRect(0, 0, w, h);
  const g = Math.max(2, Math.floor(Math.min(w, h) / 18));
  const cx = Math.round(w / 2);
  const top = Math.round(h * 0.12);
  const skin = p.skin || '#f3cfa6';
  const hair = p.hair || '#2a211d';
  const shirt = p.shirt || '#d9554f';
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#40594a');
  bg.addColorStop(1, '#26382c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#35493d' : '#2e4135';
    ctx.fillRect(0, h - (i + 1) * g * 1.2, w, g * 0.7);
  }
  // shoulders
  ctx.fillStyle = shade(shirt, -15);
  ctx.fillRect(cx - 6 * g, top + 10 * g, 12 * g, 8 * g);
  ctx.fillStyle = shirt;
  ctx.fillRect(cx - 5 * g, top + 11 * g, 10 * g, 7 * g);
  // neck
  ctx.fillStyle = shade(skin, -20);
  ctx.fillRect(cx - 2 * g, top + 9 * g, 4 * g, 2 * g);
  // head
  ctx.fillStyle = skin;
  ctx.fillRect(cx - 4 * g, top + 2 * g, 8 * g, 8 * g);
  ctx.fillStyle = shade(skin, 20);
  ctx.fillRect(cx - 4 * g, top + 2 * g, 8 * g, 1 * g);
  // hair
  ctx.fillStyle = hair;
  ctx.fillRect(cx - 5 * g, top + 1 * g, 10 * g, 2 * g);
  ctx.fillRect(cx - 5 * g, top + 2 * g, 2 * g, 5 * g);
  ctx.fillRect(cx + 3 * g, top + 2 * g, 2 * g, 5 * g);
  ctx.fillStyle = shade(hair, -20);
  ctx.fillRect(cx - 5 * g, top + 1 * g, 10 * g, 1 * g);
  // eyes
  ctx.fillStyle = '#2a211d';
  ctx.fillRect(cx - 2.5 * g, top + 5 * g, 1.3 * g, 1.4 * g);
  ctx.fillRect(cx + 1.2 * g, top + 5 * g, 1.3 * g, 1.4 * g);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2.2 * g, top + 5.2 * g, 0.5 * g, 0.5 * g);
  ctx.fillRect(cx + 1.5 * g, top + 5.2 * g, 0.5 * g, 0.5 * g);
  // brows + mouth
  ctx.fillStyle = shade(hair, -5);
  ctx.fillRect(cx - 2.5 * g, top + 4.2 * g, 1.4 * g, 0.5 * g);
  ctx.fillRect(cx + 1.2 * g, top + 4.2 * g, 1.4 * g, 0.5 * g);
  ctx.fillStyle = shade(skin, -35);
  ctx.fillRect(cx - 1 * g, top + 7.6 * g, 2 * g, 0.6 * g);
  // nose
  ctx.fillStyle = shade(skin, -18);
  ctx.fillRect(cx, top + 6.2 * g, 0.7 * g, 0.8 * g);
  // accessory
  ctx.fillStyle = '#f2c14f';
  if (accessory === 'strawhat') {
    ctx.fillStyle = '#d8b45a';
    ctx.fillRect(cx - 6 * g, top + 1 * g, 12 * g, 1.5 * g);
    ctx.fillRect(cx - 3 * g, top - 1 * g, 6 * g, 2 * g);
    ctx.fillStyle = '#b4893f';
    ctx.fillRect(cx - 3 * g, top + 0.2 * g, 6 * g, 0.5 * g);
  } else if (accessory === 'cap') {
    ctx.fillStyle = '#3c6b8f';
    ctx.fillRect(cx - 4 * g, top + 0.6 * g, 8 * g, 1.4 * g);
    ctx.fillRect(cx + 2 * g, top + 1.8 * g, 4 * g, 0.7 * g);
  } else if (accessory === 'chef') {
    ctx.fillStyle = '#f4f0e4';
    ctx.fillRect(cx - 4 * g, top - 1.5 * g, 8 * g, 3 * g);
    ctx.fillRect(cx - 3 * g, top - 2.6 * g, 2.5 * g, 1.4 * g);
    ctx.fillRect(cx + 0.5 * g, top - 2.6 * g, 2.5 * g, 1.4 * g);
  } else if (accessory === 'sunhat') {
    ctx.fillStyle = '#e8c88c';
    ctx.fillRect(cx - 7 * g, top + 1 * g, 14 * g, 1.5 * g);
    ctx.fillRect(cx - 3 * g, top - 1 * g, 6 * g, 2.2 * g);
    ctx.fillStyle = '#f28ab2';
    ctx.fillRect(cx + 1 * g, top + 0.2 * g, 2 * g, 0.8 * g);
  } else if (accessory === 'hood') {
    ctx.fillStyle = '#5d6b45';
    ctx.fillRect(cx - 5 * g, top - 1 * g, 10 * g, 2.5 * g);
    ctx.fillRect(cx - 5 * g, top + 1 * g, 1.5 * g, 7 * g);
    ctx.fillRect(cx + 3.5 * g, top + 1 * g, 1.5 * g, 7 * g);
  }
  if (accessory === 'doctor') {
    ctx.fillStyle = '#f4f4ee';
    ctx.fillRect(cx - 6 * g, top + 10 * g, 2 * g, 7 * g);
    ctx.fillRect(cx + 4 * g, top + 10 * g, 2 * g, 7 * g);
    ctx.fillStyle = '#c75050';
    ctx.fillRect(cx - 0.5 * g, top + 12 * g, 1 * g, 3 * g);
    ctx.fillRect(cx - 1.5 * g, top + 13 * g, 3 * g, 1 * g);
  }
  if (accessory === 'apron') {
    ctx.fillStyle = '#f0e6d0';
    ctx.fillRect(cx - 3 * g, top + 10 * g, 6 * g, 7 * g);
  }
}

export function drawCatchScene(ctx, w, h, time, location, nibbling) {
  ctx.clearRect(0, 0, w, h);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#35506b');
  sky.addColorStop(1, location === 'beach' ? '#2a7396' : '#2f5f6b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // water
  ctx.fillStyle = location === 'beach' ? '#2d6f9f' : '#357fae';
  ctx.fillRect(0, h * 0.34, w, h);
  for (let i = 0; i < 8; i++) {
    const y = h * 0.38 + i * 7;
    ctx.fillStyle = i % 2 ? '#4a96c2' : '#2b6b96';
    ctx.fillRect((time * 14 + i * 37) % w - 20, y, 34, 2);
  }
  // bobber
  const bx = w * 0.5 + Math.sin(time * 2) * 4;
  const by = h * 0.48 + Math.sin(time * 3.4) * 2 + (nibbling ? 4 : 0);
  ctx.fillStyle = '#d94343';
  ctx.fillRect(bx - 3, by - 5, 6, 5);
  ctx.fillStyle = '#f4f0e4';
  ctx.fillRect(bx - 3, by, 6, 3);
  ctx.fillStyle = '#2a211d';
  ctx.fillRect(bx - 3, by - 5, 6, 1);
  // ripple
  ctx.strokeStyle = 'rgba(220,245,255,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(bx, by + 6, 10 + Math.sin(time * 2) * 3, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (nibbling) {
    ctx.fillStyle = '#f2d14f';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', bx, by - 16);
  }
}

export function drawWaterSparkle(ctx, map, camX, camY, viewW, viewH, time) {
  const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
  const x1 = Math.min(map.w - 1, Math.ceil((camX + viewW) / TILE) + 1);
  const y1 = Math.min(map.h - 1, Math.ceil((camY + viewH) / TILE) + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = map.tiles[y * map.w + x];
      if (t !== T.WATER && t !== T.SEA) continue;
      const h = hash(x, y, 11);
      const phase = (time * 0.55 + h * 3) % 1;
      if (phase < 0.18) {
        const sx = x * TILE + 3 + Math.floor(h * 9);
        const sy = y * TILE + 4 + Math.floor(h * 8);
        ctx.save();
        ctx.globalAlpha = 0.6 * (1 - phase / 0.18);
        rect(ctx, sx, sy, 4, 1, '#bfe8ff');
        ctx.restore();
      }
      if (t === T.SEA && h > 0.82) {
        const wave = Math.round(Math.sin(time * 1.4 + x * 0.6 + y) * 1);
        rect(ctx, x * TILE + 2, y * TILE + 11 + wave, 7, 1, '#7fc3e0');
      }
    }
  }
}
