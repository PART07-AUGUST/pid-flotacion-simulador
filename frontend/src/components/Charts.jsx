import { useMemo } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { flowRows, format, levelRows } from "../lib/simulation.js";

const colors = { pi: "#4688d3", pi_ff: "#13a88e", reference: "#c8943d" };

function Chart({ rows, yUnit, referenceKey, referenceLabel, scenario }) {
  return (
    <div className="chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e6edf1" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="second" type="number" domain={[0, scenario.duration_s]} tickCount={5} tick={{ fill: "#79909e", fontSize: 10 }} axisLine={false} tickLine={false} unit=" s" />
          <YAxis domain={["auto", "auto"]} tickFormatter={value => format(value, 1)} tick={{ fill: "#79909e", fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip formatter={(value, name) => [`${format(value, 3)} ${yUnit}`, name]} labelFormatter={value => `Tiempo: ${value} s`} contentStyle={{ borderRadius: 10, border: "1px solid #dce6eb", fontSize: 11 }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <ReferenceLine x={scenario.feed_step_s} stroke="#9db2bd" strokeDasharray="3 4" />
          <ReferenceLine x={scenario.setpoint_step_s} stroke="#c9b18b" strokeDasharray="3 4" />
          <Line name="PI" dataKey="pi" stroke={colors.pi} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="PI + AA" dataKey="pi_ff" stroke={colors.pi_ff} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name={referenceLabel} dataKey={referenceKey} stroke={colors.reference} strokeWidth={1.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LevelChart({ result, cell }) {
  const rows = useMemo(() => levelRows(result, cell), [result, cell]);
  return (
    <article className="chart-card">
      <div className="chart-card-heading"><div><span className="cell-kicker">CELDA {cell + 1}</span><h3>Nivel de pulpa</h3></div><span className="chart-final">{format(result.modes.pi_ff.final_levels_cm[cell], 2)} cm</span></div>
      <Chart rows={rows} yUnit="cm" referenceKey="setpoint" referenceLabel="Consigna" scenario={result.scenario} />
    </article>
  );
}

export function FlowChart({ result, cell, mode }) {
  const rows = useMemo(() => flowRows(result, cell, mode), [result, cell, mode]);
  return (
    <article className="chart-card">
      <div className="chart-card-heading"><div><span className="cell-kicker">CELDA {cell + 1}</span><h3>Caudal de colas</h3></div><span className="chart-final">L/min</span></div>
      <Chart rows={rows} yUnit="L/min" referenceKey="inlet" referenceLabel={`Entrada ${mode === "pi" ? "PI" : "PI + AA"}`} scenario={result.scenario} />
    </article>
  );
}
