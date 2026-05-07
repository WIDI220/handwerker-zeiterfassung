// ============================================================
// HANDWERKER ZEITERFASSUNG v4 – WIDI Design System
// ============================================================

import { useState, useEffect, useCallback } from "react";

const APP_URL  = "https://syhjjuewkjjihxwiexmz.supabase.co";
const APP_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aGpqdWV3a2pqaWh4d2lleG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTk2NDYsImV4cCI6MjA5MzA5NTY0Nn0.9A-GrkU72IZ3uxkypX5GttN4EXNv46aX4uOY4wUmfaE";
const CTRL_URL = "https://uclsqnpqvphdbeutzzuu.supabase.co";
const CTRL_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbHNxbnBxdnBoZGJldXR6enV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODUzNjQsImV4cCI6MjA4Nzc2MTM2NH0.qpWW_Bx4Lddkf3YEPeVwv0yRU_leRwakojcdfGBELs4";

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
  const path = `${userId}/${Date.now()}.${ext}`;
  const res = await fetch(`${APP_URL}/storage/v1/object/fotos/${path}`, { method: "POST", headers: { apikey: APP_KEY, Authorization: `Bearer ${APP_KEY}`, "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error("Foto Upload fehlgeschlagen");
  return `${APP_URL}/storage/v1/object/public/fotos/${path}`;
};

// ── Session ───────────────────────────────────────────────────
const SESSION_KEY = "handwerker_v4_session";
const saveSession = (u) => localStorage.setItem(SESSION_KEY, JSON.stringify(u));
const loadSession = () => { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const clearSession = () => localStorage.removeItem(SESSION_KEY);

// ── Design tokens – identisch zum WIDI Controlling ────────────
const C = {
  navy:"#0f1f3d", blue:"#1e3a5f", accent:"#2563eb", green:"#10b981",
  amber:"#f59e0b", red:"#ef4444", cyan:"#0891b2", purple:"#8b5cf6",
  bg:"#f8fafc", card:"#ffffff", border:"#f1f5f9", border2:"#e2e8f0",
  text:"#0f172a", text2:"#64748b", text3:"#94a3b8",
};
const TYP = {
  baustelle: { label:"Baustelle", color:C.accent,  bg:"#eff6ff" },
  ticket:    { label:"Ticket",    color:C.cyan,    bg:"#ecfeff" },
  dguv:      { label:"DGUV",      color:C.green,   bg:"#f0fdf4" },
  sonstiges: { label:"Sonstiges", color:C.purple,  bg:"#f5f3ff" },
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
      // Login läuft ausschließlich über handwerker_logins
      // Dort steht Benutzername, Passwort UND direkt die employee_id – kein Matching nötig
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
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ width:60, height:60, borderRadius:18, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 8px 24px rgba(37,99,235,.4)" }}>
            <span style={{ fontSize:26, fontWeight:800, color:"#fff" }}>W</span>
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, color:"#fff", letterSpacing:"-.04em", margin:"0 0 6px" }}>WIDI Zeiterfassung</h1>
          <p style={{ fontSize:13, color:"rgba(255,255,255,.5)", margin:0 }}>Bitte einloggen um fortzufahren</p>
        </div>

        {/* Form card */}
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
  const [fotos, setFotos]   = useState({ vorher:null, nachher:null });
  const [prev, setPrev]     = useState({ vorher:null, nachher:null });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    ctrlRead("baustellen?status=not.eq.abgeschlossen&status=not.eq.abgerechnet&order=name.asc&select=id,name,adresse")
      .then(setBaustellen).catch(() => setBaustellen([]));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const handleFoto = (typ, file) => {
    if (!file) return;
    setFotos(f => ({ ...f, [typ]:file }));
    setPrev(p => ({ ...p, [typ]:URL.createObjectURL(file) }));
  };

  const submit = async () => {
    if (!form.typ)                                                        return setErr("Bitte Tätigkeitstyp wählen");
    if (!form.stunden || isNaN(form.stunden) || Number(form.stunden) <= 0) return setErr("Bitte gültige Stunden eingeben");
    if (form.typ === "baustelle" && !form.baustelle_id)                  return setErr("Bitte Baustelle wählen");
    setSaving(true); setErr("");
    try {
      let fv = null, fn = null;
      if (fotos.vorher)  fv = await uploadFoto(fotos.vorher,  user.id);
      if (fotos.nachher) fn = await uploadFoto(fotos.nachher, user.id);
      await appApi("zeiteintraege", { method:"POST", body:JSON.stringify({
        controlling_employee_id: user.controlling_employee_id,
        mitarbeiter_name: user.name,
        controlling_baustelle_id: form.baustelle_id || null,
        datum: form.datum, typ: form.typ,
        beschreibung: form.beschreibung || null,
        stunden: Number(form.stunden),
        material: form.material || null,
        material_kosten: form.material_kosten ? Number(form.material_kosten) : null,
        foto_vorher: fv, foto_nachher: fn,
        status: "offen",
      }) });
      onSuccess();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

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
        {form.typ === "baustelle" ? (
          <Section title="Dokumentationsfotos">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {["vorher","nachher"].map(typ => (
                <div key={typ}>
                  <label style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"16px 10px", border:`2px dashed ${prev[typ]?C.green:C.border2}`, borderRadius:12, cursor:"pointer", background:prev[typ]?"#f0fdf4":C.bg, textAlign:"center", transition:"all .15s" }}>
                    <span style={{ fontSize:24 }}>{typ==="vorher"?"📷":"✅"}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:prev[typ]?C.green:C.text2, textTransform:"uppercase", letterSpacing:".04em" }}>{typ==="vorher"?"Vorher":"Nachher"}</span>
                    <span style={{ fontSize:11, color:prev[typ]?C.green:C.text3 }}>{prev[typ]?"✓ Ausgewählt":"Foto aufnehmen"}</span>
                    <input type="file" accept="image/*" capture="environment" onChange={e=>handleFoto(typ,e.target.files[0])} style={{ display:"none" }} />
                  </label>
                  {prev[typ] && <img src={prev[typ]} alt={typ} style={{ width:"100%", borderRadius:8, marginTop:8, height:100, objectFit:"cover" }} />}
                </div>
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Foto / Beleg (optional)">
            <label style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", border:`2px dashed ${C.border2}`, borderRadius:12, cursor:"pointer", background:C.bg }}>
              <span style={{ fontSize:22 }}>📷</span>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:C.text2, margin:0 }}>{prev.vorher?"Foto ausgewählt ✓":"Foto hochladen"}</p>
                <p style={{ fontSize:11, color:C.text3, margin:0 }}>Optional als Beleg</p>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={e=>handleFoto("vorher",e.target.files[0])} style={{ display:"none" }} />
            </label>
            {prev.vorher && <img src={prev.vorher} alt="Beleg" style={{ width:"100%", borderRadius:8, marginTop:8, maxHeight:180, objectFit:"cover" }} />}
          </Section>
        )}

        {err && <div style={{ background:"#fef2f2", color:"#991b1b", padding:"12px 16px", borderRadius:10, fontSize:13, border:"1px solid #fecaca", fontWeight:500 }}>⚠️ {err}</div>}

        <button onClick={submit} disabled={saving} className="btn-p" style={{ padding:16, fontSize:15 }}>
          {saving ? "Wird gespeichert..." : "Eintrag einreichen →"}
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
  const [up, setUp]     = useState(false);
  const [prev, setPrev] = useState(null);
  const [done, setDone] = useState(false);
  const kann = e.typ === "baustelle" && !e.foto_nachher && e.status !== "verbucht";

  const nachher = async (file) => {
    if (!file) return;
    setPrev(URL.createObjectURL(file)); setUp(true);
    try {
      const url = await uploadFoto(file, e.controlling_employee_id || "x");
      await appApi(`zeiteintraege?id=eq.${e.id}`, { method:"PATCH", body:JSON.stringify({ foto_nachher:url }) });
      setDone(true); if (onReload) onReload();
    } catch(er) { alert("Fehler: "+er.message); setPrev(null); }
    finally { setUp(false); }
  };

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
        {(e.foto_vorher||e.foto_nachher) && (
          <div style={{ display:"grid", gridTemplateColumns:e.foto_vorher&&e.foto_nachher?"1fr 1fr":"1fr", gap:8, marginTop:8 }}>
            {e.foto_vorher  && <div><p style={{ fontSize:10,fontWeight:700,color:C.text3,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em" }}>Vorher</p>  <img src={e.foto_vorher}  alt="V" style={{ width:"100%",borderRadius:8,height:80,objectFit:"cover" }}/></div>}
            {e.foto_nachher && <div><p style={{ fontSize:10,fontWeight:700,color:C.green,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em" }}>Nachher</p> <img src={e.foto_nachher} alt="N" style={{ width:"100%",borderRadius:8,height:80,objectFit:"cover" }}/></div>}
          </div>
        )}
        {e.admin_kommentar && <div style={{ marginTop:8, padding:"8px 12px", background:C.bg, borderRadius:8, fontSize:12, color:C.text2, borderLeft:`3px solid ${C.border2}` }}>💬 {e.admin_kommentar}</div>}
      </div>
      {kann && !done && (
        <div style={{ padding:"10px 16px 14px", borderTop:`1px solid ${C.border}`, background:C.bg }}>
          {prev ? (
            <div>
              <p style={{ fontSize:11,fontWeight:700,color:C.green,marginBottom:6,textTransform:"uppercase",letterSpacing:".04em" }}>Nachher-Vorschau</p>
              <img src={prev} alt="Vorschau" style={{ width:"100%",borderRadius:8,maxHeight:140,objectFit:"cover" }} />
              {up && <p style={{ margin:"6px 0 0",fontSize:12,color:C.text3,textAlign:"center" }}>Wird hochgeladen...</p>}
            </div>
          ) : (
            <label style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",border:`2px dashed ${C.border2}`,borderRadius:10,cursor:"pointer",background:C.card }}>
              <span style={{ fontSize:20 }}>✅</span>
              <div>
                <p style={{ fontSize:13,fontWeight:600,color:C.text2,margin:0 }}>Nachher-Foto hinzufügen</p>
                <p style={{ fontSize:11,color:C.text3,margin:0 }}>Arbeit fertig?</p>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={ev=>nachher(ev.target.files[0])} style={{ display:"none" }} />
            </label>
          )}
        </div>
      )}
      {done && <div style={{ padding:"10px 16px",background:"#f0fdf4",borderTop:"1px solid #d1fae5",fontSize:13,color:"#065f46",fontWeight:600 }}>✓ Nachher-Foto hinzugefügt</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MITARBEITER DASHBOARD
// ═════════════════════════════════════════════════════════════
function MitarbeiterDashboard({ user, onLogout }) {
  const [view, setView]           = useState("list");
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    appApi(`zeiteintraege?controlling_employee_id=eq.${user.controlling_employee_id}&order=erstellt_am.desc&limit=60`)
      .then(setEintraege).finally(() => setLoading(false));
  }, [user.controlling_employee_id]);

  useEffect(() => { load(); }, [load]);

  if (view === "neu") return <NeuerEintrag user={user} onSuccess={() => { load(); setView("list"); }} onCancel={() => setView("list")} />;

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

      <div style={{ padding:"16px 20px" }}>
        <button onClick={() => setView("neu")} className="btn-p" style={{ width:"100%", padding:15, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:20, lineHeight:1 }}>+</span> Neuen Eintrag erstellen
        </button>
      </div>

      <div style={{ padding:"0 20px" }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 12px" }}>
          Meine Einträge ({eintraege.length})
        </p>
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
        if (e.foto_vorher)  await ctrlWrite("bs_fotos",{baustelle_id:e.controlling_baustelle_id,url:e.foto_vorher, kategorie:"vorher", datum:e.datum,hochgeladen_von:e.controlling_employee_id,beschreibung:`Vorher – ${e.mitarbeiter_name}`});
        if (e.foto_nachher) await ctrlWrite("bs_fotos",{baustelle_id:e.controlling_baustelle_id,url:e.foto_nachher,kategorie:"nachher",datum:e.datum,hochgeladen_von:e.controlling_employee_id,beschreibung:`Nachher – ${e.mitarbeiter_name}`});
        // Wochenplanung-Eintrag als App-Herkunft kennzeichnen
        await ctrlWrite("wochenplanung", {
          mitarbeiter_id: e.controlling_employee_id,
          datum: e.datum,
          typ: "baustelle",
          baustelle_id: e.controlling_baustelle_id,
          bezeichnung: e.beschreibung || e.mitarbeiter_name,
          stunden: e.stunden,
          quelle: "app",
        });
      } else {
        const pre = e.typ==="ticket"?"Ticket":e.typ==="dguv"?"DGUV":"Sonstiges";
        await ctrlWrite("interne_stunden",{employee_id:e.controlling_employee_id,datum:e.datum,stunden:e.stunden,beschreibung:`${pre} – ${e.beschreibung||e.mitarbeiter_name}`});
        // Wochenplanung-Eintrag für Ticket/DGUV/Sonstiges
        const wpTyp = e.typ==="ticket" ? "tickets" : e.typ==="dguv" ? "dguv" : "intern";
        const wpLabel = e.typ==="ticket" ? "Tickets" : e.typ==="dguv" ? "DGUV-Messungen" : "Interne Stunden";
        await ctrlWrite("wochenplanung", {
          mitarbeiter_id: e.controlling_employee_id,
          datum: e.datum,
          typ: wpTyp,
          bezeichnung: e.beschreibung || wpLabel,
          stunden: e.stunden,
          quelle: "app",
        });
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
                {(e.foto_vorher||e.foto_nachher) && (
                  <div style={{ display:"grid",gridTemplateColumns:e.foto_vorher&&e.foto_nachher?"1fr 1fr":"1fr",gap:8,marginTop:10 }}>
                    {e.foto_vorher  && <div><p style={{ fontSize:10,fontWeight:700,color:C.text3,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em" }}>Vorher</p>  <img src={e.foto_vorher}  alt="V" style={{ width:"100%",borderRadius:8,height:120,objectFit:"cover" }}/></div>}
                    {e.foto_nachher && <div><p style={{ fontSize:10,fontWeight:700,color:C.green,marginBottom:4,textTransform:"uppercase",letterSpacing:".06em" }}>Nachher</p> <img src={e.foto_nachher} alt="N" style={{ width:"100%",borderRadius:8,height:120,objectFit:"cover" }}/></div>}
                  </div>
                )}
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
