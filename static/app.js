"use strict";

const form = document.getElementById("scenario-form");
const errorBox = document.getElementById("form-error");
const runStatus = document.getElementById("run-status");
const downloadButton = document.getElementById("download-csv");
const runButton = form.querySelector(".run-button");
const moduleButtons = [...document.querySelectorAll(".module-button")];
const flowMode = document.getElementById("flow-mode");
const flowTime = document.getElementById("flow-time");
let latestResult = null;
let activeModule = "simulation";

function scenarioFromForm() {
  const values = new FormData(form);
  return {
    duration_s: Number(values.get("duration_s")),
    feed_lpm: Number(values.get("feed_lpm")),
    feed_step_lpm: Number(values.get("feed_step_lpm")),
    feed_step_s: Number(values.get("feed_step_s")),
    setpoints_after_cm: [Number(values.get("sp1")), Number(values.get("sp2")), Number(values.get("sp3"))],
    setpoint_step_s: Number(values.get("setpoint_step_s"))
  };
}

function number(value, decimals = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  runStatus.textContent = "Revisa los parámetros";
}

async function executeSimulation(event) {
  if (event) event.preventDefault();
  errorBox.hidden = true;
  runButton.disabled = true;
  runStatus.textContent = "Calculando…";
  try {
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenarioFromForm())
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = payload.detail;
      throw new Error(typeof detail === "string" ? detail : "Comprueba los valores e inténtalo de nuevo.");
    }
    const firstRun = latestResult === null;
    latestResult = payload;
    flowTime.max = String(payload.scenario.duration_s);
    flowTime.value = String(firstRun
      ? Math.min(payload.scenario.feed_step_s, payload.scenario.duration_s)
      : Math.min(Number(flowTime.value), payload.scenario.duration_s));
    render(payload);
    downloadButton.disabled = false;
    runStatus.textContent = `Ensayo simulado · ${payload.scenario.duration_s} s · Δt = 1 s`;
  } catch (error) {
    showError(error.message || "No se pudo ejecutar la simulación.");
  } finally {
    runButton.disabled = false;
  }
}

function render(result) {
  const pi = result.modes.pi;
  const ff = result.modes.pi_ff;
  for (let i = 0; i < 3; i++) {
    const index = i + 1;
    const piIae = pi.iae_cm_s[i];
    const ffIae = ff.iae_cm_s[i];
    const change = piIae > 0 ? 100 * (piIae - ffIae) / piIae : 0;
    const changeElement = document.getElementById(`improvement-${index}`);
    changeElement.textContent = `${change >= 0 ? "−" : "+"}${number(Math.abs(change), 1)} %`;
    changeElement.classList.toggle("negative", change < 0);
    document.getElementById(`iae-pi-${index}`).textContent = number(piIae, 2);
    document.getElementById(`iae-ff-${index}`).textContent = number(ffIae, 2);
    document.getElementById(`final-level-${index}`).textContent = `${number(ff.final_levels_cm[i], 3)} cm al final`;

    if (activeModule === "simulation") {
      plot(document.getElementById(`level-${index}`), result.time_s, [
        { values: pi.levels_cm[i], color: "#3584c7" },
        { values: ff.levels_cm[i], color: "#28bea7" },
        { values: result.setpoints_cm[i], color: "#c8a44c", dashed: true }
      ], result.scenario);
    }
    if (activeModule === "flow") {
      plot(document.getElementById(`flow-${index}`), result.time_s, [
        { values: pi.tailings_lpm[i], color: "#3584c7" },
        { values: ff.tailings_lpm[i], color: "#28bea7" },
        { values: result.modes[flowMode.value].inlets_lpm[i], color: "#c8a44c", dashed: true }
      ], result.scenario);
    }
  }
  renderFlow(result);
}

function renderFlow(result) {
  const second = Math.min(Number(flowTime.value), result.scenario.duration_s);
  const mode = result.modes[flowMode.value];
  document.getElementById("flow-inlet-legend").textContent = flowMode.value === "pi" ? "PI" : "PI + AA";
  document.getElementById("flow-time-label").textContent = `${second} s`;
  document.getElementById("flow-feed").textContent = number(result.feed_lpm[second], 2);
  for (let i = 0; i < 3; i++) {
    const index = i + 1;
    document.getElementById(`flow-level-${index}`).textContent = `${number(mode.levels_cm[i][second], 3)} cm`;
    document.getElementById(`flow-inlet-${index}`).textContent = `${number(mode.inlets_lpm[i][second], 2)} L/min`;
    document.getElementById(`flow-command-${index}`).textContent = `${number(mode.commands_lpm[i][second], 2)} L/min`;
    document.getElementById(`flow-tailings-${index}`).textContent = number(mode.tailings_lpm[i][second], 2);
  }
  const events = [];
  if (second === result.scenario.feed_step_s) events.push("cambio de alimentación");
  if (second === result.scenario.setpoint_step_s) events.push("cambio de consigna");
  document.getElementById("flow-event").textContent = events.length
    ? `Segundo ${second}: ${events.join(" y ")}. La orden de bomba y el caudal real pueden diferir por el retardo.`
    : `Segundo ${second}: caudales reales y niveles calculados para ${flowMode.value === "pi" ? "PI" : "PI + AA"}.`;
}

function showModule(module) {
  activeModule = module;
  for (const button of moduleButtons) {
    const selected = button.dataset.module === module;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
    document.getElementById(button.getAttribute("aria-controls")).hidden = !selected;
  }
  if (latestResult) render(latestResult);
}

function plot(canvas, times, lines, scenario) {
  const width = Math.max(100, canvas.getBoundingClientRect().width);
  const height = canvas.getBoundingClientRect().height || 190;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const context = canvas.getContext("2d");
  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);

  const left = 41, right = 12, top = 13, bottom = 28;
  const areaW = width - left - right;
  const areaH = height - top - bottom;
  const values = lines.flatMap(line => line.values);
  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  const span = maximum - minimum;
  const margin = span < 0.001 ? Math.max(0.1, Math.abs(maximum) * 0.01) : span * 0.13;
  minimum -= margin;
  maximum += margin;
  const x = index => left + areaW * index / (times.length - 1);
  const y = value => top + areaH * (maximum - value) / (maximum - minimum);

  context.font = "10px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = "#77909c";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick++) {
    const value = maximum - (maximum - minimum) * tick / 4;
    const py = top + areaH * tick / 4;
    context.beginPath();
    context.strokeStyle = "#e7eef0";
    context.moveTo(left, py);
    context.lineTo(width - right, py);
    context.stroke();
    context.textAlign = "right";
    context.fillText(value.toFixed(Math.abs(value) >= 10 ? 1 : 2), left - 6, py);
  }
  context.textAlign = "center";
  context.textBaseline = "top";
  for (let tick = 0; tick <= 4; tick++) {
    const index = Math.round((times.length - 1) * tick / 4);
    context.fillText(`${times[index]}s`, x(index), height - bottom + 8);
  }
  for (const eventTime of [scenario.feed_step_s, scenario.setpoint_step_s]) {
    context.beginPath();
    context.setLineDash([3, 4]);
    context.strokeStyle = "#c5d1d6";
    context.moveTo(x(eventTime), top);
    context.lineTo(x(eventTime), top + areaH);
    context.stroke();
    context.setLineDash([]);
  }
  for (const line of lines) {
    context.beginPath();
    context.lineWidth = line.dashed ? 1.4 : 2.1;
    context.strokeStyle = line.color;
    context.lineJoin = "round";
    context.setLineDash(line.dashed ? [6, 4] : []);
    line.values.forEach((value, index) => {
      if (index === 0) context.moveTo(x(index), y(value));
      else context.lineTo(x(index), y(value));
    });
    context.stroke();
    context.setLineDash([]);
  }
}

function csvCell(value) {
  return typeof value === "number" ? String(value) : `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCSV() {
  if (!latestResult) return;
  const r = latestResult;
  const header = ["tiempo_s", "alimentacion_externa_lpm"];
  for (let i = 1; i <= 3; i++) {
    header.push(`consigna_${i}_cm`, `nivel_${i}_pi_cm`, `nivel_${i}_pi_aa_cm`,
      `entrada_${i}_pi_lpm`, `entrada_${i}_pi_aa_lpm`,
      `colas_${i}_pi_lpm`, `colas_${i}_pi_aa_lpm`);
  }
  const rows = [header.join(",")];
  for (let k = 0; k < r.time_s.length; k++) {
    const row = [r.time_s[k], r.feed_lpm[k]];
    for (let i = 0; i < 3; i++) {
      row.push(r.setpoints_cm[i][k], r.modes.pi.levels_cm[i][k],
        r.modes.pi_ff.levels_cm[i][k], r.modes.pi.inlets_lpm[i][k],
        r.modes.pi_ff.inlets_lpm[i][k], r.modes.pi.tailings_lpm[i][k],
        r.modes.pi_ff.tailings_lpm[i][k]);
    }
    rows.push(row.map(csvCell).join(","));
  }
  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "simulacion_flotacion_tres_celdas.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

form.addEventListener("submit", executeSimulation);
downloadButton.addEventListener("click", downloadCSV);
for (const button of moduleButtons) {
  button.addEventListener("click", () => showModule(button.dataset.module));
}
flowTime.addEventListener("input", () => { if (latestResult) renderFlow(latestResult); });
flowMode.addEventListener("change", () => { if (latestResult) render(latestResult); });
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (latestResult) render(latestResult); }, 100);
});
executeSimulation();
