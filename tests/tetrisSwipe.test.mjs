import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../tetris.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "tetris.html should contain an inline script");

function makeCanvasStub() {
  const context = new Proxy({}, {
    get() {
      return () => {};
    },
    set() {
      return true;
    }
  });
  return {
    width: 300,
    height: 600,
    getContext: () => context,
    addEventListener: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  };
}

function loadGame() {
  const elements = new Map();
  const canvas = makeCanvasStub();
  const nextCanvas = makeCanvasStub();
  const document = {
    getElementById(id) {
      if (id === "board") return canvas;
      if (id === "nextCanvas") return nextCanvas;
      if (!elements.has(id)) {
        elements.set(id, {
          textContent: "",
          classList: { add: () => {}, remove: () => {} },
          addEventListener: () => {}
        });
      }
      return elements.get(id);
    }
  };
  const sandbox = {
    console,
    document,
    localStorage: { getItem: () => "0", setItem: () => {} },
    requestAnimationFrame: () => {},
    setTimeout: () => {},
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "tetris.html" });
  return sandbox.window;
}

const gameWindow = loadGame();
assert.equal(typeof gameWindow.__createSwipeTracker, "function");

{
  const moves = [];
  let rotates = 0;
  let hardDrops = 0;
  const swipe = gameWindow.__createSwipeTracker({
    onMove: (dir) => moves.push(dir),
    onRotate: () => rotates++,
    onHardDrop: () => hardDrops++,
    threshold: 18
  });

  swipe.start(0, 0);
  swipe.move(17, 2);
  assert.deepEqual(moves, [], "movement under the threshold should not move the piece");
  swipe.move(19, 2);
  swipe.move(38, 3);
  swipe.end(38, 3);

  assert.deepEqual(moves, [1, 1], "horizontal dragging should move once per threshold crossed");
  assert.equal(rotates, 0);
  assert.equal(hardDrops, 0);
}

{
  const moves = [];
  const swipe = gameWindow.__createSwipeTracker({
    onMove: (dir) => moves.push(dir),
    onRotate: () => {},
    onHardDrop: () => {},
    threshold: 18
  });

  swipe.start(80, 0);
  swipe.move(59, 1);
  swipe.move(39, 2);
  swipe.end(39, 2);

  assert.deepEqual(moves, [-1, -1], "left dragging should also continue one step at a time");
}

{
  let hardDrops = 0;
  const swipe = gameWindow.__createSwipeTracker({
    onMove: () => {},
    onRotate: () => {},
    onHardDrop: () => hardDrops++,
    threshold: 18
  });

  swipe.start(0, 0);
  swipe.move(2, 37);
  swipe.move(4, 60);
  swipe.end(4, 60);

  assert.equal(hardDrops, 1, "downward dragging should hard drop once");
}

{
  let hardDrops = 0;
  const swipe = gameWindow.__createSwipeTracker({
    onMove: () => {},
    onRotate: () => {},
    onHardDrop: () => hardDrops++,
    threshold: 18
  });

  swipe.start(0, 0);
  swipe.move(2, 30);
  swipe.end(2, 30);

  assert.equal(hardDrops, 0, "short downward dragging should not hard drop");
}
