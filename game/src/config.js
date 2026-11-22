// Ember Court: every tuning number, card and colour in one place. The table is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no rule
// below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const START_LIFE = 30;
export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 7;
export const FATIGUE_DAMAGE = 2;

/** The four houses of the Court. Each card belongs to one house. */
export const HOUSES = {
  ember: { name: 'Ember', color: '#e8533a', dark: '#8f2a1a', light: '#ffb199', glyph: 'flame' },
  tide: { name: 'Tide', color: '#3a9be8', dark: '#174a75', light: '#a8d4f8', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#4caf6d', dark: '#1f5c33', light: '#a9e6bd', glyph: 'leaf' },
  gale: { name: 'Gale', color: '#e8b93a', dark: '#7a5c14', light: '#f8e3a1', glyph: 'wind' },
};

/**
 * The thirteen cards of the Court. Every deck holds two copies of each (26 cards).
 * dmg hits the other duelist (shield first), shield blocks damage, heal restores
 * life (never above 30), draw pulls cards from your own deck.
 */
export const CARDS = [
  { id: 'spark', name: 'Ember Spark', house: 'ember', cost: 0, dmg: 1, text: 'Deal 1 damage.' },
  { id: 'cinder', name: 'Cinder Strike', house: 'ember', cost: 1, dmg: 3, text: 'Deal 3 damage.' },
  { id: 'lash', name: 'Flame Lash', house: 'ember', cost: 2, dmg: 5, text: 'Deal 5 damage.' },
  { id: 'inferno', name: 'Inferno', house: 'ember', cost: 5, dmg: 9, text: 'Deal 9 damage.' },
  { id: 'tidewall', name: 'Tidewall', house: 'tide', cost: 1, shield: 4, text: 'Gain 4 shield.' },
  { id: 'deepward', name: 'Deep Ward', house: 'tide', cost: 2, shield: 7, text: 'Gain 7 shield.' },
  { id: 'flood', name: 'Flood', house: 'tide', cost: 3, dmg: 4, shield: 3, text: 'Deal 4 damage. Gain 3 shield.' },
  { id: 'bloom', name: 'Bloom', house: 'thorn', cost: 1, heal: 4, text: 'Restore 4 life.' },
  { id: 'thornvine', name: 'Thornvine', house: 'thorn', cost: 2, dmg: 3, heal: 3, text: 'Deal 3 damage. Restore 3 life.' },
  { id: 'overgrowth', name: 'Overgrowth', house: 'thorn', cost: 3, heal: 7, draw: 1, text: 'Restore 7 life. Draw a card.' },
  { id: 'zephyr', name: 'Zephyr', house: 'gale', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'galerush', name: 'Gale Rush', house: 'gale', cost: 2, dmg: 2, draw: 1, text: 'Deal 2 damage. Draw a card.' },
  { id: 'stormcall', name: 'Stormcall', house: 'gale', cost: 4, dmg: 6, draw: 1, text: 'Deal 6 damage. Draw a card.' },
];

/** Card lookup by id. */
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** A fresh deck: two copies of every card, in definition order (shuffled at game start). */
export function freshDeck() {
  const deck = [];
  for (const card of CARDS) deck.push(card.id, card.id);
  return deck;
}

export const PALETTE = {
  backdrop: '#0b0e14',
  felt: '#123527',
  feltDark: '#0d2a1e',
  feltLight: '#17503a',
  feltEdge: '#c9a227',
  feltTrim: '#8a6d1f',
  panel: '#171a26',
  panelEdge: '#3d4257',
  text: '#f2ead8',
  muted: '#a8a08a',
  gold: '#e8c25a',
  goldDeep: '#c9a227',
  life: '#e5534b',
  lifeDark: '#7a1f1a',
  shield: '#5aa9e6',
  mana: '#7fb3ff',
  manaEmpty: '#2c3550',
  you: '#e8b93a',
  foe: '#b06fd6',
  cardBack: '#2a1f4d',
  cardBackEdge: '#c9a227',
  button: '#2a2f42',
  buttonHot: '#c9a227',
  logBg: 'rgba(10, 12, 20, 0.72)',
  win: '#e8c25a',
  lose: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'ember-court.best';
