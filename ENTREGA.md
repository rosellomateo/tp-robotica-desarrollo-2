# TP05 — Dashboard web de telemetría Unitree

## Alcance

Aplicación cliente-servidor de solo lectura para visualizar telemetría de Go2 y G1. El backend FastAPI ofrece un contrato JSON común; el frontend React + TypeScript lo consume mediante WebSocket. La referencia funcional es la consigna «TP - Robótica - Dashboard Web de Telemetría».

## Instalación y demostración en Windows

Descomprimir el ZIP y abrir PowerShell en la carpeta que contiene este documento. Usar Python 3.13, versión con la que se verificó el proyecto, y Node compatible con `^20.19.0 || >=22.12.0`, con npm. Se necesita conexión a Internet para descargar dependencias. Git no es necesario para ejecutar el ZIP.

```powershell
py -3.13 -m venv entorno\.venv
.\entorno\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd mi_dashboard
npm ci
cd ..
```

Terminal 1, desde la raíz: iniciar el backend demo sin robot ni ventana 3D.

```powershell
.\entorno\.venv\Scripts\python.exe .\entorno\arrancar_api.py --robot go2 --demo
```

Terminal 2, también desde la raíz:

```powershell
.\INICIAR_DASHBOARD.bat
```

Abrir http://localhost:3000 o la dirección indicada por Vite. La API predeterminada es http://127.0.0.1:8001. Dejar ambas terminales abiertas. Para probar G1, detener el backend con Ctrl+C y repetir su comando con `--robot g1`; el dashboard se reconecta automáticamente. El modelo se selecciona en el servidor, no mediante un selector en el navegador.

Para usar el simulador visual en lugar del demo, ejecutar `INICIAR_TP05.bat` según el README. No iniciar dos backend en el mismo puerto. El modo demo fue el recorrido verificado de punta a punta; no se certifica aquí el arranque 3D ni la conexión a un robot físico.

## Qué se entrega y qué corresponde a la base

- `entorno/api/` y `entorno/sim/`: infraestructura del TP identificada por las guías como material provisto; incluye lectores, adaptación de datos, servidor y modelos del simulador. No se atribuye su autoría al desarrollo del frontend.
- `mi_dashboard/`: interfaz web implementada, estilos, gráficos, consumo de datos, captura y CSV.
- Scripts de inicio y documentación: instalación y ejecución. En esta revisión se corrigieron rutas de Windows, requisitos, exportación y adaptación visual entre modelos.

El ZIP de partida ya contenía un frontend. Esta entrega es su versión revisada; no se afirma haber construido todo desde cero.

## Correspondencia con la consigna

| Requisito | Implementación |
|---|---|
| Motores Go2/G1 | Tabla de todos los motores recibidos: 12/29; ángulo en grados, velocidad en rad/s y torque en Nm |
| Temperatura | Verde <40 °C, amarillo entre 40 y 60 inclusive, rojo >60 °C |
| IMU | Roll/pitch/yaw numéricos y gráfico de 80 muestras |
| BMS | Carga, corriente en mA, temperatura y voltaje por celda |
| Cuatro patas | Indicadores FR, FL, RR y RL para Go2 |
| Actualización | WebSocket `/ws`, configurado a 10 Hz, con reconexión |
| Capturar | Copia independiente de la muestra actual y fecha ISO |
| Exportar CSV | Todas las capturas de la sesión; una fila por motor y captura |
| Demo | Generador del backend sin robot físico |

Los dos pies del G1 son una extensión al requisito de cuatro patas del Go2. Si un contacto no llega al frontend, aparece «Sin datos». El adaptador del backend puede completar valores ausentes con cero: un cero recibido no garantiza por sí mismo una medición física.

## Arquitectura y patrones

Flujo: fuente demo/simulador → lector → adaptador → API HTTP/WebSocket → estado del frontend → paneles. La captura y el CSV usan la misma muestra normalizada.

**Adapter.** `entorno/api/telemetry_adapter.py`, función `adaptar_telemetria`, convierte la estructura de la fuente al contrato web: radianes a grados, cuaternión a roll/pitch/yaw, milivoltios a voltios y contactos binarios. Permite que la vista no conozca el formato interno de la fuente. Es parte del backend base.

**Observer, mediante eventos.** En `mi_dashboard/src/App.tsx`, el manejador `socket.onmessage` recibe las notificaciones del WebSocket, actualiza el estado y los históricos, y React vuelve a representar los paneles. Es una aplicación del mecanismo de observación por callbacks del navegador; no existe una clase propia llamada Observer ni un bus de eventos adicional. El servidor envía instantáneas periódicamente, no únicamente cuando detecta cambios.

**Facade, a nivel de servicio.** `entorno/api/telemetry_server.py` ofrece `/telemetria` y `/ws` como interfaz unificada sobre lectura y adaptación. `_telemetria` coordina validación del modelo, obtención de la instantánea y conversión; el cliente consume el resultado sin gestionar el transporte del simulador. Es el papel de fachada de la API base; no se presenta como una clase Facade añadida al frontend.

Estos roles describen el código existente. Si la evaluación exige implementaciones propias de los tres patrones en clases específicas, esa exigencia adicional no queda demostrada por esta organización.

## Capturas y CSV

Cada captura lleva identificador, fecha ISO, tiempo del robot y modelo. El CSV incluye motores, orientación, aceleraciones, batería, contactos y una columna por celda. Cero y dato ausente se distinguen. Los campos con comas, comillas o saltos de línea se escapan.

No hay descarte automático al superar 6000 capturas. Se conservan al cambiar conexión y al exportar. Los gráficos, en cambio, reinician su histórico cuando cambia el modelo o la dirección del servidor, o retrocede el tiempo del robot. Las capturas se almacenan en memoria: cerrar o recargar la página las pierde y la capacidad práctica depende de la memoria disponible. Exportar antes de salir.

## Guion breve para la exposición

1. Iniciar Go2 demo y mostrar la API `/telemetria` y el dashboard.
2. Explicar las 12 filas, sus unidades y el semáforo.
3. Mostrar IMU, batería/celdas y los cuatro contactos independientes.
4. Esperar unos 8 segundos para llenar las 80 muestras del histórico.
5. Capturar tres muestras y descargar el CSV: 36 filas de datos para Go2.
6. Detener el backend y reiniciarlo como G1; mostrar reconexión, 29 motores e histórico nuevo.
7. Capturar una muestra adicional: el CSV conjunto tendrá 65 filas y cuatro identificadores de captura.
8. Explicar Adapter, los eventos del WebSocket y la API como fachada, distinguiendo infraestructura base de interfaz desarrollada.

## Validación y límites

Consultar `VALIDACION.md` y `evidencias/`. Las comprobaciones registradas corresponden a modo demo en Windows y Chrome. No equivalen a ensayos sobre un robot real ni a una instalación nueva sin dependencias. El demo produce datos sintéticos; roll y yaw pueden permanecer en cero y los cambios pequeños de pitch se ven casi planos con escala de ±180 grados.

Antes de presentar, agregar los nombres reales de los integrantes y cualquier dato administrativo solicitado por el docente. No se inventaron integrantes ni roles personales.
