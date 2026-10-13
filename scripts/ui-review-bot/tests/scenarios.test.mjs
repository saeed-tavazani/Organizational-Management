import assert from "node:assert/strict";
import test from "node:test";
import { customFieldPlan, timeTrackingPlan } from "../scenarios.mjs";

test("custom-field scenarios use fixture values and handle the new collapsed section", () => {
  const plan = customFieldPlan(true);
  assert.equal(plan.scenarios.length, 3);
  assert.deepEqual(plan.scenarios[0].actions, []);
  assert.equal(plan.scenarios[1].actions[0].name, "Custom Fields");
  assert.equal(customFieldPlan(false).scenarios[1].actions[0].name, "Design");
  assert.ok(
    plan.scenarios[2].actions.some(
      (action) => action.role === "option" && action.name === "Engineering",
    ),
  );
});

test("new time controls are never required on the base revision", () => {
  const plan = timeTrackingPlan();
  assert.equal(plan.scenarios.length, 3);
  for (const scenario of plan.scenarios) {
    assert.ok(scenario.focus);
    assert.ok(scenario.actions.every((action) => action.only === "after"));
    assert.ok(
      scenario.visible.every(
        (target) => !["Running", "0m"].includes(target.name),
      ),
    );
  }
});
