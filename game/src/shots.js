// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real
// rules forward from a fresh duel for a fixed number of rounds, steered by the same
// autopilots the Node harness uses, so the frame is what a real duel really looks
// like and the same seed always gives the same frame.
import { createRandom } from './random.js';
import { autopilotPlayerTurn, createGame } from './logic.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Rounds of real play before the play scene's frame is taken. */
const PLAY_ROUNDS = 5;

/**
 * Set `game` to the named scene (start, play, win or loss; any other name is
 * start) and return the screen to draw over it and the best result to show.
 */
export function stageShot(name, game) {
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const seed = game.seed;
  if (name === 'play') {
    const random = createRandom(seed ^ 0x9e3779b9);
    for (let round = 0; round < PLAY_ROUNDS; round += 1) {
      if (game.phase === 'over') break;
      autopilotPlayerTurn(game, 'strong', random);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // win: the strong pilot finishes the duel. loss: the hurried pilot does.
  const skill = name === 'win' ? 'strong' : 'weak';
  const random = createRandom(seed ^ 0x9e3779b9);
  let guard = 0;
  while (game.phase !== 'over' && guard < 200) {
    autopilotPlayerTurn(game, skill, random);
    guard += 1;
  }
  const won = game.winner === 'you';
  return { screen: won ? SCREEN_WIN : SCREEN_LOSS, best: won ? game.you.life : 0 };
}
