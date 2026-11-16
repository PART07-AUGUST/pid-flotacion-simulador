# Simulador de control de nivel en tres celdas de flotación

Aplicación web en español que compara control **PI** y **PI con alimentación anticipativa (PI + AA)** para tres celdas en serie. El motor está escrito en Python; la interfaz permite modificar consignas y alimentación, examinar seis gráficas y descargar los datos en CSV. El mismo `app.py` se ejecuta localmente y en Render.

## Base matemática y procedencia

Quintanilla, P., Navia, D., Moreno, F., Neethling, S. J. y Brito-Parada, P. R. (2023). *A methodology to implement a closed-loop feedback-feedforward level control in a laboratory-scale flotation bank using peristaltic pumps*. MethodsX, **10**, 102081. <https://doi.org/10.1016/j.mex.2023.102081>

El artículo identifica para cada celda una respuesta integradora de la bomba de colas al nivel:

`Gp_i(s) = -0.001018 exp(-theta_i s) / s`, con `theta = (7, 6, 3) s`.

La implementación discreta usa `dt = 1 s`, `Qentrada,2 = Qcolas,1` y `Qentrada,3 = Qcolas,2`:

`h_i[k+1] = clip(h_i[k] + 0.001018 (Qentrada,i[k] - Qcolas,i[k]), 0, 45)`.

`Qcolas,i[k]` es el caudal real de la bomba después del retardo `theta_i` de su orden. El error es `e_i = SP_i - h_i`. La orden incremental del controlador es:

`u_i[k] = clip(u_i[k-1] + Kc_i ((e_i[k]-e_i[k-1]) + e_i[k]/Ti_i) + Kff_i (Qentrada,i[k]-Qentrada,i[k-1]), 0, 90)`.

Para PI solo, `Kff_i = 0`. Para PI + AA, `Kff = (0.8, 0.8, 1)`. Las ganancias finales publicadas son `Kc = (-62, -76, -85) L/(min·cm)` y `Ti = (56, 30, 44) s`. La acción derivativa es cero en el artículo. La forma incremental hace persistir la corrección de un salto de caudal. Se aplica integración condicional cuando la bomba llega a un límite.

**Supuestos necesarios para completar el modelo:** nivel inicial y consignas iniciales de 25 cm, altura máxima de 45 cm, caudal nominal de 45 L/min, capacidad de cada bomba de 0 a 90 L/min y magnitud simétrica de la ganancia identificada para perturbaciones de entrada y salida. El artículo no aporta todos esos valores como parámetros de una simulación reproducible. Por ello, las curvas y los IAE de esta aplicación son **resultados simulados**, no los datos experimentales ni las cifras de su figura 14. No se modelan recuperación, ley de concentrado ni cinética mineral.

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

Se verifican el equilibrio, el signo y retardo de la respuesta, la conexión en serie, los límites y la comparación IAE del escenario predeterminado.

## Publicar en Render

1. Crear un repositorio nuevo en GitHub y subir todos los archivos de esta carpeta, excepto `.venv` y archivos ignorados por `.gitignore`.
2. En <https://dashboard.render.com/create>, elegir **Web Service** y conectar ese repositorio. Seleccionar la rama `main`, el directorio raíz del repositorio y **Language: Python 3**. El archivo `.python-version` fija Python 3.14.
3. Configurar **Build Command**: `pip install -r requirements.txt`.
4. Configurar **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`. El nombre del archivo es `app.py`, por eso se usa `app:app`.
5. Elegir el plan **Free** si está disponible y no se necesita disponibilidad continua. Crear el servicio y esperar a que el despliegue termine.
6. Abrir la URL HTTPS `https://<nombre-del-servicio>.onrender.com` indicada por Render. Verificar `/api/health` (debe responder `{"status":"ok"}`), ejecutar el escenario inicial y descargar su CSV.

La aplicación es un único servicio sin secretos, almacenamiento ni procesos de fondo. El endpoint `POST /api/simulate` recibe la configuración del ensayo y calcula ambos modos desde el mismo estado inicial. `GET /api/health` permite comprobar el despliegue. En el plan Free, Render puede suspender el servicio tras 15 minutos sin tráfico; la primera visita posterior puede tardar alrededor de un minuto mientras se reactiva.

## Estructura

- `simulator.py`: ecuaciones, controladores y comparación.
- `app.py`: servidor FastAPI y API.
- `static/`: interfaz y gráficas sin dependencias de JavaScript externas.
- `tests/`: verificación matemática del modelo.
