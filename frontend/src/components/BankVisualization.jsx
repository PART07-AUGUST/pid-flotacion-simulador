import { Fragment } from "react";
import { ArrowRight, Gauge, Waves } from "lucide-react";
import { format } from "../lib/simulation.js";

export default function BankVisualization({ result, mode, second }) {
  const series = result.modes[mode];
  const maximum = result.model.max_level_cm;
  return (
    <section className="bank-panel" aria-label="Banco esquemático de tres celdas de flotación">
      <div className="bank-panel-heading"><div><span className="eyebrow">VISUALIZACIÓN DEL BANCO</span><h2>Pulpa, bombas y tuberías</h2><p>La altura coloreada representa el nivel calculado en cada celda para el segundo seleccionado.</p></div><span className="bank-time">t = {second} s</span></div>
      <div className="bank-scroll"><div className="bank-visual">
        <div className="bank-feed"><span>ALIMENTACIÓN</span><strong>{format(result.feed_lpm[second], 2)}</strong><small>L/min</small><ArrowRight size={20} /></div>
        {[0, 1, 2].map(i => {
          const level = series.levels_cm[i][second];
          const setpoint = result.setpoints_cm[i][second];
          const height = Math.max(0, Math.min(100, 100 * level / maximum));
          const targetHeight = Math.max(0, Math.min(100, 100 * setpoint / maximum));
          return <Fragment key={i}>
            <div className="bank-vessel"><div className="bank-vessel-head"><span>CELDA 0{i + 1}</span><Waves size={16} /></div>
              <div className="tank-assembly"><div className="tank-shell" role="img" aria-label={`Pulpa de la celda ${i + 1} a ${format(level, 2)} de ${maximum} centímetros`}>
                  <div className="tank-pulp" style={{ height: `${height}%` }}><span className="tank-wave" /><span className="pulp-bubble bubble-one" /><span className="pulp-bubble bubble-two" /><span className="pulp-bubble bubble-three" /></div>
                  <div className="tank-target" style={{ bottom: `${targetHeight}%` }}><span>SP</span></div>
                  <div className="tank-scale"><i /><i /><i /><i /></div>
                </div><div className="tank-pump"><Gauge size={15} /><span>BOMBA</span></div></div>
              <div className="bank-vessel-readout"><strong>{format(level, 3)} cm</strong><span>Consigna {format(setpoint, 2)} cm</span></div>
            </div>
            <div className="bank-pipe"><span>{i === 2 ? "COLAS FINALES" : `COLAS ${i + 1} / ENTRADA ${i + 2}`}</span><strong>{format(series.tailings_lpm[i][second])}</strong><small>L/min</small><ArrowRight size={20} /></div>
          </Fragment>;
        })}
      </div></div>
      <div className="bank-legend"><span><i className="legend-pulp" /> Nivel de pulpa</span><span><i className="legend-setpoint" /> Consigna</span><span><Gauge size={14} /> Bomba de colas</span><p>Esquema didáctico; la dinámica y los caudales proceden del modelo matemático.</p></div>
    </section>
  );
}
