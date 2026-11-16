# Simulador de control de nivel en tres celdas de flotación

Aplicación web en español que compara control **PI** y **PI con alimentación anticipativa (PI + AA)** para tres celdas en serie. El motor está escrito en Python; la interfaz permite modificar consignas y alimentación, examinar seis gráficas y descargar los datos en CSV. El mismo `app.py` se ejecuta localmente y en Render.

## Tres módulos visibles en la interfaz

- **Simulación:** configura el ensayo en el panel lateral, ejecuta ambos controladores, compara el IAE y observa las tres curvas de nivel. Desde aquí se descarga el CSV.
- **Modelo matemático:** presenta la función de transferencia, el balance de nivel, la ley PI + alimentación anticipativa, el IAE, los parámetros por celda y los supuestos.
- **Flujo de celdas:** muestra el recorrido de la alimentación y de las colas. Permite escoger PI o PI + AA y mover un control de tiempo para leer, en un segundo concreto, los niveles, entradas, órdenes de bomba y caudales reales. También muestra las tres gráficas de caudal.

Los tres módulos usan los mismos resultados calculados por Python al ejecutar el ensayo. Al cambiar de módulo no se recalcula el modelo; al pulsar **Ejecutar simulación** sí se calculan de nuevo ambos escenarios.

## Base matemática y procedencia

Quintanilla, P., Navia, D., Moreno, F., Neethling, S. J. y Brito-Parada, P. R. (2023). *A methodology to implement a closed-loop feedback-feedforward level control in a laboratory-scale flotation bank using peristaltic pumps*. MethodsX, **10**, 102081. <https://doi.org/10.1016/j.mex.2023.102081>

El artículo identifica para cada celda una respuesta integradora de la bomba de colas al nivel:

`Gp_i(s) = -0.001018 exp(-theta_i s) / s`, con `theta = (7, 6, 3) s`.

La implementación discreta usa `dt = 1 s`, `Qentrada,2 = Qcolas,1` y `Qentrada,3 = Qcolas,2`:

`h_i[k+1] = clip(h_i[k] + 0.001018 (Qentrada,i[k] - Qcolas,i[k]), 0, 45)`.

`Qcolas,i[k]` es el caudal real de la bomba después del retardo `theta_i` de su orden. El error es `e_i = SP_i - h_i`. La orden incremental del controlador es:

`u_i[k] = clip(u_i[k-1] + Kc_i ((e_i[k]-e_i[k-1]) + e_i[k]/Ti_i) + Kff_i (Qentrada,i[k]-Qentrada,i[k-1]), 0, 90)`.

Para PI solo, `Kff_i = 0`. Para PI + AA, `Kff = (0.8, 0.8, 1)`. Las ganancias finales publicadas son `Kc = (-62, -76, -85) L/(min·cm)` y `Ti = (56, 30, 44) s`. La acción derivativa es cero en el artículo. La forma incremental hace persistir la corrección de un salto de caudal. Se aplica integración condicional cuando la bomba llega a un límite.

**Supuestos necesarios para completar el modelo:** los niveles iniciales de 30 / 33,5 / 33 cm y las consignas finales de 28,5 / 32,5 / 32 cm son lecturas aproximadas de la figura 14, no valores numéricos tabulados. El ejemplo incorpora un cambio externo de alimentación de +8 L/min a los 180 s para ilustrar el rechazo de perturbaciones; el artículo mantuvo la alimentación de la primera celda en 45 L/min en su ensayo de validación. Se suponen altura máxima de 45 cm, capacidad de cada bomba de 0 a 90 L/min y magnitud simétrica de la ganancia identificada para perturbaciones de entrada y salida. El artículo no aporta todos esos valores como parámetros de una simulación reproducible. Por ello, las curvas y los IAE de esta aplicación son **resultados simulados**, no los datos experimentales ni las cifras de su figura 14. No se modelan recuperación, ley de concentrado ni cinética mineral.

## Cómo se calcula cada segundo

El código divide el motor en tres partes, que pueden explicarse siguiendo una muestra `k`:

1. **Flujo de las celdas — `cell_flow.py`:** lee el caudal real de cada bomba desde una cola de retardo. Construye las entradas `[alimentación externa, colas de celda 1, colas de celda 2]`. Por eso, un cambio de la bomba 1 afecta primero a la celda 1 y después a la 2 y la 3. Al final de la muestra guarda las nuevas órdenes para que aparezcan tras 7, 6 y 3 s, respectivamente.
2. **Modelo matemático — `model_math.py`:** para cada celda calcula el error `e = consigna − nivel` y la nueva orden de bomba mediante PI incremental. En el modo PI + AA suma `Kff × cambio de caudal de entrada`. La orden se limita a 0–90 L/min y se aplica integración condicional si alcanza ese límite. Después actualiza el nivel con el balance de entrada menos colas, limitado a 0–45 cm.
3. **Simulación — `simulator.py`:** define el escenario, aplica los cambios de alimentación y consigna, llama a los otros dos módulos durante cada segundo, guarda niveles y caudales y acumula `IAE = suma(|consigna − nivel| × 1 s)`. Ejecuta dos ensayos independientes desde el mismo estado inicial: PI y PI + AA. `app.py` expone ese resultado a la interfaz mediante `POST /api/simulate`; el navegador dibuja las gráficas y genera el CSV.

La separación permite señalar en una exposición qué ecuación corresponde al nivel y al controlador, cómo viaja el caudal entre celdas y qué parte produce las curvas y el IAE. Los tres módulos ejecutan el mismo modelo de antes de esta reorganización.

## Ejecutar en Windows

Requiere Python **3.14**. En PowerShell, dentro de esta carpeta:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Abrir <http://127.0.0.1:8000>. Para detener el servidor, presionar `Ctrl+C`. Si se usa otra versión compatible de Python, sustituir `py -3.14` por su comando de instalación. No se necesita OpenPLC ni base de datos.

## Ejecutar las pruebas

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Se verifican el equilibrio, el signo y retardo de la respuesta, la conexión en serie, los límites, la integración del IAE y el efecto de la alimentación anticipativa sobre la orden de bomba. Una mejora de IAE en todas las celdas no se impone como propiedad universal: depende de cada escenario.

## Publicar en Render

1. Usar el repositorio público <https://github.com/PART07-AUGUST/pid-flotacion-simulador>. Los cambios locales posteriores deben subirse a la rama `main` antes de actualizar Render.
2. En <https://dashboard.render.com/create>, elegir **Web Service** y conectar ese repositorio. Seleccionar la rama `main`, el directorio raíz del repositorio y **Language: Python 3**. El archivo `.python-version` fija Python 3.14.
3. Configurar **Build Command**: `pip install -r requirements.txt`.
4. Configurar **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`. El nombre del archivo es `app.py`, por eso se usa `app:app`.
5. Elegir el plan **Free** si está disponible y no se necesita disponibilidad continua. Crear el servicio y esperar a que el despliegue termine.
6. Abrir la URL HTTPS `https://<nombre-del-servicio>.onrender.com` indicada por Render. Verificar `/api/health` (debe responder `{"status":"ok"}`), ejecutar el escenario inicial y descargar su CSV.

La aplicación es un único servicio sin secretos, almacenamiento ni procesos de fondo. El endpoint `POST /api/simulate` recibe la configuración del ensayo y calcula ambos modos desde el mismo estado inicial. `GET /api/health` permite comprobar el despliegue. En el plan Free, Render puede suspender el servicio tras 15 minutos sin tráfico; la primera visita posterior puede tardar alrededor de un minuto mientras se reactiva.

## Estructura

- `model_math.py`: parámetros, balance de nivel y controlador PI/PI + AA.
- `cell_flow.py`: retardos de bombas y caudales entre las tres celdas.
- `simulator.py`: escenarios, bucle temporal, IAE y comparación.
- `app.py`: servidor FastAPI y API.
- `static/`: interfaz y gráficas sin dependencias de JavaScript externas.
- `tests/`: verificación matemática del modelo.
