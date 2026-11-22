// Keyboard and pointer input. Held keys are not needed here — a card game is
// clicks and one-shot presses — so presses are queued and taken once by the loop,
// and pointer clicks are queued with their client coordinates; the caller turns
// them into playfield coordinates.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CARD_KEYS = {
  Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6,
  Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3, Numpad5: 4, Numpad6: 5, Numpad7: 6,
};

export function createInput(target) {
  let actions = 0;
  let cardQueue = [];
  const clicks = [];
  let mouse = { x: -1, y: -1 };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (CARD_KEYS[event.code] !== undefined) {
      if (!event.repeat) cardQueue.push(CARD_KEYS[event.code]);
    } else return;
    event.preventDefault();
  });
  target.addEventListener('pointerdown', (event) => {
    clicks.push({ x: event.clientX, y: event.clientY });
  });
  target.addEventListener('pointermove', (event) => {
    mouse = { x: event.clientX, y: event.clientY };
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeCards() {
      const taken = cardQueue;
      cardQueue = [];
      return taken;
    },
    takeClicks() {
      const taken = clicks.splice(0, clicks.length);
      return taken;
    },
    mouse() {
      return mouse;
    },
  };
}
