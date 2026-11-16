import { ArrowRight, BookOpen, Calculator, Gauge, Waves } from "lucide-react";

function Equation({ index, label, children, explanation }) {
  return <article className="equation-card"><span className="equation-index">{index}</span><div><span className="eyebrow">{label}</span><div className="equation">{children}</div><p>{explanation}</p></div></article>;
}

export default function ModelModule() {
  return (
    <div className="module-page model-page">
      <header className="page-intro plain"><span className="eyebrow">MÓDULO 02 / MODELO MATEMÁTICO</span><h1>Las ecuaciones detrás<br /><em>de cada curva.</em></h1><p>El artículo identifica la respuesta de las bombas de colas y publica la sintonización de los controladores. El simulador evalúa el balance de las tres celdas cada segundo.</p></header>

      <section className="concept-strip" aria-label="Secuencia de cálculo">
        <div><span className="concept-icon"><Waves size={21} /></span><small>PASO 01</small><strong>Medir caudales</strong><p>Entrada externa y colas reales después de los retardos.</p></div><ArrowRight className="concept-arrow" size={20} /><div><span className="concept-icon"><Gauge size={21} /></span><small>PASO 02</small><strong>Calcular PI</strong><p>El error de nivel determina la nueva orden de bomba.</p></div><ArrowRight className="concept-arrow" size={20} /><div><span className="concept-icon"><Calculator size={21} /></span><small>PASO 03</small><strong>Actualizar nivel</strong><p>El balance de entrada menos colas avanza un segundo.</p></div>
      </section>

      <div className="model-layout">
        <section className="equations-panel"><div className="panel-heading"><BookOpen size={20} /><div><span className="eyebrow">FORMULACIÓN</span><h2>Modelo de proceso y control</h2></div></div>
          <Equation index="01" label="RESPUESTA IDENTIFICADA DE LA BOMBA" explanation="La ganancia negativa indica que extraer más colas reduce el nivel. θ representa el retardo de cada bomba.">
            G<sub>p,i</sub>(s) = −0,001018 · e<sup>−θ<sub>i</sub>s</sup> / s
          </Equation>
          <Equation index="02" label="BALANCE DISCRETO · Δt = 1 s" explanation="El nivel sube cuando entra más caudal del que sale. La magnitud simétrica de la ganancia para la entrada es un supuesto explícito.">
            h<sub>i</sub>[k+1] = h<sub>i</sub>[k] + 0,001018 · (Q<sub>in,i</sub>[k] − Q<sub>colas,i</sub>[k])
          </Equation>
          <Equation index="03" label="PI INCREMENTAL + ALIMENTACIÓN ANTICIPATIVA" explanation="e = consigna − nivel. En modo PI se toma Kff = 0; en PI + AA se añade la variación medida de la entrada.">
            Δu<sub>i</sub> = K<sub>c,i</sub> · (Δe<sub>i</sub> + e<sub>i</sub>/T<sub>i,i</sub>) + K<sub>ff,i</sub> · ΔQ<sub>in,i</sub>
          </Equation>
          <Equation index="04" label="INDICADOR DE DESEMPEÑO" explanation="El IAE suma el error absoluto de cada segundo. Se calcula por celda y por estrategia.">
            IAE<sub>i</sub> = Σ |SP<sub>i</sub>[k] − h<sub>i</sub>[k]| · 1 s
          </Equation>
        </section>

        <aside className="model-aside"><section className="parameter-card"><span className="eyebrow">PARÁMETROS PUBLICADOS</span><h2>Sintonización final</h2><p>Valores reportados para las tres celdas del banco.</p>
            <div className="table-wrap"><table><thead><tr><th>Parámetro</th><th>01</th><th>02</th><th>03</th></tr></thead><tbody><tr><th>θ <small>s</small></th><td>7</td><td>6</td><td>3</td></tr><tr><th>K<sub>c</sub> <small>L/(min·cm)</small></th><td>−62</td><td>−76</td><td>−85</td></tr><tr><th>T<sub>i</sub> <small>s</small></th><td>56</td><td>30</td><td>44</td></tr><tr><th>K<sub>ff</sub></th><td>0,8</td><td>0,8</td><td>1,0</td></tr></tbody></table></div>
            <div className="parameter-foot">Ganancia identificada: <strong>−0,001018 cm/(s·L/min)</strong><br />Periodo de muestreo: <strong>1 s</strong></div>
          </section>
          <section className="assumption-card"><span className="eyebrow">ALCANCE DEL SIMULADOR</span><h3>Supuestos y límites</h3><ul><li>Niveles iniciales 30 / 33,5 / 33 cm y consignas finales 28,5 / 32,5 / 32 cm aproximadas de la figura 14.</li><li>Altura limitada a 0–45 cm y bombas a 0–90 L/min.</li><li>El cambio externo de +8 L/min del ensayo inicial es una perturbación de demostración.</li><li>Se simulan nivel y caudal; no recuperación ni ley mineral.</li></ul><p>El artículo utiliza PI. No se implementa acción derivativa.</p></section>
        </aside>
      </div>
      <a className="source-link" href="https://doi.org/10.1016/j.mex.2023.102081" target="_blank" rel="noopener noreferrer"><BookOpen size={16} /> Quintanilla et al., MethodsX 10 (2023), 102081 <ArrowRight size={15} /></a>
    </div>
  );
}
