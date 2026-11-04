// Willow Creek — a complete cozy pixel farming game.
import {
  CROPS, SEED_CYCLE, SEED_TO_CROP, ITEMS, ANIMALS, ANIMAL_NAMES, FISH,
  SHOP_INFO, SHOP_STOCK, SHOP_ICONS, NPCS, QUESTS, PALETTES, DEFAULT_PALETTE,
  TOOLS, WEATHER, SEASONS,
} from './data.js';
import { buildMaps, tileAt, isSolidTile, TILE, T } from './maps.js';
import {
  buildMapCache, drawObject, drawPlot, drawAnimal, drawCharacter,
  drawCharacterShadow, drawPortrait, drawCatchScene, drawWaterSparkle,
} from './art.js';
import {
  startMusic, stopMusic, sfx, setMuted, isMuted, initMuted, unlockAudio,
} from './audio.js';

const SAVE_KEY = 'willow-creek-save-v1';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

let maps = {};
let caches = {};
let mode = 'menu'; // menu | creation | playing
let game = null;
let demo = null;
let camera = { x: 64, y: 40 };
let viewW = 480, viewH = 270, pixelScale = 3;
let time = 0;
let lastFrame = performance.now();
let overlayStack = [];
let transitioning = false;
let transitionCooldown = 0;
let activeShop = null;
let activeDialogue = null;
let fishing = null;
let particles = [];
let ambientTimer = 0;
let autosaveTimer = 0;
let hudTimer = 0;
let toastCount = 0;
let soundOn = true;
let isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
let creationDirty = false;

let selectedCreation = {
  name: 'Farmer', gender: 'neutral', style: 'overalls',
  skin: PALETTES.skin[0], hair: PALETTES.hair[0], shirt: PALETTES.shirt[0],
};

const input = { keys: new Set(), joy: { x: 0, y: 0, active: false } };
const DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const mapNow = () => maps[game.mapId] || maps.farm;
const fmtTime = m => {
  const total = Math.floor(m) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};
const seasonNow = () => SEASONS[Math.floor((game.day - 1) / 28) % SEASONS.length];
const energyPct = () => clamp((game.energy / game.maxEnergy) * 100, 0, 100);
const saveExists = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } };
const isBusy = () => mode !== 'playing' || overlayStack.length > 0 || transitioning;

function weighted(list) {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of list) { r -= e.weight; if (r <= 0) return e; }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */
function emptyStats() {
  return {
    planted: 0, watered: 0, harvested: 0, fish: 0, animalFed: 0, animalsBought: 0,
    collected: 0, earnings: 0, dayEarnings: 0, talkedMayor: false, slept: 0,
    talks: 0, mailDay: 0, wellDay: 0, gifted: 0,
    visited: { farm: true, town: false, forest: false, river: false, beach: false },
    shopsVisited: {},
  };
}

function createNewState(c) {
  const state = {
    version: 1,
    name: (c.name || 'Farmer').trim().slice(0, 14) || 'Farmer',
    gender: c.gender,
    palette: {
      skin: c.skin, hair: c.hair, shirt: c.shirt,
      pants: c.style === 'dress' ? '#6a5a7a' : '#4a5a7a',
      style: c.style, gender: c.gender, accessory: null,
    },
    money: 500,
    energy: 100,
    maxEnergy: 100,
    day: 1,
    minutes: 6 * 60,
    weather: 'sunny',
    mapId: 'farm',
    player: { x: 25 * TILE + 8, y: 18 * TILE + 14, dir: 'down', frame: 0, walkPhase: 0 },
    inventory: { turnip_seed: 8, feed: 2, sandwich: 1 },
    plots: {},
    animals: [],
    upgrades: { house: 1, axe: 1, can: 1, rod: 1, sprinkler: false, farmExpanded: false },
    tool: 'hoe',
    seed: 'turnip_seed',
    questIndex: 0,
    stats: emptyStats(),
    npcFriends: {},
    playSeconds: 0,
    savedAt: null,
  };
  // Start with a few ready-to-till rows framing the field.
  return state;
}

function createDemoState() {
  const plots = {};
  const crops = ['turnip', 'strawberry', 'pumpkin', 'turnip', 'strawberry', 'pumpkin'];
  crops.forEach((crop, i) => {
    const x = 14 + i, y = 6 + (i % 2);
    plots[`farm:${x}:${y}`] = { crop, days: CROPS[crop].days, watered: false, ready: true };
  });
  plots['farm:16:8'] = { crop: 'tree', days: 4, watered: false, ready: true };
  return {
    version: 1,
    name: 'Farmer',
    gender: 'neutral',
    palette: { ...DEFAULT_PALETTE, style: 'overalls', gender: 'neutral', accessory: null },
    money: 500, energy: 100, maxEnergy: 100, day: 3, minutes: 10 * 60 + 20,
    weather: 'sunny', mapId: 'farm',
    player: { x: 20 * TILE + 8, y: 16 * TILE + 14, dir: 'down', frame: 0, walkPhase: 0 },
    inventory: {}, plots, animals: [
      { id: 'demo-1', type: 'cow', name: 'Buttercup', px: 30 * TILE, py: 14 * TILE, dir: 'right', phase: 0.4, fed: true, productReady: false, moving: false, targetX: 30 * TILE, targetY: 14 * TILE, wanderT: 3 },
      { id: 'demo-2', type: 'chicken', name: 'Pip', px: 33 * TILE, py: 13 * TILE, dir: 'left', phase: 1.8, fed: true, productReady: true, moving: false, targetX: 33 * TILE, targetY: 13 * TILE, wanderT: 2 },
    ],
    upgrades: { house: 1, axe: 1, can: 1, rod: 1, sprinkler: false, farmExpanded: false },
    tool: 'hoe', seed: 'turnip_seed', questIndex: 0, stats: emptyStats(), npcFriends: {},
    playSeconds: 0, savedAt: null,
  };
}

function normalizeLoadedState(raw) {
  if (!raw || typeof raw !== 'object' || !raw.mapId || !maps[raw.mapId]) return null;
  const state = createNewState({
    name: raw.name || 'Farmer',
    gender: raw.gender || 'neutral',
    style: raw.palette?.style || 'overalls',
    skin: raw.palette?.skin || DEFAULT_PALETTE.skin,
    hair: raw.palette?.hair || DEFAULT_PALETTE.hair,
    shirt: raw.palette?.shirt || DEFAULT_PALETTE.shirt,
  });
  Object.assign(state, raw);
  state.palette = { ...state.palette, ...(raw.palette || {}) };
  state.player = { ...state.player, ...(raw.player || {}) };
  state.inventory = { ...(raw.inventory || {}) };
  state.plots = { ...(raw.plots || {}) };
  state.animals = Array.isArray(raw.animals) ? raw.animals : [];
  state.upgrades = { ...state.upgrades, ...(raw.upgrades || {}) };
  state.stats = { ...emptyStats(), ...(raw.stats || {}) };
  state.stats.visited = { ...emptyStats().visited, ...(raw.stats?.visited || {}) };
  state.stats.shopsVisited = { ...(raw.stats?.shopsVisited || {}) };
  state.npcFriends = { ...(raw.npcFriends || {}) };
  state.minutes = clamp(Number(state.minutes) || 360, 360, 1559);
  state.energy = clamp(Number(state.energy) || 0, 0, state.maxEnergy || 100);
  state.maxEnergy = Math.max(100, Number(state.maxEnergy) || 100);
  state.questIndex = clamp(Number(state.questIndex) || 0, 0, QUESTS.length);
  if (!ITEMS[state.seed]) state.seed = 'turnip_seed';
  if (!TOOLS.some(t => t.id === state.tool)) state.tool = 'hoe';
  return state;
}

function saveGame(show = true) {
  if (!game) return false;
  try {
    game.savedAt = Date.now();
    const copy = JSON.parse(JSON.stringify(game));
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    updateContinueButton();
    if (show) toast('Game saved.', '💾', 'good');
    return true;
  } catch (e) {
    if (show) toast('Could not save this game.', '⚠️', 'bad');
    return false;
  }
}

function loadSavedGame() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return normalizeLoadedState(raw);
  } catch { return null; }
}

/* ------------------------------------------------------------------ */
/* Inventory & economy                                                */
/* ------------------------------------------------------------------ */
function itemCount(id) { return game?.inventory[id] || 0; }
function addItem(id, n = 1, silent = false) {
  if (!game || n <= 0) return;
  game.inventory[id] = itemCount(id) + n;
  if (!silent) toast(`+${n} ${ITEMS[id]?.name || id}`, ITEMS[id]?.icon || '📦', 'good');
  renderHotbar();
}
function removeItem(id, n = 1) {
  if (!game) return false;
  const have = itemCount(id);
  if (have < n) return false;
  game.inventory[id] = have - n;
  if (game.inventory[id] <= 0) delete game.inventory[id];
  renderHotbar();
  return true;
}
function addMoney(n, silent = false) {
  if (!game) return;
  game.money += n;
  if (n > 0) {
    game.stats.earnings += n;
    game.stats.dayEarnings += n;
  }
  updateHud(true);
  if (!silent && n > 0) toast(`+${n}g`, '🪙', 'good');
}
function spendMoney(n) {
  if (!game || game.money < n) { toast('Not enough gold.', '🪙', 'bad'); sfx('error'); return false; }
  game.money -= n;
  updateHud(true);
  return true;
}
function useEnergy(n) {
  if (!game) return false;
  if (game.energy < n) {
    toast('You are exhausted. Sleep at the farmhouse.', '😴', 'bad');
    sfx('error');
    return false;
  }
  game.energy = Math.max(0, game.energy - n);
  updateHud(true);
  return true;
}
function restoreEnergy(n) {
  const before = game.energy;
  game.energy = Math.min(game.maxEnergy, game.energy + n);
  updateHud(true);
  return game.energy - before;
}

/* ------------------------------------------------------------------ */
/* UI basics                                                          */
/* ------------------------------------------------------------------ */
function toast(text, icon = '', kind = '') {
  const host = $('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = `<span class="t-icon">${icon || '•'}</span><span>${escapeHtml(text)}</span>`;
  host.appendChild(el);
  toastCount++;
  while (host.children.length > 4) host.removeChild(host.firstChild);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function updateHud(force = false) {
  if (!game) return;
  const pct = energyPct();
  $('hud-day').textContent = `Day ${game.day}`;
  $('hud-season').textContent = seasonNow();
  $('hud-weather').textContent = WEATHER[game.weather]?.icon || '☀️';
  $('hud-weather').title = WEATHER[game.weather]?.name || 'Sunny';
  $('hud-clock').textContent = fmtTime(game.minutes);
  $('hud-location').textContent = mapNow().name;
  $('hud-money').textContent = game.money.toLocaleString();
  $('hud-energy').style.width = `${pct}%`;
  $('hud-energy').style.background = pct < 25 ? 'linear-gradient(180deg,#ff8b6a,#d9473b)' : pct < 55 ? 'linear-gradient(180deg,#ffd76a,#e8a12e)' : 'linear-gradient(180deg,#a8e46a,#5fae3e)';
  $('hud-energy-text').textContent = `${Math.floor(game.energy)}/${game.maxEnergy}`;
  const quest = QUESTS[game.questIndex];
  $('quest-text').textContent = quest ? quest.text : 'All quests complete — enjoy the farm life!';
  $('quest-reward').textContent = quest ? `Reward: ${quest.reward}g` : '✦ Free spirit ✦';
  $('inv-money').textContent = `${game.money.toLocaleString()}g`;
}

function checkQuests() {
  if (!game || game.questIndex >= QUESTS.length) return;
  const done = [];
  let guard = 0;
  while (game.questIndex < QUESTS.length && guard++ < 10) {
    const q = QUESTS[game.questIndex];
    if (!q.check(game)) break;
    game.questIndex++;
    addMoney(q.reward, true);
    done.push(q);
    sfx('coin');
  }
  if (done.length === 1) {
    toast(`Quest complete: ${done[0].text} +${done[0].reward}g`, '✦', 'quest');
  } else if (done.length > 1) {
    const total = done.reduce((sum, q) => sum + q.reward, 0);
    toast(`${done.length} quests complete! +${total}g`, '✦', 'quest');
  }
  updateHud(true);
  renderHotbar();
}

/* ------------------------------------------------------------------ */
/* Canvas sizing & camera                                             */
/* ------------------------------------------------------------------ */
let demoCam = { x: 64, y: 40 };

function resize() {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(320, window.innerHeight);
  const s = clamp(Math.round(Math.min(w / 430, h / 250)), 2, 4);
  pixelScale = s;
  viewW = Math.ceil(w / s);
  viewH = Math.ceil(h / s);
  canvas.width = viewW;
  canvas.height = viewH;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.imageSmoothingEnabled = false;
  demoCam.x = clamp(17 * TILE - viewW / 2, 0, Math.max(0, 36 * TILE - viewW));
  demoCam.y = clamp(11 * TILE - viewH / 2, 0, Math.max(0, 30 * TILE - viewH));
  if (mode === 'playing' && game) snapCamera();
}

function snapCamera() {
  const map = mapNow();
  const p = game.player;
  camera.x = clamp(p.x - viewW / 2, 0, Math.max(0, map.w * TILE - viewW));
  camera.y = clamp(p.y - viewH / 2, 0, Math.max(0, map.h * TILE - viewH));
}

function updateCamera(dt) {
  if (!game) return;
  const map = mapNow();
  const p = game.player;
  const tx = clamp(p.x - viewW / 2, 0, Math.max(0, map.w * TILE - viewW));
  const ty = clamp(p.y - viewH / 2, 0, Math.max(0, map.h * TILE - viewH));
  const t = Math.min(1, dt * 8);
  camera.x += (tx - camera.x) * t;
  camera.y += (ty - camera.y) * t;
}

function nightAlpha(m) {
  const t = m % 1440;
  if (t < 360) return 0.52;
  if (t < 480) return 0.32 * (1 - (t - 360) / 120);
  if (t < 1020) return 0;
  if (t < 1260) return 0.48 * ((t - 1020) / 240);
  if (t < 1440) return 0.48 + 0.14 * ((t - 1260) / 180);
  return 0.62;
}

/* ------------------------------------------------------------------ */
/* Particles                                                          */
/* ------------------------------------------------------------------ */
function addParticle(x, y, opts = {}) {
  if (particles.length > 280) particles.shift();
  particles.push({
    x, y, vx: opts.vx ?? rand(-8, 8), vy: opts.vy ?? rand(-14, -4),
    life: opts.life ?? rand(0.5, 1.1), max: opts.life ?? 1,
    size: opts.size ?? 1, color: opts.color ?? '#f2c14f',
    gravity: opts.gravity ?? 18, type: opts.type ?? 'rect',
  });
}
function heartBurst(x, y, n = 5) {
  for (let i = 0; i < n; i++) {
    addParticle(x + rand(-8, 8), y - rand(4, 16), {
      vx: rand(-10, 10), vy: rand(-26, -12), life: rand(0.7, 1.2), max: 1.2,
      size: 2, color: pick(['#e878a8', '#f28ab2', '#e05a7a']), gravity: -4, type: 'heart',
    });
  }
}
function sparkleBurst(x, y, color = '#ffe27a', n = 6) {
  for (let i = 0; i < n; i++) {
    addParticle(x + rand(-8, 8), y + rand(-8, 8), {
      vx: rand(-16, 16), vy: rand(-20, -2), life: rand(0.35, 0.8), max: 0.8,
      size: 1, color, gravity: 10, type: 'spark',
    });
  }
}
function dustBurst(x, y, color = '#8a6441', n = 5) {
  for (let i = 0; i < n; i++) {
    addParticle(x + rand(-6, 6), y + rand(-3, 2), {
      vx: rand(-20, 20), vy: rand(-18, -4), life: rand(0.3, 0.7), max: 0.7,
      size: randInt(1, 2), color, gravity: 30, type: 'rect',
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
  }
}
function drawParticles(c) {
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    c.globalAlpha = a;
    if (p.type === 'heart') {
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
      c.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
      c.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 1, 1);
      c.fillRect(Math.round(p.x) + 2, Math.round(p.y) - 1, 1, 1);
    } else if (p.type === 'spark') {
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      if (a > 0.6) {
        c.fillRect(Math.round(p.x) - 1, Math.round(p.y), 3, 1);
        c.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 3);
      }
    } else {
      c.fillStyle = p.color;
      c.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
  }
  c.globalAlpha = 1;
}

function updateAmbient(dt, state) {
  ambientTimer -= dt;
  if (ambientTimer > 0) return;
  const map = maps[state.mapId];
  ambientTimer = rand(0.5, 1.5);
  const cx = mode === 'playing' ? camera.x + rand(20, viewW - 20) : demoCam.x + rand(20, viewW - 20);
  const cy = mode === 'playing' ? camera.y + rand(10, viewH - 20) : demoCam.y + rand(10, viewH - 20);
  if (state.mapId === 'forest') {
    addParticle(cx, cy - 20, { vx: rand(-10, 10), vy: rand(3, 9), life: rand(1.4, 2.4), max: 2.4, size: 2, color: pick(['#7aa84a', '#c9a04a', '#5b8d42']), gravity: 2, type: 'rect' });
  } else if (state.mapId === 'beach' || state.mapId === 'river') {
    if (Math.random() < 0.5) sparkleBurst(cx, cy, '#c9ecff', 1);
  } else if (state.mapId === 'town') {
    if (Math.random() < 0.35) addParticle(cx, cy - 16, { vx: rand(4, 14), vy: rand(-3, 3), life: rand(1.2, 2), max: 2, size: 1, color: '#f7e27a', gravity: 0, type: 'spark' });
  } else if (state.mapId === 'farm') {
    if (nightAlpha(state.minutes) > 0.2) {
      if (Math.random() < 0.6) addParticle(cx, cy, { vx: rand(-4, 4), vy: rand(-4, 4), life: rand(1.5, 3), max: 3, size: 1, color: '#d9e66a', gravity: 0, type: 'spark' });
    } else if (Math.random() < 0.5) {
      addParticle(cx, cy, { vx: rand(-8, 8), vy: rand(-6, 6), life: rand(1, 2), max: 2, size: 1, color: pick(['#ffffff', '#f7e27a']), gravity: 0, type: 'spark' });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Collision & movement                                               */
/* ------------------------------------------------------------------ */
function objectCollision(o) {
  const x = o.x * TILE, y = o.y * TILE;
  switch (o.type) {
    case 'building': return { x: x + 2, y: y + 6, w: o.w * TILE - 4, h: o.h * TILE - 8 };
    case 'tree': return { x: x + 4, y: y + 6, w: 8, h: 9 };
    case 'fence': return o.orient === 'v' ? { x: x + 7, y: y + 1, w: 5, h: 14 } : { x: x + 1, y: y + 7, w: 14, h: 5 };
    case 'rock': return { x: x + 4, y: y + 8, w: 10, h: 6 };
    case 'stump': return { x: x + 3, y: y + 9, w: 10, h: 5 };
    case 'bush': return { x: x + 3, y: y + 7, w: 10, h: 7 };
    case 'log': return o.dir === 'v' ? { x: x + 4, y: y + 2, w: 8, h: 12 } : { x: x + 1, y: y + 8, w: 14, h: 6 };
    case 'bin': return { x: x + 2, y: y + 4, w: o.w * TILE - 4, h: 12 };
    case 'well': return { x: x + 3, y: y + 8, w: o.w * TILE - 6, h: 18 };
    case 'fountain': return { x: x + 2, y: y + 10, w: o.w * TILE - 4, h: 26 };
    case 'sign': return { x: x + 6, y: y + 6, w: 4, h: 9 };
    case 'lamp': return { x: x + 6, y: y + 8, w: 4, h: 7 };
    case 'bench': return { x: x + 1, y: y + 4, w: 14, h: 10 };
    case 'umbrella': return { x: x + 6, y: y + 8, w: 4, h: 7 };
    case 'sandcastle': return { x: x + 3, y: y + 6, w: 11, h: 8 };
    case 'gate': return null;
    default: return o.solid ? { x: x + 2, y: y + 4, w: 12, h: 10 } : null;
  }
}

function collidesAt(x, y, map) {
  if (x < 2 || y < 2 || x > map.w * TILE - 2 || y > map.h * TILE - 2) return true;
  const l = x - 4, r = x + 4, t = y - 7, b = y;
  const tx0 = Math.floor(l / TILE), tx1 = Math.floor(r / TILE);
  const ty0 = Math.floor(t / TILE), ty1 = Math.floor(b / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const tile = tileAt(map, tx, ty);
      if (tile === -1 || isSolidTile(tile)) return true;
    }
  }
  for (const o of map.objects) {
    if (!o.solid) continue;
    const rect = objectCollision(o);
    if (!rect) continue;
    if (l < rect.x + rect.w && r > rect.x && t < rect.y + rect.h && b > rect.y) return true;
  }
  return false;
}

function playerTile() {
  return { x: Math.floor(game.player.x / TILE), y: Math.floor((game.player.y - 2) / TILE) };
}
function facingTile() {
  const pt = playerTile();
  const d = DIRV[game.player.dir] || DIRV.down;
  return { x: pt.x + d[0], y: pt.y + d[1] };
}

function updatePlayer(dt) {
  const p = game.player;
  let dx = 0, dy = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) dx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) dx += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) dy -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) dy += 1;
  if (input.joy.active) { dx += input.joy.x; dy += input.joy.y; }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  const moving = Math.abs(dx) > 0.08 || Math.abs(dy) > 0.08;
  if (moving) {
    if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
    else p.dir = dy < 0 ? 'up' : 'down';
    let speed = game.energy <= 0 ? 42 : 64;
    const running = (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && game.energy > 2;
    if (running) {
      speed = 94;
      game.energy = Math.max(0, game.energy - dt * 1.3);
    }
    const map = mapNow();
    const mx = dx * speed * dt;
    const my = dy * speed * dt;
    if (!collidesAt(p.x + mx, p.y, map)) p.x += mx;
    if (!collidesAt(p.x, p.y + my, map)) p.y += my;
    p.walkPhase += dt * speed * 0.055;
    p.frame = Math.floor(p.walkPhase * 2) % 2 === 0 ? 1 : 2;
    if (time - (p.lastStep || 0) > (running ? 0.24 : 0.34)) {
      p.lastStep = time;
      if (Math.random() < 0.6) sfx('step');
    }
    checkExits();
  } else {
    p.frame = 0;
    p.walkPhase = 0;
  }
}

function checkExits() {
  if (transitionCooldown > 0 || transitioning) return;
  const map = mapNow();
  const p = game.player;
  const tx = Math.floor(p.x / TILE);
  const ty = Math.floor((p.y - 2) / TILE);
  for (const ex of map.exits) {
    if (tx >= ex.x && tx < ex.x + ex.w && ty >= ex.y && ty < ex.y + ex.h) {
      switchMap(ex);
      return;
    }
  }
}

function switchMap(ex) {
  if (transitioning) return;
  transitioning = true;
  transitionCooldown = 2.2;
  const fade = $('fade');
  fade.classList.add('active');
  sfx('open');
  setTimeout(() => {
    game.mapId = ex.to;
    const sp = ex.spawn;
    game.player.x = sp.x * TILE + 8;
    game.player.y = sp.y * TILE + 14;
    game.player.dir = 'down';
    game.player.frame = 0;
    game.stats.visited[ex.to] = true;
    snapCamera();
    updateHud(true);
    startMusic(ex.to);
    toast(`Arrived at ${maps[ex.to].name}`, '🧭');
    checkQuests();
    setTimeout(() => {
      fade.classList.remove('active');
      transitioning = false;
    }, 240);
  }, 220);
}

/* ------------------------------------------------------------------ */
/* Interaction discovery                                              */
/* ------------------------------------------------------------------ */
function distTo(x, y) {
  return Math.hypot(game.player.x - x, game.player.y - y);
}

function findInteraction() {
  const map = mapNow();
  const p = game.player;

  // NPCs and doors: pick whichever is closest, so a shop door is not
  // blocked just because a shopkeeper happens to be standing nearby.
  let bestNpc = null, npcD = 32;
  for (const npc of map.npcs) {
    const d = distTo(npc.px, npc.py);
    if (d < npcD) { npcD = d; bestNpc = npc; }
  }
  let bestDoor = null, doorD = 31;
  for (const o of map.objects) {
    if (o.type !== 'building' || !o.door) continue;
    const d = distTo(o.door.x * TILE + 8, o.door.y * TILE + 10);
    if (d < doorD) { doorD = d; bestDoor = o; }
  }
  if (bestNpc && (!bestDoor || npcD <= doorD)) return { kind: 'npc', npc: bestNpc, label: `Talk to ${bestNpc.name}` };
  if (bestDoor) {
    const info = SHOP_INFO[bestDoor.shop];
    const label = bestDoor.shop === 'home' ? 'Go home (sleep & save)'
      : bestDoor.shop ? `Enter ${info?.name || bestDoor.name}`
        : `Look at ${bestDoor.name}`;
    return { kind: 'door', obj: bestDoor, label };
  }

  // Animals
  let bestD;
  if (game.mapId === 'farm') {
    let bestAnimal = null; bestD = 26;
    for (const a of game.animals) {
      const d = Math.hypot(p.x - a.px, p.y - a.py);
      if (d < bestD) { bestD = d; bestAnimal = a; }
    }
    if (bestAnimal) {
      const def = ANIMALS[bestAnimal.type];
      const label = bestAnimal.productReady ? `Collect ${def.productName}`
        : !bestAnimal.fed && game.tool === 'feed' ? `Feed ${bestAnimal.name}`
          : `Pet ${bestAnimal.name}`;
      return { kind: 'animal', animal: bestAnimal, label };
    }
  }

  // Shipping bin
  const bin = map.objects.find(o => o.type === 'bin');
  if (bin && distTo(bin.x * TILE + 16, bin.y * TILE + 10) < 34) {
    return { kind: 'bin', obj: bin, label: 'Open shipping bin' };
  }

  // Facing plot / soil
  const ft = facingTile();
  const key = `${game.mapId}:${ft.x}:${ft.y}`;
  const plot = game.plots[key];
  if (plot) {
    if (plot.ready) return { kind: 'plot', plotKey: key, plot, label: `Harvest ${CROPS[plot.crop]?.name || 'crop'}` };
    if (!plot.crop) {
      const label = game.tool === 'seeds' ? `Plant ${ITEMS[game.seed]?.name || 'seed'}`
        : game.tool === 'hoe' ? 'Till soil' : 'Empty tilled soil';
      return { kind: 'plot', plotKey: key, plot, label };
    }
    const crop = CROPS[plot.crop];
    const label = game.tool === 'can' && !plot.watered ? `Water ${crop.name}`
      : `${crop.name} · ${plot.days}/${crop.days} days${plot.watered ? ' · watered' : ''}`;
    return { kind: 'plot', plotKey: key, plot, label };
  }

  // Tillable soil
  if (game.mapId === 'farm') {
    const tile = tileAt(map, ft.x, ft.y);
    if ((tile === T.GRASS || tile === T.DIRT) && !objectAtTile(map, ft.x, ft.y)) {
      if (game.tool === 'hoe') return { kind: 'soil', tile: ft, label: 'Till soil' };
    }
  }

  // Fishing water
  const ftile = tileAt(map, ft.x, ft.y);
  if (ftile === T.WATER || ftile === T.SEA) {
    return { kind: 'water', label: game.tool === 'rod' ? 'Cast fishing line' : 'Fishing spot (equip rod)' };
  }

  // Forage
  let bestForage = null; bestD = 25;
  for (const o of map.objects) {
    if (!o.forage || o.picked) continue;
    const d = distTo(o.x * TILE + 8, (o.y + 1) * TILE - 4);
    if (d < bestD) { bestD = d; bestForage = o; }
  }
  if (bestForage) return { kind: 'forage', obj: bestForage, label: `Pick ${ITEMS[bestForage.forage]?.name || 'forage'}` };

  // Chop / mine
  let bestChop = null; bestD = 27;
  for (const o of map.objects) {
    if (!['tree', 'rock', 'stump', 'log'].includes(o.type)) continue;
    const d = distTo(o.x * TILE + 8, (o.y + 1) * TILE - 4);
    if (d < bestD) { bestD = d; bestChop = o; }
  }
  if (bestChop) {
    const label = bestChop.type === 'rock' ? 'Mine rock' : 'Chop wood';
    return { kind: oType(bestChop), obj: bestChop, label: game.tool === 'axe' ? label : `${label} (equip axe)` };
  }

  // Well
  const well = map.objects.find(o => o.type === 'well');
  if (well && distTo(well.x * TILE + 16, well.y * TILE + 24) < 34) {
    return { kind: 'well', obj: well, label: game.stats.wellDay === game.day ? 'Well water (already drank)' : 'Drink from the well' };
  }

  // Signs
  let bestSign = null; bestD = 24;
  for (const o of map.objects) {
    if (o.type !== 'sign') continue;
    const d = distTo(o.x * TILE + 8, (o.y + 1) * TILE - 4);
    if (d < bestD) { bestD = d; bestSign = o; }
  }
  if (bestSign) return { kind: 'sign', obj: bestSign, label: 'Read sign' };

  return null;
}

function oType(o) {
  if (o.type === 'rock') return 'rock';
  if (o.type === 'tree') return 'tree';
  if (o.type === 'stump') return 'stump';
  return 'log';
}

function objectAtTile(map, tx, ty) {
  const cx = tx * TILE + 8, cy = ty * TILE + 8;
  for (const o of map.objects) {
    if (!o.solid) continue;
    const r = objectCollision(o);
    if (!r) continue;
    if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) return o;
  }
  return null;
}

function updatePrompt() {
  const prompt = $('prompt');
  if (!prompt) return;
  if (mode !== 'playing' || overlayStack.length || transitioning) { prompt.classList.add('hidden'); return; }
  const it = findInteraction();
  if (!it) { prompt.classList.add('hidden'); return; }
  prompt.innerHTML = `<span class="keycap">${isTouch ? 'A' : 'E'}</span> ${escapeHtml(it.label)}`;
  prompt.classList.remove('hidden');
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */
function doAction() {
  if (mode !== 'playing' || transitioning) return;
  unlockAudio();
  if (overlayStack.length) {
    const top = overlayStack[overlayStack.length - 1];
    if (top === 'dialogue') { nextDialogue(); return; }
    if (top === 'fishing') { fishingPress(); return; }
    return;
  }
  const it = findInteraction();
  if (!it) return;
  switch (it.kind) {
    case 'npc': openDialogue(it.npc); break;
    case 'door':
      if (it.obj.shop === 'home') openShop('home');
      else if (it.obj.shop) openShop(it.obj.shop);
      else { toast(it.obj.type === 'building' ? `${it.obj.name}: the door is latched.` : 'Nothing to see.', '🚪'); sfx('click'); }
      break;
    case 'animal': petAnimal(it.animal); break;
    case 'bin': openShop('shipping'); break;
    case 'plot': plotAction(it); break;
    case 'soil': tillPlot(it.tile.x, it.tile.y); break;
    case 'water':
      if (game.tool === 'rod') startFishing();
      else { toast('Select the fishing rod (4) to cast a line.', '🎣', 'bad'); sfx('error'); }
      break;
    case 'forage': pickForage(it.obj); break;
    case 'tree': case 'rock': case 'stump': case 'log': chopObject(it.obj); break;
    case 'well': drinkWell(); break;
    case 'sign': toast(it.obj.text, '🪧'); sfx('click'); break;
    default: break;
  }
}

function plotAction(it) {
  const { plot, plotKey } = it;
  const [mp, tx, ty] = plotKey.split(':');
  const x = Number(tx), y = Number(ty);
  if (plot.ready) { harvestPlot(plot, plotKey); return; }
  if (plot.crop) {
    if (game.tool === 'can' && !plot.watered) { waterPlot(x, y); return; }
    if (plot.watered) { toast(`${CROPS[plot.crop].name} is watered and growing. Sleep to advance the day.`, '🌱'); return; }
    toast(`${CROPS[plot.crop].name}: ${plot.days}/${CROPS[plot.crop].days} watered days. Select the watering can (2).`, '🌱');
    return;
  }
  if (game.tool === 'hoe') { tillPlot(x, y); return; }
  if (game.tool === 'seeds') { plantPlot(plot, plotKey); return; }
  if (game.tool === 'can') { toast('Watering empty soil does nothing. Plant a seed first!', '💧'); return; }
  toast('Use the hoe (1) to till this soil, or the seed pouch (5) to plant.', '⛏️');
}

function tillPlot(tx, ty) {
  if (game.mapId !== 'farm') return;
  const map = mapNow();
  const tile = tileAt(map, tx, ty);
  if (tile !== T.GRASS && tile !== T.DIRT) return;
  if (objectAtTile(map, tx, ty)) { toast('Something is in the way.', '🚧', 'bad'); return; }
  const key = `${game.mapId}:${tx}:${ty}`;
  if (game.plots[key]) return;
  if (!useEnergy(2)) return;
  game.plots[key] = { crop: null, days: 0, watered: false, ready: false };
  dustBurst(tx * TILE + 8, ty * TILE + 12, '#8a6441', 6);
  sfx('plant');
  toast('Soil tilled. Select the seed pouch (5) to plant.', '⛏️');
  checkQuests();
}

function plantPlot(plot, plotKey) {
  const seedId = game.seed;
  const cropId = SEED_TO_CROP[seedId];
  if (!cropId) return;
  if (!CROPS[cropId]) return;
  if (itemCount(seedId) <= 0) {
    toast(`You are out of ${ITEMS[seedId]?.name || 'seeds'}. Buy more at Willow Market.`, '🌱', 'bad');
    sfx('error');
    return;
  }
  if (!useEnergy(1)) return;
  removeItem(seedId, 1);
  plot.crop = cropId;
  plot.days = 0;
  plot.watered = false;
  plot.ready = false;
  game.stats.planted++;
  sparkleBurst(Number(plotKey.split(':')[1]) * TILE + 8, Number(plotKey.split(':')[2]) * TILE + 8, '#9ee86a', 5);
  sfx('plant');
  toast(`Planted ${CROPS[cropId].name}. Water it every day!`, '🌱', 'good');
  checkQuests();
  updatePrompt();
}

function waterPlot(tx, ty) {
  const canLevel = game.upgrades.can || 1;
  const radius = canLevel >= 3 ? 2 : canLevel >= 2 ? 1 : 0;
  if (!useEnergy(1)) return;
  let watered = 0;
  for (let yy = ty - radius; yy <= ty + radius; yy++) {
    for (let xx = tx - radius; xx <= tx + radius; xx++) {
      const key = `${game.mapId}:${xx}:${yy}`;
      const p = game.plots[key];
      if (p && !p.watered) {
        p.watered = true;
        watered++;
      }
    }
  }
  if (!watered) { toast('That soil is already watered.', '💧'); return; }
  game.stats.watered += watered;
  for (let i = 0; i < 5; i++) addParticle(tx * TILE + rand(2, 14), ty * TILE + rand(2, 14), {
    vx: rand(-14, 14), vy: rand(-18, -4), life: rand(0.4, 0.8), max: 0.8,
    size: 1, color: '#8fd4f2', gravity: 30, type: 'spark',
  });
  sfx('water');
  toast(radius ? `Watered ${watered} plots.` : 'Watered the crop.', '💧');
  checkQuests();
  updatePrompt();
}

function harvestPlot(plot, plotKey) {
  const crop = CROPS[plot.crop];
  if (!crop) return;
  const amount = randInt(crop.yield[0], crop.yield[1]);
  addItem(crop.produce, amount, true);
  toast(`Harvested ${amount} ${ITEMS[crop.produce]?.name || crop.produce}!`, ITEMS[crop.produce]?.icon || '🌾', 'good');
  const [mp, tx, ty] = plotKey.split(':').map((v, i) => i ? Number(v) : v);
  sparkleBurst(tx * TILE + 8, ty * TILE + 8, '#ffe27a', 8);
  hearts: {
    heartBurst(tx * TILE + 8, ty * TILE + 6, 2);
  }
  sfx('harvest');
  game.stats.harvested = (game.stats.harvested || 0) + 1;
  if (crop.tree) {
    plot.days = Math.max(0, crop.days - (crop.regrow || 2));
    plot.ready = false;
    plot.watered = false;
  } else {
    plot.crop = null;
    plot.days = 0;
    plot.watered = false;
    plot.ready = false;
  }
  checkQuests();
  updatePrompt();
}

function pickForage(o) {
  if (o.picked) return;
  if (!useEnergy(1)) return;
  o.picked = true;
  addItem(o.forage, 1);
  sparkleBurst(o.x * TILE + 8, (o.y + 1) * TILE - 6, '#c9ecff', 4);
  sfx('harvest');
  toast(`Found ${ITEMS[o.forage]?.name || 'forage'}!`, ITEMS[o.forage]?.icon || '🍄', 'good');
  checkQuests();
  updatePrompt();
}

function chopObject(o) {
  if (game.tool !== 'axe') {
    toast('Select the axe (3) to chop and mine.', '🪓', 'bad');
    sfx('error');
    return;
  }
  if (!useEnergy(4)) return;
  const lvl = game.upgrades.axe || 1;
  const cx = o.x * TILE + 8, cy = (o.y + 1) * TILE - 8;
  let item = 'wood', amount = randInt(1, 1 + lvl);
  if (o.type === 'rock') { item = 'stone'; amount = randInt(1, 1 + lvl); }
  addItem(item, amount, true);
  toast(`+${amount} ${ITEMS[item].name}`, ITEMS[item].icon, 'good');
  dustBurst(cx, cy, o.type === 'rock' ? '#8b8b90' : '#8a623c', 5);
  sfx('chop');
  if (o.type === 'stump') {
    o.hits = (o.hits || 0) + 1;
    if (o.hits >= 3) {
      const map = mapNow();
      const idx = map.objects.indexOf(o);
      if (idx >= 0) map.objects.splice(idx, 1);
      addItem('wood', 3, true);
      toast('Stump cleared. +3 Wood', '🪵', 'good');
    }
  }
  checkQuests();
  updatePrompt();
}

function petAnimal(a) {
  const def = ANIMALS[a.type];
  if (!def) return;
  if (a.productReady) {
    addItem(def.product, 1, true);
    a.productReady = false;
    game.stats.collected = (game.stats.collected || 0) + 1;
    heartBurst(a.px, a.py - 8, 5);
    sparkleBurst(a.px, a.py - 12, '#ffe27a', 5);
    sfx('harvest');
    toast(`${a.name} gave you ${def.productName}!`, ITEMS[def.product]?.icon || '🥚', 'good');
    checkQuests();
    return;
  }
  if (!a.fed && game.tool === 'feed') {
    if (itemCount('feed') <= 0) {
      toast('You need animal feed. Buy some at the ranch or market.', '🌾', 'bad');
      sfx('error');
      return;
    }
    if (!useEnergy(1)) return;
    removeItem('feed', 1);
    a.fed = true;
    game.stats.animalFed = (game.stats.animalFed || 0) + 1;
    heartBurst(a.px, a.py - 10, 5);
    sfx('plant');
    toast(`${a.name} munched the feed happily!`, '🌾', 'good');
    checkQuests();
    return;
  }
  heartBurst(a.px, a.py - 10, 2);
  sfx('talk');
  if (!a.fed) toast(`${a.name} is hungry. Select the feed bag (6) and use it.`, '🥺');
  else toast(`${a.name} nuzzles your hand.`, '💛');
}

function drinkWell() {
  if (game.stats.wellDay === game.day) { toast('You already drank from the well today.', '🪣'); return; }
  game.stats.wellDay = game.day;
  const gained = restoreEnergy(12);
  sfx('water');
  toast(`Cool well water. +${gained} energy.`, '💧', 'good');
  updatePrompt();
}

/* ------------------------------------------------------------------ */
/* Fishing                                                            */
/* ------------------------------------------------------------------ */
function startFishing() {
  if (!game) return;
  const loc = game.mapId === 'beach' ? 'beach' : 'river';
  if (!useEnergy(4)) return;
  const rodLvl = game.upgrades.rod || 1;
  fishing = {
    phase: 'wait', t: 0, wait: rand(1.0, 2.6), loc,
    marker: 0, dir: 1, zoneStart: 0, zoneSize: 0.24 + rodLvl * 0.035,
    timeLeft: 6, speed: 0.8 + Math.random() * 0.25, resultTimer: 0, result: null,
  };
  $('fish-title').textContent = 'Casting…';
  $('fish-sub').textContent = 'Wait for the bobber to dip, then hook it!';
  $('fish-hook').textContent = 'Wait for a bite…';
  $('catch-bar').style.visibility = 'hidden';
  $('fish-timer-fill').style.width = '100%';
  openOverlay('fishing');
  sfx('splash');
}

function updateFishing(dt) {
  if (!fishing) return;
  if (fishing.phase === 'wait') {
    fishing.t += dt;
    if (fishing.t >= fishing.wait) {
      fishing.phase = 'bite';
      fishing.zoneStart = rand(0.08, 0.8 - fishing.zoneSize);
      fishing.marker = rand(0.02, 0.2);
      fishing.dir = 1;
      fishing.timeLeft = 6;
      $('catch-bar').style.visibility = 'visible';
      $('fish-title').textContent = 'Bite! Hook it now!';
      $('fish-sub').textContent = 'Stop the marker inside the green zone.';
      $('fish-hook').textContent = 'HOOK IT!';
      sfx('splash');
    }
  } else if (fishing.phase === 'bite') {
    fishing.marker += fishing.dir * dt * fishing.speed;
    if (fishing.marker >= 1) { fishing.marker = 1; fishing.dir = -1; }
    if (fishing.marker <= 0) { fishing.marker = 0; fishing.dir = 1; }
    fishing.timeLeft -= dt;
    if (fishing.timeLeft <= 0) {
      finishFishing(false, 'timeout');
    }
  } else if (fishing.phase === 'result') {
    fishing.resultTimer -= dt;
    if (fishing.resultTimer <= 0) closeFishing();
  }
  if (fishing) {
    const zonePct = fishing.zoneSize * 100;
    const zoneLeft = fishing.zoneStart * 100;
    $('catch-zone').style.width = `${zonePct}%`;
    $('catch-zone').style.left = `${zoneLeft}%`;
    $('catch-marker').style.left = `${fishing.marker * 100}%`;
    $('fish-timer-fill').style.width = `${clamp(fishing.timeLeft / 6 * 100, 0, 100)}%`;
  }
}

function fishingPress() {
  if (!fishing) return;
  if (fishing.phase === 'wait') {
    toast('Patience… wait for the bite.', '🎣');
    return;
  }
  if (fishing.phase !== 'bite') return;
  const hit = fishing.marker >= fishing.zoneStart && fishing.marker <= fishing.zoneStart + fishing.zoneSize;
  if (hit) {
    const table = FISH[fishing.loc] || FISH.river;
    const caught = weighted(table);
    fishing.phase = 'result';
    fishing.resultTimer = 1.5;
    fishing.result = caught.id;
    $('catch-bar').style.visibility = 'hidden';
    $('fish-hook').textContent = '…';
    $('fish-title').textContent = `Caught a ${ITEMS[caught.id].name}!`;
    $('fish-sub').textContent = 'A fine addition to the pantry.';
    addItem(caught.id, 1, true);
    toast(`Caught ${ITEMS[caught.id].name}!`, ITEMS[caught.id].icon, 'quest');
    game.stats.fish = (game.stats.fish || 0) + 1;
    const p = game.player;
    sparkleBurst(p.x, p.y - 16, '#8fd4f2', 10);
    heartBurst(p.x, p.y - 20, 3);
    sfx('catch');
    checkQuests();
  } else {
    finishFishing(false, 'miss');
  }
}

function finishFishing(success, reason) {
  if (!fishing) return;
  fishing.phase = 'result';
  fishing.resultTimer = 1.3;
  fishing.result = success ? fishing.result : null;
  $('catch-bar').style.visibility = 'hidden';
  $('fish-hook').textContent = '…';
  if (!success) {
    $('fish-title').textContent = reason === 'timeout' ? 'Too slow — it slipped away.' : reason === 'early' ? 'Too early!' : 'It got away…';
    $('fish-sub').textContent = 'The river keeps its secrets. Try again!';
    sfx('error');
  }
}

function closeFishing() {
  fishing = null;
  closeOverlay('fishing');
}

/* ------------------------------------------------------------------ */
/* Day cycle                                                          */
/* ------------------------------------------------------------------ */
function pickWeather() {
  const r = Math.random();
  if (r < 0.56) return 'sunny';
  if (r < 0.76) return 'cloudy';
  if (r < 0.96) return 'rain';
  return 'storm';
}

function advanceDay(collapsed = false) {
  const prevEarnings = game.stats.dayEarnings || 0;
  const prevWeather = game.weather;
  const rained = prevWeather === 'rain' || prevWeather === 'storm';

  for (const key of Object.keys(game.plots)) {
    const plot = game.plots[key];
    if (!plot.crop) { plot.watered = false; continue; }
    const crop = CROPS[plot.crop];
    if (!crop) { plot.crop = null; continue; }
    const wet = plot.watered || rained || game.upgrades.sprinkler;
    if (wet) {
      plot.days = Math.min(crop.days, (plot.days || 0) + 1);
      if (plot.days >= crop.days && !plot.ready) {
        plot.ready = true;
      }
    }
    plot.watered = false;
  }

  for (const a of game.animals) {
    if (a.fed && !a.productReady) a.productReady = true;
    a.fed = false;
    a.wanderT = rand(1, 4);
  }

  // fresh forage everywhere
  for (const mid of Object.keys(maps)) {
    for (const o of maps[mid].objects) {
      if (o.forage) o.picked = false;
      if (o.type === 'stump') o.hits = 0;
    }
    for (const npc of maps[mid].npcs) npc.talkedToday = false;
  }

  game.day++;
  game.minutes = 6 * 60;
  game.weather = pickWeather();
  game.energy = collapsed ? 60 : game.maxEnergy;
  game.stats.slept = (game.stats.slept || 0) + 1;
  game.stats.dayEarnings = 0;

  if (game.upgrades.sprinkler) {
    for (const p of Object.values(game.plots)) if (p.crop) p.watered = true;
  }
  if (game.weather === 'rain' || game.weather === 'storm') {
    for (const p of Object.values(game.plots)) p.watered = true;
  }

  const w = WEATHER[game.weather];
  const lines = [];
  if (collapsed) lines.push('You stayed up far too late and collapsed into bed.');
  lines.push(`Yesterday's earnings: ${prevEarnings}g`);
  if (game.weather === 'rain') lines.push('Rain watered every crop while you slept.');
  if (game.upgrades.sprinkler) lines.push('Your sprinklers hummed to life at dawn.');
  const readyCount = Object.values(game.plots).filter(p => p.ready).length;
  if (readyCount) lines.push(`${readyCount} crop${readyCount === 1 ? ' is' : 's are'} ready to harvest!`);
  if (game.weather === 'storm') lines.push('A storm rolls over the valley. Stay cozy.');
  showDayOverlay(`Day ${game.day}`, `${w.icon} ${w.name}`, lines);
  updateHud(true);
  saveGame(false);
  startMusic(game.mapId);
  checkQuests();
}

function sleepNow(collapsed = false) {
  if (transitioning) return;
  transitioning = true;
  sfx('sleep');
  $('fade').classList.add('active');
  setTimeout(() => {
    advanceDay(collapsed);
    transitioning = false;
    $('fade').classList.remove('active');
  }, 700);
}

function showDayOverlay(title, weather, lines) {
  $('day-title').textContent = title;
  $('day-weather').textContent = weather;
  $('day-summary').innerHTML = lines.map(l => `<div>${escapeHtml(l)}</div>`).join('');
  openOverlay('day-overlay');
  setTimeout(() => {
    if (overlayStack.includes('day-overlay')) closeOverlay('day-overlay');
  }, 2800);
}

/* ------------------------------------------------------------------ */
/* NPC & animal wandering                                             */
/* ------------------------------------------------------------------ */
function updateNPCs(dt, state) {
  const map = maps[state.mapId];
  for (const npc of map.npcs) {
    npc.wanderT -= dt;
    if (npc.wanderT <= 0) {
      npc.wanderT = rand(2.5, 6.5);
      const angle = rand(0, Math.PI * 2);
      const r = rand(0, npc.radius || 18);
      npc.tx = npc.homeX + Math.cos(angle) * r;
      npc.ty = npc.homeY + Math.sin(angle) * r * 0.7;
    }
    if (npc.tx != null) {
      const dx = npc.tx - npc.px, dy = npc.ty - npc.py;
      const d = Math.hypot(dx, dy);
      if (d > 1.2) {
        const sp = 12;
        npc.px += (dx / d) * sp * dt;
        npc.py += (dy / d) * sp * dt;
        npc.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) npc.dir = dx < 0 ? 'left' : 'right';
        else npc.dir = dy < 0 ? 'up' : 'down';
        npc.frame = Math.floor(time * 8) % 2 === 0 ? 1 : 2;
      } else {
        npc.moving = false;
        npc.frame = 0;
      }
    }
  }
}

function updateAnimals(dt, state) {
  if (state.mapId !== 'farm') return;
  const bounds = { l: 28 * TILE, r: 34 * TILE + 14, t: 12 * TILE + 6, b: 15 * TILE + 14 };
  for (const a of state.animals) {
    a.wanderT = (a.wanderT || 0) - dt;
    if (a.wanderT <= 0) {
      a.wanderT = rand(2, 5);
      a.targetX = rand(bounds.l, bounds.r);
      a.targetY = rand(bounds.t, bounds.b);
    }
    if (a.targetX != null) {
      const dx = a.targetX - a.px, dy = a.targetY - a.py;
      const d = Math.hypot(dx, dy);
      if (d > 1.5) {
        const sp = 16;
        a.px += (dx / d) * sp * dt;
        a.py += (dy / d) * sp * dt;
        a.moving = true;
        a.dir = dx < 0 ? 'left' : 'right';
      } else {
        a.moving = false;
      }
    }
    a.px = clamp(a.px, bounds.l, bounds.r);
    a.py = clamp(a.py, bounds.t, bounds.b);
  }
}

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */
function renderWorld(state, cam) {
  if (!state) return;
  const map = maps[state.mapId];
  const cache = caches[state.mapId];
  if (!map || !cache) return;
  const cx = Math.round(cam.x), cy = Math.round(cam.y);
  const na = nightAlpha(state.minutes ?? 600);
  const isNight = na > 0.2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#22331f';
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.drawImage(cache, -cx, -cy);

  ctx.save();
  ctx.translate(-cx, -cy);
  drawWaterSparkle(ctx, map, cam.x, cam.y, viewW, viewH, time);

  // Ground-level plots
  for (const key of Object.keys(state.plots || {})) {
    const [mp, txs, tys] = key.split(':');
    if (mp !== state.mapId) continue;
    const tx = Number(txs), ty = Number(tys);
    const sx = tx * TILE, sy = ty * TILE;
    if (sx < cam.x - 24 || sx > cam.x + viewW + 24 || sy < cam.y - 24 || sy > cam.y + viewH + 24) continue;
    const plot = state.plots[key];
    drawPlot(ctx, plot, tx, ty, time);
    if (plot.ready) {
      const glint = (Math.sin(time * 3 + tx + ty) + 1) / 2;
      if (glint > 0.72) {
        ctx.globalAlpha = (glint - 0.72) * 2.2;
        ctx.fillStyle = '#fff3a8';
        const gx = sx + 12 + Math.round(Math.sin(time * 2 + tx) * 2);
        const gy = sy + 3;
        ctx.fillRect(gx, gy, 1, 3);
        ctx.fillRect(gx - 1, gy + 1, 3, 1);
        ctx.globalAlpha = 1;
      }
    }
  }

  // y-sorted entities
  const items = [];
  const margin = 80;
  for (const o of map.objects) {
    const ox = o.x * TILE, oy = o.y * TILE;
    const w = (o.w || 1) * TILE, h = (o.h || 1) * TILE;
    if (ox + w < cam.x - margin || ox > cam.x + viewW + margin || oy + h < cam.y - margin || oy - 56 > cam.y + viewH + margin) continue;
    items.push({ y: o.sortY ?? (oy + h), kind: 'obj', o });
  }
  for (const npc of map.npcs) {
    if (npc.px < cam.x - margin || npc.px > cam.x + viewW + margin || npc.py < cam.y - margin || npc.py > cam.y + viewH + margin) continue;
    items.push({ y: npc.py, kind: 'npc', npc });
  }
  if (state.mapId === 'farm') {
    for (const a of state.animals || []) {
      if (a.px < cam.x - margin || a.px > cam.x + viewW + margin || a.py < cam.y - margin || a.py > cam.y + viewH + margin) continue;
      items.push({ y: a.py, kind: 'animal', a });
    }
  }
  if (state.player) {
    const p = state.player;
    items.push({ y: p.y, kind: 'player', p });
  }
  items.sort((a, b) => a.y - b.y);

  for (const item of items) {
    if (item.kind === 'obj') {
      drawObject(ctx, item.o, time, isNight);
    } else if (item.kind === 'npc') {
      drawCharacterShadow(ctx, item.npc.px, item.npc.py);
      drawCharacter(ctx, item.npc.px, item.npc.py, item.npc.dir || 'down', item.npc.frame || 0, { ...item.npc.palette, gender: item.npc.palette.gender || 'neutral' });
    } else if (item.kind === 'animal') {
      drawAnimal(ctx, item.a, time);
    } else if (item.kind === 'player') {
      const p = item.p;
      drawCharacterShadow(ctx, p.x, p.y);
      drawCharacter(ctx, p.x, p.y, p.dir, p.frame, state.palette);
    }
  }

  drawParticles(ctx);
  ctx.restore();

  // Night tint
  if (na > 0.01) {
    ctx.fillStyle = `rgba(13,20,54,${na})`;
    ctx.fillRect(0, 0, viewW, viewH);
    if (na > 0.15) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const o of map.objects) {
        if (o.type !== 'lamp') continue;
        const lx = o.x * TILE + 8 - cx;
        const ly = o.y * TILE - 18 - cy;
        if (lx < -60 || lx > viewW + 60 || ly < -60 || ly > viewH + 60) continue;
        const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, 30);
        grad.addColorStop(0, `rgba(255,216,103,${0.3 * na})`);
        grad.addColorStop(1, 'rgba(255,216,103,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(lx - 32, ly - 32, 64, 64);
      }
      if (state.player) {
        const lx = state.player.x - cx, ly = state.player.y - 12 - cy;
        const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, 36);
        grad.addColorStop(0, `rgba(255,238,178,${0.16 * na})`);
        grad.addColorStop(1, 'rgba(255,238,178,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(lx - 38, ly - 38, 76, 76);
      }
      ctx.restore();
    }
  }

  // weather
  const weather = state.weather || 'sunny';
  if (weather === 'cloudy') {
    ctx.fillStyle = 'rgba(228,234,238,0.04)';
    ctx.fillRect(0, 0, viewW, viewH);
  }
  if (weather === 'rain' || weather === 'storm') {
    const count = weather === 'storm' ? 150 : 90;
    ctx.strokeStyle = weather === 'storm' ? 'rgba(198,226,255,0.5)' : 'rgba(198,226,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const seed = i * 47.3;
      const x = ((seed * 13 + time * 170) % (viewW + 30)) - 20;
      const y = ((seed * 31 + time * 430 + i * 7) % (viewH + 40)) - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 7);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(30,46,66,${weather === 'storm' ? 0.13 : 0.07})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
}

function renderFishing() {
  if (!fishing) return;
  const c = $('fish-canvas');
  if (!c) return;
  const fctx = c.getContext('2d');
  drawCatchScene(fctx, c.width, c.height, time, fishing.loc, fishing.phase === 'bite');
}

function renderPreview() {
  const c = $('preview');
  if (!c) return;
  const pc = c.getContext('2d');
  pc.imageSmoothingEnabled = false;
  pc.setTransform(1, 0, 0, 1, 0, 0);
  pc.clearRect(0, 0, c.width, c.height);
  const sky = pc.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0, '#9fd9e8');
  sky.addColorStop(0.55, '#b9e4c9');
  sky.addColorStop(1, '#7db95a');
  pc.fillStyle = sky;
  pc.fillRect(0, 0, c.width, c.height);
  // little hills/clouds
  pc.fillStyle = 'rgba(255,255,255,0.65)';
  pc.fillRect(18, 28, 44, 5);
  pc.fillRect(28, 22, 26, 5);
  pc.fillStyle = '#7ab553';
  pc.fillRect(0, 132, c.width, c.height - 132);
  pc.fillStyle = '#6aa347';
  pc.fillRect(0, 150, c.width, c.height - 150);
  for (let i = 0; i < 12; i++) {
    const x = (i * 37 + 11) % c.width;
    const y = 154 + ((i * 19) % 48);
    pc.fillStyle = i % 2 ? '#8ecb63' : '#5c9a3e';
    pc.fillRect(x, y, 3, 2);
  }
  pc.save();
  pc.scale(5, 5);
  pc.fillStyle = 'rgba(20,32,14,0.18)';
  pc.fillRect(16, 38, 8, 1);
  drawCharacter(pc, 21, 39, 'down', Math.floor(time * 1.4) % 2 ? 1 : 0, {
    ...selectedCreation, style: selectedCreation.style, gender: selectedCreation.gender, accessory: null,
  });
  pc.restore();
  // floating hearts
  for (let i = 0; i < 3; i++) {
    const a = (Math.sin(time * 1.3 + i * 2) + 1) / 2;
    pc.globalAlpha = 0.2 + a * 0.5;
    pc.fillStyle = '#f28ab2';
    const x = 30 + i * 45 + Math.sin(time * 0.8 + i) * 6;
    const y = 32 + i * 14 + Math.cos(time + i) * 4;
    pc.fillRect(x, y, 5, 2);
    pc.fillRect(x + 2, y - 2, 2, 6);
  }
  pc.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* Game loop                                                          */
/* ------------------------------------------------------------------ */
function updateGame(dt) {
  if (!game) return;
  game.playSeconds += dt;
  game.minutes += dt * 4;
  transitionCooldown = Math.max(0, transitionCooldown - dt);
  if (game.minutes >= 26 * 60) {
    toast('You stayed awake until 2am and collapsed.', '😴', 'bad');
    sleepNow(true);
    return;
  }
  updatePlayer(dt);
  updateNPCs(dt, game);
  updateAnimals(dt, game);
  updateParticles(dt);
  updateAmbient(dt, game);
  updateCamera(dt);
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.12; updateHud(); }
  updatePrompt();
  autosaveTimer += dt;
  if (autosaveTimer > 50) {
    autosaveTimer = 0;
    saveGame(false);
  }
}

function updateDemo(dt) {
  if (!demo) return;
  updateNPCs(dt, demo);
  updateAnimals(dt, demo);
  updateParticles(dt);
  updateAmbient(dt, demo);
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000) || 0.016;
  lastFrame = now;
  time += dt;
  if (mode === 'playing' && game) {
    if (!isBusy()) updateGame(dt);
    if (fishing) updateFishing(dt);
  } else {
    updateDemo(dt);
  }
  if (mode === 'creation') renderPreview();
  const state = mode === 'playing' ? game : demo;
  if (state) renderWorld(state, mode === 'playing' ? camera : demoCam);
  if (fishing) renderFishing();
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------ */
/* Starting / leaving a game                                         */
/* ------------------------------------------------------------------ */
function enterGame(state, loaded) {
  game = state;
  mode = 'playing';
  hideAllOverlays();
  overlayStack = [];
  $('menu').classList.add('hidden');
  $('creation').classList.add('hidden');
  $('hud').classList.remove('hidden');
  snapCamera();
  updateHud(true);
  renderHotbar();
  updateContinueButton();
  startMusic(game.mapId);
  checkQuests();
  saveGame(false);
  if (loaded) {
    toast(`Welcome back, ${game.name}!`, '🌾', 'good');
  } else {
    toast(`Day 1 — Welcome to Willow Creek, ${game.name}!`, '🌻', 'quest');
    setTimeout(() => toast('Open the quest card for your first task.', '✦'), 1200);
    setTimeout(() => toast('WASD to walk · E to act · 1–6 tools', '🎮'), 2600);
  }
  updatePrompt();
  lastFrame = performance.now();
}

function startNewGame() {
  unlockAudio();
  const input = $('farmer-name');
  selectedCreation.name = (input?.value || 'Farmer').trim().slice(0, 14) || 'Farmer';
  enterGame(createNewState(selectedCreation), false);
  sfx('open');
}

function continueGame() {
  unlockAudio();
  const loaded = loadSavedGame();
  if (!loaded) { toast('No saved game found.', '⚠️', 'bad'); updateContinueButton(); return; }
  enterGame(loaded, true);
  sfx('open');
}

function returnToMenu() {
  if (game) saveGame(false);
  hideAllOverlays();
  overlayStack = [];
  mode = 'menu';
  game = null;
  demo = createDemoState();
  $('hud').classList.add('hidden');
  $('creation').classList.add('hidden');
  $('menu').classList.remove('hidden');
  updateContinueButton();
  startMusic('farm');
  camera = { ...demoCam };
}

function hideAllOverlays() {
  for (const id of ['dialogue', 'shop', 'inventory', 'fishing', 'help', 'pause', 'day-overlay']) {
    const el = $(id);
    if (el) el.classList.add('hidden');
  }
  overlayStack = [];
  activeShop = null;
  activeDialogue = null;
  fishing = null;
}

/* ------------------------------------------------------------------ */
/* Overlay management                                                 */
/* ------------------------------------------------------------------ */
function openOverlay(id) {
  const el = $(id);
  if (!el) return;
  if (!overlayStack.includes(id)) overlayStack.push(id);
  el.style.zIndex = String(40 + overlayStack.length * 3);
  el.classList.remove('hidden');
  updatePrompt();
}

function closeOverlay(id) {
  const el = $(id);
  if (el) el.classList.add('hidden');
  const idx = overlayStack.indexOf(id);
  if (idx >= 0) overlayStack.splice(idx, 1);
  if (id === 'shop') activeShop = null;
  if (id === 'dialogue') activeDialogue = null;
  updatePrompt();
}

function closeTopOverlay() {
  const top = overlayStack[overlayStack.length - 1];
  if (!top) return false;
  if (top === 'fishing') { closeFishing(); return true; }
  if (top === 'dialogue') { closeOverlay('dialogue'); return true; }
  closeOverlay(top);
  if (top === 'pause') sfx('close');
  return true;
}

function openHelp() {
  openOverlay('help');
  sfx('open');
}
function openPause() {
  if (mode !== 'playing') return;
  openOverlay('pause');
  sfx('open');
}
function openInventory() {
  if (mode !== 'playing' || transitioning) return;
  renderInventory();
  openOverlay('inventory');
  sfx('open');
}

/* ------------------------------------------------------------------ */
/* HUD helpers                                                        */
/* ------------------------------------------------------------------ */
function renderHotbar() {
  const host = $('hotbar');
  if (!host || !game) return;
  host.innerHTML = TOOLS.map(t => {
    const seedMode = t.id === 'seeds';
    const icon = seedMode ? (ITEMS[game.seed]?.icon || '🌱') : t.icon;
    const count = seedMode ? itemCount(game.seed) : t.id === 'feed' ? itemCount('feed') : null;
    const label = seedMode ? (ITEMS[game.seed]?.name || 'Seeds').replace(' Seeds', '') : t.name;
    const active = game.tool === t.id ? ' active' : '';
    return `<button class="hot-slot${active}" data-tool="${t.id}" title="${escapeHtml(t.name)}">
      <span class="hot-key">${t.key}</span>
      <span class="hot-icon">${icon}</span>
      <span class="hot-name">${escapeHtml(label)}</span>
      ${count !== null ? `<span class="hot-count">${count}</span>` : ''}
    </button>`;
  }).join('') + `<div class="hot-hint">R · cycle seeds</div>`;
}

function selectTool(id) {
  if (!game || !TOOLS.some(t => t.id === id)) return;
  game.tool = id;
  renderHotbar();
  sfx('click');
  updatePrompt();
  if (id === 'seeds') {
    toast(`Seed pouch: ${ITEMS[game.seed]?.name || 'seeds'} (${itemCount(game.seed)})`, ITEMS[game.seed]?.icon || '🌱');
  }
}

function cycleSeed() {
  if (!game) return;
  const idx = SEED_CYCLE.indexOf(game.seed);
  for (let i = 1; i <= SEED_CYCLE.length; i++) {
    const next = SEED_CYCLE[(idx + i) % SEED_CYCLE.length];
    if (itemCount(next) > 0 || i === SEED_CYCLE.length) {
      game.seed = next;
      break;
    }
  }
  game.tool = 'seeds';
  renderHotbar();
  renderInventory();
  sfx('click');
  toast(`Seed pouch: ${ITEMS[game.seed]?.name || 'seeds'} (${itemCount(game.seed)})`, ITEMS[game.seed]?.icon || '🌱');
  updatePrompt();
}

function updateContinueButton() {
  const btn = $('btn-continue');
  if (!btn) return;
  const has = saveExists();
  btn.disabled = !has;
  btn.classList.toggle('disabled', !has);
  btn.title = has ? 'Continue your saved farm' : 'No saved game yet';
}

function updateSoundButton() {
  const btn = $('btn-sound');
  if (btn) {
    btn.textContent = soundOn ? '♪' : '🔇';
    btn.classList.toggle('muted', !soundOn);
    btn.title = soundOn ? 'Mute sound' : 'Turn sound on';
  }
}

/* ------------------------------------------------------------------ */
/* Input                                                              */
/* ------------------------------------------------------------------ */
function handleEscape() {
  if (mode === 'creation') {
    $('creation').classList.add('hidden');
    $('menu').classList.remove('hidden');
    mode = 'menu';
    return;
  }
  if (mode === 'menu') {
    if (overlayStack.length) closeTopOverlay();
    return;
  }
  if (mode === 'playing') {
    if (overlayStack.length) {
      const top = overlayStack[overlayStack.length - 1];
      if (top === 'day-overlay') return;
      closeTopOverlay();
    } else {
      openPause();
    }
  }
}

function bindInput() {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      if (e.code === 'Enter' && mode === 'creation') startNewGame();
      return;
    }
    input.keys.add(e.code);
    if (e.repeat) return;
    unlockAudio();
    if (e.code === 'Escape') { handleEscape(); return; }
    if (mode === 'menu') {
      if (e.code === 'Enter') { if (saveExists()) continueGame(); else { $('menu').classList.add('hidden'); $('creation').classList.remove('hidden'); mode = 'creation'; } }
      return;
    }
    if (mode === 'creation') {
      if (e.code === 'Enter') startNewGame();
      return;
    }
    // playing
    const top = overlayStack[overlayStack.length - 1];
    if (top === 'fishing') {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') fishingPress();
      return;
    }
    if (top === 'dialogue') {
      if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') nextDialogue();
      return;
    }
    if (top) {
      if (e.code === 'KeyB' && top === 'inventory') closeOverlay('inventory');
      if (e.code === 'KeyH' && top === 'help') closeOverlay('help');
      return;
    }
    if (e.code === 'Space' || e.code === 'KeyE') { doAction(); return; }
    if (e.code === 'KeyB') { openInventory(); return; }
    if (e.code === 'KeyH') { openHelp(); return; }
    if (e.code === 'KeyR') { cycleSeed(); return; }
    if (e.code === 'KeyM') { openPause(); return; }
    if (/^Digit[1-6]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1;
      if (TOOLS[i]) selectTool(TOOLS[i].id);
    }
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  window.addEventListener('blur', () => { input.keys.clear(); resetJoystick(); });
  window.addEventListener('resize', resize);
  window.addEventListener('visibilitychange', () => { if (document.hidden && game) saveGame(false); });
}

function resetJoystick() {
  input.joy.active = false;
  input.joy.x = 0;
  input.joy.y = 0;
  const knob = $('joystick-knob');
  if (knob) knob.style.transform = 'translate(-50%, -50%)';
}

function bindTouch() {
  const joy = $('joystick');
  const knob = $('joystick-knob');
  if (!joy) return;
  let pointerId = null;
  const update = (e) => {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const max = r.width / 2 - 10;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    input.joy.x = dx / max;
    input.joy.y = dy / max;
    input.joy.active = true;
    if (knob) knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  joy.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isTouch = true;
    document.body.classList.add('touch');
    pointerId = e.pointerId;
    joy.setPointerCapture(pointerId);
    update(e);
    unlockAudio();
  });
  joy.addEventListener('pointermove', (e) => {
    if (pointerId !== e.pointerId) return;
    e.preventDefault();
    update(e);
  });
  const end = (e) => {
    if (pointerId !== e.pointerId) return;
    pointerId = null;
    resetJoystick();
  };
  joy.addEventListener('pointerup', end);
  joy.addEventListener('pointercancel', end);
  const action = $('btn-action');
  action.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isTouch = true;
    document.body.classList.add('touch');
    unlockAudio();
    if (fishing) fishingPress();
    else doAction();
  });
  window.addEventListener('touchstart', () => {
    isTouch = true;
    document.body.classList.add('touch');
    unlockAudio();
  }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Dialogue                                                           */
/* ------------------------------------------------------------------ */
const GIFT_ORDER = [
  'strawberry', 'pumpkin', 'apple', 'turnip', 'mushroom', 'berry', 'shell',
  'flower', 'egg', 'duck_egg', 'milk', 'wool', 'trout', 'bass', 'catfish',
  'sardine', 'snapper', 'tuna', 'golden_fish', 'sandwich', 'coffee', 'meal', 'salad', 'ale',
];

function friendship(npcId) { return game?.npcFriends?.[npcId] || 0; }
function heartsText(npcId) {
  const hearts = Math.min(5, Math.floor(friendship(npcId) / 20));
  return '❤'.repeat(hearts) + '♡'.repeat(5 - hearts);
}

function openDialogue(npc) {
  if (!game) return;
  const firstMayor = npc.id === 'mayor' && !game.stats.talkedMayor;
  const gain = npc.talkedToday ? 1 : 6;
  game.npcFriends[npc.id] = clamp(friendship(npc.id) + gain, 0, 100);
  npc.talkedToday = true;
  game.stats.talks = (game.stats.talks || 0) + 1;
  if (npc.id === 'mayor' && !game.stats.talkedMayor) {
    game.stats.talkedMayor = true;
  }
  const lines = [];
  if (firstMayor) {
    lines.push(`You must be ${game.name}! Welcome home. Your grandparents' farm has been waiting for someone with your kind of stubborn hope.`);
  } else {
    lines.push(npc.lines[(game.day + npc.id.length) % npc.lines.length]);
  }
  const q = QUESTS[game.questIndex];
  if (q) lines.push(`By the way — ${q.text}`);
  else lines.push('You have done so much for this valley already. Thank you.');
  activeDialogue = { npc, lines, idx: 0, gifted: false };
  $('dlg-name').textContent = npc.name;
  $('dlg-role').textContent = npc.role;
  $('dlg-hearts').textContent = heartsText(npc.id);
  const portrait = $('portrait');
  const pctx = portrait.getContext('2d');
  drawPortrait(pctx, portrait.width, portrait.height, npc.palette, npc.palette.accessory);
  updateDialogue();
  openOverlay('dialogue');
  sfx('talk');
  checkQuests();
}

function updateDialogue() {
  if (!activeDialogue) return;
  const { npc, lines, idx } = activeDialogue;
  $('dlg-text').textContent = lines[Math.min(idx, lines.length - 1)];
  $('dlg-hearts').textContent = heartsText(npc.id);
  const last = idx >= lines.length - 1;
  $('dlg-next').textContent = last ? 'Bye ▸' : 'Next ▸';
  $('dlg-gift').disabled = !getGiftItem();
}

function nextDialogue() {
  if (!activeDialogue) return;
  activeDialogue.idx++;
  if (activeDialogue.idx >= activeDialogue.lines.length) {
    closeOverlay('dialogue');
    sfx('close');
    return;
  }
  updateDialogue();
  sfx('talk');
}

function getGiftItem() {
  if (!game) return null;
  for (const id of GIFT_ORDER) {
    if (itemCount(id) > 0) return id;
  }
  return null;
}

function giveGift() {
  if (!activeDialogue || !game) return;
  if (activeDialogue.gifted) { toast('You already gave a gift in this conversation.', '💝'); return; }
  const id = getGiftItem();
  if (!id) { toast('You have nothing to give right now.', '🎁', 'bad'); return; }
  removeItem(id, 1);
  const npc = activeDialogue.npc;
  game.npcFriends[npc.id] = clamp(friendship(npc.id) + 14, 0, 100);
  activeDialogue.gifted = true;
  game.stats.gifted = (game.stats.gifted || 0) + 1;
  activeDialogue.lines.push(`Oh! ${ITEMS[id].name} — for me? That is thoughtful. I will treasure it.`);
  activeDialogue.idx = activeDialogue.lines.length - 1;
  updateDialogue();
  heartBurst(0, 0, 0);
  sfx('coin');
  toast(`${npc.name} loved the ${ITEMS[id].name}. +14 friendship`, '💝', 'good');
}

/* ------------------------------------------------------------------ */
/* Shops & services                                                   */
/* ------------------------------------------------------------------ */
function shopInfo(id) {
  if (id === 'shipping') return { name: 'Shipping Bin', tagline: 'Sell your harvest in one go', icon: '📦', keeper: null };
  if (id === 'home') return { name: 'Your Farmhouse', tagline: 'Sleep, save and plan tomorrow', icon: '🏡', keeper: null };
  return SHOP_INFO[id] || { name: 'Shop', tagline: '', icon: '🏪', keeper: null };
}

function openShop(id) {
  if (!game) return;
  activeShop = { id, tab: null };
  if (id === 'shipping') activeShop.tab = 'sell';
  else if (id === 'home') activeShop.tab = 'services';
  else if (['blacksmith', 'carpenter', 'clinic', 'townhall'].includes(id)) activeShop.tab = 'services';
  else activeShop.tab = 'buy';
  if (id !== 'home' && id !== 'shipping') game.stats.shopsVisited[id] = true;
  renderShop();
  openOverlay('shop');
  sfx('open');
}

function shopHasServices(id) {
  return ['blacksmith', 'carpenter', 'clinic', 'townhall', 'home'].includes(id);
}

function shopHasBuy(id) {
  if (id === 'shipping' || id === 'home') return false;
  if (id === 'ranch') return true;
  return (SHOP_STOCK[id] || []).some(item => ITEMS[item]?.buy);
}

function renderShop() {
  if (!activeShop) return;
  const id = activeShop.id;
  const info = shopInfo(id);
  const tabs = $('shop-tabs');
  const grid = $('shop-grid');
  $('shop-title').textContent = info.name;
  $('shop-tagline').textContent = info.tagline;
  $('shop-icon').textContent = info.icon;
  $('shop-money').textContent = game.money.toLocaleString();
  const available = [];
  if (shopHasBuy(id)) available.push('buy');
  available.push('sell');
  if (shopHasServices(id)) available.push('services');
  if (!available.includes(activeShop.tab)) activeShop.tab = available[0];
  tabs.innerHTML = available.map(tab => `<button data-tab="${tab}" class="${activeShop.tab === tab ? 'active' : ''}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join('');
  $('shop-hint').textContent = '';

  if (activeShop.tab === 'buy') renderShopBuy(id, grid);
  else if (activeShop.tab === 'sell') renderShopSell(id, grid);
  else renderShopServices(id, grid);
  $('shop-money').textContent = game.money.toLocaleString();
}

function renderShopBuy(id, grid) {
  let html = '';
  if (id === 'ranch') {
    html += '<div class="shop-section-title">Animals</div>';
    for (const [type, def] of Object.entries(ANIMALS)) {
      const emoji = type === 'chicken' ? '🐔' : type === 'duck' ? '🦆' : type === 'cow' ? '🐄' : '🐑';
      const owned = game.animals.filter(a => a.type === type).length;
      const can = game.money >= def.cost;
      html += `<article class="shop-item animal-item">
        <div class="shop-item-icon">${emoji}</div>
        <div class="shop-item-body">
          <div class="shop-item-name">${def.name} <span class="owned">owned ${owned}</span></div>
          <div class="shop-item-desc">Produces ${def.productName} each morning after a day of feeding. Needs feed daily.</div>
        </div>
        <div class="shop-item-buy">
          <div class="price">${def.cost}g</div>
          <button class="chip-btn primary ${can ? '' : 'disabled'}" data-animal="${type}" ${can ? '' : 'disabled'}>Buy</button>
        </div>
      </article>`;
    }
    html += '<div class="shop-section-title">Supplies</div>';
  }
  for (const itemId of (SHOP_STOCK[id] || [])) {
    const item = ITEMS[itemId];
    if (!item || !item.buy) continue;
    const count = itemCount(itemId);
    const can = game.money >= item.buy;
    html += `<article class="shop-item">
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-body">
        <div class="shop-item-name">${escapeHtml(item.name)} ${count ? `<span class="owned">owned ${count}</span>` : ''}</div>
        <div class="shop-item-desc">${escapeHtml(item.desc || '')}</div>
      </div>
      <div class="shop-item-buy">
        <div class="price">${item.buy}g</div>
        <button class="chip-btn primary ${can ? '' : 'disabled'}" data-buy="${itemId}" ${can ? '' : 'disabled'}>Buy</button>
      </div>
    </article>`;
  }
  if (!html) html = '<div class="empty-shop">Nothing in stock today.</div>';
  grid.innerHTML = html;
}

function sellValue() {
  let total = 0;
  for (const [id, count] of Object.entries(game.inventory)) {
    const item = ITEMS[id];
    if (item && item.sell > 0 && count > 0) total += item.sell * count;
  }
  return total;
}

function renderShopSell(id, grid) {
  const entries = Object.entries(game.inventory)
    .filter(([itemId, count]) => ITEMS[itemId]?.sell > 0 && count > 0)
    .sort((a, b) => ITEMS[b[0]].sell - ITEMS[a[0]].sell);
  let html = '';
  if (id === 'shipping') {
    const total = sellValue();
    html += `<div class="ship-banner">
      <div><b>Ship everything</b><br><span>${escapeHtml('Every sellable item in your backpack')}</span></div>
      <button class="chip-btn primary" data-shipall="1" ${total ? '' : 'disabled'}>Ship all · ${total}g</button>
    </div>`;
  }
  if (!entries.length) {
    html += '<div class="empty-shop">Nothing to sell yet. Harvest crops, catch fish, or forage in the forest.</div>';
  }
  for (const [itemId, count] of entries) {
    const item = ITEMS[itemId];
    const total = item.sell * count;
    html += `<article class="shop-item">
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-body">
        <div class="shop-item-name">${escapeHtml(item.name)} <span class="owned">×${count}</span></div>
        <div class="shop-item-desc">${escapeHtml(item.desc || '')}</div>
      </div>
      <div class="shop-item-buy">
        <div class="price">${item.sell}g each</div>
        <div class="sell-btns">
          <button class="chip-btn" data-sell="${itemId}" data-qty="1">Sell 1</button>
          <button class="chip-btn primary" data-sell="${itemId}" data-qty="${count}">Sell all · ${total}g</button>
        </div>
      </div>
    </article>`;
  }
  grid.innerHTML = html;
}

function serviceList(id) {
  const list = [];
  if (id === 'clinic') {
    list.push({
      key: 'heal', title: 'Full check-up', icon: '💗',
      desc: 'Restore all of your energy. Dr. Sage insists on a lollipop afterwards.',
      cost: 80, label: game.energy >= game.maxEnergy ? 'Feeling great' : 'Heal · 80g',
      disabled: game.energy >= game.maxEnergy || game.money < 80,
    });
  }
  if (id === 'townhall') {
    list.push({
      key: 'mail', title: 'Collect mail', icon: '📬',
      desc: game.stats.mailDay === game.day ? 'You already collected today’s parcel.' : 'A small parcel arrives for every resident each day.',
      cost: 0, label: game.stats.mailDay === game.day ? 'Collected' : 'Open parcel',
      disabled: game.stats.mailDay === game.day,
    });
    list.push({
      key: 'bulletin', title: 'Read the bulletin', icon: '📋',
      desc: 'Catch up on town news, farm statistics and gentle gossip.',
      cost: 0, label: 'Read', disabled: false,
    });
  }
  if (id === 'blacksmith') {
    for (const [toolId, name] of [['axe', 'Axe'], ['can', 'Watering Can'], ['rod', 'Fishing Rod']]) {
      const lvl = game.upgrades[toolId] || 1;
      const max = lvl >= 3;
      const cost = lvl === 1 ? 600 : 1500;
      const desc = toolId === 'axe' ? 'Higher levels yield more wood and stone.'
        : toolId === 'can' ? 'Level 2 waters 3×3 plots. Level 3 waters 5×5.'
          : 'Higher levels widen the catching zone.';
      list.push({
        key: `upgrade:${toolId}`, title: `${name} · Lv ${lvl}${max ? ' (max)' : ''}`, icon: toolId === 'axe' ? '🪓' : toolId === 'can' ? '💧' : '🎣',
        desc, cost: max ? 0 : cost,
        label: max ? 'Masterwork' : `Upgrade · ${cost}g`,
        disabled: max || game.money < cost,
      });
    }
  }
  if (id === 'carpenter') {
    const houseLvl = game.upgrades.house || 1;
    if (houseLvl < 3) {
      const cost = houseLvl === 1 ? 1500 : 3500;
      list.push({
        key: 'house', title: `Cozy House · Lv ${houseLvl} → ${houseLvl + 1}`, icon: '🏡',
        desc: 'A proper extension: +20 maximum energy and a warmer place to wake up.',
        cost, label: `Build · ${cost}g`, disabled: game.money < cost,
      });
    } else {
      list.push({ key: 'house', title: 'Cozy House · Lv 3', icon: '🏡', desc: 'The finest farmhouse in the valley. Cedar is very proud.', cost: 0, label: 'Complete', disabled: true });
    }
    list.push({
      key: 'sprinkler', title: 'Sprinkler System', icon: '💦',
      desc: game.upgrades.sprinkler ? 'Installed. Your crops are watered automatically every morning.' : 'Waters every crop automatically each morning. Never carry a can again.',
      cost: game.upgrades.sprinkler ? 0 : 1800,
      label: game.upgrades.sprinkler ? 'Installed' : 'Install · 1800g',
      disabled: game.upgrades.sprinkler || game.money < 1800,
    });
    list.push({
      key: 'farm', title: 'Field Expansion', icon: '🌾',
      desc: game.upgrades.farmExpanded ? 'Twelve new plots have been tilled beside your field.' : 'Cedar tills twelve extra plots beside your field, ready for seeds.',
      cost: game.upgrades.farmExpanded ? 0 : 1200,
      label: game.upgrades.farmExpanded ? 'Expanded' : 'Expand · 1200g',
      disabled: game.upgrades.farmExpanded || game.money < 1200,
    });
  }
  if (id === 'home') {
    list.push({ key: 'sleep', title: 'Sleep until morning', icon: '🛏️', desc: 'End the day, restore energy, grow crops and save your farm.', cost: 0, label: 'Sleep', disabled: false });
    list.push({ key: 'save', title: 'Save game', icon: '💾', desc: 'Write your progress to this browser.', cost: 0, label: 'Save', disabled: false });
  }
  return list;
}

function renderShopServices(id, grid) {
  const list = serviceList(id);
  if (!list.length) { grid.innerHTML = '<div class="empty-shop">No services here today.</div>'; return; }
  grid.innerHTML = list.map(s => `<article class="shop-item service-item">
    <div class="shop-item-icon">${s.icon}</div>
    <div class="shop-item-body">
      <div class="shop-item-name">${escapeHtml(s.title)}</div>
      <div class="shop-item-desc">${escapeHtml(s.desc)}</div>
    </div>
    <div class="shop-item-buy">
      ${s.cost ? `<div class="price">${s.cost}g</div>` : '<div class="price">free</div>'}
      <button class="chip-btn primary ${s.disabled ? 'disabled' : ''}" data-service="${s.key}" ${s.disabled ? 'disabled' : ''}>${escapeHtml(s.label)}</button>
    </div>
  </article>`).join('');
}

function buyItem(id) {
  const item = ITEMS[id];
  if (!item || !item.buy) return;
  if (game.money < item.buy) { toast('Not enough gold.', '🪙', 'bad'); sfx('error'); return; }
  spendMoney(item.buy);
  addItem(id, 1, true);
  toast(`Bought ${item.name}.`, item.icon, 'good');
  sfx('coin');
  renderShop();
  checkQuests();
}

function buyAnimal(type) {
  const def = ANIMALS[type];
  if (!def) return;
  if (game.money < def.cost) { toast('Not enough gold.', '🪙', 'bad'); sfx('error'); return; }
  spendMoney(def.cost);
  const names = ANIMAL_NAMES[type] || [def.name];
  const used = new Set(game.animals.map(a => a.name));
  const name = names.find(n => !used.has(n)) || `${pick(names)} ${game.animals.length + 1}`;
  game.animals.push({
    id: `animal-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type, name,
    px: rand(29, 33) * TILE, py: rand(12.5, 14.5) * TILE,
    dir: 'down', phase: Math.random() * 6, fed: false, productReady: false,
    moving: false, targetX: null, targetY: null, wanderT: rand(1, 4),
  });
  game.stats.animalsBought = (game.stats.animalsBought || 0) + 1;
  toast(`${name} the ${def.name} joins the farm!`, type === 'chicken' ? '🐔' : type === 'duck' ? '🦆' : type === 'cow' ? '🐄' : '🐑', 'good');
  sfx('coin');
  renderShop();
  checkQuests();
}

function sellItem(id, qty) {
  const item = ITEMS[id];
  if (!item || !item.sell) return;
  const have = itemCount(id);
  const n = Math.min(qty, have);
  if (n <= 0) return;
  removeItem(id, n);
  const total = item.sell * n;
  addMoney(total, true);
  toast(`Sold ${n} ${item.name} for ${total}g.`, '🪙', 'good');
  sfx('coin');
  renderShop();
  checkQuests();
}

function shipAll() {
  let total = 0, count = 0;
  for (const [id, n] of Object.entries(game.inventory)) {
    const item = ITEMS[id];
    if (!item || !item.sell || n <= 0) continue;
    total += item.sell * n;
    count += n;
    delete game.inventory[id];
  }
  if (!count) { toast('Nothing to ship.', '📦'); return; }
  addMoney(total, true);
  renderHotbar();
  toast(`Shipped ${count} items for ${total}g.`, '🪙', 'quest');
  sfx('coin');
  renderShop();
  checkQuests();
}

function doService(key) {
  if (!activeShop || !game) return;
  const id = activeShop.id;
  if (key.startsWith('upgrade:')) {
    const toolId = key.split(':')[1];
    const lvl = game.upgrades[toolId] || 1;
    if (lvl >= 3) return;
    const cost = lvl === 1 ? 600 : 1500;
    if (!spendMoney(cost)) return;
    game.upgrades[toolId] = lvl + 1;
    toast(`${toolId === 'axe' ? 'Axe' : toolId === 'can' ? 'Watering Can' : 'Fishing Rod'} upgraded to Lv ${lvl + 1}!`, '🔨', 'quest');
    sfx('catch');
    renderShop();
    return;
  }
  if (key === 'heal') {
    if (!spendMoney(80)) return;
    game.energy = game.maxEnergy;
    toast('Fully rested. Dr. Sage gives you a lollipop.', '💗', 'good');
    sfx('sleep');
    updateHud(true);
    renderShop();
    return;
  }
  if (key === 'mail') {
    if (game.stats.mailDay === game.day) return;
    game.stats.mailDay = game.day;
    if (Math.random() < 0.55) {
      const amount = randInt(80, 180);
      addMoney(amount, true);
      toast(`The parcel contains ${amount}g and a kind note.`, '📬', 'good');
    } else {
      const gifts = ['feed', 'coffee', 'sandwich', 'mushroom', 'berry', 'shell', 'flower'];
      const item = pick(gifts);
      addItem(item, 1, true);
      toast(`The parcel contains ${ITEMS[item].name}.`, '📬', 'good');
    }
    sfx('coin');
    renderShop();
    return;
  }
  if (key === 'bulletin') {
    const s = game.stats;
    $('shop-hint').textContent = `Day ${game.day} · ${seasonNow()} · ${game.animals.length} animals · ${s.harvested} crops harvested · ${s.fish} fish caught · ${s.earnings}g earned all-time. “The valley is thriving because of you.”`;
    sfx('click');
    return;
  }
  if (key === 'house') {
    const lvl = game.upgrades.house || 1;
    if (lvl >= 3) return;
    const cost = lvl === 1 ? 1500 : 3500;
    if (!spendMoney(cost)) return;
    game.upgrades.house = lvl + 1;
    game.maxEnergy += 20;
    game.energy = Math.min(game.maxEnergy, game.energy + 20);
    toast(`Farmhouse upgraded to Lv ${lvl + 1}! Max energy +20.`, '🏡', 'quest');
    sfx('catch');
    updateHud(true);
    renderShop();
    return;
  }
  if (key === 'sprinkler') {
    if (game.upgrades.sprinkler) return;
    if (!spendMoney(1800)) return;
    game.upgrades.sprinkler = true;
    for (const p of Object.values(game.plots)) if (p.crop) p.watered = true;
    toast('Sprinkler system installed. Morning watering is automatic!', '💦', 'quest');
    sfx('water');
    renderShop();
    return;
  }
  if (key === 'farm') {
    if (game.upgrades.farmExpanded) return;
    if (!spendMoney(1200)) return;
    game.upgrades.farmExpanded = true;
    let added = 0;
    for (let y = 12; y <= 13; y++) {
      for (let x = 13; x <= 18; x++) {
        const k = `farm:${x}:${y}`;
        if (!game.plots[k] && !objectAtTile(maps.farm, x, y)) {
          game.plots[k] = { crop: null, days: 0, watered: false, ready: false };
          added++;
        }
      }
    }
    toast(`Field expanded! ${added} new plots tilled.`, '🌾', 'quest');
    sfx('harvest');
    renderShop();
    return;
  }
  if (key === 'sleep') {
    closeOverlay('shop');
    sleepNow(false);
    return;
  }
  if (key === 'save') {
    saveGame(true);
    return;
  }
}

/* ------------------------------------------------------------------ */
/* Inventory                                                          */
/* ------------------------------------------------------------------ */
function renderInventory() {
  if (!game) return;
  const grid = $('inv-grid');
  if (!grid) return;
  const entries = Object.entries(game.inventory)
    .filter(([id, n]) => n > 0 && ITEMS[id])
    .sort((a, b) => {
      const ka = ITEMS[a[0]].kind, kb = ITEMS[b[0]].kind;
      return ka === kb ? ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name) : ka.localeCompare(kb);
    });
  if (!entries.length) {
    grid.innerHTML = '<div class="empty-shop">Your backpack is empty. Forage, harvest and fish to fill it up!</div>';
  } else {
    grid.innerHTML = entries.map(([id, n]) => {
      const item = ITEMS[id];
      const selected = item.kind === 'seed' && game.seed === id ? ' selected' : '';
      const hint = item.kind === 'seed' ? 'Click to bind to seed pouch'
        : item.energy ? `Click to eat · +${item.energy} energy`
          : item.sell ? `Sells for ${item.sell}g` : 'A keepsake';
      return `<button class="inv-card${selected}" data-inv="${id}" title="${escapeHtml(item.desc || '')}">
        <span class="inv-icon">${item.icon}</span>
        <span class="inv-name">${escapeHtml(item.name)}</span>
        <span class="inv-count">×${n}</span>
        <span class="inv-tip">${escapeHtml(hint)}</span>
      </button>`;
    }).join('');
  }
  $('inv-money').textContent = `${game.money.toLocaleString()}g`;
}

function handleInventoryItem(id) {
  const item = ITEMS[id];
  if (!item) return;
  if (item.kind === 'seed') {
    game.seed = id;
    game.tool = 'seeds';
    renderHotbar();
    renderInventory();
    toast(`Seed pouch now holds ${item.name}.`, item.icon, 'good');
    sfx('click');
    return;
  }
  if (item.energy) {
    if (game.energy >= game.maxEnergy) { toast('You are already full of energy.', '⚡'); return; }
    removeItem(id, 1);
    const gained = restoreEnergy(item.energy);
    toast(`Ate ${item.name}. +${gained} energy.`, item.icon, 'good');
    sfx('harvest');
    renderInventory();
    return;
  }
  toast(`${item.name}: ${item.desc || 'A useful thing.'}`, item.icon);
  sfx('click');
}

/* ------------------------------------------------------------------ */
/* Menu, creation and UI bindings                                     */
/* ------------------------------------------------------------------ */
function refreshCreationUI() {
  const segs = [['gender-opts', 'gender'], ['style-opts', 'style']];
  for (const [hostId, field] of segs) {
    const host = $(hostId);
    if (!host) continue;
    for (const btn of host.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === selectedCreation[field]);
    }
  }
  for (const [hostId, field, palette] of [
    ['skin-opts', 'skin', PALETTES.skin],
    ['hair-opts', 'hair', PALETTES.hair],
    ['shirt-opts', 'shirt', PALETTES.shirt],
  ]) {
    const host = $(hostId);
    if (!host) continue;
    for (const btn of host.querySelectorAll('button')) {
      btn.classList.toggle('active', btn.dataset.value === selectedCreation[field]);
    }
  }
  const label = $('preview-label');
  if (label) label.textContent = selectedCreation.name ? `${selectedCreation.name}'s look` : 'Ready for the valley';
}

function initCreationUI() {
  for (const [hostId, field] of [['gender-opts', 'gender'], ['style-opts', 'style']]) {
    const host = $(hostId);
    if (!host) continue;
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      selectedCreation[field] = btn.dataset.value;
      refreshCreationUI();
      sfx('click');
    });
  }
  const swatchDefs = [
    ['skin-opts', 'skin', PALETTES.skin],
    ['hair-opts', 'hair', PALETTES.hair],
    ['shirt-opts', 'shirt', PALETTES.shirt],
  ];
  for (const [hostId, field, colors] of swatchDefs) {
    const host = $(hostId);
    if (!host) continue;
    host.innerHTML = colors.map(c => `<button class="swatch" data-value="${c}" style="--sw:${c}" aria-label="${c}"></button>`).join('');
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn) return;
      selectedCreation[field] = btn.dataset.value;
      refreshCreationUI();
      sfx('click');
    });
  }
  const nameInput = $('farmer-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      selectedCreation.name = nameInput.value.trim().slice(0, 14);
      refreshCreationUI();
    });
  }
  $('btn-create-back').addEventListener('click', () => {
    $('creation').classList.add('hidden');
    $('menu').classList.remove('hidden');
    mode = 'menu';
    sfx('close');
  });
  $('btn-start').addEventListener('click', startNewGame);
  refreshCreationUI();
}

function bindUI() {
  $('btn-new').addEventListener('click', () => {
    unlockAudio();
    mode = 'creation';
    $('menu').classList.add('hidden');
    $('creation').classList.remove('hidden');
    const nameInput = $('farmer-name');
    if (nameInput) nameInput.value = selectedCreation.name === 'Farmer' ? 'Farmer' : selectedCreation.name;
    refreshCreationUI();
    sfx('open');
  });
  $('btn-continue').addEventListener('click', continueGame);
  $('btn-how').addEventListener('click', openHelp);
  $('btn-inventory').addEventListener('click', openInventory);
  $('btn-help').addEventListener('click', openHelp);
  $('btn-menu').addEventListener('click', openPause);
  $('btn-sound').addEventListener('click', () => {
    unlockAudio();
    soundOn = !soundOn;
    setMuted(!soundOn);
    updateSoundButton();
    if (soundOn) sfx('click');
  });

  $('inv-close').addEventListener('click', () => closeOverlay('inventory'));
  $('help-close').addEventListener('click', () => closeOverlay('help'));
  $('help-ok').addEventListener('click', () => closeOverlay('help'));

  $('dlg-next').addEventListener('click', nextDialogue);
  $('dlg-gift').addEventListener('click', giveGift);
  $('dlg-close').addEventListener('click', () => closeOverlay('dialogue'));

  $('shop-close').addEventListener('click', () => closeOverlay('shop'));
  $('shop-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn || !activeShop) return;
    activeShop.tab = btn.dataset.tab;
    renderShop();
    sfx('click');
  });
  $('shop-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-buy], button[data-animal], button[data-sell], button[data-shipall], button[data-service]');
    if (!btn || !activeShop) return;
    if (btn.dataset.buy) buyItem(btn.dataset.buy);
    else if (btn.dataset.animal) buyAnimal(btn.dataset.animal);
    else if (btn.dataset.sell) sellItem(btn.dataset.sell, Number(btn.dataset.qty) || 1);
    else if (btn.dataset.shipall) shipAll();
    else if (btn.dataset.service) doService(btn.dataset.service);
  });

  $('inv-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-inv]');
    if (btn) handleInventoryItem(btn.dataset.inv);
  });
  $('hotbar').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tool]');
    if (btn) selectTool(btn.dataset.tool);
  });
  $('fish-hook').addEventListener('click', fishingPress);

  $('pause-resume').addEventListener('click', () => closeOverlay('pause'));
  $('pause-save').addEventListener('click', () => saveGame(true));
  $('pause-help').addEventListener('click', openHelp);
  $('pause-quit').addEventListener('click', () => {
    saveGame(false);
    returnToMenu();
  });
  $('day-overlay').addEventListener('click', () => {
    if (overlayStack.includes('day-overlay')) closeOverlay('day-overlay');
  });

  // close overlays by clicking the dim background (but not the card)
  for (const id of ['dialogue', 'shop', 'inventory', 'help', 'pause']) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) closeOverlay(id);
    });
  }
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */
function boot() {
  initMuted();
  soundOn = !isMuted();
  updateSoundButton();
  maps = buildMaps();
  caches = {};
  for (const key of Object.keys(maps)) caches[key] = buildMapCache(maps[key]);
  demo = createDemoState();
  if (isTouch) document.body.classList.add('touch');
  resize();
  bindInput();
  bindTouch();
  bindUI();
  initCreationUI();
  updateContinueButton();
  updateSoundButton();
  $('hud').classList.add('hidden');
  $('menu').classList.remove('hidden');
  mode = 'menu';
  camera = { ...demoCam };
  requestAnimationFrame(loop);
}

boot();
window.__wc = {
  get game() { return game; },
  get mode() { return mode; },
  get camera() { return camera; },
  get view() { return { viewW, viewH, pixelScale }; },
  get map() { return mapNow(); },
  get overlays() { return overlayStack.slice(); },
  get fishing() { return fishing; },
};
