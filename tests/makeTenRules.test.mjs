import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../make_ten.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "make_ten.html should contain an inline script");

function makeElementStub() {
  return {
    textContent: "",
    innerHTML: "",
    className: "",
    style: { setProperty: () => {} },
    dataset: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    appendChild: () => {},
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 800 })
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
    }
  };
  const sandbox = {
    console,
    document,
    localStorage: { getItem: () => "0", setItem: () => {} },
    setTimeout: () => {},
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "make_ten.html" });
  return sandbox.window;
}

const gameWindow = loadGame();
assert.equal(typeof gameWindow.__makeTenRules, "object");

const { cellsInRect, tryClearSelection } = gameWindow.__makeTenRules;

const board = [
  [{ value: 1, cleared: false }, { value: 9, cleared: false }, { value: 2, cleared: false }],
  [{ value: 4, cleared: false }, { value: 6, cleared: false }, { value: 8, cleared: false }],
  [{ value: 5, cleared: true }, { value: 5, cleared: false }, { value: 1, cleared: false }]
];

const selected = cellsInRect(board, { row: 0, col: 0 }, { row: 1, col: 1 });
assert.equal(
  JSON.stringify(selected.map((cell) => [cell.row, cell.col, cell.value])),
  JSON.stringify([[0, 0, 1], [0, 1, 9], [1, 0, 4], [1, 1, 6]]),
  "rectangular selection should include every uncleared cell inside the bounds"
);

{
  const result = tryClearSelection(board, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
  assert.equal(result.sum, 10);
  assert.equal(result.cleared, true);
  assert.equal(board[0][0].cleared, true);
  assert.equal(board[0][1].cleared, true);
}

{
  const result = tryClearSelection(board, [{ row: 1, col: 0 }, { row: 1, col: 2 }]);
  assert.equal(result.sum, 12);
  assert.equal(result.cleared, false);
  assert.equal(board[1][0].cleared, false);
  assert.equal(board[1][2].cleared, false);
}
