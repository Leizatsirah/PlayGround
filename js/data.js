// Static game data: items, crops, animals, fish, shops, NPCs, quests.

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const WEATHER = {
  sunny: { name: 'Sunny', icon: '☀️', tint: 0 },
  cloudy: { name: 'Cloudy', icon: '☁️', tint: 0.04 },
  rain: { name: 'Rainy', icon: '🌧️', tint: 0.12 },
  storm: { name: 'Stormy', icon: '⛈️', tint: 0.2 },
};

export const ITEMS = {
  turnip_seed:     { name: 'Turnip Seeds',    icon: '🌱', sell: 0,   buy: 20,  kind: 'seed', desc: 'Plant in tilled soil. Grows in 3 watered days.' },
  strawberry_seed: { name: 'Strawberry Seeds',icon: '🌱', sell: 0,   buy: 60,  kind: 'seed', desc: 'A sweet summer treat. 4 watered days.' },
  pumpkin_seed:    { name: 'Pumpkin Seeds',   icon: '🌱', sell: 0,   buy: 100, kind: 'seed', desc: 'A prize-winning pumpkin. 5 watered days.' },
  sapling:         { name: 'Apple Sapling',   icon: '🌳', sell: 0,   buy: 150, kind: 'seed', desc: 'Plant in tilled soil. Bears apples every few days.' },

  turnip:      { name: 'Turnip',       icon: '🥬', sell: 55,  kind: 'crop',  desc: 'Crisp and peppery.' },
  strawberry:  { name: 'Strawberry',   icon: '🍓', sell: 140, kind: 'crop',  desc: 'Sun-warmed and sweet.' },
  pumpkin:     { name: 'Pumpkin',      icon: '🎃', sell: 320, kind: 'crop',  desc: 'Heavy, orange, glorious.' },
  apple:       { name: 'Apple',        icon: '🍎', sell: 65,  kind: 'crop',  desc: 'From your own orchard.' },

  egg:         { name: 'Egg',          icon: '🥚', sell: 45,  kind: 'animal',desc: 'Still warm from the coop.' },
  duck_egg:    { name: 'Duck Egg',     icon: '🥚', sell: 60,  kind: 'animal',desc: 'A little richer than a hen egg.' },
  milk:        { name: 'Milk',         icon: '🥛', sell: 140, kind: 'animal',desc: 'Frothed and fresh.' },
  wool:        { name: 'Wool',         icon: '🧶', sell: 180, kind: 'animal',desc: 'Soft enough for a winter scarf.' },

  feed:        { name: 'Animal Feed',  icon: '🌾', sell: 6,   buy: 15,  kind: 'supply', desc: 'One bag feeds one animal for a day.' },
  sandwich:    { name: 'Sandwich',     icon: '🥪', sell: 20,  buy: 60,  kind: 'food', desc: 'Restores 35 energy.', energy: 35 },
  coffee:      { name: 'Coffee',       icon: '☕', sell: 12,  buy: 35,  kind: 'food', desc: 'Restores 20 energy.', energy: 20 },
  meal:        { name: 'Hot Meal',     icon: '🍲', sell: 40,  buy: 120, kind: 'food', desc: 'Restores 60 energy.', energy: 60 },
  salad:       { name: 'Garden Salad', icon: '🥗', sell: 30,  buy: 80,  kind: 'food', desc: 'Restores 45 energy.', energy: 45 },
  tonic:       { name: 'Herbal Tonic', icon: '🧪', sell: 30,  buy: 90,  kind: 'food', desc: 'Restores 50 energy.', energy: 50 },
  ale:         { name: 'Meadow Ale',   icon: '🍺', sell: 15,  buy: 40,  kind: 'food', desc: 'Restores 10 energy. Tastes like home.', energy: 10 },

  mushroom:    { name: 'Mushroom',     icon: '🍄', sell: 40,  kind: 'forage', desc: 'Found under the old forest trees.' },
  berry:       { name: 'Wild Berries', icon: '🫐', sell: 25,  kind: 'forage', desc: 'Tart little forest gems.' },
  shell:       { name: 'Sea Shell',    icon: '🐚', sell: 35,  kind: 'forage', desc: 'The tide leaves tiny treasures.' },
  wood:        { name: 'Wood',         icon: '🪵', sell: 12,  kind: 'resource', desc: 'Chop trees in the forest.' },
  stone:       { name: 'Stone',        icon: '🪨', sell: 15,  kind: 'resource', desc: 'Mine rocks with your axe.' },
  flower:      { name: 'Wildflower',   icon: '🌼', sell: 20,  kind: 'forage', desc: 'A cheerful little bloom.' },

  trout:       { name: 'River Trout',  icon: '🐟', sell: 60,  kind: 'fish', desc: 'A river regular.' },
  bass:        { name: 'Largemouth Bass', icon: '🐟', sell: 80, kind: 'fish', desc: 'Puts up a good fight.' },
  catfish:     { name: 'Catfish',      icon: '🐟', sell: 140, kind: 'fish', desc: 'A whiskered river dweller.' },
  sardine:     { name: 'Sardine',      icon: '🐟', sell: 45,  kind: 'fish', desc: 'Small, shiny, plentiful.' },
  snapper:     { name: 'Red Snapper',  icon: '🐠', sell: 110, kind: 'fish', desc: 'A coral-reef beauty.' },
  tuna:        { name: 'Bluefin Tuna', icon: '🐟', sell: 220, kind: 'fish', desc: 'A powerful ocean swimmer.' },
  golden_fish: { name: 'Golden Fish',  icon: '🐠', sell: 500, kind: 'fish', desc: 'A legend of Willow Creek. Very rare.' },
};

export const CROPS = {
  turnip: {
    name: 'Turnip', seed: 'turnip_seed', produce: 'turnip', days: 3, yield: [2, 3],
    stem: '#5fbf4a', leaf: '#3d8f36', fruit: '#f4f0dc', accent: '#c8c0a6',
  },
  strawberry: {
    name: 'Strawberry', seed: 'strawberry_seed', produce: 'strawberry', days: 4, yield: [2, 4],
    stem: '#4fa83f', leaf: '#2f7a2a', fruit: '#e64444', accent: '#ffd85e',
  },
  pumpkin: {
    name: 'Pumpkin', seed: 'pumpkin_seed', produce: 'pumpkin', days: 5, yield: [1, 2],
    stem: '#4f9a3d', leaf: '#2f6e2a', fruit: '#e8892c', accent: '#b95d14',
  },
  tree: {
    name: 'Apple Tree', seed: 'sapling', produce: 'apple', days: 4, yield: [2, 3],
    stem: '#7b5230', leaf: '#3c8f3f', fruit: '#d94343', accent: '#f2c14f', tree: true, regrow: 2,
  },
};

export const SEED_CYCLE = ['turnip_seed', 'strawberry_seed', 'pumpkin_seed', 'sapling'];
export const SEED_TO_CROP = {
  turnip_seed: 'turnip', strawberry_seed: 'strawberry', pumpkin_seed: 'pumpkin', sapling: 'tree',
};

export const ANIMALS = {
  chicken: { name: 'Chicken', cost: 400, product: 'egg', productName: 'Egg', color: '#f7f2df', accent: '#e04b3d', size: 10 },
  duck:    { name: 'Duck',    cost: 500, product: 'duck_egg', productName: 'Duck Egg', color: '#f7d55c', accent: '#e8912c', size: 11 },
  cow:     { name: 'Cow',     cost: 1200, product: 'milk', productName: 'Milk', color: '#f4f0e4', accent: '#2c2a2a', size: 20 },
  sheep:   { name: 'Sheep',   cost: 900, product: 'wool', productName: 'Wool', color: '#f4f0e6', accent: '#4a3b38', size: 18 },
};
export const ANIMAL_NAMES = {
  chicken: ['Henrietta', 'Pip', 'Nugget', 'Clucky', 'Dottie'],
  duck: ['Quackers', 'Mallory', 'Pudding', 'Waddles'],
  cow: ['Buttercup', 'Mabel', 'Daisy', 'Clover'],
  sheep: ['Cloud', 'Wooliam', 'Marshmallow', 'Bramble'],
};

export const FISH = {
  river: [
    { id: 'trout', weight: 40 },
    { id: 'bass', weight: 30 },
    { id: 'catfish', weight: 18 },
    { id: 'golden_fish', weight: 2 },
  ],
  beach: [
    { id: 'sardine', weight: 42 },
    { id: 'snapper', weight: 28 },
    { id: 'tuna', weight: 18 },
    { id: 'golden_fish', weight: 2 },
  ],
};

export const SHOP_ICONS = {
  supermarket: '🏪', ranch: '🐄', bar: '🍺', clinic: '🏥',
  restaurant: '🍲', blacksmith: '🔨', carpenter: '🪚', townhall: '🏛', home: '🏡',
};

export const SHOP_INFO = {
  supermarket: { name: 'Willow Market', tagline: 'Seeds, snacks and everyday supplies', keeper: 'Poppy' },
  ranch: { name: 'Clover Ranch', tagline: 'Animals, feed and fresh produce', keeper: 'Rosa' },
  bar: { name: 'The Rusty Lantern', tagline: 'Warm drinks and warmer conversation', keeper: 'Marlow' },
  clinic: { name: 'Willow Clinic', tagline: 'Rest, recover, repeat', keeper: 'Sage' },
  restaurant: { name: 'The Skillet', tagline: 'Hot meals from the valley', keeper: 'Basil' },
  blacksmith: { name: 'Flint & Flame', tagline: 'Honest tools, expertly sharpened', keeper: 'Flint' },
  carpenter: { name: 'Cedar Works', tagline: 'Home and farm improvements', keeper: 'Cedar' },
  townhall: { name: 'Willow Town Hall', tagline: 'Bulletins, mail and civic pride', keeper: 'Maple' },
  home: { name: 'Your Farmhouse', tagline: 'Home sweet home', keeper: 'You' },
};

export const SHOP_STOCK = {
  supermarket: ['turnip_seed', 'strawberry_seed', 'pumpkin_seed', 'sapling', 'feed', 'sandwich', 'coffee', 'tonic'],
  ranch: ['feed'],
  bar: ['ale', 'coffee'],
  clinic: ['tonic'],
  restaurant: ['meal', 'salad', 'coffee'],
  blacksmith: [],
  carpenter: [],
  townhall: [],
};

export const NPCS = [
  {
    id: 'mayor', name: 'Mayor Maple', role: 'Town Mayor', map: 'town', x: 40, y: 30, radius: 26,
    palette: { skin: '#e8b98e', hair: '#d8d2c4', shirt: '#4f5b9e', pants: '#3a3f6b', style: 'jacket', accessory: 'sash' },
    lines: [
      'Welcome to Willow Creek, farmer! Your grandparents\' old plot is looking lively again.',
      'The town runs on good neighbors and good produce. You\'ll fit right in.',
      'If you need a hand, check the town hall bulletin. And sleep before 2am — the valley wakes early!',
    ],
  },
  {
    id: 'poppy', name: 'Poppy', role: 'Market Clerk', map: 'town', x: 8, y: 8, radius: 18,
    palette: { skin: '#f0c9a2', hair: '#b4552f', shirt: '#e7a13c', pants: '#5d7a3f', style: 'overalls', accessory: 'apron' },
    lines: [
      'Morning! The strawberries came in from the coast this week. Gorgeous.',
      'Seeds are by the window. Feed is by the counter. Snacks are by me.',
      'Crops sell for more at the shipping bin, but I\'ll take them off your hands too.',
    ],
  },
  {
    id: 'rosa', name: 'Rosa', role: 'Rancher', map: 'town', x: 30, y: 8, radius: 20,
    palette: { skin: '#b97a4e', hair: '#3a2a21', shirt: '#b84a42', pants: '#6a4630', style: 'overalls', accessory: 'strawhat' },
    lines: [
      'Animals remember kindness. Feed them every day and they\'ll pay you back in eggs and milk.',
      'A chicken is a fine first step. Cows are a bigger commitment — and a bigger milkshake.',
      'If an animal has a little bubble over its head, it has something for you.',
    ],
  },
  {
    id: 'basil', name: 'Basil', role: 'Chef', map: 'town', x: 16, y: 30, radius: 16,
    palette: { skin: '#d9a066', hair: '#4a2d1e', shirt: '#f2eee2', pants: '#4b4b4b', style: 'jacket', accessory: 'chef' },
    lines: [
      'A hot meal fixes most things. The rest usually need a nap.',
      'Bring me a pumpkin sometime and I\'ll make something ridiculous.',
      'The salad is fresh. The coffee is strong. The pie is a secret.',
    ],
  },
  {
    id: 'sage', name: 'Dr. Sage', role: 'Doctor', map: 'town', x: 41, y: 8, radius: 15,
    palette: { skin: '#8a5a3a', hair: '#2b2a33', shirt: '#eef2ee', pants: '#50627a', style: 'jacket', accessory: 'doctor' },
    lines: [
      'Rest is medicine. Sleep at home and you\'ll wake up right as rain.',
      'If you overdo it in the mines or the fields, the clinic can patch you up.',
      'Drink water. Pet an animal. Call your grandmother. Medical advice, all of it.',
    ],
  },
  {
    id: 'flint', name: 'Flint', role: 'Blacksmith', map: 'town', x: 30, y: 30, radius: 16,
    palette: { skin: '#9e663d', hair: '#3a2a20', shirt: '#43536b', pants: '#2f2f33', style: 'jacket', accessory: 'apron' },
    lines: [
      'A sharp axe makes short work of a long day.',
      'Bring me coin and I\'ll make your tools sing.',
      'That old rod of yours has one more adventure in it. Probably.',
    ],
  },
  {
    id: 'cedar', name: 'Cedar', role: 'Carpenter', map: 'town', x: 17, y: 8, radius: 15,
    palette: { skin: '#e0a878', hair: '#7a4a2f', shirt: '#c77b3a', pants: '#4e3a2a', style: 'overalls', accessory: 'cap' },
    lines: [
      'A house is just a farmhouse with better curtains. I can help with both.',
      'A sprinkler system saves your back and your mornings.',
      'Measure twice. Sleep once. That\'s the Cedar Works motto.',
    ],
  },
  {
    id: 'marlow', name: 'Marlow', role: 'Barkeep', map: 'town', x: 7, y: 30, radius: 14,
    palette: { skin: '#d3a07a', hair: '#5a3b2a', shirt: '#594a77', pants: '#33304a', style: 'jacket', accessory: 'apron' },
    lines: [
      'The lantern\'s always lit. Sit a spell if you like.',
      'Ale restores a little energy. Conversation restores the rest.',
      'Heard a golden fish was spotted near the old dock. Big as a boot, they say.',
    ],
  },
  {
    id: 'moss', name: 'Moss', role: 'Forest Hermit', map: 'forest', x: 30, y: 11, radius: 22,
    palette: { skin: '#c99b70', hair: '#6a7a4f', shirt: '#5d6b45', pants: '#3f4a33', style: 'jacket', accessory: 'hood' },
    lines: [
      'The forest gives freely, if you know where to look. Mushrooms after rain. Berries in the shade.',
      'I planted half these trees. The other half planted themselves.',
      'Listen. That\'s the creek. It\'s been singing the same song for a hundred years.',
    ],
  },
  {
    id: 'coral', name: 'Coral', role: 'Beachcomber', map: 'beach', x: 9, y: 10, radius: 20,
    palette: { skin: '#e6b88c', hair: '#2f6c8a', shirt: '#3fa7a0', pants: '#d8c48a', style: 'dress', accessory: 'sunhat' },
    lines: [
      'The tide brings something new every morning. Shells, driftwood, the occasional boot.',
      'Fish off the end of the dock. The big ones like deep water.',
      'If you find a golden fish, don\'t tell Marlow. He\'ll never stop talking about it.',
    ],
  },
  {
    id: 'nana', name: 'Nana Fern', role: 'Neighbor', map: 'farm', x: 30, y: 20, radius: 18,
    palette: { skin: '#e0b48b', hair: '#cfc7b8', shirt: '#b46a8a', pants: '#5d4a62', style: 'dress', accessory: 'shawl' },
    lines: [
      'Your grandmother would be proud. She planted those trees by the fence herself.',
      'Ship your crops in the green bin. It\'s the one thing in this valley that always pays on time.',
      'Don\'t forget to eat. And don\'t forget to sit by the river sometimes. Work can wait.',
    ],
  },
];

export const QUESTS = [
  { id: 'mayor', text: 'Meet Mayor Maple at the town hall.', reward: 100,
    check: s => !!s.stats.talkedMayor },
  { id: 'plant', text: 'Till a plot with the Hoe, then plant a seed.', reward: 150,
    check: s => s.stats.planted > 0 },
  { id: 'water', text: 'Water a crop, then sleep at the farmhouse.', reward: 150,
    check: s => s.stats.watered > 0 && s.stats.slept > 0 },
  { id: 'harvest', text: 'Harvest a ripe crop.', reward: 200,
    check: s => s.stats.harvested > 0 },
  { id: 'animal', text: 'Buy an animal at Clover Ranch and feed it.', reward: 300,
    check: s => s.stats.animalFed > 0 },
  { id: 'fish', text: 'Catch a fish at the river or the beach.', reward: 250,
    check: s => s.stats.fish > 0 },
  { id: 'explore', text: 'Visit the forest and the beach.', reward: 300,
    check: s => s.stats.visited.forest && s.stats.visited.beach },
  { id: 'earn', text: 'Earn 3,000g from your farm and adventures.', reward: 500,
    check: s => s.stats.earnings >= 3000 },
];

export const PALETTES = {
  skin: ['#f3cfa6', '#e0ae7c', '#b97a4e', '#8a5a3a', '#5e3b26'],
  hair: ['#2a211d', '#5a3b2a', '#9a5b34', '#d7b45a', '#b7b2a8', '#5f4d9e'],
  shirt: ['#d9554f', '#e0a03a', '#4f9e63', '#4f8fb5', '#8a62b8', '#e878a8', '#f2eee2', '#3c4a5c'],
};

export const DEFAULT_PALETTE = {
  skin: PALETTES.skin[0],
  hair: PALETTES.hair[0],
  shirt: PALETTES.shirt[0],
  pants: '#4a5a7a',
};

export const TOOLS = [
  { id: 'hoe', name: 'Hoe', icon: '⛏️', key: 1 },
  { id: 'can', name: 'Watering Can', icon: '💧', key: 2 },
  { id: 'axe', name: 'Axe', icon: '🪓', key: 3 },
  { id: 'rod', name: 'Fishing Rod', icon: '🎣', key: 4 },
  { id: 'seeds', name: 'Seed Pouch', icon: '🌱', key: 5 },
  { id: 'feed', name: 'Feed Bag', icon: '🌾', key: 6 },
];

export const HELP_TIPS = [
  'Tip: watered crops only grow overnight. Rain waters everything for free.',
  'Tip: the shipping bin sells everything in one go. The market buys too.',
  'Tip: animals love being fed every morning. Their bubbles mean a gift is ready.',
  'Tip: talk to the same villager on different days to become better friends.',
  'Tip: the blacksmith can upgrade your rod, axe and watering can.',
  'Tip: the carpenter sells a sprinkler that waters your crops automatically.',
  'Tip: mushrooms appear in the forest each morning. So do shells on the beach.',
];
