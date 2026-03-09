import { useState } from "react";

const REQUESTS = [
  {
    id: "SR-2026-00219", status: "pending", submitted: "Mar 9, 2026 — 2:34 PM", submittedBy: "Lab Tech (QR scan)",
    instrument: { sn: "DE83710294", model: "G7120A", type: "1260 Infinity II High Speed Pump", stId: "ST-2025-01432" },
    system: { id: "SYS-2025-0012", name: "UPLC Stack 1", slot: "Pump" },
    urgency: "Critical — System Down",
    description: "Pump showing E.PRES error during overnight stability run. Pressure spiking to 580 bar then dropping to 0. System halted automatically. Error appeared around 3:15 AM per audit trail.",
    errorCodes: ["E.PRES — Pressure Error"],
    customError: "",
    impact: "Batch halted — awaiting resolution",
    photos: 2,
  },
  {
    id: "SR-2026-00218", status: "confirmed", submitted: "Mar 8, 2026 — 10:12 AM", submittedBy: "Lab Tech (QR scan)",
    instrument: { sn: "JP45821039", model: "G1330B", type: "1290 Infinity II Thermostat", stId: "ST-2026-00847" },
    system: { id: "SYS-2025-0012", name: "UPLC Stack 1", slot: "Thermostat" },
    urgency: "High — Performance Issue",
    description: "Thermostat unable to cool below 18°C. Column compartment door sensor throwing intermittent faults.",
    errorCodes: ["E.TEMP — Temperature Error"],
    customError: "Door open fault — intermittent",
    impact: "GLP-critical method affected",
    photos: 3,
    resolution: { action: "confirmed", engineer: "M. Torres", date: "Mar 8, 2026 — 11:45 AM", explanation: "Confirmed Peltier module failure via remote diagnostics. Temperature setpoint deviation exceeds ±2°C specification (measured: unable to reach 15°C setpoint, stabilized at 19.3°C). Door sensor ribbon cable connection visually inspected — intermittent contact confirmed. Module decoupled from system SYS-2025-0012 and replaced with JP45821040 from shadow lab inventory. IQ/OQ requalification completed. GLP impact assessment: No batches affected — failure detected during PM window. No data integrity concerns.", serviceRecordId: "SR-2026-00847-001" },
  },
  {
    id: "SR-2026-00215", status: "dismissed", submitted: "Mar 5, 2026 — 4:50 PM", submittedBy: "Lab Tech (QR scan)",
    instrument: { sn: "DE85009934", model: "G7117A", type: "1260 Infinity II DAD", stId: "ST-2026-00801" },
    system: { id: "SYS-2025-0012", name: "UPLC Stack 1", slot: "Detector" },
    urgency: "Medium — Intermittent",
    description: "Detector baseline drift noticed during method validation. Approximately 0.5 mAU drift over 60 minutes.",
    errorCodes: [],
    customError: "Baseline drift — visual observation",
    impact: "No active batch — can wait",
    photos: 1,
    resolution: { action: "dismissed", engineer: "R. Kim", date: "Mar 6, 2026 — 9:20 AM", explanation: "Investigated baseline drift report. Performed lamp energy check — 82% remaining life, within acceptable range. Baseline drift of 0.5 mAU/hr is within OEM specification for this detector model (spec: <1.0 mAU/hr). Drift likely caused by insufficient warm-up time — lab tech confirmed detector was powered on only 15 minutes before observation. Recommended minimum 60-minute warm-up per Agilent guidelines. No service action required. Instrument status remains WORKING. No GLP impact — method validation data reviewed, all system suitability criteria met.", serviceRecordId: null },
  },
];

const SX = {
  pending: { bg: "#FEF9E7", c: "#B7950B", l: "Pending Review" },
  confirmed: { bg: "#E8F8EF", c: "#1E8449", l: "Confirmed" },
  dismissed: { bg: "#F4F6F8", c: "#7D8A96", l: "Dismissed" },
};

const Pill = ({ children, bg, c }) => <span style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: c, whiteSpace: "nowrap" }}>{children}</span>;
const StatusPill = ({ s }) => { const x = SX[s] || SX.pending; return <Pill bg={x.bg} c={x.c}>{x.l}</Pill>; };

function Header({ menuOpen, setMenuOpen }) {
  return (
    <div style={st.header}>
      <button onClick={() => setMenuOpen(!menuOpen)} style={st.hamburger}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          {menuOpen ? <path d="M18 6L6 18M6 6L18 18" stroke="#1C2833" strokeWidth="2" strokeLinecap="round" />
            : <path d="M3 6H21M3 12H21M3 18H21" stroke="#1C2833" strokeWidth="2" strokeLinecap="round" />}
        </svg>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>SierraTrac</span>
        <span style={{ fontSize: 9, background: "#2471A3", color: "#fff", padding: "2px 5px", borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
      </div>
      <div style={{ width: 32 }} />
    </div>
  );
}

function BottomNav({ page, setPage, pendingCount }) {
  return (
    <div style={st.bottomNav}>
      {[
        { id: "queue", icon: "🔔", label: "Requests" },
        { id: "all", icon: "◉", label: "All Calls" },
      ].map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{ ...st.bottomTab, ...(page === t.id || (t.id === "queue" && page === "detail") ? st.bottomTabActive : {}) }}>
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.id === "queue" && pendingCount > 0 && (
              <span style={st.badge}>{pendingCount}</span>
            )}
          </div>
          <span style={{ fontSize: 10.5 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══ Request Queue ═══ */
function RequestQueue({ setPage, setSelectedId }) {
  const pending = REQUESTS.filter(r => r.status === "pending");
  const recent = REQUESTS.filter(r => r.status !== "pending");

  return (
    <div style={st.content}>
      <h2 style={st.pageTitle}>Service Requests</h2>

      {pending.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C0392B", animation: "none" }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Pending Review ({pending.length})</span>
          </div>
          {pending.map(req => (
            <button key={req.id} onClick={() => { setSelectedId(req.id); setPage("detail"); }} style={st.reqCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "#B7950B", fontWeight: 600 }}>{req.id}</span>
                <StatusPill s={req.status} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{req.instrument.model} — {req.urgency.split(" — ")[0]}</div>
              <div style={{ fontSize: 12, color: "#7D8A96" }}>S/N {req.instrument.sn} · {req.system?.name || "No system"}</div>
              <p style={{ fontSize: 12, color: "#566573", lineHeight: 1.5, marginTop: 8 }}>{req.description.slice(0, 120)}...</p>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11 }}>
                <span style={{ color: "#C0392B", fontWeight: 600 }}>{req.urgency.split(" — ")[0]}</span>
                {req.photos > 0 && <span style={{ color: "#7D8A96" }}>📷 {req.photos}</span>}
                {req.errorCodes.length > 0 && <span style={{ color: "#7D8A96" }}>⚠ {req.errorCodes.length} code{req.errorCodes.length > 1 ? "s" : ""}</span>}
              </div>
            </button>
          ))}
        </>
      )}

      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 20, marginBottom: 10 }}>Recently Resolved</div>
          {recent.map(req => (
            <button key={req.id} onClick={() => { setSelectedId(req.id); setPage("detail"); }} style={{ ...st.reqCard, opacity: 0.85 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "#7D8A96" }}>{req.id}</span>
                <StatusPill s={req.status} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{req.instrument.model} — {req.instrument.sn}</div>
              <div style={{ fontSize: 11, color: "#7D8A96", marginTop: 2 }}>{req.resolution?.date} · {req.resolution?.engineer}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/* ═══ Request Detail + Confirm/Dismiss ═══ */
function RequestDetail({ reqId, setPage }) {
  const req = REQUESTS.find(r => r.id === reqId);
  const [action, setAction] = useState(null); // null, "confirm", "dismiss"
  const [explanation, setExplanation] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!req) return null;

  if (submitted) {
    return (
      <div style={st.content}>
        <button onClick={() => setPage("queue")} style={st.backLink}>← Back to Queue</button>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: "32px 20px", textAlign: "center", marginTop: 12 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16 }}>
            <circle cx="24" cy="24" r="20" stroke="#1E8449" strokeWidth="2" fill="#E8F8EF" />
            <path d="M16 24L22 30L32 18" stroke="#1E8449" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Request {action === "confirm" ? "Confirmed" : "Dismissed"}</h2>
          <p style={{ fontSize: 14, color: "#7D8A96", lineHeight: 1.5, marginBottom: 16 }}>
            {action === "confirm"
              ? "A service record has been created and the instrument has been flagged. The lab tech will be notified."
              : "The request has been closed with your GLP explanation. The instrument warning has been cleared."
            }
          </p>
          <div style={{ background: "#FAFBFC", borderRadius: 10, padding: 14, textAlign: "left" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#2471A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>GLP Documentation</div>
            <p style={{ fontSize: 13, color: "#566573", lineHeight: 1.6, fontStyle: "italic" }}>{explanation}</p>
          </div>
          <button onClick={() => setPage("queue")} style={{ ...st.btnPrimary, width: "100%", marginTop: 16 }}>Back to Queue</button>
        </div>
      </div>
    );
  }

  return (
    <div style={st.content}>
      <button onClick={() => setPage("queue")} style={st.backLink}>← Back to Queue</button>

      {/* Request header */}
      <div style={{ ...st.card, marginTop: 12 }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 600, color: req.status === "pending" ? "#B7950B" : "#7D8A96" }}>{req.id}</span>
            <StatusPill s={req.status} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{req.instrument.model}</div>
          <div style={{ fontSize: 13, color: "#7D8A96" }}>{req.instrument.type}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "#7D8A96", marginTop: 4 }}>S/N {req.instrument.sn} · {req.instrument.stId}</div>
          {req.system && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Pill bg="#F4E6FF" c="#8E44AD">{req.system.name} — {req.system.slot}</Pill>
            </div>
          )}
        </div>
      </div>

      {/* Request details */}
      <div style={{ ...st.card }}>
        <div style={st.cardHead}><span style={{ fontSize: 13, fontWeight: 700 }}>Reported Issue</span></div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Pill bg={req.urgency.includes("Critical") ? "#FDECEA" : req.urgency.includes("High") ? "#FEF9E7" : "#EBF5FB"} c={req.urgency.includes("Critical") ? "#C0392B" : req.urgency.includes("High") ? "#B7950B" : "#2471A3"}>{req.urgency}</Pill>
          </div>
          <p style={{ fontSize: 13, color: "#1C2833", lineHeight: 1.65, marginBottom: 14 }}>{req.description}</p>

          {(req.errorCodes.length > 0 || req.customError) && (
            <div style={{ background: "#FDECEA", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Error Codes</div>
              {req.errorCodes.map((c, i) => <div key={i} style={{ fontSize: 12, color: "#922B21", marginBottom: 2, fontFamily: "var(--mono)" }}>{c}</div>)}
              {req.customError && <div style={{ fontSize: 12, color: "#922B21", fontFamily: "var(--mono)" }}>{req.customError}</div>}
            </div>
          )}

          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#7D8A96" }}>
            <span>📷 {req.photos} photo{req.photos > 1 ? "s" : ""}</span>
            <span>Impact: {req.impact}</span>
          </div>
          <div style={{ fontSize: 11, color: "#9CA8B4", marginTop: 10 }}>Submitted {req.submitted} · {req.submittedBy}</div>
        </div>
      </div>

      {/* Resolution (if already resolved) */}
      {req.resolution && (
        <div style={{ ...st.card }}>
          <div style={st.cardHead}><span style={{ fontSize: 13, fontWeight: 700 }}>ISO Resolution</span></div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <StatusPill s={req.status} />
              <span style={{ fontSize: 12, color: "#7D8A96" }}>{req.resolution.date}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#566573", marginBottom: 4 }}>{req.resolution.engineer}</div>
            <div style={{ background: "#FAFBFC", borderLeft: "3px solid #2471A3", borderRadius: "0 8px 8px 0", padding: "10px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#2471A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>GLP Explanation</div>
              <p style={{ fontSize: 13, color: "#566573", lineHeight: 1.6, fontStyle: "italic" }}>{req.resolution.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons (pending only) */}
      {req.status === "pending" && !action && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => setAction("dismiss")} style={{ ...st.btnSec, flex: 1, justifyContent: "center" }}>Dismiss</button>
          <button onClick={() => setAction("confirm")} style={{ ...st.btnDanger, flex: 2, justifyContent: "center" }}>Confirm Issue</button>
        </div>
      )}

      {/* Confirm/Dismiss form */}
      {action && (
        <div style={{ ...st.card, borderColor: action === "confirm" ? "rgba(192,57,43,0.2)" : "#E8ECF0" }}>
          <div style={st.cardHead}>
            <span style={{ fontSize: 13, fontWeight: 700, color: action === "confirm" ? "#C0392B" : "#1C2833" }}>
              {action === "confirm" ? "Confirm Issue — Engineer Assessment" : "Dismiss Request — Engineer Assessment"}
            </span>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ background: "#FEF9E7", borderRadius: 8, padding: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7D6608", marginBottom: 2 }}>GLP Requirement</div>
              <div style={{ fontSize: 12, color: "#4A3F0F", lineHeight: 1.5 }}>
                {action === "confirm"
                  ? "You must document your diagnostic findings, the confirmed failure mode, impact on data integrity, and the corrective action taken or planned."
                  : "You must explain why no service action is required, reference any diagnostic evidence, and confirm there is no impact on instrument performance or data integrity."
                }
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#566573", marginBottom: 5 }}>
                Engineer Explanation (required for GLP) *
              </div>
              <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={6}
                placeholder={action === "confirm"
                  ? "Describe: confirmed failure mode, diagnostic method, measured vs. specification values, impact on any active batches or data, corrective action taken or planned..."
                  : "Describe: diagnostic findings, why reported symptoms do not indicate a failure, reference measurements or specifications, confirmation that instrument remains within operating parameters..."
                }
                style={st.textarea} />
            </div>

            {action === "confirm" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <input type="checkbox" defaultChecked style={{ width: 16, height: 16, accentColor: "#2471A3", marginTop: 2 }} />
                  <span style={{ fontSize: 12, color: "#566573", lineHeight: 1.5 }}>Create service record on instrument and flag system for requalification</span>
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAction(null)} style={{ ...st.btnSec, flex: 1, justifyContent: "center" }}>Cancel</button>
              <button onClick={() => { if (explanation.trim()) setSubmitted(true); }} style={{
                ...st.btnPrimary, flex: 2, justifyContent: "center",
                opacity: explanation.trim() ? 1 : 0.5,
                background: action === "confirm" ? "#C0392B" : "#2471A3",
              }}>
                {action === "confirm" ? "Confirm & Create Record" : "Dismiss with Explanation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ App ═══ */
export default function AdminApp() {
  const [page, setPage] = useState("queue");
  const [selectedId, setSelectedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingCount = REQUESTS.filter(r => r.status === "pending").length;

  return (
    <div style={st.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --mono: 'IBM Plex Mono', monospace; }
        html, body { background: #F4F6F8; }
        button { cursor: pointer; font-family: inherit; }
        input, select, textarea { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: #9CA8B4; }
        input:focus, textarea:focus { border-color: #2471A3 !important; box-shadow: 0 0 0 3px rgba(36,113,163,0.08); outline: none; }
      `}</style>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {page === "queue" && <RequestQueue setPage={setPage} setSelectedId={setSelectedId} />}
      {page === "detail" && <RequestDetail reqId={selectedId} setPage={setPage} />}
      {page === "all" && <RequestQueue setPage={setPage} setSelectedId={setSelectedId} />}
      <BottomNav page={page} setPage={setPage} pendingCount={pendingCount} />
    </div>
  );
}

/* ═══ Styles ═══ */
const st = {
  app: { minHeight: "100vh", background: "#F4F6F8", fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", color: "#1C2833", maxWidth: 480, margin: "0 auto", paddingBottom: 72 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fff", borderBottom: "1px solid #E8ECF0", position: "sticky", top: 0, zIndex: 50 },
  hamburger: { width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none" },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "#fff", borderTop: "1px solid #E8ECF0", display: "flex", zIndex: 50 },
  bottomTab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0 6px", background: "none", border: "none", color: "#9CA8B4", fontWeight: 500 },
  bottomTabActive: { color: "#2471A3" },
  badge: { position: "absolute", top: -4, right: -8, width: 16, height: 16, borderRadius: "50%", background: "#C0392B", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  content: { padding: "14px 14px 20px" },
  pageTitle: { fontSize: 20, fontWeight: 700, marginBottom: 16 },
  card: { background: "#fff", border: "1px solid #E8ECF0", borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  cardHead: { padding: "12px 16px", borderBottom: "1px solid #E8ECF0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  reqCard: { display: "block", width: "100%", background: "#fff", border: "1px solid #E8ECF0", borderRadius: 12, padding: 14, marginBottom: 8, textAlign: "left", fontFamily: "inherit", color: "inherit" },
  backLink: { background: "none", border: "none", color: "#2471A3", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 },
  btnPrimary: { display: "flex", alignItems: "center", padding: "12px 20px", background: "#2471A3", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  btnSec: { display: "flex", alignItems: "center", padding: "12px 20px", background: "#F4F6F8", color: "#566573", border: "1px solid #E8ECF0", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  btnDanger: { display: "flex", alignItems: "center", padding: "12px 20px", background: "#C0392B", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  textarea: { width: "100%", padding: "10px 12px", background: "#FAFBFC", border: "1.5px solid #E8ECF0", borderRadius: 8, fontSize: 13, color: "#1C2833", outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif", minHeight: 140 },
};
