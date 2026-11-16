import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, FlaskConical, GitBranch, Sigma } from "lucide-react";
import SimulationModule from "./modules/SimulationModule.jsx";
import ModelModule from "./modules/ModelModule.jsx";
import FlowModule from "./modules/FlowModule.jsx";
import { downloadResults, initialForm, scenarioFromForm } from "./lib/simulation.js";

const modules = [
  { id: "simulation", number: "01", label: "Simulación", detail: "Ensayos y resultados", icon: Activity },
  { id: "model", number: "02", label: "Modelo matemático", detail: "Ecuaciones y parámetros", icon: Sigma },
  { id: "flow", number: "03", label: "Flujo de celdas", detail: "Recorrido y retardos", icon: GitBranch }
];

export default function App() {
  const [module, setModule] = useState(() => {
    const requested = window.location.hash.slice(1);
    return modules.some(item => item.id === requested) ? requested : "simulation";
  });
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("pi_ff");
  const [second, setSecond] = useState(180);

  async function runSimulation(values) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(typeof payload.detail === "string"
          ? payload.detail : "Revisa los valores del ensayo e inténtalo de nuevo.");
      }
      setResult(payload);
      setSecond(previous => result === null
        ? Math.min(values.feed_step_s, values.duration_s)
        : Math.min(previous, values.duration_s));
    } catch (failure) {
      setError(failure.message || "No se pudo ejecutar la simulación.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    runSimulation(scenarioFromForm(initialForm));
  }, []);

  function submit(event) {
    event.preventDefault();
    runSimulation(scenarioFromForm(form));
  }

  function showModule(id) {
    window.history.replaceState(null, "", `#${id}`);
    setModule(id);
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand"><span className="brand-icon"><FlaskConical size={21} strokeWidth={2} /></span><span>FLOTACIÓN<span className="brand-muted"> / LAB</span></span></div>
        <div className="sidebar-label">EXPLORAR EL MODELO</div>
        <nav className="module-nav" aria-label="Módulos principales">
          {modules.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={`module-link ${module === item.id ? "selected" : ""}`} aria-current={module === item.id ? "page" : undefined} onClick={() => showModule(item.id)}>
                <span className="module-icon"><Icon size={19} strokeWidth={1.8} /></span>
                <span className="module-link-text"><strong>{item.label}</strong><small>{item.detail}</small></span>
                <span className="module-number">{item.number}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-card"><span className="system-dot" /><div><strong>Motor de simulación</strong><small>Python · 3 celdas · Δt = 1 s</small></div></div>
          <p>Basado en Quintanilla et al., MethodsX 10 (2023) 102081.</p>
          <a href="https://doi.org/10.1016/j.mex.2023.102081" target="_blank" rel="noopener noreferrer">Consultar artículo <ArrowUpRight size={14} /></a>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-topbar"><span>SIMULADOR DE CONTROL DE NIVEL</span><div><span className="topbar-pulse" /> BANCO DE FLOTACIÓN · 3 CELDAS</div></header>
        <main id="main-content" className="workspace-main">
          {module === "simulation" && (
            <SimulationModule form={form} setForm={setForm} result={result} busy={busy} error={error} onSubmit={submit} onDownload={() => result && downloadResults(result)} onOpenFlow={() => showModule("flow")} />
          )}
          {module === "model" && <ModelModule />}
          {module === "flow" && <FlowModule result={result} mode={mode} setMode={setMode} second={second} setSecond={setSecond} />}
        </main>
      </div>
    </div>
  );
}
