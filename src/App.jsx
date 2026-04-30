import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://syhjjuewkjjihxwiexmz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5aGpqdWV3a2pqaWh4d2lleG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTk2NDYsImV4cCI6MjA5MzA5NTY0Nn0.9A-GrkU72IZ3uxkypX5GttN4EXNv46aX4uOY4wUmfaE";

const api = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Fehler beim Laden");
  }
  if (res.status === 204) return null;
  return res.json();
};

const uploadFoto = async (file, mitarbeiterId) => {
  const ext = file.name.split(".").pop();
  const path = `${mitarbeiterId}/${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error("Foto Upload fehlgeschlagen");
  return `${SUPABASE_URL}/storage/v1/object/public/fotos/${path}`;
};

const TYP_CONFIG = {
  baustelle: { label: "Baustelle", icon: "🏗️", color: "#e67e22" },
  ticket: { label: "Ticket", icon: "🎫", color: "#3498db" },
  dguv: { label: "DGUV", icon: "🦺", color: "#27ae60" },
  sonstiges: { label: "Sonstiges", icon: "📋", color: "#8e44ad" },
};

const STATUS_CONFIG = {
  offen: { label: "Offen", bg: "#fff3cd", color: "#856404" },
  genehmigt: { label: "Genehmigt", bg: "#d1eddb", color: "#0f5132" },
  abgelehnt: { label: "Abgelehnt", bg: "#f8d7da", color: "#842029" },
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("mitarbeiter?aktiv=eq.true&order=rolle.asc,name.asc")
      .then(setMitarbeiter)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚒️</div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "#1a1a1a", letterSpacing: "-0.5px" }}>Zeiterfassung</h1>
          <p style={{ margin: "8px 0 0", color: "#666", fontSize: "15px" }}>Wähle deinen Namen aus</p>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "#999" }}>Laden...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {mitarbeiter.map((m) => (
              <button
                key={m.id}
                onClick={() => onLogin(m)}
                style={{
                  padding: "16px 20px",
                  background: "#fff",
                  border: "2px solid #e8e6e0",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  fontSize: "16px",
                  fontWeight: "500",
                  color: "#1a1a1a",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#d4612a"; e.currentTarget.style.background = "#fdf6f1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e8e6e0"; e.currentTarget.style.background = "#fff"; }}
              >
                <span style={{ width: "38px", height: "38px", borderRadius: "50%", background: m.rolle === "admin" ? "#1a1a1a" : "#d4612a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", flexShrink: 0 }}>
                  {m.name.charAt(0)}
                </span>
                <span style={{ flex: 1, textAlign: "left" }}>{m.name}</span>
                {m.rolle === "admin" && (
                  <span style={{ fontSize: "11px", background: "#1a1a1a", color: "#fff", padding: "3px 8px", borderRadius: "20px" }}>Admin</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Neuer Eintrag Form ────────────────────────────────────────────────────────
function NeuerEintrag({ mitarbeiter, onSuccess, onCancel }) {
  const [baustellen, setBaustellen] = useState([]);
  const [form, setForm] = useState({
    datum: new Date().toISOString().split("T")[0],
    typ: "",
    baustelle_id: "",
    beschreibung: "",
    stunden: "",
    material: "",
    material_kosten: "",
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("baustellen?aktiv=eq.true&order=name.asc").then(setBaustellen);
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.typ) return setError("Bitte Typ wählen");
    if (!form.stunden || isNaN(form.stunden) || Number(form.stunden) <= 0) return setError("Bitte gültige Stunden eingeben");
    if (form.typ === "baustelle" && !form.baustelle_id) return setError("Bitte Baustelle wählen");

    setSaving(true);
    setError("");
    try {
      let foto_url = null;
      if (foto) foto_url = await uploadFoto(foto, mitarbeiter.id);

      await api("zeiteintraege", {
        method: "POST",
        body: JSON.stringify({
          mitarbeiter_id: mitarbeiter.id,
          datum: form.datum,
          typ: form.typ,
          baustelle_id: form.baustelle_id || null,
          beschreibung: form.beschreibung || null,
          stunden: Number(form.stunden),
          material: form.material || null,
          material_kosten: form.material_kosten ? Number(form.material_kosten) : null,
          foto_url,
          status: "offen",
        }),
      });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "0 0 80px" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e8e6e0", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", padding: "0", color: "#666" }}>←</button>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>Neuer Eintrag</h2>
      </div>

      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Typ */}
        <div>
          <label style={labelStyle}>Was hast du gemacht?</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
            {Object.entries(TYP_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => set("typ", key)}
                style={{
                  padding: "14px 12px",
                  border: `2px solid ${form.typ === key ? cfg.color : "#e8e6e0"}`,
                  borderRadius: "12px",
                  background: form.typ === key ? cfg.color + "15" : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: form.typ === key ? "600" : "400",
                  color: form.typ === key ? cfg.color : "#555",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "20px" }}>{cfg.icon}</span>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Datum */}
        <div>
          <label style={labelStyle}>Datum</label>
          <input type="date" value={form.datum} onChange={e => set("datum", e.target.value)} style={inputStyle} />
        </div>

        {/* Baustelle (nur wenn typ=baustelle) */}
        {form.typ === "baustelle" && (
          <div>
            <label style={labelStyle}>Baustelle</label>
            <select value={form.baustelle_id} onChange={e => set("baustelle_id", e.target.value)} style={inputStyle}>
              <option value="">-- Baustelle wählen --</option>
              {baustellen.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Beschreibung */}
        <div>
          <label style={labelStyle}>Beschreibung <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
          <textarea
            value={form.beschreibung}
            onChange={e => set("beschreibung", e.target.value)}
            placeholder="Was genau wurde gemacht?"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Stunden */}
        <div>
          <label style={labelStyle}>Stunden</label>
          <input
            type="number"
            value={form.stunden}
            onChange={e => set("stunden", e.target.value)}
            placeholder="z.B. 3.5"
            step="0.25"
            min="0.25"
            max="24"
            style={inputStyle}
          />
        </div>

        {/* Material */}
        <div>
          <label style={labelStyle}>Material <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
          <input
            type="text"
            value={form.material}
            onChange={e => set("material", e.target.value)}
            placeholder="z.B. Kabel 10m, Schrauben..."
            style={inputStyle}
          />
        </div>

        {/* Materialkosten */}
        {form.material && (
          <div>
            <label style={labelStyle}>Materialkosten (€)</label>
            <input
              type="number"
              value={form.material_kosten}
              onChange={e => set("material_kosten", e.target.value)}
              placeholder="z.B. 45.00"
              step="0.01"
              style={inputStyle}
            />
          </div>
        )}

        {/* Foto */}
        <div>
          <label style={labelStyle}>Foto / Beleg <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
          <label style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", border: "2px dashed #d0cec8", borderRadius: "12px",
            cursor: "pointer", color: "#666", fontSize: "14px", marginTop: "6px",
            background: "#fafaf8",
          }}>
            <span style={{ fontSize: "20px" }}>📷</span>
            {fotoPreview ? "Foto ausgewählt ✓" : "Foto aufnehmen oder hochladen"}
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display: "none" }} />
          </label>
          {fotoPreview && (
            <img src={fotoPreview} alt="Vorschau" style={{ width: "100%", borderRadius: "10px", marginTop: "8px", maxHeight: "200px", objectFit: "cover" }} />
          )}
        </div>

        {error && (
          <div style={{ background: "#f8d7da", color: "#842029", padding: "12px 16px", borderRadius: "10px", fontSize: "14px" }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: "16px",
            background: saving ? "#ccc" : "#d4612a",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}
        >
          {saving ? "Wird gespeichert..." : "Eintrag einreichen ✓"}
        </button>
      </div>
    </div>
  );
}

// ── Mitarbeiter Dashboard ─────────────────────────────────────────────────────
function MitarbeiterDashboard({ mitarbeiter }) {
  const [view, setView] = useState("list"); // list | neu
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEintraege = useCallback(() => {
    setLoading(true);
    api(`zeiteintraege?mitarbeiter_id=eq.${mitarbeiter.id}&order=erstellt_am.desc&limit=50`)
      .then(data => {
        // Load baustelle names
        const bIds = [...new Set(data.filter(e => e.baustelle_id).map(e => e.baustelle_id))];
        if (bIds.length) {
          api(`baustellen?id=in.(${bIds.join(",")})`).then(bs => {
            const bMap = Object.fromEntries(bs.map(b => [b.id, b.name]));
            setEintraege(data.map(e => ({ ...e, baustelle_name: bMap[e.baustelle_id] || "" })));
          });
        } else {
          setEintraege(data);
        }
      })
      .finally(() => setLoading(false));
  }, [mitarbeiter.id]);

  useEffect(() => { loadEintraege(); }, [loadEintraege]);

  if (view === "neu") {
    return <NeuerEintrag mitarbeiter={mitarbeiter} onSuccess={() => { loadEintraege(); setView("list"); }} onCancel={() => setView("list")} />;
  }

  const offene = eintraege.filter(e => e.status === "offen").length;

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "20px", background: "#1a1a1a", color: "#fff" }}>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.6 }}>Eingeloggt als</p>
        <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700" }}>{mitarbeiter.name}</h2>
        {offene > 0 && (
          <p style={{ margin: "6px 0 0", fontSize: "13px", opacity: 0.7 }}>
            {offene} {offene === 1 ? "Eintrag wartet" : "Einträge warten"} auf Genehmigung
          </p>
        )}
      </div>

      <div style={{ padding: "16px 20px" }}>
        <button
          onClick={() => setView("neu")}
          style={{
            width: "100%", padding: "16px", background: "#d4612a", color: "#fff",
            border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: "700",
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "8px",
          }}
        >
          <span style={{ fontSize: "20px" }}>+</span> Neuen Eintrag erstellen
        </button>
      </div>

      <div style={{ padding: "0 20px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Meine Einträge
        </h3>
        {loading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>Laden...</p>
        ) : eintraege.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>Noch keine Einträge</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {eintraege.map(e => (
              <EintragCard key={e.id} eintrag={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("offen");
  const [kommentar, setKommentar] = useState({});
  const [mitarbeiterMap, setMitarbeiterMap] = useState({});
  const [baustellenMap, setBaustellenMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, ma, bs] = await Promise.all([
        api(`zeiteintraege?order=erstellt_am.desc&limit=200`),
        api("mitarbeiter?select=id,name"),
        api("baustellen?select=id,name"),
      ]);
      setMitarbeiterMap(Object.fromEntries(ma.map(m => [m.id, m.name])));
      setBaustellenMap(Object.fromEntries(bs.map(b => [b.id, b.name])));
      setEintraege(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, status) => {
    await api(`zeiteintraege?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        admin_kommentar: kommentar[id] || null,
        bearbeitet_am: new Date().toISOString(),
      }),
    });
    setKommentar(k => { const n = { ...k }; delete n[id]; return n; });
    load();
  };

  const gefiltert = eintraege.filter(e => e.status === filter);
  const counts = { offen: eintraege.filter(e => e.status === "offen").length };

  return (
    <div style={{ paddingBottom: "80px" }}>
      <div style={{ padding: "20px", background: "#1a1a1a", color: "#fff" }}>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.6 }}>Admin Ansicht</p>
        <h2 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700" }}>Genehmigungen</h2>
        {counts.offen > 0 && (
          <div style={{ marginTop: "8px", background: "#d4612a", display: "inline-block", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600" }}>
            {counts.offen} offen
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e8e6e0", padding: "0 20px" }}>
        {["offen", "genehmigt", "abgelehnt"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "12px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: filter === s ? "600" : "400",
              color: filter === s ? "#d4612a" : "#666",
              borderBottom: filter === s ? "2px solid #d4612a" : "2px solid transparent",
              fontFamily: "inherit", textTransform: "capitalize",
            }}
          >
            {STATUS_CONFIG[s].label}
            {s === "offen" && counts.offen > 0 && (
              <span style={{ marginLeft: "6px", background: "#d4612a", color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px" }}>
                {counts.offen}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {loading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>Laden...</p>
        ) : gefiltert.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "40px 0" }}>Keine Einträge</p>
        ) : (
          gefiltert.map(e => (
            <div key={e.id} style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: "14px", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "22px" }}>{TYP_CONFIG[e.typ]?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: "#1a1a1a" }}>
                      {mitarbeiterMap[e.mitarbeiter_id] || "Unbekannt"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      {new Date(e.datum).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </div>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: TYP_CONFIG[e.typ]?.color }}>
                    {e.stunden}h
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  <Pill color={TYP_CONFIG[e.typ]?.color}>{TYP_CONFIG[e.typ]?.label}</Pill>
                  {e.baustelle_id && <Pill color="#666">{baustellenMap[e.baustelle_id] || "Baustelle"}</Pill>}
                </div>

                {e.beschreibung && <p style={{ margin: "6px 0", fontSize: "14px", color: "#444" }}>{e.beschreibung}</p>}
                {e.material && (
                  <p style={{ margin: "4px 0", fontSize: "13px", color: "#666" }}>
                    📦 {e.material}{e.material_kosten ? ` — ${e.material_kosten}€` : ""}
                  </p>
                )}
                {e.foto_url && (
                  <img src={e.foto_url} alt="Beleg" style={{ width: "100%", borderRadius: "8px", marginTop: "8px", maxHeight: "180px", objectFit: "cover" }} />
                )}

                {e.admin_kommentar && (
                  <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#666", fontStyle: "italic" }}>
                    💬 {e.admin_kommentar}
                  </p>
                )}
              </div>

              {/* Admin Actions (nur für offene) */}
              {e.status === "offen" && (
                <div style={{ padding: "12px 16px", background: "#fafaf8", borderTop: "1px solid #f0ede8" }}>
                  <input
                    placeholder="Kommentar (optional)..."
                    value={kommentar[e.id] || ""}
                    onChange={ev => setKommentar(k => ({ ...k, [e.id]: ev.target.value }))}
                    style={{ ...inputStyle, marginBottom: "10px", fontSize: "13px", padding: "8px 12px" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleAction(e.id, "genehmigt")}
                      style={{ flex: 1, padding: "12px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✓ Genehmigen
                    </button>
                    <button
                      onClick={() => handleAction(e.id, "abgelehnt")}
                      style={{ flex: 1, padding: "12px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ✗ Ablehnen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────
function EintragCard({ eintrag: e }) {
  const cfg = TYP_CONFIG[e.typ] || {};
  const st = STATUS_CONFIG[e.status] || {};
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e6e0", borderRadius: "12px", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "22px" }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: cfg.color }}>{cfg.label}</span>
            {e.baustelle_name && <span style={{ fontSize: "13px", color: "#666" }}>— {e.baustelle_name}</span>}
          </div>
          <div style={{ fontSize: "13px", color: "#999", marginTop: "2px" }}>
            {new Date(e.datum).toLocaleDateString("de-DE")} · {e.stunden}h
          </div>
        </div>
        <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "20px", background: st.bg, color: st.color, fontWeight: "500" }}>
          {st.label}
        </span>
      </div>
      {e.beschreibung && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#555" }}>{e.beschreibung}</p>}
      {e.admin_kommentar && <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#888", fontStyle: "italic" }}>💬 {e.admin_kommentar}</p>}
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "20px", background: color + "15", color: color, fontWeight: "500" }}>
      {children}
    </span>
  );
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ user, view, setView, onLogout }) {
  const isAdmin = user.rolle === "admin";
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff", borderTop: "1px solid #e8e6e0",
      display: "flex", alignItems: "center",
      padding: "8px 16px 12px",
      gap: "4px",
    }}>
      {isAdmin ? (
        <NavBtn active={view === "admin"} onClick={() => setView("admin")} icon="📋" label="Genehmigungen" />
      ) : (
        <NavBtn active={view === "dashboard"} onClick={() => setView("dashboard")} icon="🏠" label="Meine Einträge" />
      )}
      <NavBtn active={false} onClick={onLogout} icon="👤" label="Abmelden" />
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: "8px 4px", background: "none", border: "none",
        cursor: "pointer", display: "flex", flexDirection: "column",
        alignItems: "center", gap: "3px", fontFamily: "inherit",
        color: active ? "#d4612a" : "#888",
      }}
    >
      <span style={{ fontSize: "22px" }}>{icon}</span>
      <span style={{ fontSize: "11px", fontWeight: active ? "600" : "400" }}>{label}</span>
    </button>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "12px 14px", border: "1.5px solid #e8e6e0",
  borderRadius: "10px", fontSize: "15px", background: "#fff",
  color: "#1a1a1a", boxSizing: "border-box", fontFamily: "inherit",
  outline: "none", marginTop: "6px",
};

const labelStyle = {
  fontSize: "13px", fontWeight: "600", color: "#444",
  display: "block", textTransform: "uppercase", letterSpacing: "0.4px",
};

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState(null);

  const handleLogin = (m) => {
    setUser(m);
    setView(m.rolle === "admin" ? "admin" : "dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setView(null);
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', sans-serif", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {view === "dashboard" && <MitarbeiterDashboard mitarbeiter={user} />}
      {view === "admin" && <AdminDashboard />}
      <BottomNav user={user} view={view} setView={setView} onLogout={handleLogout} />
    </div>
  );
}
