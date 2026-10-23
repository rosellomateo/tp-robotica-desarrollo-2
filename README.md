# TP05 — Dashboard de telemetría Unitree

Proyecto completo del TP05 de Desarrollo de Aplicaciones II. Incluye:

- simulador local para Unitree G1 y Go2;
- modelos 3D oficiales necesarios para ejecutarlo;
- API HTTP y WebSocket de telemetría;
- dashboard web responsive;
- exportación del historial a CSV.

No hace falta descargar el SDK de Unitree ni CycloneDDS.

## Requisitos

- Python 3.10 o superior
- Node.js 20 o superior
- Git

## Instalación

### Linux y macOS

```bash
python3 -m venv entorno/.venv
entorno/.venv/bin/python -m pip install -r requirements.txt
cd mi_dashboard
npm install
cd ..
```

### Windows PowerShell

```powershell
py -3 -m venv entorno\.venv
entorno\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd mi_dashboard
npm install
cd ..
```

En Windows, MuJoCo también necesita el Microsoft Visual C++ Redistributable.
La explicación y la resolución de problemas están en `INSTALACION.md`.

## Ejecución

Se usan dos terminales.

### Terminal 1 — simulador y API

Linux/macOS:

```bash
./INICIAR_TP05.sh
```

Windows:

```bat
INICIAR_TP05.bat
```

Elegí G1 o Go2 y dejá el proceso abierto. La API queda disponible en el
puerto `8001`.

### Terminal 2 — dashboard

Linux/macOS:

```bash
./INICIAR_DASHBOARD.sh
```

Windows:

```bat
INICIAR_DASHBOARD.bat
```

Abrí <http://localhost:3000>. Si la API está en otra computadora, usá el
botón **Conexión** del dashboard e ingresá la dirección mostrada por el backend.

## Funcionalidades del dashboard

- Telemetría por WebSocket con reconexión automática.
- Ángulos, velocidad, torque y temperatura de todos los motores, con semáforo
  verde/amarillo/rojo igual a electroSim.
- Roll, pitch, yaw, horizonte artificial e histórico de IMU en gráfico de línea.
- Panel BMS completo: carga, corriente, temperatura de batería y voltaje por celda.
- Patas apoyadas para el Go2.
- Adaptación automática al G1 y al Go2 mediante `/info`.
- Botón **Capturar muestra** + exportación CSV de hasta 6000 muestras capturadas.

El contrato completo del backend está documentado en `API.md`.

## Verificaciones

```bash
cd mi_dashboard
npm run lint
npm run build
```

## Publicar en Git

La carpeta ya está inicializada como repositorio local sobre la rama `main`.
Para crear el primer commit:

```bash
git add .
git commit -m "TP05: dashboard de telemetría Unitree"
```

Después creá un repositorio vacío en GitHub, GitLab o el servicio que uses:

```bash
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

No subas `entorno/.venv`, `node_modules` ni `dist`; están excluidos porque se
regeneran con los comandos de instalación.
