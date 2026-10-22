# Unitree Control Center

Dashboard web de telemetría para el TP05 de Desarrollo de Aplicaciones II.
Consume la API del simulador o del robot real y muestra batería, IMU, motores,
temperaturas, torque y apoyo de patas en tiempo real.

El botón **Exportar CSV** descarga el historial acumulado durante la sesión.
Cada fila representa un motor en una muestra e incluye también IMU, batería y
estado de apoyo. Se conservan en memoria hasta 6000 muestras (unos 10 minutos).

## Requisitos

- Node.js 22.13 o superior
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
npm test
```

El dashboard consulta `/info` para adaptarse automáticamente a G1 o Go2 y usa
`/ws` para recibir telemetría unas diez veces por segundo. Si se corta la
conexión, intenta recuperarla con espera progresiva.
