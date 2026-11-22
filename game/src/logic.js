// Ember Court: the pure game rules. No DOM here, so Node can autopilot it and the
// browser can play it from the same code — one ruleset, two front ends.
//
// A duel: you (the Ember Acolyte) against the Warden of the Court. Both start at
// 30 life. A round is your turn then the Warden's turn. At the start of your turn
// you draw a card and your mana refills to the round number (up to 10). Playing a
// card costs its mana, applies its effect at once, and puts it on the table (the
// last three cards each side played stay face-up on the table). Damage hits shield
// first, then life. Drawing from an empty deck deals 2 fatigue damage. The duel
// ends when a life total reaches 0.
import { CARD_BY_ID, FATIGUE_DAMAGE, MAX_HAND, MAX_LIFE, MAX_MANA, START_LIFE, freshDeck } from './config.js';
import { createRandom } from './random.js';

export const PHASE_PLAYER = 'player';
export const PHASE_AI = 'ai';
export const PHASE_OVER = 'over';

function shuffle(deck, random) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

function newSide(random) {
  return {
    life: START_LIFE,
    shield: 0,
    mana: 1,
    maxMana: 1,
    deck: shuffle(freshDeck(), random),
    hand: [],
    discard: [],
    fatigue: 0,
  };
}

/** A fresh duel. `seed` fixes both shuffles, so the same seed always deals the same hands. */
export function createGame(seed) {
  const random = createRandom(seed);
  const game = {
    seed,
    round: 1,
    phase: PHASE_PLAYER,
    you: newSide(random),
    foe: newSide(random),
    tableYou: [],
    tableFoe: [],
    log: [],
    winner: null,
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, turns: 0 },
  };
  drawCards(game, game.you, 3, 'You');
  drawCards(game, game.foe, 3, 'Warden');
  game.you.mana = 1;
  game.you.maxMana = 1;
  game.foe.mana = 1;
  game.foe.maxMana = 1;
  logLine(game, 'The duel begins. You draw 3 cards; the Warden draws 3.');
  return game;
}

export function logLine(game, text) {
  game.log.push(text);
  if (game.log.length > 5) game.log.shift();
}

/** Draw `n` cards for `side`; an empty deck deals fatigue damage instead of a card. */
export function drawCards(game, side, n, who) {
  for (let i = 0; i < n; i += 1) {
    if (side.hand.length >= MAX_HAND) {
      if (side.deck.length > 0) side.deck.pop();
      continue;
    }
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.life -= FATIGUE_DAMAGE;
      logLine(game, `${who} ${who === 'You' ? 'take' : 'takes'} ${FATIGUE_DAMAGE} fatigue — the deck is empty!`);
      checkEnd(game);
      if (game.phase === PHASE_OVER) return;
      continue;
    }
    side.hand.push(side.deck.pop());
  }
}

/** Damage to `target` (shield first, then life). Returns the life damage dealt. */
function dealDamage(game, target, amount, who) {
  let left = amount;
  if (target.shield > 0) {
    const blocked = Math.min(target.shield, left);
    target.shield -= blocked;
    left -= blocked;
  }
  if (left > 0) target.life -= left;
  if (who === 'Warden') game.stats.damageDealt += amount;
  else game.stats.damageTaken += amount;
  return Math.max(0, left);
}

function checkEnd(game) {
  if (game.winner) return;
  if (game.foe.life <= 0 && game.you.life <= 0) game.winner = game.you.life >= game.foe.life ? 'you' : 'foe';
  else if (game.foe.life <= 0) game.winner = 'you';
  else if (game.you.life <= 0) game.winner = 'foe';
  if (game.winner) game.phase = PHASE_OVER;
}

/**
 * Play the card at `handIndex` from `side`'s hand. Returns true when the card was
 * played (it was your turn, the card was there, and you could afford it).
 */
export function playCard(game, side, handIndex, who) {
  if (game.phase === PHASE_OVER) return false;
  if (who === 'You' && game.phase !== PHASE_PLAYER) return false;
  if (who === 'Warden' && game.phase !== PHASE_AI) return false;
  const id = side.hand[handIndex];
  if (id === undefined) return false;
  const card = CARD_BY_ID[id];
  if (side.mana < card.cost) return false;
  side.mana -= card.cost;
  side.hand.splice(handIndex, 1);
  side.discard.push(id);
  const table = who === 'You' ? game.tableYou : game.tableFoe;
  table.push(id);
  if (table.length > 3) table.shift();
  game.stats.cardsPlayed += 1;

  const parts = [];
  if (card.dmg) {
    const target = who === 'You' ? game.foe : game.you;
    const lifeHit = dealDamage(game, target, card.dmg, who);
    parts.push(`${card.dmg} damage${lifeHit > 0 ? ` (${lifeHit} to life)` : ' (all blocked)'}`);
  }
  if (card.shield) {
    side.shield += card.shield;
    parts.push(`+${card.shield} shield`);
  }
  if (card.heal) {
    const healed = Math.min(card.heal, MAX_LIFE - side.life);
    side.life += healed;
    parts.push(`+${healed} life`);
  }
  if (card.draw) {
    drawCards(game, side, card.draw, who);
    parts.push(`Draw ${card.draw}`);
  }
  logLine(game, `${who === 'You' ? 'You play' : 'Warden plays'} ${card.name} — ${parts.join(', ') || 'nothing happens'}.`);
  checkEnd(game);
  return true;
}

/** Start `side`'s turn: refill mana to the round number and draw a card. */
export function startTurn(game, side, who) {
  side.maxMana = Math.min(MAX_MANA, game.round);
  side.mana = side.maxMana;
  drawCards(game, side, 1, who);
}

/** How much a card is worth to the side playing it, for the greedy pilots. */
export function cardValue(game, side, card) {
  const foe = side === game.you ? game.foe : game.you;
  let value = 0;
  if (card.dmg) {
    const throughShield = Math.max(0, card.dmg - foe.shield);
    value += card.dmg * 0.6 + throughShield * 0.8;
    if (foe.life - throughShield <= 0) value += 100;
  }
  if (card.shield) value += card.shield * 0.9;
  if (card.heal) value += Math.min(card.heal, MAX_LIFE - side.life) * 0.7;
  if (card.draw) value += card.draw * 1.6;
  value -= card.cost * 0.15;
  return value;
}

/** The Warden's turn: play the best affordable card, again and again, then end. */
export function aiTurn(game) {
  if (game.phase !== PHASE_AI) return;
  startTurn(game, game.foe, 'Warden');
  if (game.phase === PHASE_OVER) return;
  for (;;) {
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < game.foe.hand.length; i += 1) {
      const card = CARD_BY_ID[game.foe.hand[i]];
      if (card.cost > game.foe.mana) continue;
      const value = cardValue(game, game.foe, card);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    playCard(game, game.foe, bestIndex, 'Warden');
    if (game.phase === PHASE_OVER) return;
  }
  logLine(game, 'The Warden ends the turn.');
  endRound(game);
}

function endRound(game) {
  game.round += 1;
  game.stats.turns += 1;
  game.phase = PHASE_PLAYER;
  startTurn(game, game.you, 'You');
}

/** End your turn: the Warden plays, then the round advances. */
export function endPlayerTurn(game) {
  if (game.phase !== PHASE_PLAYER) return;
  logLine(game, 'You end the turn.');
  game.phase = PHASE_AI;
  aiTurn(game);
}

/**
 * The player's autopilot. 'strong' plays the best-value affordable card until
 * none is worth playing, then ends the turn; 'weak' plays a random affordable
 * card (or passes) — the pilot a hurried player resembles, and the one that loses.
 */
export function autopilotPlayerTurn(game, skill, random) {
  if (game.phase !== PHASE_PLAYER) return;
  for (;;) {
    const affordable = [];
    for (let i = 0; i < game.you.hand.length; i += 1) {
      if (CARD_BY_ID[game.you.hand[i]].cost <= game.you.mana) affordable.push(i);
    }
    if (affordable.length === 0) break;
    if (skill === 'weak') {
      if (random() < 0.35) break;
      playCard(game, game.you, affordable[Math.floor(random() * affordable.length)], 'You');
    } else {
      let bestIndex = -1;
      let bestValue = 0.5;
      for (const i of affordable) {
        const value = cardValue(game, game.you, CARD_BY_ID[game.you.hand[i]]);
        if (value > bestValue) {
          bestValue = value;
          bestIndex = i;
        }
      }
      if (bestIndex === -1) break;
      playCard(game, game.you, bestIndex, 'You');
    }
    if (game.phase === PHASE_OVER) return;
  }
  endPlayerTurn(game);
}

/** Play a whole duel with the named player skill. Returns the finished game. */
export function selfPlay(seed, skill) {
  const game = createGame(seed);
  const random = createRandom(seed ^ 0x9e3779b9);
  let guard = 0;
  while (game.phase !== PHASE_OVER && guard < 200) {
    autopilotPlayerTurn(game, skill, random);
    guard += 1;
  }
  return game;
}
