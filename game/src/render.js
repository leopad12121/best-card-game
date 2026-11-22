// Ember Court: everything the player sees, painted on one canvas. The table is a
// fixed 1280x720 logical area; the renderer scales it to the window. Cards are
// drawn, not images: house colours, a cost gem, a hand-drawn sigil, one big number
// and the card's name, so every value reads at a glance in a screenshot.
import { CARD_BY_ID, FIELD, HOUSES, MAX_MANA, PALETTE, FONT } from './config.js';
import { PHASE_PLAYER } from './logic.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const CARD_W = 132;
const CARD_H = 184;
const TABLE_W = 104;
const TABLE_H = 146;
const FOE_W = 84;
const FOE_H = 118;

export const END_TURN_BUTTON = { x: 1104, y: 528, width: 152, height: 58 };

/** Where the player's hand sits: a gentle fan, centred on the table. */
export function layoutHand(count) {
  const spacing = count <= 1 ? 0 : Math.min(136, 880 / Math.max(1, count - 1));
  const total = CARD_W + spacing * Math.max(0, count - 1);
  const startX = (FIELD.width - total) / 2;
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    cards.push({
      x: startX + i * spacing,
      y: 492 + Math.abs(t) * 10,
      width: CARD_W,
      height: CARD_H,
      rot: t * 0.07,
    });
  }
  return cards;
}

/** Where the Warden's face-down hand sits. */
export function layoutFoeHand(count) {
  const spacing = count <= 1 ? 0 : Math.min(64, 560 / Math.max(1, count - 1));
  const total = FOE_W + spacing * Math.max(0, count - 1);
  const startX = (FIELD.width - total) / 2;
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    cards.push({ x: startX + i * spacing, y: 66, width: FOE_W, height: FOE_H, rot: 0 });
  }
  return cards;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawShield(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(8, -6);
  ctx.lineTo(8, 1);
  ctx.bezierCurveTo(8, 6, 4, 9, 0, 11);
  ctx.bezierCurveTo(-4, 9, -8, 6, -8, 1);
  ctx.lineTo(-8, -6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** One house sigil, drawn with paths so it needs no font or image. */
export function drawSigil(ctx, glyph, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.bezierCurveTo(7, -4, 9, 2, 6, 7);
    ctx.bezierCurveTo(3, 11, -3, 11, -6, 7);
    ctx.bezierCurveTo(-9, 2, -6, -5, 0, -11);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(3.5, 2, 3, 6, 0, 8);
    ctx.bezierCurveTo(-3, 6, -3.5, 2, 0, -2);
    ctx.fill();
  } else if (glyph === 'drop') {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(7, -1, 9, 4, 6, 8);
    ctx.bezierCurveTo(3, 11, -3, 11, -6, 8);
    ctx.bezierCurveTo(-9, 4, -7, -1, 0, -12);
    ctx.fill();
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.bezierCurveTo(9, -8, 10, 4, 0, 11);
    ctx.bezierCurveTo(-10, 4, -9, -8, 0, -11);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
  } else {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-10, -7 + i * 7);
      ctx.bezierCurveTo(-2, -10 + i * 7, 4, -4 + i * 7, 10, -7 + i * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** A face-up card: house band, cost gem, sigil, one big number, name and text. */
function drawCard(ctx, id, x, y, w, h, opts = {}) {
  const card = CARD_BY_ID[id];
  const house = HOUSES[card.house];
  const scale = w / CARD_W;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.translate(-w / 2, -h / 2);
  if (opts.lift) ctx.translate(0, -14);
  roundRect(ctx, 0, 0, w, h, 10 * scale);
  ctx.fillStyle = '#f7efdc';
  ctx.fill();
  ctx.lineWidth = (opts.affordable === false ? 2 : 3) * scale;
  ctx.strokeStyle = opts.highlight ? PALETTE.gold : house.color;
  ctx.stroke();
  // House band across the top.
  ctx.save();
  roundRect(ctx, 0, 0, w, 34 * scale, 10 * scale);
  ctx.clip();
  ctx.fillStyle = house.color;
  ctx.fillRect(0, 0, w, 34 * scale);
  ctx.restore();
  ctx.fillStyle = house.dark;
  ctx.fillRect(0, 34 * scale, w, 2 * scale);
  // Cost gem, top left.
  ctx.beginPath();
  ctx.arc(17 * scale, 17 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#2b3a67';
  ctx.fill();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = '#9db8ff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${17 * scale}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), 17 * scale, 18 * scale);
  // House sigil, top right.
  drawSigil(ctx, house.glyph, w - 20 * scale, 17 * scale, 1.05 * scale, 'rgba(255,255,255,0.92)');
  // Big number: the card's main value.
  const main = card.dmg ? { n: card.dmg, label: 'DAMAGE', color: '#b3261e' }
    : card.shield ? { n: card.shield, label: 'SHIELD', color: '#1d5fa8' }
    : card.heal ? { n: card.heal, label: 'LIFE', color: '#227a3d' }
    : { n: card.draw, label: 'DRAW', color: '#8a6d1f' };
  ctx.fillStyle = main.color;
  ctx.font = `bold ${44 * scale}px ${FONT}`;
  ctx.fillText(String(main.n), w / 2, 82 * scale);
  ctx.fillStyle = '#6b6252';
  ctx.font = `bold ${10 * scale}px ${FONT}`;
  ctx.fillText(main.label, w / 2, 106 * scale);
  // Secondary effects as small chips.
  const chips = [];
  if (card.dmg && (card.shield || card.heal || card.draw)) chips.push(`DMG ${card.dmg}`);
  if (card.shield && card.dmg) chips.push(`+${card.shield} SHD`);
  if (card.heal && card.dmg) chips.push(`+${card.heal} HP`);
  if (card.draw) chips.push(`Draw ${card.draw}`);
  if (chips.length > 0) {
    ctx.fillStyle = '#4a4234';
    ctx.font = `${11 * scale}px ${FONT}`;
    ctx.fillText(chips.join('  ·  '), w / 2, 122 * scale);
  }
  // Name.
  ctx.fillStyle = '#241f16';
  ctx.font = `bold ${13.5 * scale}px ${FONT}`;
  const nameLines = wrapText(ctx, card.name, w - 14 * scale);
  nameLines.forEach((line, i) => ctx.fillText(line, w / 2, 142 * scale + i * 15 * scale));
  // Effect text.
  ctx.fillStyle = '#6b6252';
  ctx.font = `${10.5 * scale}px ${FONT}`;
  const textLines = wrapText(ctx, card.text, w - 14 * scale);
  const textY = 142 * scale + nameLines.length * 15 * scale + 4 * scale;
  textLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, w / 2, textY + i * 12 * scale));
  if (opts.affordable === false) {
    roundRect(ctx, 0, 0, w, h, 10 * scale);
    ctx.fillStyle = 'rgba(20, 20, 30, 0.45)';
    ctx.fill();
  }
  ctx.restore();
}

/** A face-down card: the Court's purple back with a gold diamond. */
function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = PALETTE.cardBack;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PALETTE.cardBackEdge;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = PALETTE.goldDeep;
  ctx.fillRect(-13, -13, 26, 26);
  ctx.fillStyle = PALETTE.cardBack;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();
  ctx.restore();
}

function drawMana(ctx, mana, maxMana, x, y) {
  for (let i = 0; i < MAX_MANA; i += 1) {
    const cx = x + i * 22;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    const filled = i < mana;
    const exists = i < maxMana;
    ctx.fillStyle = filled ? PALETTE.mana : exists ? '#3a4364' : '#1c2138';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = filled ? '#cfe4ff' : '#2c3550';
    ctx.lineWidth = 1;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }
}

function drawLife(ctx, life, shield, x, y, alignRight) {
  ctx.save();
  ctx.textAlign = alignRight ? 'right' : 'left';
  ctx.textBaseline = 'middle';
  if (alignRight) {
    drawHeart(ctx, x - 58, y, 1.5, life <= 8 ? '#ff6b5e' : PALETTE.life);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(String(Math.max(0, life)), x, y + 1);
    if (shield > 0) {
      drawShield(ctx, x - 104, y, 1.5, PALETTE.shield);
      ctx.fillStyle = '#bcd9f5';
      ctx.font = `bold 20px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(String(shield), x - 90, y + 1);
    }
    ctx.restore();
    return;
  }
  drawHeart(ctx, x + 12, y, 1.5, life <= 8 ? '#ff6b5e' : PALETTE.life);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(String(Math.max(0, life)), x + 30, y + 1);
  if (shield > 0) {
    const sx = x + 78;
    drawShield(ctx, sx, y, 1.5, PALETTE.shield);
    ctx.fillStyle = '#bcd9f5';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(shield), sx + 14, y + 1);
  }
  ctx.restore();
}

function drawFelt(ctx) {
  const g = ctx.createRadialGradient(640, 330, 80, 640, 360, 820);
  g.addColorStop(0, PALETTE.feltLight);
  g.addColorStop(0.55, PALETTE.felt);
  g.addColorStop(1, PALETTE.feltDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Faint diamond pattern on the felt.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = -40; x < FIELD.width + 40; x += 80) {
    for (let y = -40; y < FIELD.height + 40; y += 80) {
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 18);
      ctx.lineTo(x - 18, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  // Gold table edge.
  ctx.strokeStyle = PALETTE.feltEdge;
  ctx.lineWidth = 5;
  ctx.strokeRect(7, 7, FIELD.width - 14, FIELD.height - 14);
  ctx.strokeStyle = 'rgba(201, 162, 39, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, FIELD.width - 32, FIELD.height - 32);
}

function drawCenterEmblem(ctx, round) {
  ctx.save();
  ctx.translate(905, 340);
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 14, 22, 0.55)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.goldDeep;
  ctx.stroke();
  const glyphs = ['flame', 'drop', 'leaf', 'wind'];
  const colors = [HOUSES.ember.color, HOUSES.tide.color, HOUSES.thorn.color, HOUSES.gale.color];
  for (let i = 0; i < 4; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 2;
    drawSigil(ctx, glyphs[i], Math.cos(a) * 26, Math.sin(a) * 26, 0.9, colors[i]);
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ROUND ${round}`, 0, 74);
  ctx.restore();
}

function drawLog(ctx, lines) {
  ctx.save();
  roundRect(ctx, 1008, 208, 248, 156, 10);
  ctx.fillStyle = PALETTE.logBg;
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('— THE TABLE TALKS —', 1020, 228);
  ctx.fillStyle = '#d8d0bd';
  ctx.font = `12px ${FONT}`;
  const shown = lines.slice(-4);
  shown.forEach((line, i) => {
    const wrapped = wrapText(ctx, line, 224);
    wrapped.slice(0, 2).forEach((part, j) => ctx.fillText(part, 1020, 250 + i * 30 + j * 13));
  });
  ctx.restore();
}

function drawEndTurn(ctx, enabled, hover) {
  const b = END_TURN_BUTTON;
  ctx.save();
  roundRect(ctx, b.x, b.y, b.width, b.height, 10);
  ctx.fillStyle = enabled ? (hover ? '#c9a227' : '#3a2f10') : PALETTE.button;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = enabled ? PALETTE.gold : PALETTE.panelEdge;
  ctx.stroke();
  ctx.fillStyle = enabled ? '#fff3c4' : PALETTE.muted;
  ctx.font = `bold 19px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('END TURN', b.x + b.width / 2, b.y + b.height / 2 + 1);
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = enabled ? '#d8c98f' : PALETTE.muted;
  ctx.fillText('[ Space ]', b.x + b.width / 2, b.y + b.height - 12);
  ctx.restore();
}

function drawOverlay(ctx, title, titleColor, lines, footer) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 16, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, 240, 120, 800, 480, 18);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.goldDeep;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = titleColor;
  ctx.font = `bold 74px ${FONT}`;
  ctx.fillText(title, 640, 235);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, 640, 300 + i * 34));
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(footer, 640, 545);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function draw(game, screen, best, hoverCard, hoverEndTurn) {
    ctx.save();
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFelt(ctx);

    if (screen === SCREEN_TITLE) {
      // A dressed table behind the title: both hands dealt, two cards on the table.
      const foeCards = layoutFoeHand(5);
      for (const c of foeCards) drawCardBack(ctx, c.x, c.y, c.width, c.height);
      drawCard(ctx, 'inferno', 470, 218, TABLE_W, TABLE_H);
      drawCard(ctx, 'deepward', 706, 218, TABLE_W, TABLE_H);
      const hand = layoutHand(5);
      const sample = ['cinder', 'tidewall', 'bloom', 'zephyr', 'lash'];
      hand.forEach((c, i) => drawCard(ctx, sample[i], c.x, c.y, c.width, c.height, { rot: c.rot }));
      ctx.save();
      ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 88px ${FONT}`;
      ctx.fillText('EMBER COURT', 640, 190);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `22px ${FONT}`;
      ctx.fillText('A duel of the four houses — outplay the Warden, card by card.', 640, 232);
      const glyphs = ['flame', 'drop', 'leaf', 'wind'];
      const names = ['Ember · damage', 'Tide · shield', 'Thorn · heal', 'Gale · draw'];
      glyphs.forEach((glyph, i) => {
        const x = 400 + i * 160;
        drawSigil(ctx, glyph, x, 300, 1.6, [HOUSES.ember.color, HOUSES.tide.color, HOUSES.thorn.color, HOUSES.gale.color][i]);
        ctx.fillStyle = PALETTE.text;
        ctx.font = `15px ${FONT}`;
        ctx.fillText(names[i], x, 332);
      });
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.fillText('Mana grows each round · click a card (or press 1–7) to play it · Space ends your turn', 640, 400);
      ctx.fillText('Reduce the Warden to 0 life to win. An empty deck deals 2 fatigue damage.', 640, 428);
      ctx.fillStyle = '#fff3c4';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText('— CLICK OR PRESS SPACE TO BEGIN —', 640, 490);
      if (best > 0) {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `15px ${FONT}`;
        ctx.fillText(`Best result: won with ${best} life to spare`, 640, 528);
      }
      ctx.restore();
      return;
    }

    // Opponent bar.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.foe;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('WARDEN OF THE COURT', 28, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`Deck ${game.foe.deck.length} · Hand ${game.foe.hand.length}`, 28, 62);
    drawLife(ctx, game.foe.life, game.foe.shield, 1252, 40, true);

    // Warden's face-down hand.
    const foeCards = layoutFoeHand(game.foe.hand.length);
    for (const c of foeCards) drawCardBack(ctx, c.x, c.y, c.width, c.height);

    // The table: last cards each side played.
    game.tableFoe.forEach((id, i) => drawCard(ctx, id, 480 + i * 116, 208, TABLE_W, TABLE_H));
    game.tableYou.forEach((id, i) => drawCard(ctx, id, 480 + i * 116, 372, TABLE_W, TABLE_H));
    if (game.tableFoe.length === 0) {
      ctx.fillStyle = 'rgba(242, 234, 216, 0.35)';
      ctx.font = `italic 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('the Warden has played nothing yet', 640, 280);
    }
    if (game.tableYou.length === 0) {
      ctx.fillStyle = 'rgba(242, 234, 216, 0.35)';
      ctx.font = `italic 14px ${FONT}`;
      ctx.fillText('your plays will land here', 640, 444);
    }
    drawCenterEmblem(ctx, game.round);
    drawLog(ctx, game.log);

    // Player bar: name, life, mana, deck counts.
    ctx.fillStyle = PALETTE.you;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('YOU — EMBER ACOLYTE', 28, 520);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`Deck ${game.you.deck.length} · Discard ${game.you.discard.length}`, 28, 542);
    drawLife(ctx, game.you.life, game.you.shield, 28, 570, false);
    drawMana(ctx, game.you.mana, game.you.maxMana, 28, 612);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${game.you.mana}/${game.you.maxMana} mana`, 28, 646);

    // Player hand.
    const hand = layoutHand(game.you.hand.length);
    hand.forEach((c, i) => {
      const id = game.you.hand[i];
      const affordable = CARD_BY_ID[id].cost <= game.you.mana && game.phase === PHASE_PLAYER;
      drawCard(ctx, id, c.x, c.y, c.width, c.height, {
        rot: c.rot,
        lift: hoverCard === i,
        highlight: hoverCard === i,
        affordable,
      });
    });
    drawEndTurn(ctx, game.phase === PHASE_PLAYER, hoverEndTurn);

    if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', PALETTE.text, ['The duel waits for you.'], 'Press P or click to resume');
    } else if (screen === SCREEN_WIN) {
      drawOverlay(ctx, 'VICTORY', PALETTE.win,
        ['The Warden yields — the Court is yours!',
          `Won in ${game.stats.turns} rounds · ${game.stats.damageDealt} damage dealt`,
          `${game.stats.cardsPlayed} cards played · ${game.you.life} life to spare`],
        'Click or press Space to duel again');
    } else if (screen === SCREEN_LOSS) {
      drawOverlay(ctx, 'DEFEAT', PALETTE.lose,
        ['The Warden prevails — the Court keeps its secrets.',
          `Lasted ${game.stats.turns} rounds · ${game.stats.damageDealt} damage dealt`,
          `${game.stats.cardsPlayed} cards played · the Warden stands at ${game.foe.life} life`],
        'Click or press Space to duel again');
    }
    ctx.restore();
  }

  return { draw, toLogical };
}
