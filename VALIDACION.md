# Registro de validación

Entrega preparada el 28/10/2026. Resume las pruebas realizadas durante esta revisión, no una certificación del robot físico.

| Comprobación | Resultado |
|---|---|
| ESLint | Sin errores ni advertencias |
| TypeScript `tsc --noEmit` | Sin errores |
| Vite, compilación de producción | Correcta |
| Navegador + backend demo Go2 | 12 motores, cuatro contactos, BMS con ocho celdas |
| Histórico IMU | Se observaron 80 muestras en el gráfico |
| Frecuencia observada | Intervalo medio aproximado de 108 ms en la prueba |
| Captura/descarga real | Tres capturas Go2, 36 filas en CSV |
| Reinicio del backend como G1 | Reconexión, 29 motores, dos pies e histórico nuevo |
| Exportación mixta | Cuatro capturas: tres Go2 y una G1; 65 filas |
| Semáforo controlado | 39,9 verde; 40 y 60 amarillo; 60,1 rojo |
| Contactos controlados | Apoyado, sin apoyo y ausencia de datos diferenciados |
| Prueba de lógica con 6001 capturas | Sin pérdida de la primera o última; copia independiente |
| CSV con comillas, saltos, ceros y celdas variables | Correcto |
| Vista móvil | Sin desbordamiento horizontal en 390 px |
| JavaScript en navegador | Sin excepciones de página |

Durante el apagado deliberado del backend se produjo el error de red esperado; la aplicación se reconectó. Se detectó y corrigió el contraste del botón Exportar CSV al pasar el mouse; la prueba final confirmó fondo oscuro y texto blanco.

## Evidencias incluidas

- `evidencias/go2.png` y `evidencias/g1.png`: paneles con backend demo.
- `evidencias/g1-movil.png`: vista móvil.
- `evidencias/umbrales.png`: página de prueba con temperaturas controladas; esos valores no proceden del demo normal.
- `evidencias/go2.csv` y `evidencias/sesion-mixta.csv`: descargas reales del navegador.
- `evidencias/resultado.json`: resultados automáticos de la última prueba funcional.

## Entorno observado

Windows, Python 3.13.12; MuJoCo 3.17.0, FastAPI 0.162.0, Uvicorn 0.54.0 y websockets 17.3. La compilación y las comprobaciones se ejecutaron con Node 24.22.1 y Vite 8.0.13. Las versiones del frontend quedan fijadas por `package-lock.json`; `requirements.txt` declara mínimos del backend, no un bloqueo completo de todas las dependencias.

## Repetir controles de código

Desde `mi_dashboard` después de instalar las dependencias:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Para repetir el recorrido funcional usar el guion de `ENTREGA.md`. Las pruebas de umbrales y 6001 capturas se realizaron con datos controlados y no se presentan como mediciones reales.
