# Unitree Control Center

Dashboard web de telemetría para el TP05 de Desarrollo de Aplicaciones II.
Consume la API del simulador o del robot real y muestra batería (BMS), IMU,
motores, temperaturas, torque y apoyo de patas en tiempo real.

Es una SPA de **Vite + React + TypeScript** sin servidor propio: todo corre en
el navegador y habla por HTTP/WebSocket directo contra el backend FastAPI del
TP05. No usa Next.js, Cloudflare Workers ni base de datos — no hace falta para
este TP, que es de solo lectura.

El botón **Capturar muestra** guarda el estado actual del robot. El botón
**Exportar CSV** descarga todas las muestras capturadas hasta el momento, sin
descartar las más antiguas al superar 6000. Cada fila representa un motor en
una muestra e incluye un identificador de captura, fecha ISO, tiempo del robot,
modelo, IMU (orientación y aceleraciones), batería, voltajes de cada celda y
contactos de Go2 y G1. Los campos no disponibles quedan vacíos, no en cero.

Las capturas se conservan al cambiar la conexión y al exportar. Se guardan en
memoria durante la sesión: se pierden al recargar o cerrar la página. El volumen
máximo práctico depende de la memoria del navegador. Exportá antes de salir.

## Requisitos

- Node.js compatible con Vite: `^20.19.0 || >=22.12.0` (20.19.0 o posterior de la rama 20, o 22.12.0 o superior). Node 21 no cumple este requisito.
- npm (incluido con Node.js)
- El backend del TP05 activo

## Iniciar

Primero iniciá el backend desde la raíz del proyecto, en una terminal de
PowerShell, con `.\INICIAR_TP05.bat`. Elegí el
robot y dejá esa terminal abierta.

En otra terminal ubicada en la raíz, ejecutá `.\INICIAR_DASHBOARD.bat`.
En Linux/macOS usá `./INICIAR_TP05.sh` y `./INICIAR_DASHBOARD.sh`, respectivamente.

También podés iniciar el frontend manualmente desde esta carpeta (`mi_dashboard`):

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` o la dirección que muestre Vite si el puerto está ocupado. La dirección predeterminada del backend es
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
- **Contactos**: FR/FL/RR/RL para Go2 y L_foot/R_foot para G1 cuando el backend los informa. Un campo ausente se muestra como «Sin datos».

El modelo recibido por telemetría determina los paneles y las filas de motores
(12 para Go2, 29 para G1). Los históricos se reinician al cambiar de modelo,
de dirección del backend o cuando el tiempo del robot retrocede al reiniciarse.
Las capturas manuales se conservan con su modelo para exportarlas.
