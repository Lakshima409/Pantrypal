// server/utils/recipeImage.js
// The imported corpus stores placeholder image URLs (https://example.com/...)
// that never resolve, so every recipe tile rendered as a broken image.
//
// This helper maps each recipe to a REAL food photo by classifying its
// title + ingredients, then picks one verified photo URL per category
// (rotated deterministically per recipe so different dishes look different).
// If nothing matches, it falls back to a generated SVG tile that always loads.

// --- Real photos ---------------------------------------------------------
// Every URL below was verified to return HTTP 200 with an image/* body.
// Multiple candidates per category so variety is deterministic by recipe.
const IMG_PARAMS = '?auto=format&fit=crop&w=800&q=80';

const PHOTO_BUCKETS = {
  salmon: [
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
    'https://images.unsplash.com/photo-1485921325833-c519f76c4927',
  ],
  tuna: [
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2',
    'https://images.unsplash.com/photo-1535140728325-a4d3707eee61',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c',
  ],
  prawn: [
    'https://images.unsplash.com/photo-1553621042-f6e147245754',
    'https://images.unsplash.com/photo-1565688534245-05d6b5be184a',
    'https://images.unsplash.com/photo-1625943553852-781c6dd46faa',
  ],
  chicken: [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
  ],
  beef: [
    'https://images.unsplash.com/photo-1544025162-d76694265947',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e',
    'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba',
  ],
  tofu: [
    'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf',
    'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d',
  ],
  lentil: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246',
  ],
  chickpea: [
    'https://images.unsplash.com/photo-1585032226651-759b368d7246',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  ],
  bean: [
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  ],
  rice: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  ],
  noodle: [
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8',
    'https://images.unsplash.com/photo-1552611052-33e04de081de',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1432139555190-58524dae6a55',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601',
  ],
  salad: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe',
    'https://images.unsplash.com/photo-1546793665-c74683f339c1',
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592180-85f173990554',
    'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a',
  ],
  curry: [
    'https://images.unsplash.com/photo-1585032226651-759b368d7246',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
  ],
  wrap: [
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f',
    'https://images.unsplash.com/photo-1565299507177-b0ac66763828',
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b',
  ],
  bowl: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061',
  ],
  stirfry: [
    'https://images.unsplash.com/photo-1512058564366-18510be2db19',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8',
  ],
  skillet: [
    'https://images.unsplash.com/photo-1600891964092-4316c288032e',
    'https://images.unsplash.com/photo-1553621042-f6e147245754',
    'https://images.unsplash.com/photo-1544025162-d76694265947',
  ],
  bake: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
  ],
};

// Ordered classification rules — first match wins. Most visually distinctive
// cues (proteins) come before generic dish forms so the photo is relevant.
const CATEGORY_RULES = [
  [/salmon/, 'salmon'],
  [/tuna/, 'tuna'],
  [/prawn|shrimp/, 'prawn'],
  [/chicken/, 'chicken'],
  [/beef|steak/, 'beef'],
  [/tofu/, 'tofu'],
  [/lentil/, 'lentil'],
  [/chickpea/, 'chickpea'],
  [/kidney bean|bean/, 'bean'],
  [/noodle/, 'noodle'],
  [/pasta|spaghetti/, 'pasta'],
  [/\brice\b/, 'rice'],
  [/soup/, 'soup'],
  [/salad/, 'salad'],
  [/curry/, 'curry'],
  [/wrap|burrito/, 'wrap'],
  [/stir[- ]?fry/, 'stirfry'],
  [/skillet/, 'skillet'],
  [/\bbake|baked|roasted|casserole/, 'bake'],
  [/bowl|grain|poke/, 'bowl'],
];

function classify(text) {
  const t = String(text || '').toLowerCase();
  for (const [re, cat] of CATEGORY_RULES) if (re.test(t)) return cat;
  return null;
}

function pickPhoto(category, seedText) {
  const bucket = PHOTO_BUCKETS[category];
  if (!bucket || !bucket.length) return null;
  const idx = Math.abs(hash(seedText)) % bucket.length;
  return bucket[idx] + IMG_PARAMS;
}

const CUISINE_COLORS = {
  italian: ['#e11d48', '#16a34a'],
  mexican: ['#ef4444', '#f59e0b'],
  indian: ['#f97316', '#b45309'],
  sri_lankan: ['#eab308', '#f97316'],
  asian: ['#f59e0b', '#dc2626'],
  chinese: ['#dc2626', '#111827'],
  japanese: ['#f472b6', '#1f2937'],
  thai: ['#f59e0b', '#059669'],
  mediterranean: ['#0ea5e9', '#f8fafc'],
  greek: ['#0ea5e9', '#f8fafc'],
  american: ['#3b82f6', '#ef4444'],
  french: ['#8b5cf6', '#ec4899'],
  default: ['#f97316', '#7c2d0e'],
};

// Main ingredient / protein -> emoji shown on the generated tile.
const INGREDIENT_EMOJI = [
  [/prawn|shrimp/, '🦐'],
  [/salmon|tuna|fish/, '🐟'],
  [/chicken/, '🍗'],
  [/beef|steak/, '🥩'],
  [/pork|bacon/, '🥓'],
  [/tofu/, '🍢'],
  [/egg/, '🍳'],
  [/chickpea|bean|lentil/, '🫘'],
  [/rice/, '🍚'],
  [/noodle|pasta|spaghetti/, '🍜'],
  [/salad/, '🥗'],
  [/soup|stew|curry/, '🍲'],
  [/bread|toast|sandwich|wrap/, '🥪'],
  [/cake|cookie|dessert|sweet/, '🍰'],
  [/pizza/, '🍕'],
  [/taco|burrito/, '🌮'],
  [/burger/, '🍔'],
  [/vegetable|veg|spinach|carrot|broccoli|zucchini|pumpkin/, '🥦'],
  [/fruit|berry|apple|banana|mango/, '🍓'],
];

const DEFAULT_EMOJI = '🍽️';

function pickEmoji(text) {
  const t = String(text || '').toLowerCase();
  for (const [re, emoji] of INGREDIENT_EMOJI) if (re.test(t)) return emoji;
  return DEFAULT_EMOJI;
}

function cuisineKey(text) {
  const t = String(text || '').toLowerCase();
  for (const key of Object.keys(CUISINE_COLORS)) {
    if (key !== 'default' && t.includes(key.replace('_', ' '))) return key;
    if (key !== 'default' && t.includes(key)) return key;
  }
  return 'default';
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Wrap a title onto up to 3 short lines so it never overflows the tile.
function wrapTitle(title, perLine = 16, maxLines = 3) {
  const words = String(title || 'Recipe').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > perLine && line) {
      lines.push(line.trim());
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line && lines.length < maxLines) lines.push(line.trim());
  return lines.slice(0, maxLines);
}

function generatedImage(title, contextText) {
  const [c1, c2] = CUISINE_COLORS[cuisineKey(contextText || title)];
  const emoji = pickEmoji(contextText || title);
  const lines = wrapTitle(title);
  const gid = 'g' + Math.abs(hash(title + contextText)).toString(36);
  const titleSvg = lines
    .map((ln, i) => `<text x="300" y="${238 + i * 26}" fill="#ffffff" font-size="20" font-family="Georgia, serif" font-weight="700" text-anchor="middle">${escapeXml(ln)}</text>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="400" fill="url(#${gid})"/>` +
    `<circle cx="300" cy="150" r="92" fill="rgba(255,255,255,0.16)"/>` +
    `<text x="300" y="150" font-size="96" text-anchor="middle" dominant-baseline="central">${emoji}</text>` +
    titleSvg +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function hash(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// True when a stored URL is missing or a known non-resolving placeholder.
function isPlaceholder(url) {
  if (!url) return true;
  const u = String(url).trim().toLowerCase();
  if (!u) return true;
  return u.includes('example.com') || u.includes('placeholder') || u.includes('via.placeholder');
}

/**
 * Resolve the best image for a recipe.
 * @param {string} url     stored image_url (may be a placeholder/empty)
 * @param {string} title   recipe title (used for matching + generated tiles)
 * @param {string} context cuisine / ingredient text used to classify the photo
 * @returns {string} a usable image URL (real photo or generated data-URI)
 */
function recipeImage(url, title, context) {
  // Respect any real, non-placeholder URL the corpus might already provide.
  if (!isPlaceholder(url)) return url;

  const seed = `${title || ''} ${context || ''}`;
  const category = classify(seed);
  if (category) {
    const photo = pickPhoto(category, seed);
    if (photo) return photo;
  }
  // Ultimate fallback: a deterministic generated tile that always loads.
  return generatedImage(title || 'Recipe', context || title || '');
}

module.exports = { recipeImage, generatedImage, isPlaceholder, classify };
