import { simulate } from "./model.mjs";
const ids = ["cooks", "cook-time", "ingredients", "orders"];
const byId = id => document.getElementById(id);
const defaults = { cooks: 8, "cook-time": 8, ingredients: 4, orders: 1000 };
function render() {
  for (const id of ids) byId(id + "-value").value = byId(id).value;
  const s = simulate({ cooks: +byId("cooks").value, cookSeconds: +byId("cook-time").value,
    ingredientRate: +byId("ingredients").value, orders: +byId("orders").value });
  byId("throughput").textContent = s.throughput.toFixed(2);
  byId("duration").textContent = s.estimatedSeconds.toFixed(1) + "s";
  byId("compute-label").textContent = s.computeCapacity.toFixed(2) + " meals/s";
  byId("supply-label").textContent = s.ingredientRate.toFixed(2) + " meals/s";
  const denominator = Math.max(s.computeCapacity, s.ingredientRate);
  byId("compute-bar").style.width = (100 * s.computeCapacity / denominator) + "%";
  byId("supply-bar").style.width = (100 * s.ingredientRate / denominator) + "%";
  const stories = {
    supply: ["PANTRY BOTTLENECK", "Hiring more cooks will not increase throughput. Improve ingredient supply or reduce movement."],
    compute: ["COOK BOTTLENECK", "The pantry has capacity to spare. More cooks or less work per meal can help."],
    balanced: ["BALANCED CAPACITY", "Cooking and supply ceilings meet. Increasing only one may simply expose the other."]
  };
  const [heading, insight] = stories[s.bottleneck];
  byId("diagnosis").textContent = heading;
  byId("lesson").textContent = insight;
}
for (const id of ids) byId(id).addEventListener("input", render);
byId("reset").addEventListener("click", () => {
  for (const [id, value] of Object.entries(defaults)) byId(id).value = value;
  render();
});
byId("challenge").addEventListener("click", () => {
  Object.assign(byId("cooks"), { value: 96 });
  byId("cook-time").value = 8;
  byId("ingredients").value = 2;
  byId("orders").value = 1000;
  render();
});
render();
