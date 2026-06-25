import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../snake.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "snake.html should contain an inline script");

function makeElementStub() {
  return {
    textContent: "",
    disabled: false,
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    addEventListener: () => {},
    getContext: () => new Proxy({}, { get: () => () => {}, set: () => true })
  };
}

function loadGame() {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElementStub());
      return elements.get(id);
    },
    querySelectorAll: () => []
  };
  const sandbox = {
    console,
    document,
    clearInterval: () => {},
    setInterval: () => 1,
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "snake.html" });
  return sandbox.window;
}

const gameWindow = loadGame();
assert.equal(typeof gameWindow.__snakeRules, "object");

const { createGame, changeDirection, nextState } = gameWindow.__snakeRules;

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const game = createGame(10, () => 0);
  assert.equal(game.snake.length, 3);
  assert.deepEqual(plain(game.direction), { x: 1, y: 0 });
  assert.notDeepEqual(plain(game.food), plain(game.snake[0]), "food should not spawn on the snake");
}

{
  const game = createGame(10, () => 0);
  changeDirection(game, { x: -1, y: 0 });
  assert.deepEqual(plain(game.nextDirection), { x: 1, y: 0 }, "snake cannot reverse directly");
  changeDirection(game, { x: 0, y: -1 });
  assert.deepEqual(plain(game.nextDirection), { x: 0, y: -1 });
}

{
  const game = createGame(8, () => 0);
  game.snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }];
  game.direction = { x: 1, y: 0 };
  game.nextDirection = { x: 1, y: 0 };
  game.food = { x: 4, y: 3 };

  const result = nextState(game, () => 0.9);
  assert.equal(result.ateFood, true);
  assert.equal(game.score, 10);
  assert.equal(game.snake.length, 4);
}

{
  const game = createGame(5, () => 0);
  game.snake = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }];
  game.direction = { x: 1, y: 0 };
  game.nextDirection = { x: 1, y: 0 };

  const result = nextState(game, () => 0);
  assert.equal(result.gameOver, true, "moving beyond the wall should end the game");
}
