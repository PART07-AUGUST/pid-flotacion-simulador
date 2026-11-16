import { useEffect, useState } from "react";
import { Activity, FlaskConical, GitBranch, Sigma } from "lucide-react";
import SimulationModule from "./modules/SimulationModule.jsx";
import ModelModule from "./modules/ModelModule.jsx";
import FlowModule from "./modules/FlowModule.jsx";
import { downloadResults, initialForm, scenarioFromForm } from "./lib/simulation.js";

const modules = [
  { id: "simulation", label: "Simulación", icon: Activity },
  { id: "model", label: "Modelo matemático", icon: Sigma },
  { id: "flow", label: "Flujo de celdas", icon: GitBranch }
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
    window.scrollTo(0, 0);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-icon"><FlaskConical size={21} strokeWidth={2} /></span><span>FLOTACIÓN<span className="brand-muted"> / LAB</span></span></div>
        <nav className="module-nav" aria-label="Módulos principales">
          {modules.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" className={`module-link ${module === item.id ? "selected" : ""}`} aria-current={module === item.id ? "page" : undefined} onClick={() => showModule(item.id)}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="header-context">3 CELDAS <span>·</span> Δt = 1 s</div>
      </header>

      <div className="workspace">
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
