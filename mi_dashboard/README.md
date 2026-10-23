# Unitree Control Center

Dashboard web de telemetría para el TP05 de Desarrollo de Aplicaciones II.
Consume la API del simulador o del robot real y muestra batería (BMS), IMU,
motores, temperaturas, torque y apoyo de patas en tiempo real.

Es una SPA de **Vite + React + TypeScript** sin servidor propio: todo corre en
el navegador y habla por HTTP/WebSocket directo contra el backend FastAPI del
TP05. No usa Next.js, Cloudflare Workers ni base de datos — no hace falta para
este TP, que es de solo lectura.

El botón **Capturar muestra** guarda el estado actual del robot. El botón
**Exportar CSV** descarga todas las muestras capturadas hasta el momento (hasta
6000). Cada fila representa un motor en una muestra e incluye también IMU,
batería y estado de apoyo.

## Requisitos

- Node.js 20 o superior
- El backend del TP05 activo

## Iniciar

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`. La dirección predeterminada del backend es
`http://127.0.0.1:8001`. Se puede cambiar desde el botón **Conexión** usando la
dirección que muestra `INICIAR_TP05`.

## Verificar

```bash
npm run build
npm run lint
```

El dashboard consulta `/info` para adaptarse automáticamente a G1 o Go2 y usa
`/ws` para recibir telemetría unas diez veces por segundo. Si se corta la
conexión, intenta recuperarla con espera progresiva.

## Paneles

- **Motores**: ángulo, velocidad, torque y temperatura de cada motor, con
  semáforo verde/amarillo/rojo (&lt;40°C / 40-60°C / &gt;60°C, igual a
  electroSim).
- **IMU**: roll/pitch/yaw numéricos, horizonte artificial y gráfico de línea
  histórico (80 muestras).
- **BMS**: carga (%), corriente (mA), temperatura de batería y voltaje de cada
  celda.
- **Patas**: contacto de FR/FL/RR/RL para el Go2 (el G1 no reporta patas).
