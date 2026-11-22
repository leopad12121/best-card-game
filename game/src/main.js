// Boot and the one loop: input is read every frame, the duel advances when the
// player acts, and the renderer paints what is there. The game moves between five
// screens: title, play, paused, win and loss.
//
// ?seed=N fixes the duel. ?shot=start|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
//
// Click a card in your hand (or press 1–7) to play it; Space or the End Turn
// button ends your turn and the Warden plays.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame, endPlayerTurn, playCard } from './logic.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { END_TURN_BUTTON, SCREEN_LOSS, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer, layoutHand } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const game = createGame(seed);
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('ember-court.best') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('ember-court.best', String(value));
  } catch {
    // Storage can be off (private windows): the best result then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, scene.best, -1, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    const fresh = createGame(Math.floor(Math.random() * 4294967296));
    game.round = fresh.round;
    game.phase = fresh.phase;
    game.you = fresh.you;
    game.foe = fresh.foe;
    game.tableYou = fresh.tableYou;
    game.tableFoe = fresh.tableFoe;
    game.log = fresh.log;
    game.winner = fresh.winner;
    game.stats = fresh.stats;
    game.seed = fresh.seed;
    screen = SCREEN_PLAY;
    announce('Your turn. Play a card, then end your turn.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSS;
    if (won && game.you.life > best) {
      best = game.you.life;
      saveBest(best);
    }
    announce(won
      ? `Victory. The Warden yields with ${game.you.life} life to spare.`
      : `Defeat. The Warden prevails at ${game.foe.life} life.`);
  }

  function handleClicks() {
    for (const click of input.takeClicks()) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
        startGame();
        return;
      }
      if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        return;
      }
      if (screen !== SCREEN_PLAY || game.phase !== 'player') return;
      const point = renderer.toLogical(click.x, click.y);
      if (point.x >= END_TURN_BUTTON.x && point.x <= END_TURN_BUTTON.x + END_TURN_BUTTON.width
        && point.y >= END_TURN_BUTTON.y && point.y <= END_TURN_BUTTON.y + END_TURN_BUTTON.height) {
        endPlayerTurn(game);
        if (game.phase === 'over') endGame(game.winner === 'you');
        return;
      }
      const hand = layoutHand(game.you.hand.length);
      for (let i = hand.length - 1; i >= 0; i -= 1) {
        const c = hand[i];
        if (point.x >= c.x && point.x <= c.x + c.width && point.y >= c.y - 14 && point.y <= c.y + c.height) {
          if (playCard(game, game.you, i, 'You')) {
            announce(game.log[game.log.length - 1] ?? '');
            if (game.phase === 'over') endGame(game.winner === 'you');
          }
          return;
        }
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    for (const index of input.takeCards()) {
      if (screen === SCREEN_PLAY && game.phase === 'player') {
        if (playCard(game, game.you, index, 'You')) {
          announce(game.log[game.log.length - 1] ?? '');
          if (game.phase === 'over') endGame(game.winner === 'you');
        }
      }
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY && game.phase === 'player') {
        endPlayerTurn(game);
        if (game.phase === 'over') endGame(game.winner === 'you');
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function hoverState() {
    const mouse = input.mouse();
    if (mouse.x < 0) return { card: -1, endTurn: false };
    const point = renderer.toLogical(mouse.x, mouse.y);
    let card = -1;
    if (screen === SCREEN_PLAY && game.phase === 'player') {
      const hand = layoutHand(game.you.hand.length);
      for (let i = hand.length - 1; i >= 0; i -= 1) {
        const c = hand[i];
        if (point.x >= c.x && point.x <= c.x + c.width && point.y >= c.y - 14 && point.y <= c.y + c.height) {
          card = i;
          break;
        }
      }
    }
    const endTurn = screen === SCREEN_PLAY && game.phase === 'player'
      && point.x >= END_TURN_BUTTON.x && point.x <= END_TURN_BUTTON.x + END_TURN_BUTTON.width
      && point.y >= END_TURN_BUTTON.y && point.y <= END_TURN_BUTTON.y + END_TURN_BUTTON.height;
    return { card, endTurn };
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    handleClicks();
    const hover = hoverState();
    renderer.draw(game, screen, best, hover.card, hover.endTurn);
  }

  announce('Ember Court. Press Space or click to begin the duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
