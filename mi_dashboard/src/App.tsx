import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Motor = {
  id: number;
  nombre: string;
  angulo: number;
  velocidad: number;
  torque: number;
  temperatura: number;
};

type Telemetria = {
  modelo: "go2" | "g1";
  ts: number;
  motores: Motor[];
  imu: { roll: number; pitch: number; yaw: number; ax: number; ay: number; az: number };
  bms: { soc: number; corriente: number; temperatura: number; celdas: number[] };
  fuerzas: Record<string, number>;
};

type RobotInfo = {
  modelo: "go2" | "g1";
  nombre: string;
  tipo: string;
  n_motores: number;
  frecuencia_hz: number;
  modo: string;
};

type Status = "connecting" | "online" | "offline";
type Point = { t: number; values: number[] };
type RecordedSnapshot = { receivedAt: string; data: Telemetria };
type NivelTemperatura = "ok" | "warn" | "danger";

const SERIES_COLORS = ["#0d7c7b", "#ec7d55", "#5271a8", "#9d6aae"];
const MAX_POINTS = 80;
const DEFAULT_API_BASE = "http://127.0.0.1:8001";

// Semáforo igual a electroSim: verde <40°C, amarillo 40-60°C, rojo >60°C.
function nivelTemperatura(temp: number): NivelTemperatura {
  if (temp > 60) return "danger";
  if (temp >= 40) return "warn";
  return "ok";
}

function normalizarBase(value: string) {
  let base = value.trim().replace(/\/$/, "");
  if (base && !/^https?:\/\//i.test(base)) base = `http://${base}`;
  return base;
}

function formato(value: number | undefined, digits = 1, suffix = "") {
  return Number.isFinite(value) ? `${value!.toFixed(digits)}${suffix}` : "—";
}

function estadoContacto(valor: number | undefined) {
  return valor === 1 ? "supported" : valor === 0 ? "raised" : "unknown";
}

function reiniciarHistorial(anterior: Telemetria | null, siguiente: Telemetria) {
  return !anterior || anterior.modelo !== siguiente.modelo || siguiente.ts < anterior.ts;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// Una fila por motor y captura; columnas comunes para toda la sesión.
function generarCsv(capturas: RecordedSnapshot[]) {
  const cantidadCeldas = capturas.reduce((max, { data }) => Math.max(max, data.bms.celdas.length), 0);
  const contactos = Array.from(new Set([
    "FR", "FL", "RR", "RL", "R_foot", "L_foot",
    ...capturas.flatMap(({ data }) => Object.keys(data.fuerzas ?? {})),
  ]));
  const headers = [
    "muestra_id", "fecha_iso", "tiempo_robot_s", "modelo", "motor_id", "motor_nombre",
    "angulo_grados", "velocidad_rad_s", "torque_nm", "temperatura_c",
    "roll_grados", "pitch_grados", "yaw_grados", "ax_m_s2", "ay_m_s2", "az_m_s2",
    "bateria_pct", "corriente_ma", "temperatura_bateria_c",
    ...contactos.map((nombre) => `pata_${nombre}`),
    ...Array.from({ length: cantidadCeldas }, (_, i) => `celda_${i + 1}_v`),
  ];
  const rows: Array<Array<string | number>> = [headers];
  capturas.forEach(({ receivedAt, data }, index) => {
    // Conservar también una muestra que no tenga motores.
    const motores = data.motores.length ? data.motores : [null];
    motores.forEach((motor) => {
      rows.push([
        index + 1, receivedAt, data.ts, data.modelo, motor?.id ?? "", motor?.nombre ?? "",
        motor?.angulo ?? "", motor?.velocidad ?? "", motor?.torque ?? "", motor?.temperatura ?? "",
        data.imu.roll, data.imu.pitch, data.imu.yaw, data.imu.ax, data.imu.ay, data.imu.az,
        data.bms.soc, data.bms.corriente, data.bms.temperatura,
        ...contactos.map((nombre) => data.fuerzas?.[nombre] ?? ""),
        ...Array.from({ length: cantidadCeldas }, (_, i) => data.bms.celdas[i] ?? ""),
      ]);
    });
  });
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function LineChart({
  points,
  labels,
  range = 120,
  unit = "°",
  ariaLabel,
}: {
  points: Point[];
  labels: string[];
  range?: number;
  unit?: string;
  ariaLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;
      const pad = { left: 43, right: 16, top: 18, bottom: 28 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "#e5ebeb";
      ctx.fillStyle = "#7a888e";
      ctx.font = "10px Arial";
      ctx.lineWidth = 1;

      const step = (range * 2) / 4;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (plotH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        const value = range - i * step;
        ctx.fillText(`${value}${unit}`, 7, y + 3);
      }

      if (points.length < 2) return;
      labels.forEach((_, seriesIndex) => {
        ctx.beginPath();
        ctx.strokeStyle = SERIES_COLORS[seriesIndex];
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        points.forEach((point, index) => {
          const x = pad.left + (index / Math.max(points.length - 1, 1)) * plotW;
          const raw = point.values[seriesIndex] ?? 0;
          const y = pad.top + ((range - Math.max(-range, Math.min(range, raw))) / (range * 2)) * plotH;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    };

    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    draw();
    return () => observer.disconnect();
  }, [points, labels, range, unit]);

  return <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />;
}

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [draftBase, setDraftBase] = useState(DEFAULT_API_BASE);
  const [status, setStatus] = useState<Status>("connecting");
  const [telemetry, setTelemetry] = useState<Telemetria | null>(null);
  const [info, setInfo] = useState<RobotInfo | null>(null);
  const [motorHistory, setMotorHistory] = useState<Point[]>([]);
  const [imuHistory, setImuHistory] = useState<Point[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const telemetryRef = useRef<Telemetria | null>(null);
  const capturasRef = useRef<RecordedSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/info`)
      .then((response) => {
        if (!response.ok) throw new Error("API no disponible");
        return response.json();
      })
      .then((data: RobotInfo) => { if (!cancelled) setInfo(data); })
      .catch(() => { if (!cancelled) setInfo(null); });
    return () => { cancelled = true; };
  }, [apiBase, status]);

  useEffect(() => {
    let disposed = false;
    let attempts = 0;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      const wsUrl = apiBase.replace(/^http/i, "ws") + "/ws";
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || socketRef.current !== socket) return;
        attempts = 0;
        setStatus("online");
      };

      socket.onmessage = (event) => {
        if (disposed || socketRef.current !== socket) return;
        try {
          const next = JSON.parse(event.data) as Telemetria;
          const resetHistory = reiniciarHistorial(telemetryRef.current, next);
          setTelemetry(next);
          telemetryRef.current = next;
          setLastUpdate(new Date());
          setStatus("online");
          const selectedMotors = next.motores.slice(0, 4);
          setMotorHistory((current) => [
            ...(resetHistory ? [] : current),
            { t: next.ts, values: selectedMotors.map((motor) => motor.angulo) },
          ].slice(-MAX_POINTS));
          setImuHistory((current) => [
            ...(resetHistory ? [] : current),
            { t: next.ts, values: [next.imu.roll, next.imu.pitch, next.imu.yaw] },
          ].slice(-MAX_POINTS));
        } catch {
          setStatus("offline");
        }
      };

      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) return;
        setStatus("offline");
        const delay = Math.min(1000 * 2 ** attempts, 8000);
        attempts += 1;
        retryRef.current = setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [apiBase]);

  const applyBase = useCallback(() => {
    const next = normalizarBase(draftBase);
    if (!next) return;
    if (next === apiBase) {
      setSettingsOpen(false);
      return;
    }
    const previousSocket = socketRef.current;
    socketRef.current = null;
    previousSocket?.close();
    setInfo(null);
    setLastUpdate(null);
    setStatus("connecting");
    setMotorHistory([]);
    setImuHistory([]);
    setTelemetry(null);
    telemetryRef.current = null;
    setApiBase(next);
    setDraftBase(next);
    setSettingsOpen(false);
  }, [draftBase, apiBase]);

  const model = telemetry?.modelo ?? info?.modelo;
  const activeInfo = info?.modelo === model ? info : null;

  // Requisito transversal: "Capturar" guarda una muestra puntual a pedido
  // del usuario; es independiente del refresco continuo de los gráficos.
  const capturarMuestra = useCallback(() => {
    const actual = telemetryRef.current;
    if (!actual) return;
    capturasRef.current.push({ receivedAt: new Date().toISOString(), data: structuredClone(actual) });
    setCapturedCount(capturasRef.current.length);
  }, []);

  const exportCsv = useCallback(() => {
    if (!capturasRef.current.length) return;
    const csv = generarCsv(capturasRef.current);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `telemetria-sesion-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const motors = useMemo(() => telemetry?.motores ?? [], [telemetry?.motores]);
  const chartMotors = motors.slice(0, 4);
  const maxTemperature = useMemo(
    () => motors.length ? Math.max(...motors.map((motor) => motor.temperatura)) : undefined,
    [motors],
  );
  const averageTorque = useMemo(
    () => motors.length ? motors.reduce((sum, motor) => sum + Math.abs(motor.torque), 0) / motors.length : undefined,
    [motors],
  );
  const contactNames = model === "go2" ? ["FL", "FR", "RL", "RR"]
    : model === "g1" ? ["L_foot", "R_foot"] : [];
  const knownContacts = contactNames.filter((name) => estadoContacto(telemetry?.fuerzas?.[name]) !== "unknown").length;
  const supportedLegs = contactNames.filter((name) => telemetry?.fuerzas?.[name] === 1).length;
  const robotName = activeInfo?.nombre ?? (model ? `Unitree ${model.toUpperCase()}` : "Robot Unitree");
  const celdas = telemetry?.bms.celdas ?? [];

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <p className="eyebrow">UNITREE / TELEMETRÍA EN VIVO</p>
            <h1>Centro de control</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div className={`connection-pill ${status}`} role="status">
            <span className="status-dot" />
            {status === "online" ? "En línea" : status === "connecting" ? "Conectando" : "Sin conexión"}
          </div>
          <button className="capture-button" type="button" onClick={capturarMuestra} disabled={!telemetry} aria-label="Capturar la muestra actual">
            <span aria-hidden="true">●</span> Capturar muestra
          </button>
          <button className="export-button" type="button" onClick={exportCsv} disabled={!capturedCount} aria-label={`Exportar ${capturedCount} muestras capturadas como CSV`}>
            <span aria-hidden="true">↓</span> Exportar CSV
          </button>
          <button className="settings-button" type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
            <span aria-hidden="true">⚙</span> Conexión
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="connection-panel" aria-label="Configuración de conexión">
          <div>
            <strong>Dirección del backend</strong>
            <p>Usá la IP que muestra <span>INICIAR_TP05</span>.</p>
          </div>
          <label>
            <span className="sr-only">Dirección del backend</span>
            <input value={draftBase} onChange={(event) => setDraftBase(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyBase()} placeholder="http://192.168.0.10:8001" />
          </label>
          <button type="button" onClick={applyBase}>Aplicar</button>
        </section>
      )}

      <section className="context-row">
        <div>
          <span className="context-label">UNIDAD ACTIVA</span>
          <strong>{robotName}</strong>
          <span>{activeInfo?.tipo ?? "Esperando identificación"}</span>
        </div>
        <dl>
          <div><dt>FUENTE</dt><dd>{activeInfo?.modo ?? "—"}</dd></div>
          <div><dt>FRECUENCIA</dt><dd>{activeInfo ? `${activeInfo.frecuencia_hz} Hz` : "—"}</dd></div>
          <div><dt>ACTUALIZADO</dt><dd>{lastUpdate ? lastUpdate.toLocaleTimeString("es-AR") : "—"}</dd></div>
        </dl>
      </section>

      <section className="hero-grid" aria-label="Resumen del robot">
        <article className="primary-card battery-card">
          <div className="card-heading"><span>ENERGÍA DEL SISTEMA</span><span>{model?.toUpperCase() ?? "—"}</span></div>
          <div className="battery-content">
            <div>
              <strong className="hero-value">{telemetry ? Math.round(telemetry.bms.soc) : "—"}<small>{telemetry ? "%" : ""}</small></strong>
              <p>Batería disponible</p>
            </div>
            <div className="battery-icon" aria-hidden="true"><span style={{ height: `${telemetry?.bms.soc ?? 0}%` }} /></div>
          </div>
          <div className="battery-track"><span style={{ width: `${telemetry?.bms.soc ?? 0}%` }} /></div>
        </article>

        <article className="metric-card orientation-card">
          <div className="card-heading"><span>ORIENTACIÓN</span><span>IMU</span></div>
          <div className="horizon" aria-hidden="true" style={{ transform: `rotate(${telemetry?.imu.roll ?? 0}deg)` }}>
            <div className="sky" style={{ transform: `translateY(${Math.max(-20, Math.min(20, telemetry?.imu.pitch ?? 0))}px)` }} />
            <div className="ground" style={{ transform: `translateY(${Math.max(-20, Math.min(20, telemetry?.imu.pitch ?? 0))}px)` }} />
            <i />
          </div>
          <div className="orientation-values">
            <span><small>ROLL</small>{formato(telemetry?.imu.roll, 1, "°")}</span>
            <span><small>PITCH</small>{formato(telemetry?.imu.pitch, 1, "°")}</span>
            <span><small>YAW</small>{formato(telemetry?.imu.yaw, 1, "°")}</span>
          </div>
        </article>

        <article className="metric-card accent-card">
          <div className="card-heading"><span>ARTICULACIONES</span><span>ACTIVAS</span></div>
          <strong className="hero-value">{telemetry ? motors.length : "—"}</strong>
          <p>Motores reportando</p>
          <div className="mini-stats">
            <span><small>T° MÁX.</small>{formato(maxTemperature, 1, " °C")}</span>
            <span><small>TORQUE MED.</small>{formato(averageTorque, 2, " Nm")}</span>
          </div>
        </article>
      </section>

      <section className="telemetry-grid">
        <article className="chart-card panel">
          <div className="section-heading">
            <div><p className="eyebrow">MOVIMIENTO EN TIEMPO REAL</p><h2>Ángulo de motores</h2></div>
            <div className="legend" aria-label="Series del gráfico">
              {chartMotors.map((motor, index) => <span key={motor.id}><i style={{ background: SERIES_COLORS[index] }} />{motor.nombre}</span>)}
            </div>
          </div>
          <div className="chart-area">
            {motorHistory.length < 2 && <div className="empty-chart">Esperando datos para construir el historial…</div>}
            <LineChart points={motorHistory} labels={chartMotors.map((motor) => motor.nombre)} range={120} ariaLabel="Historial de ángulos de motores" />
          </div>
          <div className="chart-footer"><span>−120°</span><span>Ventana móvil · {MAX_POINTS / 10} segundos</span><span>+120°</span></div>
        </article>

        <article className="stance-card panel">
          <div className="section-heading">
            <div><p className="eyebrow">CONTACTO CON EL SUELO</p><h2>{model === "go2" ? "Apoyo de patas" : model === "g1" ? "Apoyo de pies" : "Contacto"}</h2></div>
          </div>
          {model ? (
            <>
              <div className={`stance-visual ${model === "g1" ? "stance-biped" : ""}`}>
                <div className="robot-body"><span>FRENTE</span></div>
                {contactNames.map((leg) => {
                  const state = estadoContacto(telemetry?.fuerzas?.[leg]);
                  const label = leg === "L_foot" ? "Pie izquierdo" : leg === "R_foot" ? "Pie derecho" : leg;
                  const description = state === "supported" ? "Apoyado" : state === "raised" ? "Sin apoyo" : "Sin datos";
                  return (
                    <div key={leg} className={`foot foot-${leg.toLowerCase()} ${state}`} aria-label={`${label}: ${description}`}>
                      <span>{label}<small>{description}</small></span><i aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
              <div className="stance-summary">
                <strong>{knownContacts === contactNames.length ? `${supportedLegs}/${contactNames.length}` : "—"}</strong>
                <span>{knownContacts === contactNames.length ? (model === "go2" ? "Patas apoyadas" : "Pies apoyados") : "Datos de contacto incompletos"}</span>
              </div>
            </>
          ) : (
            <div className="platform-message"><p>Esperando identificación del robot.</p></div>
          )}
        </article>
      </section>

      <section className="telemetry-grid">
        <article className="chart-card panel">
          <div className="section-heading">
            <div><p className="eyebrow">INCLINACIÓN EN EL TIEMPO</p><h2>Historial de IMU</h2></div>
            <div className="legend" aria-label="Series del gráfico">
              <span><i style={{ background: SERIES_COLORS[0] }} />Roll</span>
              <span><i style={{ background: SERIES_COLORS[1] }} />Pitch</span>
              <span><i style={{ background: SERIES_COLORS[2] }} />Yaw</span>
            </div>
          </div>
          <div className="chart-area">
            {imuHistory.length < 2 && <div className="empty-chart">Esperando datos para construir el historial…</div>}
            <LineChart points={imuHistory} labels={["Roll", "Pitch", "Yaw"]} range={180} ariaLabel="Historial de roll, pitch y yaw" />
          </div>
          <div className="chart-footer"><span>−180°</span><span>Ventana móvil · {MAX_POINTS / 10} segundos · mín. 60 muestras</span><span>+180°</span></div>
        </article>

        <article className="bms-card panel">
          <div className="section-heading">
            <div><p className="eyebrow">BATERÍA</p><h2>Panel BMS</h2></div>
          </div>
          <div className="bms-summary">
            <div><small>CARGA</small><strong>{formato(telemetry?.bms.soc, 0, "%")}</strong></div>
            <div><small>CORRIENTE</small><strong>{formato(telemetry?.bms.corriente, 0, " mA")}</strong></div>
            <div><small>TEMPERATURA</small><strong>{formato(telemetry?.bms.temperatura, 1, " °C")}</strong></div>
          </div>
          <div className="cell-grid" aria-label="Voltaje por celda">
            {celdas.length
              ? celdas.map((volt, index) => (
                  <div className="cell-chip" key={index}>
                    <small>CEL {index + 1}</small>
                    <span>{formato(volt, 2, " V")}</span>
                  </div>
                ))
              : <p className="empty-inline">Sin datos de celdas.</p>}
          </div>
        </article>
      </section>

      <section className="motors-section panel">
        <div className="section-heading motors-heading">
          <div><p className="eyebrow">DIAGNÓSTICO POR ARTICULACIÓN</p><h2>Estado de motores</h2></div>
          <div className="temperature-key" aria-label="Referencia del semáforo de temperatura">
            <span className="key-item"><i className="dot ok" /> &lt;40°C</span>
            <span className="key-item"><i className="dot warn" /> 40-60°C</span>
            <span className="key-item"><i className="dot danger" /> &gt;60°C</span>
          </div>
        </div>
        {motors.length ? (
          <div className="motor-table" role="table" aria-label="Estado de motores">
            <div className="motor-row motor-table-head" role="row">
              <span role="columnheader">MOTOR</span><span role="columnheader">ÁNGULO</span><span role="columnheader">VELOCIDAD</span><span role="columnheader">TORQUE</span><span role="columnheader">TEMPERATURA</span>
            </div>
            {motors.map((motor) => {
              const nivel = nivelTemperatura(motor.temperatura);
              return (
                <div className="motor-row" role="row" key={motor.id}>
                  <span className="motor-name" role="cell"><i>{String(motor.id + 1).padStart(2, "0")}</i><strong>{motor.nombre}</strong></span>
                  <span role="cell"><small>Ángulo</small>{formato(motor.angulo, 1, "°")}</span>
                  <span role="cell"><small>Velocidad</small>{formato(motor.velocidad, 2, " rad/s")}</span>
                  <span role="cell"><small>Torque</small>{formato(motor.torque, 2, " Nm")}</span>
                  <span className={`temp-cell temp-${nivel}`} role="cell">
                    <small>Temperatura</small>
                    <b>{formato(motor.temperatura, 1, " °C")}</b>
                    <i className="temp-dot" aria-hidden="true" />
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">∿</span>
            <strong>Esperando telemetría</strong>
            <p>Iniciá el simulador y verificá la dirección de conexión.</p>
          </div>
        )}
      </section>

      <footer>
        <span>UADE · Desarrollo de Aplicaciones II</span>
        <span>{apiBase} · {capturedCount} muestras capturadas</span>
        <span>TP05 / UNITREE LAB</span>
      </footer>
    </main>
  );
}
