export const initialForm = {
  feed_lpm: "45",
  feed_step_lpm: "8",
  feed_step_s: "180",
  sp1: "28.5",
  sp2: "32.5",
  sp3: "32",
  setpoint_step_s: "450",
  duration_s: "900"
};

export function scenarioFromForm(form) {
  return {
    feed_lpm: Number(form.feed_lpm),
    feed_step_lpm: Number(form.feed_step_lpm),
    feed_step_s: Number(form.feed_step_s),
    setpoints_after_cm: [Number(form.sp1), Number(form.sp2), Number(form.sp3)],
    setpoint_step_s: Number(form.setpoint_step_s),
    duration_s: Number(form.duration_s)
  };
}

export function format(value, decimals = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function levelRows(result, cell) {
  return result.time_s.map((second, k) => ({
    second,
    pi: result.modes.pi.levels_cm[cell][k],
    pi_ff: result.modes.pi_ff.levels_cm[cell][k],
    setpoint: result.setpoints_cm[cell][k]
  }));
}

export function flowRows(result, cell, mode) {
  return result.time_s.map((second, k) => ({
    second,
    pi: result.modes.pi.tailings_lpm[cell][k],
    pi_ff: result.modes.pi_ff.tailings_lpm[cell][k],
    inlet: result.modes[mode].inlets_lpm[cell][k]
  }));
}

function csvCell(value) {
  return typeof value === "number" ? String(value) : `"${String(value).replaceAll('"', '""')}"`;
}

export function downloadResults(result) {
  const header = ["tiempo_s", "alimentacion_externa_lpm"];
  for (let i = 1; i <= 3; i++) {
    header.push(`consigna_${i}_cm`, `nivel_${i}_pi_cm`, `nivel_${i}_pi_aa_cm`,
      `entrada_${i}_pi_lpm`, `entrada_${i}_pi_aa_lpm`,
      `colas_${i}_pi_lpm`, `colas_${i}_pi_aa_lpm`);
  }
  const rows = [header.join(",")];
  for (let k = 0; k < result.time_s.length; k++) {
    const row = [result.time_s[k], result.feed_lpm[k]];
    for (let i = 0; i < 3; i++) {
      row.push(result.setpoints_cm[i][k], result.modes.pi.levels_cm[i][k],
        result.modes.pi_ff.levels_cm[i][k], result.modes.pi.inlets_lpm[i][k],
        result.modes.pi_ff.inlets_lpm[i][k], result.modes.pi.tailings_lpm[i][k],
        result.modes.pi_ff.tailings_lpm[i][k]);
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
