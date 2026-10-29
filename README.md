# TP05 — Dashboard de telemetría Unitree

Proyecto completo del TP05 de Desarrollo de Aplicaciones II. Incluye:

- simulador local para Unitree G1 y Go2;
- modelos 3D oficiales necesarios para ejecutarlo;
- API HTTP y WebSocket de telemetría;
- dashboard web responsive;
- exportación del historial a CSV.

No hace falta descargar el SDK de Unitree ni CycloneDDS.

Para presentar y ejecutar esta entrega, comenzar por [ENTREGA.md](ENTREGA.md).
Las pruebas y sus límites están en [VALIDACION.md](VALIDACION.md).

## Requisitos

- Python 3.10 o superior
- Node.js compatible con Vite: `^20.19.0 || >=22.12.0` (20.19.0 o posterior de la rama 20, o 22.12.0 o superior). Node 21 no cumple este requisito.
- npm (incluido con Node.js)
- Git solo si se desea gestionar el repositorio; no hace falta para ejecutar este ZIP.

## Instalación

### Linux y macOS

```bash
python3 -m venv entorno/.venv
entorno/.venv/bin/python -m pip install -r requirements.txt
cd mi_dashboard
npm ci
cd ..
```

### Windows PowerShell

```powershell
py -3 -m venv entorno\.venv
entorno\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd mi_dashboard
npm ci
cd ..
```

En Windows, MuJoCo también necesita el Microsoft Visual C++ Redistributable.
La explicación y la resolución de problemas están en `INSTALACION.md`.

## Ejecución

Se usan dos terminales abiertas en la carpeta raíz del proyecto. El backend
provee los datos y el frontend muestra el dashboard; hay que iniciar ambos.
Dejá las dos terminales abiertas mientras usás la aplicación.

### Terminal 1 — simulador y API

Linux/macOS:

```bash
./INICIAR_TP05.sh
```

Windows PowerShell:

```powershell
.\INICIAR_TP05.bat
```

Elegí G1 o Go2 y dejá el proceso abierto. La API queda disponible en el
puerto `8001`. Podés verificar que responde abriendo
`http://127.0.0.1:8001/telemetria` en el navegador.

Para probar sin simulador 3D, podés reemplazar el comando de esta terminal
por el modo demo (no ejecutes ambos backend a la vez):

```powershell
.\entorno\.venv\Scripts\python.exe .\entorno\arrancar_api.py --robot go2 --demo
```

En Linux/macOS, usá `entorno/.venv/bin/python entorno/arrancar_api.py --robot go2 --demo`.
Reemplazá `go2` por `g1` para probar el otro modelo. Estos comandos usan el
entorno virtual creado en la instalación.

### Terminal 2 — dashboard

Linux/macOS:

```bash
./INICIAR_DASHBOARD.sh
```

Windows PowerShell:

```powershell
.\INICIAR_DASHBOARD.bat
```

Abrí <http://localhost:3000> (si ese puerto está ocupado, usá la dirección
que muestre Vite en la terminal). El dashboard apunta inicialmente a
`http://127.0.0.1:8001`. Si la API está en otra computadora, usá el
botón **Conexión** del dashboard e ingresá la dirección mostrada por el backend.

## Funcionalidades del dashboard

- Telemetría por WebSocket con reconexión automática.
- Ángulos, velocidad, torque y temperatura de todos los motores, con semáforo
  verde/amarillo/rojo igual a electroSim.
- Roll, pitch, yaw, horizonte artificial e histórico de IMU en gráfico de línea.
- Panel BMS completo: carga, corriente, temperatura de batería y voltaje por celda.
- Contactos de las cuatro patas del Go2 y de los dos pies del G1, cuando están disponibles.
- Adaptación automática al G1 y al Go2 mediante `/info`.
- Botón **Capturar muestra** + exportación CSV de todas las muestras capturadas en la sesión.

El contrato completo del backend está documentado en `API.md`.

## Verificaciones

```bash
cd mi_dashboard
npm run lint
npm run build
```

## Contenido de la entrega

El ZIP incluye código, modelos del simulador, dependencias declaradas y evidencias.
No incluye `.git`, `.venv`, `node_modules`, compilados ni cachés. Las dependencias
se instalan siguiendo los pasos anteriores. Las capturas de ejemplo son datos demo.
