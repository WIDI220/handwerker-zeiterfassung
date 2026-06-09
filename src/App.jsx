// ============================================================
// HANDWERKER ZEITERFASSUNG v5 – WIDI Design System
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";

const APP_URL  = "https://syhjjuewkjjihxwiexmz.supabase.co";
const APP_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aGpqdWV3a2pqaWh4d2lleG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTk2NDYsImV4cCI6MjA5MzA5NTY0Nn0.9A-GrkU72IZ3uxkypX5GttN4EXNv46aX4uOY4wUmfaE";
const CTRL_URL = "https://uclsqnpqvphdbeutzzuu.supabase.co";
const CTRL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHNxbnBxdnBoZGJldXR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODUzNjQsImV4cCI6MjA4Nzc2MTM2NH0.qpWW_Bx4Lddkf3YEPeVwv0yRU_leRwakojcdfGBELs4";

const MAX_FOTOS = 10;
const FOTO_LABELS = ["Vorher", "Nachher", "Detail", "Schaden", "Fertig", "Beleg", "Sonstiges"];

// ── API helpers ───────────────────────────────────────────────
const appApi = async (path, options = {}) => {
  const res = await fetch(`${APP_URL}/rest/v1/${path}`, {
    headers: { apikey: APP_KEY, Authorization: `Bearer ${APP_KEY}`, "Content-Type": "application/json", Prefer: options.prefer || "return=representation", ...options.headers },
    ...options,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Fehler"); }
  if (res.status === 204) return null;
  return res.json();
};
const ctrlRead = async (path) => {
  const res = await fetch(`${CTRL_URL}/rest/v1/${path}`, { headers: { apikey: CTRL_KEY, Authorization: `Bearer ${CTRL_KEY}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Fehler beim Laden");
  return res.json();
};
const ctrlWrite = async (path, body, options = {}) => {
  const res = await fetch(`${CTRL_URL}/rest/v1/${path}`, { method: options.method || "POST", headers: { apikey: CTRL_KEY, Authorization: `Bearer ${CTRL_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Fehler"); }
  return res.status === 204 ? null : res.json();
};
const uploadFoto = async (file, userId) => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${APP_URL}/storage/v1/object/fotos/${path}`, { method: "POST", headers: { apikey: APP_KEY, Authorization: `Bearer ${APP_KEY}`, "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error("Foto Upload fehlgeschlagen");
  return `${APP_URL}/storage/v1/object/public/fotos/${path}`;
};

// ── Session ───────────────────────────────────────────────────
const SESSION_KEY = "handwerker_v4_session";
const saveSession = (u) => localStorage.setItem(SESSION_KEY, JSON.stringify(u));
const loadSession = () => { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const clearSession = () => localStorage.removeItem(SESSION_KEY);

// ── Design tokens ─────────────────────────────────────────────
const C = {
  navy:"#0f1f3d", blue:"#1e3a5f", accent:"#2563eb", green:"#10b981",
  amber:"#f59e0b", red:"#ef4444", cyan:"#0891b2", purple:"#8b5cf6",
  bg:"#f8fafc", card:"#ffffff", border:"#f1f5f9", border2:"#e2e8f0",
  text:"#0f172a", text2:"#64748b", text3:"#94a3b8",
};
const TYP = {
  baustelle: { label:"Baustelle",       color:C.accent,  bg:"#eff6ff" },
  ticket:    { label:"Ticket",          color:C.cyan,    bg:"#ecfeff" },
  tickets:   { label:"Tickets",         color:C.cyan,    bg:"#ecfeff" },
  dguv:      { label:"DGUV",            color:C.green,   bg:"#f0fdf4" },
  sonstiges: { label:"Sonstiges",       color:C.purple,  bg:"#f5f3ff" },
  extern:    { label:"Ext. Ticket",     color:"#e11d48", bg:"#fff1f2" },
  intern:    { label:"Intern",          color:C.purple,  bg:"#f5f3ff" },
  begehung:  { label:"Begehung",        color:C.amber,   bg:"#fffbeb" },
};
const ST = {
  offen:     { label:"Offen",     bg:"#fffbeb", color:"#b45309" },
  genehmigt: { label:"Genehmigt", bg:"#f0fdf4", color:"#065f46" },
  abgelehnt: { label:"Abgelehnt", bg:"#fef2f2", color:"#991b1b" },
  verbucht:  { label:"Verbucht",  bg:"#eff6ff", color:"#1d4ed8" },
};
const ICONS = { baustelle:"🏗️", ticket:"🎫", dguv:"🦺", sonstiges:"📋" };
const FONT  = "'Inter', system-ui, sans-serif";
const inp   = { width:"100%", padding:"11px 14px", border:`1.5px solid ${C.border2}`, borderRadius:10, fontSize:14, background:C.card, color:C.text, boxSizing:"border-box", fontFamily:"inherit", outline:"none" };

// Label-Farben für Foto-Tags
const LABEL_COLORS = {
  "Vorher":    { color:"#1d4ed8", bg:"#eff6ff" },
  "Nachher":   { color:"#065f46", bg:"#f0fdf4" },
  "Detail":    { color:"#92400e", bg:"#fffbeb" },
  "Schaden":   { color:"#991b1b", bg:"#fef2f2" },
  "Fertig":    { color:"#065f46", bg:"#d1fae5" },
  "Beleg":     { color:"#6b21a8", bg:"#f5f3ff" },
  "Sonstiges": { color:"#475569", bg:"#f1f5f9" },
};

// ── Global CSS ────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${C.bg}; font-family: ${FONT}; -webkit-font-smoothing: antialiased; }
    input, select, textarea, button { font-family: inherit; }
    input:focus, select:focus, textarea:focus {
      border-color: ${C.accent} !important;
      box-shadow: 0 0 0 3px rgba(37,99,235,.12);
      outline: none;
    }
    .card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px; }
    .btn-p { background: linear-gradient(135deg,${C.accent},#1d4ed8); color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer; transition:opacity .15s; font-family:inherit; }
    .btn-p:hover { opacity:.9; }
    .btn-p:disabled { opacity:.45; cursor:not-allowed; }
    .btn-g { background:${C.bg}; color:${C.text2}; border:1px solid ${C.border2}; border-radius:10px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .1s; }
    .btn-g:hover { background:${C.border}; }
    .row { display:flex; align-items:center; }
    .fade { animation: fadeIn .22s ease; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 99px; }
  `}</style>
);

// ── Helpers ───────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return <span style={{ fontSize:11, fontWeight:600, padding:"3px 9px", borderRadius:99, background:bg||color+"18", color, whiteSpace:"nowrap" }}>{label}</span>;
}

function Avatar({ name, size = 36 }) {
  const ini = (name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const cols = [C.accent, C.green, C.cyan, C.purple, C.amber];
  const col  = cols[((name||"").charCodeAt(0)||0) % cols.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:col+"20", border:`2px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.35, fontWeight:700, color:col, flexShrink:0 }}>
      {ini}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign:"center", padding:"48px 0", color:C.text3 }}>
      <div style={{ width:32, height:32, border:`3px solid ${C.border2}`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 12px" }} />
      Laden...
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>{title}</p>
      {children}
    </div>
  );
}

// ── Foto-Label Picker ─────────────────────────────────────────
function LabelPicker({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
      {FOTO_LABELS.map(l => {
        const lc = LABEL_COLORS[l] || { color:C.text2, bg:C.bg };
        const active = value === l;
        return (
          <button key={l} type="button" onClick={() => onChange(l)}
            style={{ padding:"4px 10px", borderRadius:99, fontSize:11, fontWeight:700, cursor:"pointer", border:`1.5px solid ${active ? lc.color : C.border2}`, background:active ? lc.bg : C.card, color:active ? lc.color : C.text3, transition:"all .12s" }}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ── Foto-Upload Block (Multi, aus Galerie oder Kamera) ────────
function FotoUploadBlock({ fotos, onChange }) {
  // fotos: Array<{ file?: File, url?: string, preview: string, label: string }>
  const fileRef = useRef();

  const handleFiles = (files) => {
    const arr = Array.from(files).slice(0, MAX_FOTOS - fotos.length);
    if (!arr.length) return;
    const neu = arr.map(f => ({ file: f, preview: URL.createObjectURL(f), label: "Vorher" }));
    onChange([...fotos, ...neu]);
  };

  const removeAt = (i) => {
    const updated = fotos.filter((_, idx) => idx !== i);
    onChange(updated);
  };

  const setLabelAt = (i, label) => {
    const updated = fotos.map((f, idx) => idx === i ? { ...f, label } : f);
    onChange(updated);
  };

  const remaining = MAX_FOTOS - fotos.length;

  return (
    <div>
      {/* Hinzufügen Button */}
      {remaining > 0 && (
        <label style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", border:`2px dashed ${C.border2}`, borderRadius:12, cursor:"pointer", background:C.bg, marginBottom: fotos.length ? 12 : 0, transition:"all .15s" }}>
          <span style={{ fontSize:22 }}>📷</span>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text2, margin:0 }}>
              {fotos.length === 0 ? "Fotos hinzufügen" : "Weitere Fotos hinzufügen"}
            </p>
            <p style={{ fontSize:11, color:C.text3, margin:0 }}>
              Aus Galerie oder Kamera · noch {remaining} von {MAX_FOTOS}
            </p>
          </div>
          <span style={{ fontSize:12, fontWeight:700, color:C.text3, background:C.border, padding:"3px 8px", borderRadius:6 }}>{fotos.length}/{MAX_FOTOS}</span>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display:"none" }} />
        </label>
      )}

      {/* Foto-Grid */}
      {fotos.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {fotos.map((f, i) => {
            const lc = LABEL_COLORS[f.label] || { color:C.text2, bg:C.bg };
            return (
              <div key={i} style={{ border:`1px solid ${C.border2}`, borderRadius:12, overflow:"hidden", background:C.card }}>
                <div style={{ position:"relative" }}>
                  <img src={f.preview || f.url} alt={`Foto ${i+1}`} style={{ width:"100%", height:140, objectFit:"cover", display:"block" }} />
                  <button type="button" onClick={() => removeAt(i)}
                    style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,.55)", border:"none", color:"#fff", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
                    ×
                  </button>
                  <span style={{ position:"absolute", top:8, left:8, fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:99, background:lc.bg, color:lc.color, border:`1px solid ${lc.color}30` }}>
                    {f.label}
                  </span>
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", margin:"0 0 6px" }}>Markierung</p>
                  <LabelPicker value={f.label} onChange={l => setLabelAt(i, l)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {remaining === 0 && (
        <p style={{ fontSize:12, color:C.text3, textAlign:"center", marginTop:8 }}>Maximale Anzahl erreicht ({MAX_FOTOS} Fotos)</p>
      )}
    </div>
  );
}

// ── Foto-Anzeige (read-only) ──────────────────────────────────
function FotoAnzeige({ fotos, fotoVorher, fotoNachher, compact = false }) {
  // Unterstützt sowohl neues fotos-Array als auch altes vorher/nachher
  const items = [];
  if (fotos && Array.isArray(fotos) && fotos.length > 0) {
    fotos.forEach(f => items.push({ url: f.url, label: f.label }));
  } else {
    if (fotoVorher)  items.push({ url: fotoVorher,  label: "Vorher" });
    if (fotoNachher) items.push({ url: fotoNachher, label: "Nachher" });
  }
  if (!items.length) return null;

  const h = compact ? 80 : 120;
  const cols = items.length === 1 ? "1fr" : items.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div style={{ display:"grid", gridTemplateColumns:cols, gap:8, marginTop:10 }}>
      {items.map((item, i) => {
        const lc = LABEL_COLORS[item.label] || { color:C.text2, bg:C.bg };
        return (
          <div key={i} style={{ position:"relative" }}>
            <img src={item.url} alt={item.label} style={{ width:"100%", borderRadius:8, height:h, objectFit:"cover", display:"block" }} />
            <span style={{ position:"absolute", bottom:4, left:4, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, background:lc.bg, color:lc.color, border:`1px solid ${lc.color}30` }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// KALENDER VIEW
// ═════════════════════════════════════════════════════════════
function KalenderView({ eintraege, planung = [], abwesenheit = [] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });

  const prevMonth = () => setMonth(m => {
    const d = new Date(m.year, m.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setMonth(m => {
    const d = new Date(m.year, m.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const monatName = new Date(month.year, month.month, 1).toLocaleDateString("de-DE", { month:"long", year:"numeric" });

  // NRW Feiertage für dieses und ggf. Nachbarjahr
  const feiertage = { ...getNRWFeiertage(month.year) };

  // Eigene Einträge für diesen Monat
  const tageMap = {};
  eintraege.forEach(e => {
    const d = new Date(e.datum);
    if (d.getFullYear() === month.year && d.getMonth() === month.month) {
      const key = d.getDate();
      if (!tageMap[key]) tageMap[key] = [];
      tageMap[key].push(e);
    }
  });

  // Planungs-Einträge
  const planungMap = {};
  planung.forEach(p => {
    const d = new Date(p.datum);
    if (d.getFullYear() === month.year && d.getMonth() === month.month) {
      const key = d.getDate();
      if (!planungMap[key]) planungMap[key] = [];
      planungMap[key].push(p);
    }
  });

  // Abwesenheiten (Urlaub / Krank)
  const abwMap = {};
  abwesenheit.forEach(a => {
    const d = new Date(a.datum);
    if (d.getFullYear() === month.year && d.getMonth() === month.month) {
      abwMap[d.getDate()] = a; // pro Tag max. 1
    }
  });

  // Kalender-Grid
  const ersterTag = new Date(month.year, month.month, 1);
  const letzterTag = new Date(month.year, month.month + 1, 0);
  let startDow = ersterTag.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= letzterTag.getDate(); d++) cells.push(d);

  const today = new Date();
  const isToday = (d) => d === today.getDate() && month.month === today.getMonth() && month.year === today.getFullYear();
  const isoDay = (d) => `${month.year}-${String(month.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const monatStunden = Object.values(tageMap).flat().reduce((s,e) => s + Number(e.stunden||0), 0);
  const monatTage    = Object.keys(tageMap).length;

  const typSummen = {};
  Object.values(tageMap).flat().forEach(e => {
    typSummen[e.typ] = (typSummen[e.typ] || 0) + Number(e.stunden || 0);
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const dayEntries = selectedDay ? (tageMap[selectedDay]    || []) : [];
  const dayPlanung = selectedDay ? (planungMap[selectedDay] || []) : [];
  const dayAbw     = selectedDay ? abwMap[selectedDay]              : null;
  const dayFt      = selectedDay ? feiertage[isoDay(selectedDay)]   : null;

  return (
    <div style={{ padding:"16px 20px", paddingBottom:40 }}>
      {/* Monats-Navigation */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={prevMonth} style={{ width:36, height:36, borderRadius:10, background:C.card, border:`1px solid ${C.border2}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:C.text2 }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:16, fontWeight:800, color:C.text, margin:0 }}>{monatName}</p>
          <p style={{ fontSize:11, color:C.text3, margin:"2px 0 0" }}>{monatStunden}h gebucht · {monatTage} Tage</p>
        </div>
        <button onClick={nextMonth} style={{ width:36, height:36, borderRadius:10, background:C.card, border:`1px solid ${C.border2}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:C.text2 }}>›</button>
      </div>

      {/* Legende */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
        {Object.entries(typSummen).map(([typ, h]) => {
          const cfg = TYP[typ] || {};
          return (
            <div key={typ} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:99, background:cfg.bg||C.bg, border:`1px solid ${cfg.color||C.border2}30` }}>
              <span style={{ fontSize:11 }}>{ICONS[typ]||"📋"}</span>
              <span style={{ fontSize:11, fontWeight:700, color:cfg.color||C.text2 }}>{cfg.label||typ}</span>
              <span style={{ fontSize:11, color:C.text3, fontWeight:600 }}>{h}h</span>
            </div>
          );
        })}
        {Object.keys(planungMap).length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:99, background:"#fff7ed", border:"1px solid #f59e0b30" }}>
            <span style={{ fontSize:11 }}>📅</span>
            <span style={{ fontSize:11, fontWeight:700, color:C.amber }}>Planung</span>
            <span style={{ fontSize:11, color:C.text3, fontWeight:600 }}>{Object.values(planungMap).flat().reduce((s,p) => s+Number(p.stunden||0), 0)}h</span>
          </div>
        )}
        {Object.keys(abwMap).some(k => abwMap[k].typ === "urlaub") && (
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:99, background:"#f0fdf4", border:"1px solid #10b98130" }}>
            <span style={{ fontSize:11 }}>🏖️</span>
            <span style={{ fontSize:11, fontWeight:700, color:C.green }}>Urlaub</span>
          </div>
        )}
        {Object.keys(abwMap).some(k => abwMap[k].typ === "krank") && (
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:99, background:"#fef2f2", border:"1px solid #ef444430" }}>
            <span style={{ fontSize:11 }}>🤒</span>
            <span style={{ fontSize:11, fontWeight:700, color:C.red }}>Krank</span>
          </div>
        )}
      </div>

      {/* Wochentage Header */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:3, marginBottom:3 }}>
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".05em", padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Kalender-Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:3 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const entries  = tageMap[d]    || [];
          const geplant  = planungMap[d] || [];
          const abw      = abwMap[d];
          const ftName   = feiertage[isoDay(d)];
          const totalH   = entries.reduce((s,e) => s + Number(e.stunden||0), 0);
          const planH    = geplant.reduce((s,p) => s + Number(p.stunden||0), 0);
          const typen    = [...new Set(entries.map(e => e.typ))];
          const selected = selectedDay === d;
          const tod      = isToday(d);
          const hasAny   = entries.length > 0 || geplant.length > 0 || abw || ftName;

          // Hintergrundfarbe: Feiertag > Urlaub > Krank > normal
          const cellBg = selected ? C.accent+"12"
            : ftName   ? "#fef9c3"
            : abw?.typ === "urlaub" ? "#f0fdf4"
            : abw?.typ === "krank"  ? "#fef2f2"
            : tod      ? C.accent+"08"
            : hasAny   ? C.card
            : "transparent";

          const cellBorder = selected ? C.accent
            : ftName         ? "#ca8a04"
            : abw?.typ === "urlaub" ? C.green
            : abw?.typ === "krank"  ? C.red
            : tod            ? C.accent+"40"
            : hasAny         ? C.border2
            : "transparent";

          return (
            <button key={d} type="button" onClick={() => hasAny ? setSelectedDay(selected ? null : d) : null}
              style={{
                padding:"4px 2px", borderRadius:10,
                border:`1.5px solid ${cellBorder}`,
                background: cellBg,
                cursor: hasAny ? "pointer" : "default",
                display:"flex", flexDirection:"column", alignItems:"center", gap:1, minHeight:60,
                transition:"all .12s", position:"relative", overflow:"hidden",
              }}>

              {/* Feiertag-Streifen oben */}
              {ftName && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"#ca8a04", borderRadius:"10px 10px 0 0" }} />}

              <span style={{ fontSize:13, fontWeight: tod ? 800 : hasAny ? 700 : 400, color: tod ? C.accent : ftName ? "#92400e" : hasAny ? C.text : C.text3, marginTop: ftName ? 4 : 0 }}>{d}</span>

              {/* Abwesenheits-Icon */}
              {abw && <span style={{ fontSize:12, lineHeight:1 }}>{abw.typ === "urlaub" ? "🏖️" : "🤒"}</span>}

              {/* Feiertag-Kürzel */}
              {ftName && !abw && <span style={{ fontSize:8, fontWeight:700, color:"#92400e", textAlign:"center", lineHeight:1.2, padding:"0 2px", wordBreak:"break-word" }}>{ftName.slice(0,6)}</span>}

              {/* Eigene Stunden */}
              {totalH > 0 && <span style={{ fontSize:10, fontWeight:700, color:selected ? C.accent : C.text2 }}>{totalH}h</span>}

              {/* Geplante Stunden */}
              {planH > 0 && <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:"#fff7ed", borderRadius:3, padding:"0 3px" }}>{planH}h</span>}

              {/* Typ-Punkte */}
              {typen.length > 0 && (
                <div style={{ display:"flex", gap:2, flexWrap:"wrap", justifyContent:"center" }}>
                  {typen.slice(0,3).map(t => {
                    const cfg = TYP[t] || {};
                    return <span key={t} style={{ width:5, height:5, borderRadius:"50%", background:cfg.color||C.text3, flexShrink:0 }} />;
                  })}
                  {geplant.length > 0 && <span style={{ width:5, height:5, borderRadius:"50%", background:C.amber, flexShrink:0 }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tag-Detail */}
      {selectedDay && (dayEntries.length > 0 || dayPlanung.length > 0 || dayAbw || dayFt) && (
        <div className="fade" style={{ marginTop:16, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background:C.bg }}>
            <p style={{ fontSize:13, fontWeight:700, color:C.text, margin:0 }}>
              {new Date(month.year, month.month, selectedDay).toLocaleDateString("de-DE", { weekday:"long", day:"2-digit", month:"long" })}
            </p>
            <p style={{ fontSize:11, color:C.text3, margin:"2px 0 0" }}>
              {dayEntries.reduce((s,e) => s+Number(e.stunden||0), 0)}h gebucht
              {dayPlanung.length > 0 && ` · ${dayPlanung.reduce((s,p) => s+Number(p.stunden||0), 0)}h geplant`}
            </p>
          </div>

          {/* Feiertag */}
          {dayFt && (
            <div style={{ padding:"12px 16px", background:"#fefce8", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>🎉</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:"#92400e", margin:0 }}>Feiertag (NRW)</p>
                <p style={{ fontSize:12, color:"#a16207", margin:"2px 0 0" }}>{dayFt}</p>
              </div>
            </div>
          )}

          {/* Abwesenheit */}
          {dayAbw && (
            <div style={{ padding:"12px 16px", background: dayAbw.typ === "urlaub" ? "#f0fdf4" : "#fef2f2", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:20 }}>{dayAbw.typ === "urlaub" ? "🏖️" : "🤒"}</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color: dayAbw.typ === "urlaub" ? C.green : C.red, margin:0 }}>
                  {dayAbw.typ === "urlaub" ? "Urlaub" : "Krank"}
                </p>
                {dayAbw.bemerkung && <p style={{ fontSize:12, color:C.text3, margin:"2px 0 0" }}>{dayAbw.bemerkung}</p>}
              </div>
            </div>
          )}

          {/* Planungs-Blöcke */}
          {dayPlanung.length > 0 && (
            <div style={{ borderBottom: dayEntries.length > 0 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ padding:"8px 16px 4px" }}>
                <span style={{ fontSize:10, fontWeight:700, color:C.amber, textTransform:"uppercase", letterSpacing:".06em" }}>📅 Vom Vorgesetzten eingeplant</span>
              </div>
              {dayPlanung.map((p, i) => (
                <div key={p.id} style={{ padding:"10px 16px", borderBottom: i < dayPlanung.length-1 ? `1px solid ${C.border}` : "none", background:"#fffbeb" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                      {ICONS[p.typ] || "📅"}
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#92400e" }}>{p.bezeichnung}</span>
                      <p style={{ fontSize:11, color:C.text3, margin:"2px 0 0" }}>{TYP[p.typ]?.label || p.typ}</p>
                    </div>
                    <span style={{ fontSize:14, fontWeight:800, color:C.amber, flexShrink:0 }}>{p.stunden}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Eigene Buchungen */}
          {dayEntries.length > 0 && (
            <div>
              {dayPlanung.length > 0 && (
                <div style={{ padding:"8px 16px 4px" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".06em" }}>✅ Deine Buchungen</span>
                </div>
              )}
              {dayEntries.map((e, i) => {
                const cfg = TYP[e.typ] || {};
                const st  = ST[e.status] || {};
                return (
                  <div key={e.id} style={{ padding:"12px 16px", borderBottom: i < dayEntries.length-1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>{ICONS[e.typ] || "📋"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:13, fontWeight:700, color:cfg.color||C.text }}>{cfg.label||e.typ}</span>
                          <Badge label={st.label} color={st.color} bg={st.bg} />
                        </div>
                        {e.beschreibung && <p style={{ fontSize:12, color:C.text2, margin:"2px 0 0", lineHeight:1.4 }}>{e.beschreibung}</p>}
                      </div>
                      <span style={{ fontSize:14, fontWeight:800, color:C.text, flexShrink:0 }}>{e.stunden}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [u, setU]       = useState("");
  const [p, setP]       = useState("");
  const [load, setLoad] = useState(false);
  const [err, setErr]   = useState("");
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!u.trim() || !p.trim()) return setErr("Bitte alle Felder ausfüllen");
    setLoad(true); setErr("");
    try {
      const logins = await ctrlRead(`handwerker_logins?benutzername=eq.${encodeURIComponent(u.trim())}&aktiv=eq.true&select=id,name,benutzername,passwort,employee_id`);
      if (!logins?.length) return setErr("Benutzername nicht gefunden oder deaktiviert");
      const login = logins[0];
      if (login.passwort !== p) return setErr("Passwort falsch");
      const sess = {
        id:   login.id,
        name: login.name || login.benutzername,
        rolle: "handwerker",
        controlling_employee_id: login.employee_id || null,
      };
      saveSession(sess); onLogin(sess);
    } catch (er) { setErr("Fehler: " + er.message); }
    finally { setLoad(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${C.navy},${C.blue},#1e40af)`, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:FONT, position:"relative", overflow:"hidden" }}>
      <GlobalStyles />
      <div style={{ position:"absolute", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(37,99,235,.15)", filter:"blur(60px)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-80, left:-80, width:300, height:300, borderRadius:"50%", background:"rgba(16,185,129,.1)", filter:"blur(40px)", pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:400, position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:60, height:60, borderRadius:18, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 8px 24px rgba(37,99,235,.4)" }}>
            <span style={{ fontSize:26, fontWeight:800, color:"#fff" }}>W</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-.04em", margin:"0 0 6px" }}>WIDI Zeiterfassung</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.5)", margin:0 }}>Bitte einloggen um fortzufahren</p>
        </div>

        <div className="card fade" style={{ padding:"28px 24px" }}>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>Benutzername</label>
              <input type="text" value={u} onChange={e=>setU(e.target.value)} placeholder="Dein Benutzername" autoCapitalize="off" autoCorrect="off" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text2, textTransform:"uppercase", letterSpacing:".06em", display:"block", marginBottom:6 }}>Passwort</label>
              <div style={{ position:"relative" }}>
                <input type={show?"text":"password"} value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••" style={{ ...inp, paddingRight:44 }} />
                <button type="button" onClick={()=>setShow(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:16, padding:0, lineHeight:1 }}>{show?"🙈":"👁️"}</button>
              </div>
            </div>
            {err && <div style={{ background:"#fef2f2", color:"#991b1b", padding:"10px 14px", borderRadius:10, fontSize:13, border:"1px solid #fecaca", fontWeight:500 }}>{err}</div>}
            <button type="submit" disabled={load} className="btn-p" style={{ padding:13, fontSize:14, marginTop:4 }}>{load ? "Wird geprüft..." : "Einloggen →"}</button>
          </form>
        </div>
        <p style={{ textAlign:"center", marginTop:20, fontSize:12, color:"rgba(255,255,255,.3)" }}>Zugangsdaten werden vom Admin vergeben</p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// NEUER EINTRAG
// ═════════════════════════════════════════════════════════════
function NeuerEintrag({ user, onSuccess, onCancel }) {
  const [baustellen, setBaustellen] = useState([]);
  const [form, setForm] = useState({ datum:new Date().toISOString().split("T")[0], typ:"", baustelle_id:"", beschreibung:"", stunden:"", material:"", material_kosten:"" });
  const [fotos, setFotos]   = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    ctrlRead("baustellen?status=not.eq.abgeschlossen&status=not.eq.abgerechnet&order=name.asc&select=id,name,adresse")
      .then(setBaustellen).catch(() => setBaustellen([]));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async () => {
    if (!form.typ)                                                        return setErr("Bitte Tätigkeitstyp wählen");
    if (!form.stunden || isNaN(form.stunden) || Number(form.stunden) <= 0) return setErr("Bitte gültige Stunden eingeben");
    if (form.typ === "baustelle" && !form.baustelle_id)                  return setErr("Bitte Baustelle wählen");
    setSaving(true); setErr("");
    try {
      // Fotos hochladen
      const uploadedFotos = [];
      for (const f of fotos) {
        if (f.file) {
          const url = await uploadFoto(f.file, user.id);
          uploadedFotos.push({ url, label: f.label });
        } else if (f.url) {
          uploadedFotos.push({ url: f.url, label: f.label });
        }
      }

      await appApi("zeiteintraege", { method:"POST", body:JSON.stringify({
        controlling_employee_id: user.controlling_employee_id,
        mitarbeiter_name: user.name,
        controlling_baustelle_id: form.baustelle_id || null,
        datum: form.datum, typ: form.typ,
        beschreibung: form.beschreibung || null,
        stunden: Number(form.stunden),
        material: form.material || null,
        material_kosten: form.material_kosten ? Number(form.material_kosten) : null,
        fotos: uploadedFotos,
        // Legacy-Felder für Rückwärtskompatibilität
        foto_vorher:  uploadedFotos.find(f => f.label === "Vorher")?.url  || null,
        foto_nachher: uploadedFotos.find(f => f.label === "Nachher")?.url || null,
        status: "offen",
      }) });
      onSuccess();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const uploadingCount = fotos.filter(f => f.file).length;

  return (
    <div style={{ paddingBottom:100, fontFamily:FONT }}>
      <GlobalStyles />
      {/* Sticky header */}
      <div style={{ padding:"16px 20px", background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onCancel} style={{ width:36, height:36, borderRadius:10, background:C.bg, border:`1px solid ${C.border2}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.text2, fontSize:16 }}>←</button>
        <div>
          <h2 style={{ fontSize:16, fontWeight:700, color:C.text, margin:0 }}>Neuer Eintrag</h2>
          <p style={{ fontSize:12, color:C.text3, margin:0 }}>{user.name}</p>
        </div>
      </div>

      <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:20 }}>
        {/* Typ */}
        <Section title="Was hast du gemacht?">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {Object.entries(TYP).map(([k, cfg]) => (
              <button key={k} type="button" onClick={() => set("typ", k)} style={{
                padding:"14px 12px", border:`2px solid ${form.typ===k ? cfg.color : C.border2}`,
                borderRadius:12, background:form.typ===k ? cfg.color+"12" : C.card,
                cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                fontSize:14, fontWeight:form.typ===k ? 700 : 500,
                color:form.typ===k ? cfg.color : C.text2, transition:"all .15s",
              }}>
                <span style={{ fontSize:20, lineHeight:1 }}>{ICONS[k]}</span>
                {cfg.label}
                {form.typ === k && <span style={{ marginLeft:"auto", width:8, height:8, borderRadius:"50%", background:cfg.color, flexShrink:0 }} />}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Datum"><input type="date" value={form.datum} onChange={e=>set("datum",e.target.value)} style={inp}/></Section>

        {form.typ === "baustelle" && (
          <Section title="Baustelle">
            <select value={form.baustelle_id} onChange={e=>set("baustelle_id",e.target.value)} style={inp}>
              <option value="">— Baustelle wählen —</option>
              {baustellen.map(b => <option key={b.id} value={b.id}>{b.name}{b.adresse?` · ${b.adresse}`:""}</option>)}
            </select>
          </Section>
        )}

        <Section title="Stunden"><input type="number" value={form.stunden} onChange={e=>set("stunden",e.target.value)} placeholder="z.B. 3.5" step="0.25" min="0.25" max="24" style={inp}/></Section>
        <Section title="Beschreibung (optional)"><textarea value={form.beschreibung} onChange={e=>set("beschreibung",e.target.value)} placeholder="Was genau wurde gemacht?" rows={3} style={{...inp,resize:"vertical"}}/></Section>
        <Section title="Material (optional)"><input type="text" value={form.material} onChange={e=>set("material",e.target.value)} placeholder="z.B. Kabel 10m..." style={inp}/></Section>
        {form.material && <Section title="Materialkosten (€)"><input type="number" value={form.material_kosten} onChange={e=>set("material_kosten",e.target.value)} placeholder="45.00" step="0.01" style={inp}/></Section>}

        {/* Fotos */}
        <Section title={`Fotos${fotos.length > 0 ? ` (${fotos.length})` : " (optional)"}`}>
          <FotoUploadBlock fotos={fotos} onChange={setFotos} />
        </Section>

        {err && <div style={{ background:"#fef2f2", color:"#991b1b", padding:"12px 16px", borderRadius:10, fontSize:13, border:"1px solid #fecaca", fontWeight:500 }}>⚠️ {err}</div>}

        <button onClick={submit} disabled={saving} className="btn-p" style={{ padding:16, fontSize:15 }}>
          {saving ? `Wird gespeichert${uploadingCount > 0 ? ` (${uploadingCount} Fotos)...` : "..."}` : "Eintrag einreichen →"}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// EINTRAG CARD (Mitarbeiter-Ansicht)
// ═════════════════════════════════════════════════════════════
function EintragCard({ e, onReload }) {
  const cfg = TYP[e.typ] || {}; const st = ST[e.status] || {};

  // Fotos parsen
  let fotosArr = [];
  if (e.fotos && Array.isArray(e.fotos) && e.fotos.length > 0) fotosArr = e.fotos;

  return (
    <div className="card fade" style={{ overflow:"hidden" }}>
      <div style={{ padding:"14px 16px" }}>
        <div className="row" style={{ gap:12, marginBottom:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:cfg.bg||C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{ICONS[e.typ]}</div>
          <div style={{ flex:1 }}>
            <div className="row" style={{ gap:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:cfg.color||C.text }}>{cfg.label||e.typ}</span>
              <Badge label={st.label} color={st.color} bg={st.bg} />
            </div>
            <p style={{ fontSize:12, color:C.text3, margin:"2px 0 0" }}>
              {new Date(e.datum).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}
              {" · "}<strong style={{ color:C.text2 }}>{e.stunden}h</strong>
            </p>
          </div>
        </div>
        {e.beschreibung && <p style={{ fontSize:13, color:C.text2, margin:"0 0 8px", lineHeight:1.5 }}>{e.beschreibung}</p>}
        {e.material && <p style={{ fontSize:12, color:C.text3, margin:"0 0 8px" }}>📦 {e.material}{e.material_kosten?` — ${e.material_kosten}€`:""}</p>}

        <FotoAnzeige fotos={fotosArr} fotoVorher={e.foto_vorher} fotoNachher={e.foto_nachher} compact />

        {e.admin_kommentar && <div style={{ marginTop:8, padding:"8px 12px", background:C.bg, borderRadius:8, fontSize:12, color:C.text2, borderLeft:`3px solid ${C.border2}` }}>💬 {e.admin_kommentar}</div>}
      </div>
    </div>
  );
}

// ── NRW Feiertage (Gauß-Algorithmus, kein API-Call) ───────────
function getNRWFeiertage(year) {
  const k  = Math.floor(year / 100);
  const m  = 15 + Math.floor((3*k+3)/4) - Math.floor((8*k+13)/25);
  const s  = 2 - Math.floor((3*k+3)/4);
  const a  = year % 19;
  const d  = (19*a+m) % 30;
  const r  = Math.floor(d/29) + (Math.floor(d/28)-Math.floor(d/29)) * Math.floor(a/11);
  const og = 21+d-r;
  const sz = 7-(year+Math.floor(year/4)+s)%7;
  const oe = 7-(og-sz)%7;
  const os = og+oe;
  const ostern = os<=31 ? new Date(year,2,os) : new Date(year,3,os-31);
  const add = (dt,days) => { const x=new Date(dt); x.setDate(x.getDate()+days); return x; };
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return {
    [`${year}-01-01`]:"Neujahr",
    [`${year}-01-06`]:"Heilige Drei Könige",
    [`${year}-05-01`]:"Tag der Arbeit",
    [`${year}-10-03`]:"Tag der Deutschen Einheit",
    [`${year}-11-01`]:"Allerheiligen",
    [`${year}-12-25`]:"1. Weihnachtstag",
    [`${year}-12-26`]:"2. Weihnachtstag",
    [fmt(add(ostern,-2))]:"Karfreitag",
    [fmt(add(ostern, 1))]:"Ostermontag",
    [fmt(add(ostern,39))]:"Christi Himmelfahrt",
    [fmt(add(ostern,50))]:"Pfingstmontag",
    [fmt(add(ostern,60))]:"Fronleichnam",
  };
}

// ═════════════════════════════════════════════════════════════
// MITARBEITER DASHBOARD
// ═════════════════════════════════════════════════════════════
function MitarbeiterDashboard({ user, onLogout }) {
  const [mainView, setMainView]   = useState("list");
  const [eintraege, setEintraege] = useState([]);
  const [planung, setPlanung]     = useState([]);
  const [abwesenheit, setAbwesenheit] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const vonDatum = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
    })();
    Promise.all([
      appApi(`zeiteintraege?controlling_employee_id=eq.${user.controlling_employee_id}&order=datum.desc&limit=500`),
      user.controlling_employee_id
        ? ctrlRead(`wochenplanung?mitarbeiter_id=eq.${user.controlling_employee_id}&datum=gte.${vonDatum}&select=id,datum,typ,bezeichnung,stunden&order=datum.asc`)
        : Promise.resolve([]),
      user.controlling_employee_id
        ? ctrlRead(`mitarbeiter_abwesenheiten?employee_id=eq.${user.controlling_employee_id}&datum=gte.${vonDatum}&select=id,datum,typ,bemerkung&order=datum.asc`)
        : Promise.resolve([]),
    ]).then(([eintr, plan, abw]) => {
      setEintraege(eintr || []);
      setPlanung(plan || []);
      setAbwesenheit(abw || []);
    }).finally(() => setLoading(false));
  }, [user.controlling_employee_id]);

  useEffect(() => { load(); }, [load]);

  if (mainView === "neu") return <NeuerEintrag user={user} onSuccess={() => { load(); setMainView("list"); }} onCancel={() => setMainView("list")} />;

  const offene     = eintraege.filter(e => e.status === "offen").length;
  const gesamtH    = eintraege.reduce((s,e) => s+Number(e.stunden||0), 0);
  const dieseWoche = (() => {
    const now = new Date(); const day = now.getDay() || 7;
    const mon = new Date(now); mon.setDate(now.getDate()-day+1); mon.setHours(0,0,0,0);
    return eintraege.filter(e => new Date(e.datum) >= mon).reduce((s,e) => s+Number(e.stunden||0), 0);
  })();

  return (
    <div style={{ paddingBottom:80, fontFamily:FONT }}>
      <GlobalStyles />

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, padding:"20px 20px 24px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(37,99,235,.2)", pointerEvents:"none" }} />
        <div className="row" style={{ gap:12, marginBottom:16, position:"relative" }}>
          <Avatar name={user.name} size={44} />
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:"rgba(255,255,255,.5)", margin:"0 0 2px", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Eingeloggt als</p>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#fff", margin:0, letterSpacing:"-.03em" }}>{user.name}</h2>
          </div>
          <button onClick={onLogout} style={{ padding:"7px 14px", borderRadius:8, background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", color:"rgba(255,255,255,.7)", fontSize:12, fontWeight:600, cursor:"pointer" }}>Abmelden</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, position:"relative" }}>
          {[{label:"Diese Woche",value:`${dieseWoche}h`},{label:"Gesamt",value:`${gesamtH}h`},{label:"Ausstehend",value:offene}].map(k => (
            <div key={k.label} style={{ background:"rgba(255,255,255,.1)", borderRadius:12, padding:"10px 12px", border:"1px solid rgba(255,255,255,.1)" }}>
              <p style={{ fontSize:18, fontWeight:800, color:"#fff", margin:"0 0 2px", letterSpacing:"-.03em" }}>{k.value}</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.5)", margin:0, fontWeight:600 }}>{k.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Neuer Eintrag Button */}
      <div style={{ padding:"16px 20px 0" }}>
        <button onClick={() => setMainView("neu")} className="btn-p" style={{ width:"100%", padding:15, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:20, lineHeight:1 }}>+</span> Neuen Eintrag erstellen
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display:"flex", background:C.card, borderBottom:`1px solid ${C.border}`, margin:"16px 0 0" }}>
        {[
          { key:"list",      label:"📋 Meine Einträge", count: eintraege.length },
          { key:"kalender",  label:"📅 Mein Kalender",  count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainView(tab.key)}
            style={{ flex:1, padding:"12px 8px", border:"none", background:"none", cursor:"pointer", fontSize:13, fontWeight:mainView===tab.key ? 700 : 500, color:mainView===tab.key ? C.accent : C.text3, borderBottom:mainView===tab.key ? `2px solid ${C.accent}` : "2px solid transparent", transition:"all .15s" }}>
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span style={{ marginLeft:6, minWidth:18, height:18, background:C.border2, color:C.text2, borderRadius:99, fontSize:10, fontWeight:800, display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"0 5px" }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {mainView === "kalender" ? (
        loading ? <Spinner /> : <KalenderView eintraege={eintraege} planung={planung} abwesenheit={abwesenheit} />
      ) : (
        <div style={{ padding:"16px 20px" }}>
          {loading ? <Spinner /> : eintraege.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <p style={{ fontSize:40, marginBottom:12 }}>📋</p>
              <p style={{ fontSize:15, fontWeight:600, color:C.text2, margin:"0 0 4px" }}>Noch keine Einträge</p>
              <p style={{ fontSize:13, color:C.text3 }}>Erstelle deinen ersten Eintrag oben</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {eintraege.map(e => <EintragCard key={e.id} e={e} onReload={load} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═════════════════════════════════════════════════════════════
function AdminDashboard({ onLogout }) {
  const [eintraege, setEintraege]               = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [filter, setFilter]                     = useState("offen");
  const [kommentar, setKommentar]               = useState({});
  const [verbId, setVerbId]                     = useState(null);
  const [verbLoad, setVerbLoad]                 = useState(false);
  const [verbErr, setVerbErr]                   = useState("");
  const [bMap, setBMap]                         = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setEintraege(await appApi("zeiteintraege?order=erstellt_am.desc&limit=300")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    ctrlRead("baustellen?select=id,name").then(d => { if(d) setBMap(Object.fromEntries(d.map(b=>[b.id,b.name]))); });
  }, []);

  const action = async (id, status) => {
    await appApi(`zeiteintraege?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ status, admin_kommentar:kommentar[id]||null, bearbeitet_am:new Date().toISOString() }) });
    setKommentar(k => { const n={...k}; delete n[id]; return n; });
    load();
  };

  const verbuchen = async () => {
    const e = eintraege.find(x => x.id === verbId); if(!e) return;
    setVerbLoad(true); setVerbErr("");
    try {
      if (e.typ === "baustelle" && e.controlling_baustelle_id) {
        const r = await fetch(`${CTRL_URL}/rest/v1/bs_stundeneintraege`, { method:"POST", headers:{apikey:CTRL_KEY,Authorization:`Bearer ${CTRL_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify({baustelle_id:e.controlling_baustelle_id,mitarbeiter_id:e.controlling_employee_id,datum:e.datum,stunden:e.stunden,beschreibung:e.beschreibung||`App: ${e.mitarbeiter_name}`}) });
        if (!r.ok) throw new Error("Fehler beim Schreiben");

        // Fotos verbuchen (neues Format + Legacy-Kompatibilität)
        const fotosArr = (e.fotos && Array.isArray(e.fotos) && e.fotos.length > 0)
          ? e.fotos
          : [
              ...(e.foto_vorher  ? [{ url: e.foto_vorher,  label: "Vorher"  }] : []),
              ...(e.foto_nachher ? [{ url: e.foto_nachher, label: "Nachher" }] : []),
            ];

        for (const f of fotosArr) {
          await ctrlWrite("bs_fotos", { baustelle_id:e.controlling_baustelle_id, url:f.url, kategorie:f.label.toLowerCase(), datum:e.datum, hochgeladen_von:e.controlling_employee_id, beschreibung:`${f.label} – ${e.mitarbeiter_name}` });
        }
      } else {
        const pre = e.typ==="ticket"?"Ticket":e.typ==="dguv"?"DGUV":"Sonstiges";
        await ctrlWrite("interne_stunden",{employee_id:e.controlling_employee_id,datum:e.datum,stunden:e.stunden,beschreibung:`${pre} – ${e.beschreibung||e.mitarbeiter_name}`});
      }
      await appApi(`zeiteintraege?id=eq.${e.id}`,{method:"PATCH",body:JSON.stringify({status:"verbucht",bearbeitet_am:new Date().toISOString()})});
      setVerbId(null); load();
    } catch(er) { setVerbErr(er.message); }
    finally { setVerbLoad(false); }
  };

  const gefiltert = eintraege.filter(e => e.status === filter);
  const counts    = {
    offen:     eintraege.filter(e=>e.status==="offen").length,
    genehmigt: eintraege.filter(e=>e.status==="genehmigt").length,
    verbucht:  eintraege.filter(e=>e.status==="verbucht").length,
    abgelehnt: eintraege.filter(e=>e.status==="abgelehnt").length,
  };

  return (
    <div style={{ paddingBottom:80, fontFamily:FONT }}>
      <GlobalStyles />

      {/* Verbuchen Modal */}
      {verbId && (() => {
        const e = eintraege.find(x => x.id === verbId); if(!e) return null;
        return (
          <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
            <div style={{ background:C.card,borderRadius:"20px 20px 0 0",padding:"28px 24px 40px",width:"100%",maxWidth:480 }}>
              <div className="row" style={{ gap:12, marginBottom:16 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>⚠️</div>
                <div>
                  <h3 style={{ fontSize:16,fontWeight:800,color:C.text,margin:0 }}>Ins Controlling verbuchen?</h3>
                  <p style={{ fontSize:12,color:C.text3,margin:0 }}>Nicht rückgängig machbar</p>
                </div>
              </div>
              <div style={{ background:C.bg,borderRadius:12,padding:"14px 16px",marginBottom:20,border:`1px solid ${C.border}` }}>
                <p style={{ fontSize:14,fontWeight:700,color:C.text,margin:"0 0 4px" }}>{e.mitarbeiter_name} · {e.datum}</p>
                <p style={{ fontSize:13,color:C.text2,margin:0 }}>{TYP[e.typ]?.label} · {e.stunden}h</p>
                {e.controlling_baustelle_id && <p style={{ fontSize:12,color:C.text3,margin:"4px 0 0" }}>📍 {bMap[e.controlling_baustelle_id]||"Baustelle"}</p>}
                {e.beschreibung && <p style={{ fontSize:12,color:C.text3,margin:"4px 0 0" }}>{e.beschreibung}</p>}
              </div>
              {verbErr && <div style={{ background:"#fef2f2",color:"#991b1b",padding:"10px 14px",borderRadius:10,marginBottom:14,fontSize:13,border:"1px solid #fecaca" }}>❌ {verbErr}</div>}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>{setVerbId(null);setVerbErr("");}} className="btn-g" style={{ flex:1,padding:14,fontSize:14 }}>Abbrechen</button>
                <button onClick={verbuchen} disabled={verbLoad} className="btn-p" style={{ flex:1,padding:14,fontSize:14 }}>{verbLoad?"Wird verbucht...":"Jetzt verbuchen →"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`,padding:"20px 20px 24px",position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"rgba(37,99,235,.2)",pointerEvents:"none" }} />
        <div className="row" style={{ gap:12,marginBottom:16,position:"relative" }}>
          <div style={{ width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🛡️</div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",margin:"0 0 2px",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em" }}>Administrator</p>
            <h2 style={{ fontSize:18,fontWeight:800,color:"#fff",margin:0,letterSpacing:"-.03em" }}>Genehmigungen</h2>
          </div>
          <button onClick={onLogout} style={{ padding:"7px 14px",borderRadius:8,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",color:"rgba(255,255,255,.7)",fontSize:12,fontWeight:600,cursor:"pointer" }}>Abmelden</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"relative" }}>
          <div style={{ background:counts.offen>0?"rgba(245,158,11,.2)":"rgba(255,255,255,.08)",borderRadius:12,padding:"10px 12px",border:`1px solid ${counts.offen>0?"rgba(245,158,11,.3)":"rgba(255,255,255,.1)"}` }}>
            <p style={{ fontSize:22,fontWeight:800,color:counts.offen>0?C.amber:"#fff",margin:"0 0 2px",letterSpacing:"-.03em" }}>{counts.offen}</p>
            <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",margin:0,fontWeight:600 }}>Offen</p>
          </div>
          <div style={{ background:counts.genehmigt>0?"rgba(16,185,129,.2)":"rgba(255,255,255,.08)",borderRadius:12,padding:"10px 12px",border:`1px solid ${counts.genehmigt>0?"rgba(16,185,129,.3)":"rgba(255,255,255,.1)"}` }}>
            <p style={{ fontSize:22,fontWeight:800,color:counts.genehmigt>0?C.green:"#fff",margin:"0 0 2px",letterSpacing:"-.03em" }}>{counts.genehmigt}</p>
            <p style={{ fontSize:11,color:"rgba(255,255,255,.5)",margin:0,fontWeight:600 }}>Zu verbuchen</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display:"flex",background:C.card,borderBottom:`1px solid ${C.border}`,overflowX:"auto" }}>
        {["offen","genehmigt","verbucht","abgelehnt"].map(s => (
          <button key={s} onClick={()=>setFilter(s)} style={{ padding:"12px 16px",border:"none",background:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:13,fontWeight:filter===s?700:500,color:filter===s?C.accent:C.text3,borderBottom:filter===s?`2px solid ${C.accent}`:"2px solid transparent",transition:"all .15s" }}>
            {ST[s]?.label}
            {counts[s]>0 && <span style={{ marginLeft:6,minWidth:18,height:18,background:s==="offen"?C.amber:s==="genehmigt"?C.green:C.accent,color:"#fff",borderRadius:99,fontSize:10,fontWeight:800,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px" }}>{counts[s]}</span>}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div style={{ padding:"16px 20px",display:"flex",flexDirection:"column",gap:12 }}>
        {loading ? <Spinner /> : gefiltert.length === 0 ? (
          <div style={{ textAlign:"center",padding:"48px 0" }}>
            <p style={{ fontSize:36,marginBottom:10 }}>✅</p>
            <p style={{ fontSize:15,fontWeight:600,color:C.text2 }}>Keine Einträge</p>
          </div>
        ) : gefiltert.map(e => {
          const cfg = TYP[e.typ]||{}; const st = ST[e.status]||{};
          let fotosArr = [];
          if (e.fotos && Array.isArray(e.fotos) && e.fotos.length > 0) fotosArr = e.fotos;

          return (
            <div key={e.id} className="card fade" style={{ overflow:"hidden" }}>
              <div style={{ padding:"14px 16px" }}>
                <div className="row" style={{ gap:12,marginBottom:10 }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:cfg.bg||C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{ICONS[e.typ]}</div>
                  <div style={{ flex:1 }}>
                    <div className="row" style={{ gap:8,flexWrap:"wrap" }}>
                      <span style={{ fontSize:14,fontWeight:700,color:C.text }}>{e.mitarbeiter_name}</span>
                      <Badge label={cfg.label||e.typ} color={cfg.color||C.text2} bg={cfg.bg} />
                    </div>
                    <p style={{ fontSize:12,color:C.text3,margin:"2px 0 0" }}>
                      {new Date(e.datum).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"})}
                      {" · "}<strong style={{ color:C.text2 }}>{e.stunden}h</strong>
                    </p>
                  </div>
                  <Badge label={st.label} color={st.color} bg={st.bg} />
                </div>
                {e.controlling_baustelle_id && bMap[e.controlling_baustelle_id] && (
                  <div className="row" style={{ gap:6,marginBottom:6 }}>
                    <span style={{ fontSize:12,color:C.text3 }}>📍</span>
                    <span style={{ fontSize:12,color:C.text2,fontWeight:500 }}>{bMap[e.controlling_baustelle_id]}</span>
                  </div>
                )}
                {e.beschreibung && <p style={{ fontSize:13,color:C.text2,margin:"0 0 6px",lineHeight:1.5 }}>{e.beschreibung}</p>}
                {e.material && <p style={{ fontSize:12,color:C.text3,margin:"0 0 6px" }}>📦 {e.material}{e.material_kosten?` — ${e.material_kosten}€`:""}</p>}

                <FotoAnzeige fotos={fotosArr} fotoVorher={e.foto_vorher} fotoNachher={e.foto_nachher} />

                {e.admin_kommentar && <div style={{ marginTop:8,padding:"8px 12px",background:C.bg,borderRadius:8,fontSize:12,color:C.text2,borderLeft:`3px solid ${C.border2}` }}>💬 {e.admin_kommentar}</div>}
              </div>

              {e.status === "offen" && (
                <div style={{ padding:"12px 16px",background:C.bg,borderTop:`1px solid ${C.border}` }}>
                  <input placeholder="Kommentar für den Mitarbeiter (optional)..." value={kommentar[e.id]||""} onChange={ev=>setKommentar(k=>({...k,[e.id]:ev.target.value}))} style={{...inp,marginBottom:10,fontSize:13}}/>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={()=>action(e.id,"genehmigt")} style={{ flex:1,padding:11,background:C.green,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer" }}>✓ Genehmigen</button>
                    <button onClick={()=>action(e.id,"abgelehnt")} style={{ flex:1,padding:11,background:C.red,  color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer" }}>✗ Ablehnen</button>
                  </div>
                </div>
              )}
              {e.status === "genehmigt" && (
                <div style={{ padding:"12px 16px",background:"#f0fdf4",borderTop:"1px solid #d1fae5" }}>
                  <button onClick={()=>setVerbId(e.id)} className="btn-p" style={{ width:"100%",padding:12,fontSize:13 }}>📤 Ins Controlling verbuchen</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// APP ROOT
// ═════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => loadSession());
  const [view, setView] = useState(() => {
    const s = loadSession();
    if (!s) return null;
    return s.rolle === "admin" ? "admin" : "dashboard";
  });

  const login  = (u) => { setUser(u); setView(u.rolle==="admin"?"admin":"dashboard"); };
  const logout = ()  => { clearSession(); setUser(null); setView(null); };

  if (!user) return <LoginScreen onLogin={login} />;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT, maxWidth:480, margin:"0 auto", position:"relative" }}>
      <GlobalStyles />
      {view === "dashboard" && <MitarbeiterDashboard user={user} onLogout={logout} />}
      {view === "admin"     && <AdminDashboard onLogout={logout} />}
    </div>
  );
}
