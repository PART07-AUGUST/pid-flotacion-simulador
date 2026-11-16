import { Activity, ArrowRight, Download, Play, SlidersHorizontal, Timer, Waves } from "lucide-react";
import { LevelChart } from "../components/Charts.jsx";
import { format } from "../lib/simulation.js";

function Field({ label, name, unit, value, onChange, min, max, step = "1" }) {
  return (
    <label className="field"><span>{label}<small>{unit}</small></span>
      <input type="number" name={name} value={value} onChange={onChange} min={min} max={max} step={step} required />
    </label>
  );
}

function ScenarioForm({ form, setForm, busy, error, onSubmit }) {
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  return (
    <form className="scenario-card" onSubmit={onSubmit}>
      <div className="card-title"><span className="card-icon"><SlidersHorizontal size={19} /></span><div><span className="eyebrow">CONFIGURACIÓN</span><h2>Diseña el ensayo</h2></div></div>
      <div className="form-group"><h3><Waves size={16} /> Alimentación</h3>
        <div className="form-grid two">
          <Field label="Caudal inicial" name="feed_lpm" unit="L/min" value={form.feed_lpm} onChange={change} min="20" max="60" step="0.1" />
          <Field label="Cambio de caudal" name="feed_step_lpm" unit="L/min" value={form.feed_step_lpm} onChange={change} min="-15" max="15" step="0.1" />
        </div>
        <Field label="Instante del cambio" name="feed_step_s" unit="s" value={form.feed_step_s} onChange={change} min="0" max="899" />
      </div>
      <div className="form-group"><h3><Activity size={16} /> Consignas finales</h3>
        <p className="form-note">Consignas iniciales aproximadas: 30 / 33,5 / 33 cm.</p>
        <div className="form-grid three">
          {[1, 2, 3].map(i => <Field key={i} label={`Celda ${i}`} name={`sp${i}`} unit="cm" value={form[`sp${i}`]} onChange={change} min="5" max="40" step="0.1" />)}
        </div>
        <Field label="Instante del cambio" name="setpoint_step_s" unit="s" value={form.setpoint_step_s} onChange={change} min="0" max="899" />
      </div>
      <div className="form-group last"><h3><Timer size={16} /> Duración</h3>
        <Field label="Tiempo total" name="duration_s" unit="s" value={form.duration_s} onChange={change} min="120" max="900" />
        <p className="form-note">Muestreo de 1 segundo · máximo 15 minutos.</p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy}><Play size={16} fill="currentColor" /> {busy ? "Calculando…" : "Ejecutar simulación"}</button>
    </form>
  );
}

function MetricCard({ result, cell }) {
  const pi = result.modes.pi.iae_cm_s[cell];
  const ff = result.modes.pi_ff.iae_cm_s[cell];
  const change = pi > 0 ? 100 * (pi - ff) / pi : 0;
  return (
    <article className="metric-card">
      <div className="metric-head"><span className="metric-index">0{cell + 1}</span><span>CELDA {cell + 1}</span><span className={`metric-trend ${change < 0 ? "worse" : "better"}`}>{change < 0 ? "AUMENTO" : "MEJORA"}</span></div>
      <div className={`metric-value ${change < 0 ? "worse" : ""}`}>{change >= 0 ? "−" : "+"}{format(Math.abs(change), 1)}<small>%</small></div>
      <p>Cambio relativo en el error absoluto integral</p>
      <div className="metric-comparison"><span>PI <strong>{format(pi, 2)}</strong></span><span>PI + AA <strong>{format(ff, 2)}</strong></span></div>
    </article>
  );
}

export default function SimulationModule({ form, setForm, result, busy, error, onSubmit, onDownload, onOpenFlow }) {
  return (
    <div className="module-page simulation-page">
      <section className="page-intro simulation-hero">
        <div><span className="eyebrow light">MÓDULO 01 / SIMULACIÓN</span><h1>Tres celdas.<br /><em>Dos estrategias.</em></h1><p>Compara el control PI con PI más alimentación anticipativa ante cambios de caudal y de consigna. Cada curva proviene del modelo Python.</p></div>
        <div className="hero-bank"><div className="hero-bank-label">BANCO EN SERIE · NIVELES INICIALES</div><div className="hero-cell-row"><span>Q entrada</span><ArrowRight size={16} />{[1, 2, 3].map(i => <div className="hero-cell" key={i}><small>0{i}</small><div className="hero-mini-tank"><span style={{height: `${100 * [30, 33.5, 33][i - 1] / 45}%`}} /></div><strong>Celda {i}</strong></div>)}</div><button className="hero-bank-link" type="button" onClick={onOpenFlow}>Ver banco dinámico <ArrowRight size={13} /></button></div>
      </section>

      <div className="simulation-grid">
        <ScenarioForm form={form} setForm={setForm} busy={busy} error={error} onSubmit={onSubmit} />
        <section className="results-panel" aria-label="Resultados de la simulación">
          <div className="results-heading"><div><span className="eyebrow">RESULTADOS COMPARADOS</span><h2>Desempeño del control</h2></div><button className="outline-button" type="button" onClick={onDownload} disabled={!result}><Download size={15} /> Descargar CSV</button></div>
          <p className="results-description">IAE = Σ |consigna − nivel| × 1 s. Menor IAE indica mejor seguimiento en este ensayo.</p>
          {result ? <div className="metric-grid">{[0, 1, 2].map(i => <MetricCard key={i} result={result} cell={i} />)}</div> : <div className="loading-card" role="status">{busy ? "Calculando ambos escenarios…" : "Esperando resultados…"}</div>}
          <div className="result-context"><span className="context-dot" /> {result ? `Ensayo de ${result.scenario.duration_s} s · Δt = 1 s · resultados simulados` : "El motor se ejecuta en Python"}</div>
        </section>
      </div>

      <section className="charts-section"><div className="section-title"><div><span className="eyebrow">VARIABLE CONTROLADA</span><h2>Niveles de pulpa</h2><p>Respuesta temporal de cada celda frente a su consigna, en centímetros.</p></div><span className="section-unit">cm</span></div>
        {result ? <div className="chart-grid">{[0, 1, 2].map(i => <LevelChart key={i} result={result} cell={i} />)}</div> : <div className="loading-card">Las curvas aparecerán al terminar el cálculo.</div>}
      </section>
      <div className="academic-note">Las curvas y los IAE son resultados de esta simulación. Los datos experimentales del artículo no se reproducen aquí.</div>
    </div>
  );
}
