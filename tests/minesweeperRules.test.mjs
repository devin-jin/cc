import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../minesweeper.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "minesweeper.html should contain an inline script");

function makeElementStub() {
  const listeners = new Map();
  const element = {
    textContent: "",
    value: "",
    disabled: false,
    dataset: {},
    className: "",
    children: [],
    listeners,
    style: { setProperty: () => {} },
    classList: {
      add: (...tokens) => {
        const classes = new Set(element.className.split(/\s+/).filter(Boolean));
        for (const token of tokens) classes.add(token);
        element.className = [...classes].join(" ");
      },
      remove: (...tokens) => {
        const classes = new Set(element.className.split(/\s+/).filter(Boolean));
        for (const token of tokens) classes.delete(token);
        element.className = [...classes].join(" ");
      },
      toggle: (token, force) => {
        const classes = new Set(element.className.split(/\s+/).filter(Boolean));
        const shouldAdd = force ?? !classes.has(token);
        if (shouldAdd) classes.add(token);
        else classes.delete(token);
        element.className = [...classes].join(" ");
      }
    },
    appendChild: (child) => {
      element.children.push(child);
    },
    addEventListener: (type, listener) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    setAttribute: (name, value) => {
      element[name] = value;
    },
    setPointerCapture: () => {},
    querySelector: () => null,
    closest: (selector) => (selector === ".cell" && element.className.split(/\s+/).includes("cell") ? element : null)
  };

  Object.defineProperty(element, "innerHTML", {
    get: () => "",
    set: () => {
      element.children = [];
    }
  });

  return element;
}

function loadGame() {
  const elements = new Map();
  let nextTimerId = 1;
  const timers = new Map();
  const document = {
    createElement() {
      return makeElementStub();
    },
    getElementById(id) {
      if (!elements.has(id)) {
        const element = makeElementStub();
        if (id === "sizeSelect") element.value = "12";
        elements.set(id, element);
      }
      return elements.get(id);
    },
    addEventListener: () => {}
  };
  const sandbox = {
    console,
    document,
    clearTimeout: (id) => {
      timers.delete(id);
    },
    clearInterval: () => {},
    setTimeout: (listener) => {
      const timerId = nextTimerId++;
      timers.set(timerId, listener);
      return timerId;
    },
    setInterval: () => 1,
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "minesweeper.html" });
  return { gameWindow: sandbox.window, elements, timers };
}

function fire(element, type, event) {
  for (const listener of element.listeners.get(type) ?? []) {
    listener(event);
  }
}

const { gameWindow, elements, timers } = loadGame();
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

{
  const boardEl = elements.get("board");
  let firstCell = boardEl.children[0];

  fire(boardEl, "pointerdown", {
    pointerType: "touch",
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    target: firstCell
  });

  timers.get(1)();

  firstCell = boardEl.children[0];
  assert.equal(firstCell.textContent, "!", "long pressing a cell should flag it");

  fire(boardEl, "click", { target: firstCell });
  assert.equal(boardEl.children[0].textContent, "!", "the synthetic click after flagging should not reveal the cell");
}

{
  const boardEl = elements.get("board");
  let secondCell = boardEl.children[1];
  let prevented = false;

  fire(boardEl, "pointerdown", {
    pointerType: "touch",
    pointerId: 2,
    clientX: 20,
    clientY: 20,
    target: secondCell
  });
  fire(boardEl, "pointermove", {
    pointerId: 2,
    clientX: 21,
    clientY: 52,
    preventDefault: () => {
      prevented = true;
    }
  });

  assert.equal(prevented, true, "downward press-and-slide should suppress the default tap action");
  secondCell = boardEl.children[1];
  assert.equal(secondCell.textContent, "!", "pressing and sliding down on a cell should flag it");

  fire(boardEl, "click", { target: secondCell });
  assert.equal(boardEl.children[1].textContent, "!", "the synthetic click after sliding to flag should not reveal the cell");
}
