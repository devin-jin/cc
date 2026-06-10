import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../tank_battle.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
assert.ok(script, "tank_battle.html should contain an inline script");

function makeCanvasStub() {
  const gradient = { addColorStop: () => {} };
  const context = new Proxy({}, {
    get(_target, prop) {
      if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => gradient;
      return () => {};
    },
    set() {
      return true;
    }
  });
  return {
    width: 624,
    height: 624,
    getContext: () => context,
    addEventListener: () => {},
    setPointerCapture: () => {}
  };
}

function makeElementStub() {
  return {
    textContent: "",
    classList: { add: () => {}, remove: () => {} },
    addEventListener: () => {},
    closest: () => null
  };
}

function loadGame() {
  const elements = new Map();
  const canvas = makeCanvasStub();
  const touchUi = makeElementStub();
  const document = {
    getElementById(id) {
      if (id === "game") return canvas;
      if (!elements.has(id)) elements.set(id, makeElementStub());
      return elements.get(id);
    },
    querySelector(selector) {
      if (selector === ".touch-ui") return touchUi;
      return makeElementStub();
    }
  };
  const sandbox = {
    console,
    document,
    localStorage: { getItem: () => "0", setItem: () => {} },
    requestAnimationFrame: () => {},
    window: { addEventListener: () => {} }
  };

  vm.runInNewContext(script, sandbox, { filename: "tank_battle.html" });
  return sandbox.window;
}

const gameWindow = loadGame();
assert.equal(typeof gameWindow.__createTankTouchState, "function");

const touch = gameWindow.__createTankTouchState();

touch.startMove(100, 100);
touch.updateMove(130, 102);
assert.equal(touch.direction, "right");

touch.endMove();
assert.equal(touch.direction, null, "lifting a movement finger should stop the tank");

touch.startFire();
assert.equal(touch.direction, null, "starting fire should not change movement direction");
assert.equal(touch.firing, true);

touch.endFire();
assert.equal(touch.direction, null, "lifting the fire finger should not change movement direction");
assert.equal(touch.firing, false);

touch.startMove(100, 100);
touch.updateMove(98, 70);
assert.equal(touch.direction, "up", "a later swipe should replace the stored movement direction");

touch.startMove(100, 100);
touch.updateMove(100, 130);
assert.equal(touch.direction, null, "swiping in the opposite direction should stop the tank");
