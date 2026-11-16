import { ArrowRight, Clock3, GitBranch, Waves } from "lucide-react";
import { FlowChart } from "../components/Charts.jsx";
import BankVisualization from "../components/BankVisualization.jsx";
import { format } from "../lib/simulation.js";

function Stream({ label, value, last = false }) {
  return <div className="stream-node"><span>{label}</span><strong>{format(value, 2)}</strong><small>L/min</small>{!last && <ArrowRight className="stream-arrow" size={17} />}</div>;
}

function Cell({ index, level, inlet, command, delay }) {
  return <article className="process-cell"><div className="process-cell-head"><span>CELDA 0{index}</span><Waves size={17} /></div><div className="process-cell-level"><strong>{format(level, 3)}</strong><span>cm de nivel</span></div><dl><div><dt>Entrada</dt><dd>{format(inlet, 2)} L/min</dd></div><div><dt>Orden de bomba</dt><dd>{format(command, 2)} L/min</dd></div><div><dt>Retardo</dt><dd>{delay} s</dd></div></dl></article>;
}

export default function FlowModule({ result, mode, setMode, second, setSecond }) {
  const sample = result ? Math.min(second, result.scenario.duration_s) : 0;
  const series = result?.modes[mode];
  const events = result ? [
    sample === result.scenario.feed_step_s && "Cambio de alimentación",
    sample === result.scenario.setpoint_step_s && "Cambio de consigna"
  ].filter(Boolean) : [];

  return <div className="module-page flow-page">
    <header className="page-intro plain"><span className="eyebrow">MÓDULO 03 / FLUJO DE CELDAS</span><h1>El recorrido del caudal<br /><em>en tiempo real simulado.</em></h1><p>Inspecciona cualquier segundo del ensayo. El caudal de colas real de una celda se convierte en la entrada de la siguiente después del retardo de su bomba.</p></header>

    {result ? <>
      <section className="flow-controls"><div className="flow-controls-title"><span className="card-icon"><GitBranch size={20} /></span><div><span className="eyebrow">INSPECTOR DEL PROCESO</span><h2>Estado del banco</h2></div></div>
        <div className="flow-controls-body"><div className="segmented-control" role="group" aria-label="Estrategia de control"><button type="button" className={mode === "pi" ? "selected" : ""} aria-pressed={mode === "pi"} onClick={() => setMode("pi")}>Solo PI</button><button type="button" className={mode === "pi_ff" ? "selected" : ""} aria-pressed={mode === "pi_ff"} onClick={() => setMode("pi_ff")}>PI + anticipativa</button></div><div className="time-readout"><Clock3 size={15} /> <strong>{sample} s</strong><span>/ {result.scenario.duration_s} s</span></div></div>
        <label className="time-slider-label" htmlFor="flow-time-slider">Seleccionar instante</label><input id="flow-time-slider" type="range" min="0" max={result.scenario.duration_s} step="1" value={sample} onChange={event => setSecond(Number(event.target.value))} />
        <div className="timeline-ends"><span>0 s · Inicio</span><span>{result.scenario.duration_s} s · Fin</span></div>
        <p className="event-note" aria-live="polite">{events.length ? events.join(" · ") : `Estado calculado a los ${sample} s para ${mode === "pi" ? "PI" : "PI + alimentación anticipativa"}.`}</p>
      </section>

      <BankVisualization result={result} mode={mode} second={sample} />

      <section className="flow-diagram-section"><div className="section-title"><div><span className="eyebrow">CONEXIÓN EN SERIE</span><h2>Balance de caudales por celda</h2><p>Los valores de salida son caudales reales; la orden puede ser distinta mientras actúa el retardo.</p></div></div>
        <div className="flow-map">
          <Stream label="ALIMENTACIÓN EXTERNA" value={result.feed_lpm[sample]} />
          {[0, 1, 2].map(i => <div className="flow-map-pair" key={i}><Cell index={i + 1} level={series.levels_cm[i][sample]} inlet={series.inlets_lpm[i][sample]} command={series.commands_lpm[i][sample]} delay={result.model.delays_s[i]} /><Stream label={i === 2 ? "COLAS FINALES" : `COLAS ${i + 1} → ENTRADA ${i + 2}`} value={series.tailings_lpm[i][sample]} last={i === 2} /></div>)}
        </div>
        <div className="flow-law"><span>LEY DE CONSERVACIÓN</span><strong>Q<sub>entrada,2</sub> = Q<sub>colas,1</sub></strong><strong>Q<sub>entrada,3</sub> = Q<sub>colas,2</sub></strong></div>
      </section>

      <section className="charts-section"><div className="section-title"><div><span className="eyebrow">VARIABLE MANIPULADA</span><h2>Caudales en el tiempo</h2><p>Las líneas PI y PI + AA representan las colas; la línea punteada muestra la entrada de la estrategia seleccionada.</p></div><span className="section-unit">L/min</span></div><div className="chart-grid">{[0, 1, 2].map(i => <FlowChart key={i} result={result} cell={i} mode={mode} />)}</div></section>
      <div className="academic-note">La celda 1 recibe la alimentación externa. La celda 3 descarga las colas finales del banco. Los caudales están calculados por el modelo Python.</div>
    </> : <div className="loading-card" role="status">Preparando los resultados del proceso…</div>}
  </div>;
}
