import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../minesweeper.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "minesweeper.html should contain an inline script");

function makeElementStub() {
  return {
    textContent: "",
    value: "",
    innerHTML: "",
    disabled: false,
    dataset: {},
    className: "",
    style: { setProperty: () => {} },
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    setAttribute: () => {},
    querySelector: () => null
  };
}

function loadGame() {
  const elements = new Map();
  const document = {
    createElement() {
      return makeElementStub();
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElementStub());
      return elements.get(id);
    },
    addEventListener: () => {}
  };
  const sandbox = {
    console,
    document,
    clearInterval: () => {},
    setInterval: () => 1,
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "minesweeper.html" });
  return sandbox.window;
}

const gameWindow = loadGame();
assert.equal(typeof gameWindow.__minesweeperRules, "object");

const { createBoard, countAdjacentMines, mineCountForSize, revealCell, toggleFlag } = gameWindow.__minesweeperRules;

{
  const board = createBoard(4, 4, 3, 0, 0, () => 0);
  assert.equal(board[0][0].mine, false, "first revealed cell should never contain a mine");
  assert.equal(board.flat().filter((cell) => cell.mine).length, 3);
}

{
  assert.equal(mineCountForSize(8), 8);
  assert.equal(mineCountForSize(12), 18);
  assert.equal(mineCountForSize(16), 32);
}

{
  const board = createBoard(3, 3, 0, 0, 0, () => 0);
  board[0][0].mine = true;
  board[2][2].mine = true;

  assert.equal(countAdjacentMines(board, 1, 1), 2);
  assert.equal(countAdjacentMines(board, 0, 1), 1);
}

{
  const board = createBoard(3, 3, 0, 0, 0, () => 0);
  board[2][2].mine = true;
  for (const row of board) {
    for (const cell of row) {
      cell.adjacent = countAdjacentMines(board, cell.row, cell.col);
    }
  }

  const result = revealCell(board, 0, 0);
  assert.equal(result.hitMine, false);
  assert.equal(result.revealedCount, 8, "revealing a blank area should flood fill safe cells");
  assert.equal(board[2][2].revealed, false);
}

{
  const board = createBoard(2, 2, 0, 0, 0, () => 0);
  assert.equal(toggleFlag(board, 0, 0), true);
  assert.equal(board[0][0].flagged, true);
  board[0][0].revealed = true;
  assert.equal(toggleFlag(board, 0, 0), false, "revealed cells cannot be flagged");
}
