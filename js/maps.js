// World maps, tiles and static decorations.
import { NPCS } from './data.js';

export const TILE = 16;

export const T = {
  GRASS: 0,
  PATH: 1,
  DIRT: 2,
  WATER: 3,
  SAND: 4,
  FOREST: 5,
  PLAZA: 6,
  BRIDGE: 7,
  SEA: 8,
};

const SOLID_TILES = new Set([T.WATER, T.SEA]);

export function isSolidTile(type) { return SOLID_TILES.has(type); }

function rngFactory(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeMap(id, name, w, h, fill) {
  const tiles = new Uint8Array(w * h);
  tiles.fill(fill);
  return { id, name, w, h, tiles, objects: [], npcs: [], exits: [], defaultSpawn: { x: Math.floor(w / 2), y: Math.floor(h / 2) } };
}

function setTile(m, x, y, tile) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
  m.tiles[y * m.w + x] = tile;
}
function rectTile(m, x, y, w, h, tile) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setTile(m, xx, yy, tile);
}
function getTile(m, x, y) {
  if (x < 0 || y < 0 || x >= m.w || y >= m.h) return T.GRASS;
  return m.tiles[y * m.w + x];
}

function obj(m, data) {
  const o = { ...data };
  o.sortY = ((o.y + (o.h || 1)) * TILE) + (o.sortOffset || 0);
  m.objects.push(o);
  return o;
}

function tree(m, x, y, variant = 0, fruit = false) {
  return obj(m, { type: 'tree', x, y, variant, fruit, solid: true });
}
function bush(m, x, y, forage = null) {
  return obj(m, { type: 'bush', x, y, forage, solid: true, picked: false });
}
function rock(m, x, y, variant = 0) {
  return obj(m, { type: 'rock', x, y, variant, solid: true });
}
function stump(m, x, y) {
  return obj(m, { type: 'stump', x, y, solid: true, hits: 0 });
}
function log(m, x, y, dir = 'h') {
  return obj(m, { type: 'log', x, y, dir, solid: true });
}
function mushroom(m, x, y) {
  return obj(m, { type: 'mushroom', x, y, forage: 'mushroom', picked: false });
}
function shell(m, x, y) {
  return obj(m, { type: 'shell', x, y, forage: 'shell', picked: false });
}
function flower(m, x, y, variant = 0) {
  return obj(m, { type: 'flower', x, y, variant });
}
function fence(m, x, y, orient = 'h') {
  return obj(m, { type: 'fence', x, y, orient, solid: true });
}
function sign(m, x, y, text) {
  return obj(m, { type: 'sign', x, y, text, solid: true });
}
function lamp(m, x, y) {
  return obj(m, { type: 'lamp', x, y, solid: true });
}
function building(m, x, y, w, h, style, name, shop, door) {
  const b = obj(m, {
    type: 'building', x, y, w, h, style, name, shop,
    door: { x: door.x, y: door.y }, solid: true,
  });
  b.sortY = (y + h) * TILE;
  return b;
}

/* ------------------------------------------------------------------ */
/* FARM                                                               */
/* ------------------------------------------------------------------ */
function buildFarm() {
  const m = makeMap('farm', 'Willow Creek Farm', 36, 30, T.GRASS);
  m.ambient = 'farm';
  m.defaultSpawn = { x: 25, y: 18 };

  // paths
  rectTile(m, 24, 0, 3, 20, T.PATH);
  rectTile(m, 0, 14, 27, 2, T.PATH);
  rectTile(m, 30, 17, 2, 13, T.PATH);
  rectTile(m, 7, 8, 2, 7, T.PATH);

  // field
  rectTile(m, 13, 4, 10, 8, T.DIRT);

  // farmhouse
  building(m, 4, 3, 7, 5, 'house', 'Farmhouse', 'home', { x: 7, y: 8 });
  obj(m, { type: 'doormat', x: 7, y: 8 });

  // barn
  building(m, 28, 3, 6, 5, 'barn', 'Barn', null, { x: 31, y: 8 });

  // animal pen
  for (let x = 27; x <= 35; x++) {
    if (x !== 30 && x !== 31) fence(m, x, 11, 'h');
    if (x !== 30 && x !== 31) fence(m, x, 16, 'h');
  }
  for (let y = 12; y <= 15; y++) {
    fence(m, 27, y, 'v');
    fence(m, 35, y, 'v');
  }
  obj(m, { type: 'gate', x: 30, y: 16 });

  // well & shipping bin
  obj(m, { type: 'well', x: 11, y: 4, w: 2, h: 2, solid: true });
  obj(m, { type: 'bin', x: 22, y: 12, w: 2, h: 1, solid: true });

  // signs
  sign(m, 28, 1, 'Willow Town  ↑');
  sign(m, 1, 13, '←  Whisper River');
  sign(m, 30, 27, 'Mosswood Forest  ↓');
  sign(m, 12, 13, 'Field — till the soil, plant seeds, water daily.');

  // orchard + scenic trees
  tree(m, 3, 14, 1, true);
  tree(m, 4, 18, 0, true);
  tree(m, 4, 24, 2, true);
  tree(m, 12, 20, 1);
  tree(m, 17, 18, 2);
  tree(m, 20, 24, 0);
  tree(m, 33, 20, 1);
  tree(m, 34, 26, 0);
  tree(m, 1, 27, 2, true);
  tree(m, 8, 27, 1);
  tree(m, 14, 26, 2);
  tree(m, 22, 28, 0);
  rock(m, 18, 27, 0);
  rock(m, 6, 22, 1);
  stump(m, 9, 23);
  log(m, 19, 20, 'h');
  bush(m, 2, 20, 'berry');
  bush(m, 21, 16);
  bush(m, 33, 18);
  for (const [x, y, v] of [[2, 10, 0], [11, 11, 1], [16, 14, 2], [23, 20, 0], [34, 13, 1], [6, 12, 2], [15, 24, 0], [26, 25, 1], [33, 6, 2], [6, 20, 0]]) {
    flower(m, x, y, v);
  }
  // border trees
  for (let x = 0; x < m.w; x += 2) {
    if (x > 22 && x < 28) continue;
    if (x > 28 && x < 33) continue;
    if (getTile(m, x, 29) === T.GRASS) tree(m, x, 29, (x / 2) % 3);
  }
  for (let y = 0; y < m.h; y += 3) {
    if (y > 12 && y < 18) continue;
    if (getTile(m, 0, y) === T.GRASS) tree(m, 0, y, (y / 3) % 3);
    if (y > 12 && y < 18) continue;
    if (getTile(m, 35, y) === T.GRASS) tree(m, 35, y, (y / 3) % 3);
  }

  m.exits = [
    { x: 24, y: 0, w: 3, h: 1, to: 'town', spawn: { x: 25, y: 31 }, label: 'Willow Town' },
    { x: 0, y: 13, w: 1, h: 4, to: 'river', spawn: { x: 29, y: 18 }, label: 'Whisper River' },
    { x: 30, y: 29, w: 2, h: 1, to: 'forest', spawn: { x: 19, y: 1 }, label: 'Mosswood Forest' },
  ];
  return m;
}

/* ------------------------------------------------------------------ */
/* TOWN                                                               */
/* ------------------------------------------------------------------ */
function buildTown() {
  const m = makeMap('town', 'Willow Town', 48, 34, T.GRASS);
  m.ambient = 'town';
  m.defaultSpawn = { x: 25, y: 31 };

  rectTile(m, 8, 9, 33, 15, T.PLAZA);
  rectTile(m, 2, 7, 45, 2, T.PATH);
  rectTile(m, 2, 29, 45, 3, T.PATH);
  rectTile(m, 24, 29, 3, 5, T.PATH);
  rectTile(m, 0, 15, 8, 3, T.PATH);
  rectTile(m, 40, 15, 8, 3, T.PATH);
  rectTile(m, 8, 23, 33, 1, T.PLAZA);

  building(m, 4, 2, 7, 5, 'supermarket', 'Willow Market', 'supermarket', { x: 7, y: 7 });
  building(m, 14, 2, 7, 5, 'carpenter', 'Cedar Works', 'carpenter', { x: 17, y: 7 });
  building(m, 26, 2, 8, 5, 'ranch', 'Clover Ranch', 'ranch', { x: 29, y: 7 });
  building(m, 37, 2, 7, 5, 'clinic', 'Willow Clinic', 'clinic', { x: 40, y: 7 });

  building(m, 4, 24, 6, 5, 'bar', 'The Rusty Lantern', 'bar', { x: 6, y: 29 });
  building(m, 13, 24, 7, 5, 'restaurant', 'The Skillet', 'restaurant', { x: 16, y: 29 });
  building(m, 27, 24, 7, 5, 'blacksmith', 'Flint & Flame', 'blacksmith', { x: 30, y: 29 });
  building(m, 37, 23, 8, 6, 'townhall', 'Town Hall', 'townhall', { x: 40, y: 29 });

  obj(m, { type: 'fountain', x: 22, y: 15, w: 3, h: 3, solid: true });
  for (const [x, y] of [[10, 10], [39, 10], [10, 22], [39, 22], [20, 12], [30, 12], [20, 21], [30, 21]]) lamp(m, x, y);
  for (const [x, y] of [[14, 12], [32, 12], [14, 20], [32, 20]]) obj(m, { type: 'bench', x, y, solid: true });

  // small park corners
  tree(m, 2, 12, 0);
  tree(m, 45, 12, 1);
  tree(m, 2, 20, 2, true);
  tree(m, 45, 21, 0, true);
  tree(m, 23, 27, 1);
  tree(m, 34, 32, 0);
  tree(m, 2, 32, 2);
  bush(m, 12, 8, 'berry');
  bush(m, 35, 8);
  bush(m, 20, 26);
  for (const [x, y, v] of [[9, 9, 0], [38, 9, 1], [9, 22, 2], [38, 22, 0], [22, 20, 1], [31, 20, 2], [12, 27, 0], [36, 27, 1]]) flower(m, x, y, v);
  for (let x = 0; x < m.w; x += 3) {
    if (x > 2 && x < 46) continue;
    if (getTile(m, x, 33) === T.GRASS) tree(m, x, 33, x % 3);
  }
  for (let y = 2; y < m.h; y += 4) {
    if (getTile(m, 0, y) === T.GRASS) tree(m, 0, y, y % 3);
    if (getTile(m, 47, y) === T.GRASS) tree(m, 47, y, y % 3);
  }

  m.exits = [
    { x: 24, y: 33, w: 3, h: 1, to: 'farm', spawn: { x: 25, y: 2 }, label: 'Your Farm' },
    { x: 0, y: 15, w: 1, h: 3, to: 'river', spawn: { x: 28, y: 6 }, label: 'Whisper River' },
    { x: 47, y: 15, w: 1, h: 3, to: 'beach', spawn: { x: 2, y: 15 }, label: 'Sunstone Beach' },
  ];
  return m;
}

/* ------------------------------------------------------------------ */
/* FOREST                                                             */
/* ------------------------------------------------------------------ */
function buildForest() {
  const m = makeMap('forest', 'Mosswood Forest', 40, 32, T.FOREST);
  m.ambient = 'forest';
  m.defaultSpawn = { x: 19, y: 1 };

  // winding path
  rectTile(m, 18, 0, 4, 9, T.PATH);
  rectTile(m, 14, 8, 8, 3, T.PATH);
  rectTile(m, 12, 10, 4, 6, T.PATH);
  rectTile(m, 8, 15, 8, 3, T.PATH);
  rectTile(m, 8, 17, 4, 10, T.PATH);
  rectTile(m, 6, 25, 9, 4, T.PATH);
  rectTile(m, 22, 8, 10, 4, T.PATH);
  rectTile(m, 24, 11, 3, 2, T.PATH);

  // clearing grass patches
  rectTile(m, 4, 24, 12, 6, T.GRASS);
  rectTile(m, 22, 17, 10, 7, T.GRASS);
  rectTile(m, 26, 5, 9, 7, T.GRASS);

  building(m, 28, 5, 6, 5, 'cabin', 'Mosswood Cabin', null, { x: 31, y: 10 });

  // keep a grid of cells clear of trees
  const blocked = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = getTile(m, x, y);
    if (t === T.PATH || t === T.GRASS) blocked[y * m.w + x] = 1;
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (x < 2 || x >= m.w - 2 || y < 1 || y >= m.h - 2) blocked[y * m.w + x] = 1;
  }
  for (let y = 3; y <= 7; y++) for (let x = 27; x <= 34; x++) blocked[y * m.w + x] = 1;

  const rng = rngFactory(98765);
  let placed = 0;
  for (let tries = 0; tries < 500 && placed < 90; tries++) {
    const x = 2 + Math.floor(rng() * (m.w - 4));
    const y = 2 + Math.floor(rng() * (m.h - 5));
    if (blocked[y * m.w + x]) continue;
    // avoid hugging walkable cells too closely
    let nearPath = false;
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      if (getTile(m, x + xx, y + yy) === T.PATH) nearPath = true;
    }
    if (nearPath && rng() < 0.7) continue;
    tree(m, x, y, Math.floor(rng() * 3), rng() < 0.08);
    blocked[y * m.w + x] = 1;
    placed++;
  }

  // forage + resources at memorable spots
  mushroom(m, 6, 14); mushroom(m, 10, 22); mushroom(m, 15, 18);
  mushroom(m, 23, 21); mushroom(m, 33, 12); mushroom(m, 12, 27);
  mushroom(m, 26, 26); mushroom(m, 8, 28); mushroom(m, 35, 18);
  bush(m, 10, 12, 'berry'); bush(m, 27, 18, 'berry'); bush(m, 7, 26, 'berry'); bush(m, 21, 14, 'berry');
  for (const [x, y] of [[5, 20], [13, 23], [16, 28], [25, 14], [34, 24], [30, 27], [18, 13], [22, 27]]) {
    if (rng() < 0.5) stump(m, x, y); else rock(m, x, y, Math.floor(rng() * 2));
  }
  log(m, 9, 17, 'h'); log(m, 24, 12, 'h'); log(m, 31, 19, 'v');
  sign(m, 20, 2, 'Mosswood Forest — forage daily, chop responsibly.');
  flower(m, 6, 29, 0); flower(m, 16, 29, 1); flower(m, 28, 22, 2); flower(m, 12, 17, 0);

  m.exits = [
    { x: 18, y: 0, w: 4, h: 1, to: 'farm', spawn: { x: 30, y: 27 }, label: 'Your Farm' },
  ];
  return m;
}

/* ------------------------------------------------------------------ */
/* RIVER                                                              */
/* ------------------------------------------------------------------ */
function buildRiver() {
  const m = makeMap('river', 'Whisper River', 32, 36, T.GRASS);
  m.ambient = 'river';
  m.defaultSpawn = { x: 27, y: 18 };

  rectTile(m, 10, 0, 9, 36, T.WATER);
  rectTile(m, 10, 7, 9, 2, T.BRIDGE);
  rectTile(m, 14, 16, 5, 2, T.BRIDGE);
  rectTile(m, 19, 4, 12, 2, T.PATH);
  rectTile(m, 19, 16, 12, 2, T.PATH);
  rectTile(m, 24, 0, 3, 5, T.PATH);
  rectTile(m, 19, 5, 2, 12, T.PATH);
  rectTile(m, 4, 7, 6, 2, T.PATH);
  rectTile(m, 4, 8, 2, 16, T.PATH);
  rectTile(m, 4, 23, 7, 3, T.GRASS);

  // bank decorations
  for (let y = 1; y < 36; y += 3) {
    if (y > 5 && y < 9) continue;
    if (y > 14 && y < 19) continue;
    if (y > 4 && y < 7) continue;
    if (getTile(m, 8, y) === T.GRASS) tree(m, 8, y, y % 3, y % 4 === 0);
    if (getTile(m, 20, y) === T.GRASS) tree(m, 20, y, (y + 1) % 3);
  }
  for (let y = 1; y < 35; y += 2) {
    if (y > 5 && y < 9) continue;
    obj(m, { type: 'reeds', x: 9, y });
    obj(m, { type: 'reeds', x: 19, y });
  }
  for (let y = 0; y < 36; y += 4) {
    if (getTile(m, 0, y) === T.GRASS) tree(m, 0, y, y % 3);
    if (getTile(m, 31, y) === T.GRASS) tree(m, 31, y, (y + 1) % 3);
  }
  for (const [x, y] of [[3, 12], [5, 18], [6, 30], [27, 10], [28, 26], [23, 30], [25, 22]]) {
    if (getTile(m, x, y) === T.GRASS) rock(m, x, y, x % 2);
  }
  for (const [x, y, v] of [[6, 9, 0], [7, 20, 1], [22, 7, 2], [28, 14, 0], [26, 28, 1], [5, 33, 2]]) flower(m, x, y, v);
  bush(m, 24, 12, 'berry');
  bush(m, 3, 14, 'berry');
  mushroom(m, 4, 26); mushroom(m, 27, 20);
  sign(m, 26, 2, 'Town  ↑     Bridge →     Your farm  →');
  obj(m, { type: 'dockpost', x: 14, y: 15 });
  obj(m, { type: 'dockpost', x: 14, y: 18 });
  obj(m, { type: 'dockpost', x: 17, y: 15 });
  obj(m, { type: 'dockpost', x: 17, y: 18 });

  m.exits = [
    { x: 31, y: 16, w: 1, h: 2, to: 'farm', spawn: { x: 2, y: 14 }, label: 'Your Farm' },
    { x: 24, y: 0, w: 3, h: 1, to: 'town', spawn: { x: 2, y: 16 }, label: 'Willow Town' },
  ];
  return m;
}

/* ------------------------------------------------------------------ */
/* BEACH                                                              */
/* ------------------------------------------------------------------ */
function buildBeach() {
  const m = makeMap('beach', 'Sunstone Beach', 40, 30, T.SAND);
  m.ambient = 'beach';
  m.defaultSpawn = { x: 4, y: 15 };

  // sea + a wavy shore
  rectTile(m, 20, 0, 20, 30, T.SEA);
  for (let y = 0; y < 30; y++) {
    const offset = Math.round(Math.sin(y * 0.55) * 1.2);
    if (offset > 0) rectTile(m, 20, y, offset, 1, T.SAND);
    if (offset < 0) rectTile(m, 20 + offset, y, -offset, 1, T.SEA);
  }
  rectTile(m, 16, 15, 5, 2, T.BRIDGE);
  rectTile(m, 0, 15, 5, 2, T.PATH);
  rectTile(m, 2, 9, 2, 12, T.PATH);
  rectTile(m, 2, 9, 10, 2, T.PATH);

  // palms
  for (const [x, y] of [[6, 6], [11, 5], [14, 11], [7, 20], [13, 24], [17, 27], [16, 7], [4, 25]]) tree(m, x, y, 2, false);
  bush(m, 12, 18); bush(m, 5, 13);
  rock(m, 17, 19, 0); rock(m, 8, 12, 1); rock(m, 15, 26, 0);
  log(m, 9, 22, 'h'); log(m, 18, 8, 'v');
  for (const [x, y] of [[7, 15], [9, 11], [12, 14], [14, 20], [6, 23], [16, 17], [11, 27], [18, 13], [13, 8]]) shell(m, x, y);
  obj(m, { type: 'umbrella', x: 8, y: 16 });
  obj(m, { type: 'sandcastle', x: 12, y: 17 });
  obj(m, { type: 'dockpost', x: 16, y: 14 });
  obj(m, { type: 'dockpost', x: 16, y: 18 });
  obj(m, { type: 'dockpost', x: 19, y: 14 });
  obj(m, { type: 'dockpost', x: 19, y: 18 });
  sign(m, 2, 13, 'Sunstone Beach — big fish off the dock. Mind the tide.');
  for (const [x, y, v] of [[6, 10, 0], [9, 19, 1], [12, 23, 2], [5, 27, 0]]) flower(m, x, y, v);
  for (let y = 0; y < 30; y += 3) {
    if (y > 8 && y < 12) continue;
    if (getTile(m, 0, y) === T.SAND) tree(m, 0, y, (y / 3) % 3);
  }
  for (let x = 1; x < 19; x += 4) {
    if (getTile(m, x, 29) === T.SAND) flower(m, x, 29, x % 3);
  }

  m.exits = [
    { x: 0, y: 13, w: 1, h: 6, to: 'town', spawn: { x: 45, y: 16 }, label: 'Willow Town' },
  ];
  return m;
}

export function buildMaps() {
  const maps = {
    farm: buildFarm(),
    town: buildTown(),
    forest: buildForest(),
    river: buildRiver(),
    beach: buildBeach(),
  };
  // attach NPCs
  for (const npc of NPCS) {
    const map = maps[npc.map];
    if (!map) continue;
    map.npcs.push({
      ...npc,
      px: npc.x * TILE + TILE / 2,
      py: npc.y * TILE + TILE - 2,
      homeX: npc.x * TILE + TILE / 2,
      homeY: npc.y * TILE + TILE - 2,
      dir: 'down', frame: 0, offsetX: 0, offsetY: 0,
      wanderT: 0, moving: false, talkedToday: false,
    });
  }
  return maps;
}

export function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return -1;
  return map.tiles[ty * map.w + tx];
}
