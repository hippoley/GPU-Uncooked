import test from "node:test";
import assert from "node:assert/strict";
import { advanceScene, initialScene } from "../playground/scene.mjs";
const p = { cooks: 16, cookSeconds: 8, ingredientRate: 1, orders: 100 };
test("supply bottleneck leaves cooks idle", () => {
 const frame = advanceScene(initialScene(), p, 10);
 assert.equal(frame.activeCooks, 8);
 assert.equal(frame.waitingCooks, 8);
 assert.equal(frame.completed, 10);
 assert.equal(frame.remaining, 90);
});
test("progress ends at total orders", () => {
 const frame = advanceScene(initialScene(), p, 10000);
 assert.equal(frame.completed, 100);
 assert.equal(frame.remaining, 0);
 assert.equal(frame.progress, 1);
 assert.equal(frame.finished, true);
});
test("advancement is additive and stable", () => {
 const a = advanceScene(initialScene(), p, 2);
 const b = advanceScene(a, p, 3);
 const direct = advanceScene(initialScene(), p, 5);
 assert.deepEqual(b, direct);
});
test("negative time is rejected", () => {
 assert.throws(() => advanceScene(initialScene(), p, -1), RangeError);
});
