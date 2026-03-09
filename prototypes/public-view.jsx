import { useState, useRef, useEffect } from "react";

/* ═══ DATA ═══ */
const INSTRUMENTS = {
  DE83710294: {
    sn: "DE83710294", model: "G7120A", mfg: "Agilent Technologies",
    type: "1260 Infinity II High Speed Pump", category: "UPLC Module",
    stId: "ST-2025-01432", qr: true, lastInspection: "2026-01-15",
    status: "WORKING", consignment: false,
    systemId: "SYS-2025-0012", slot: "Pump", systemName: "UPLC Stack 1",
    history: [
      { date: "January 15, 2026", type: "service", engineer: "R. Kim, Sierra Spectra", title: "Preventive Maintenance — Annual", summary: "Annual PM completed on-site.", findings: ["All check valves replaced", "Piston seals replaced", "Pressure ripple within spec", "Firmware current — v3.4.12"], designation: "WORKING", notes: "Next PM recommended January 2027.", photos: 2 },
    ],
    specs: { "Flow Range": "0.001–5.0 mL/min", "Max Pressure": "600 bar", "Flow Accuracy": "±1.0%" },
  },
  DE84200117: {
    sn: "DE84200117", model: "G7129A", mfg: "Agilent Technologies",
    type: "1260 Infinity II Vialsampler", category: "UPLC Module",
    stId: "ST-2025-01433", qr: true, lastInspection: "2026-01-15",
    status: "WORKING", consignment: false,
    systemId: "SYS-2025-0012", slot: "Autosampler", systemName: "UPLC Stack 1",
    history: [
      { date: "January 15, 2026", type: "service", engineer: "R. Kim, Sierra Spectra", title: "Preventive Maintenance — Annual", summary: "Needle assembly inspected, wash port seals replaced. Injection precision tested.", findings: ["Needle assembly — no visible wear", "Wash port seals replaced", "Injection precision: 0.3% RSD (spec: <1.0%)", "Carryover: <0.01%"], designation: "WORKING", notes: "System performing within spec.", photos: 1 },
    ],
    specs: { "Injection Volume": "0.1–100 µL", "Injection Precision": "≤0.5% RSD", "Sample Capacity": "132 vials (2 mL)" },
  },
  JP45821040: {
    sn: "JP45821040", model: "G1330B", mfg: "Agilent Technologies",
    type: "1290 Infinity II Multicolumn Thermostat", category: "UPLC Module",
    stId: "ST-2026-00850", qr: true, lastInspection: "2026-03-08",
    status: "WORKING", consignment: false,
    systemId: "SYS-2025-0012", slot: "Thermostat", systemName: "UPLC Stack 1",
    history: [
      { date: "March 8, 2026", type: "system", engineer: "M. Torres, Sierra Spectra", title: "Coupled to UPLC Stack 1", summary: "Installed as replacement thermostat. Replaced JP45821039 (Peltier failure). Full IQ/OQ performed.", findings: ["Temperature setpoint accuracy: ±0.2°C", "All column positions tested", "Door sensor functional", "CAN bus confirmed"], designation: "WORKING", notes: "From shadow lab inventory. IQ/OQ same day. Certificate ST-IQ-2026-0214.", photos: 0 },
    ],
    specs: { "Temperature Range": "4°C to 105°C", "Column Capacity": "Up to 6 columns (max 300mm)", "Communication": "CAN bus" },
  },
  DE85009934: {
    sn: "DE85009934", model: "G7117A", mfg: "Agilent Technologies",
    type: "1260 Infinity II DAD Detector", category: "UPLC Module",
    stId: "ST-2025-01434", qr: true, lastInspection: "2026-01-15",
    status: "WORKING", consignment: false,
    systemId: "SYS-2025-0012", slot: "Detector", systemName: "UPLC Stack 1",
    history: [
      { date: "January 15, 2026", type: "service", engineer: "R. Kim, Sierra Spectra", title: "Preventive Maintenance — Annual", summary: "Deuterium lamp checked — 82% life remaining. Holmium oxide filter test passed.", findings: ["Lamp energy: 82% remaining", "Wavelength accuracy: ±0.5 nm (spec: ±1 nm)", "Baseline noise: 0.8 mAU (spec: <2.0 mAU)", "Holmium oxide test: PASS"], designation: "WORKING", notes: "Lamp replacement recommended at next PM if below 50%.", photos: 1 },
    ],
    specs: { "Wavelength Range": "190–640 nm", "Bandwidth": "1–16 nm", "Noise": "<±1.5 µAU" },
  },
  JP45821039: {
    sn: "JP45821039", model: "G1330B", mfg: "Agilent Technologies",
    type: "1290 Infinity II Multicolumn Thermostat", category: "UPLC Module",
    stId: "ST-2026-00847", qr: true, lastInspection: "2026-03-01",
    status: "NON-WORKING", consignment: true,
    systemId: null, slot: null, systemName: null,
    previousSystems: [{ name: "UPLC Stack 1", slot: "Thermostat", from: "2025-01-10", to: "2026-03-08", reason: "Peltier failure" }],
    seller: "Consignment — Sierra Spectra Lab, Oakhurst, CA", askingPrice: "$12,400",
    history: [
      { date: "March 8, 2026", type: "system", engineer: "M. Torres, Sierra Spectra", title: "Decoupled from UPLC Stack 1", summary: "Removed from system due to Peltier module failure. Replaced by JP45821040.", findings: [], designation: "NON-WORKING", notes: "Moved to consignment.", photos: 0 },
      { date: "March 1, 2026", type: "inspection", engineer: "M. Torres, Sierra Spectra", title: "Intake Inspection", summary: "Peltier failure confirmed. Est. repair $2,800–$3,400.", findings: ["Peltier module failure — unable to maintain setpoint below 18°C", "Door sensor intermittent", "Firmware two revisions behind", "Leak sensor functional", "CAN bus operational"], designation: "NON-WORKING", notes: "Peltier replacement required.", photos: 3 },
    ],
    specs: { "Temperature Range": "4°C to 105°C", "Column Capacity": "Up to 6 columns", "Communication": "CAN bus" },
  },
};

const SYSTEM = {
  id: "SYS-2025-0012", name: "UPLC Stack 1",
  location: "Building C, Lab 204 — South San Francisco, CA",
  status: "WORKING", qualified: true, lastQualified: "2025-03-22",
  modules: [
    { slot: "Pump", sn: "DE83710294", model: "G7120A", type: "High Speed Pump", status: "WORKING", since: "2025-01-10" },
    { slot: "Autosampler", sn: "DE84200117", model: "G7129A", type: "Vialsampler", status: "WORKING", since: "2025-01-10" },
    { slot: "Thermostat", sn: "JP45821040", model: "G1330B", type: "Multicolumn Thermostat", status: "WORKING", since: "2026-03-08" },
    { slot: "Detector", sn: "DE85009934", model: "G7117A", type: "DAD Detector", status: "WORKING", since: "2025-01-10" },
  ],
  swapHistory: [
    { date: "March 8, 2026", slot: "Thermostat", outSN: "JP45821039", outModel: "G1330B", inSN: "JP45821040", inModel: "G1330B", reason: "Peltier module failure", engineer: "M. Torres, Sierra Spectra", requalified: true, notes: "Replacement from shadow lab inventory. IQ/OQ requalification completed same day." },
    { date: "January 10, 2025", slot: "All", outSN: null, outModel: null, inSN: null, inModel: null, reason: null, engineer: "M. Torres, Sierra Spectra", requalified: true, notes: "System onboarded to Sierra Spectra service contract. All modules enrolled in SierraTrac." },
  ],
};

const COMMON_ERROR_CODES = {
  "Agilent HPLC/UPLC": ["E.PRES — Pressure Error", "E.LEAK — Leak Detected", "E.FLOW — Flow Error", "E.TEMP — Temperature Error", "E.COMM — Communication Error", "E.LAMP — Lamp Failure", "E.DET — Detector Error"],
  General: ["System Not Responding", "Unexpected Shutdown", "Error Code on Display", "Unusual Noise / Vibration", "Performance Drift / OOS Results", "Physical Damage", "Other"],
};

const SX = { "NON-WORKING": { bg: "#FDECEA", c: "#C0392B", l: "Non-Working" }, WORKING: { bg: "#E8F8EF", c: "#1E8449", l: "Working" }, WARNING: { bg: "#FEF9E7", c: "#B7950B", l: "Service Requested" }, UNKNOWN: { bg: "#F4F6F8", c: "#7D8A96", l: "Unknown" } };
const TC = { inspection: { icon: "⬡", c: "#2471A3" }, service: { icon: "⬢", c: "#1E8449" }, system: { icon: "⬡", c: "#8E44AD" }, listing: { icon: "◻", c: "#7D8A96" }, purchase: { icon: "◇", c: "#6C3483" } };

function Badge({ status, sm }) {
  const x = SX[status] || SX.UNKNOWN;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: sm ? 4 : 6, padding: sm ? "3px 8px" : "5px 12px", borderRadius: 20, background: x.bg, color: x.c, fontSize: sm ? 11 : 12.5, fontWeight: 600, border: `1px solid ${x.c}20` }}>{x.l}</span>;
}

function TopBar({ onBack, right }) {
  return (
    <div style={S.topBar}>
      <button onClick={onBack} style={S.backBtn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#2471A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>
      {right && <span style={S.tracBadge}>{right}</span>}
    </div>
  );
}

/* ═══ Search ═══ */
function SearchPage({ onSearch }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div style={S.searchPage}>
      <div style={S.searchInner}>
        <div style={S.logoGroup}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="2" y="2" width="32" height="32" rx="8" stroke="#2471A3" strokeWidth="2" fill="none" /><path d="M11 18H25" stroke="#2471A3" strokeWidth="1.5" /><path d="M18 11V25" stroke="#2471A3" strokeWidth="1.5" /><circle cx="18" cy="18" r="5" stroke="#2471A3" strokeWidth="1.5" fill="none" /></svg>
          <div><h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>SierraTrac</h1><p style={{ fontSize: 11, color: "#7D8A96", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>Instrument Lifecycle Platform</p></div>
        </div>
        <div style={{ ...S.searchBox, ...(focused ? S.searchBoxF : {}) }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" stroke="#7D8A96" strokeWidth="2" /><path d="M16 16L21 21" stroke="#7D8A96" strokeWidth="2" strokeLinecap="round" /></svg>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && q.trim() && onSearch(q.trim())} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Scan QR or enter S/N" style={S.searchInput} />
        </div>
        <button onClick={() => q.trim() && onSearch(q.trim())} style={S.searchBtn}>Look Up</button>
        <div style={S.tryRow}>
          <span style={{ fontSize: 12, color: "#7D8A96" }}>Try:</span>
          {["DE83710294", "JP45821039", "SYS-2025-0012", "XX00000000"].map(x => <button key={x} onClick={() => onSearch(x)} style={S.tryChip}>{x}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ═══ Service Request Form ═══ */
function ServiceRequestPage({ inst, onBack, onSubmit }) {
  const [step, setStep] = useState(1); // 1=describe, 2=details, 3=review, 4=submitted
  const [urgency, setUrgency] = useState("");
  const [description, setDescription] = useState("");
  const [errorCodes, setErrorCodes] = useState([]);
  const [customError, setCustomError] = useState("");
  const [impact, setImpact] = useState("");
  const [photoCount, setPhotoCount] = useState(0);

  const toggleError = (code) => {
    setErrorCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  if (step === 4) {
    return (
      <div style={S.resultPage}>
        <TopBar onBack={onBack} />
        <div style={{ padding: "24px 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: "32px 20px", textAlign: "center", marginBottom: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" stroke="#1E8449" strokeWidth="2" fill="#E8F8EF" /><path d="M16 24L22 30L32 18" stroke="#1E8449" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Service Request Submitted</h2>
            <p style={{ fontSize: 14, color: "#7D8A96", lineHeight: 1.5, marginBottom: 16 }}>Your request has been dispatched to Sierra Spectra. The instrument has been flagged for service.</p>
            <div style={{ background: "#FAFBFC", borderRadius: 10, padding: 14, textAlign: "left" }}>
              <div style={S.metaRow}><span style={S.metaRowK}>Request ID</span><span style={S.metaRowV}>SR-2026-00219</span></div>
              <div style={S.metaRow}><span style={S.metaRowK}>Instrument</span><span style={S.metaRowV}>{inst.model} · {inst.sn}</span></div>
              <div style={S.metaRow}><span style={S.metaRowK}>Status</span><span style={{ ...S.metaRowV, color: "#B7950B" }}>Pending ISO Review</span></div>
              <div style={S.metaRow}><span style={S.metaRowK}>Urgency</span><span style={S.metaRowV}>{urgency}</span></div>
              <div style={{ ...S.metaRow, borderBottom: "none" }}><span style={S.metaRowK}>Submitted</span><span style={S.metaRowV}>March 9, 2026 — 2:34 PM</span></div>
            </div>
          </div>
          <div style={{ background: "#FEF9E7", borderRadius: 14, border: "1px solid #F0E5BE", padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7D6608", marginBottom: 8 }}>What happens next?</div>
            <div style={{ fontSize: 13, color: "#4A3F0F", lineHeight: 1.6 }}>
              A Sierra Spectra engineer will review your request and either confirm the issue or contact you for more information. For GLP compliance, all actions will be documented with engineer explanations.
            </div>
          </div>
          <button onClick={onBack} style={{ ...S.searchBtn, marginTop: 16 }}>Back to Instrument</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.resultPage}>
      <TopBar onBack={onBack} right="Service Request" />

      {/* Instrument context */}
      <div style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F4F6F8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none" opacity="0.4"><rect x="6" y="12" width="36" height="24" rx="3" stroke="#2471A3" strokeWidth="2" /></svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{inst.model} — {inst.type.split(" ").slice(-3).join(" ")}</div>
          <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#7D8A96" }}>S/N {inst.sn}{inst.systemName ? ` · ${inst.systemName}` : ""}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ margin: "12px 12px 0", display: "flex", gap: 4 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= i ? "#2471A3" : "#E8ECF0", transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ margin: "6px 12px 0", fontSize: 11, color: "#7D8A96", fontWeight: 500 }}>
        Step {step} of 3: {step === 1 ? "Describe Issue" : step === 2 ? "Error Details" : "Review & Submit"}
      </div>

      <div style={{ padding: "12px 12px 100px" }}>
        {/* Step 1: Describe */}
        {step === 1 && (
          <>
            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>How urgent is this?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { val: "Critical — System Down", desc: "Instrument non-functional. Production halted.", color: "#C0392B" },
                  { val: "High — Performance Issue", desc: "Still running but out of spec or degraded.", color: "#B7950B" },
                  { val: "Medium — Intermittent", desc: "Issue comes and goes. Not blocking work.", color: "#2471A3" },
                  { val: "Low — Scheduled", desc: "Planned maintenance or minor concern.", color: "#7D8A96" },
                ].map(u => (
                  <button key={u.val} onClick={() => setUrgency(u.val)} style={{ ...S.urgencyBtn, ...(urgency === u.val ? { borderColor: u.color, background: `${u.color}08` } : {}) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: urgency === u.val ? u.color : "#E8ECF0", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2833" }}>{u.val}</div>
                        <div style={{ fontSize: 11, color: "#7D8A96", marginTop: 1 }}>{u.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Describe the issue</div>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's happening? When did it start? What were you running?" rows={4} style={S.textarea} />
            </div>
          </>
        )}

        {/* Step 2: Error codes + photos */}
        {step === 2 && (
          <>
            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Error codes on display?</div>
              <div style={{ fontSize: 11, color: "#7D8A96", marginBottom: 12 }}>Select any that apply, or describe below.</div>
              {Object.entries(COMMON_ERROR_CODES).map(([group, codes]) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#2471A3", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{group}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {codes.map(code => (
                      <button key={code} onClick={() => toggleError(code)} style={{ ...S.errorChip, ...(errorCodes.includes(code) ? S.errorChipSel : {}) }}>{code}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#566573", marginBottom: 5 }}>Other error code or message</div>
                <input value={customError} onChange={e => setCustomError(e.target.value)} placeholder="e.g. Error 4231 on display" style={S.input} />
              </div>
            </div>

            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Attach photos</div>
              <div style={{ fontSize: 11, color: "#7D8A96", marginBottom: 10 }}>Photo of the error screen, instrument display, or physical issue.</div>
              <input type="file" multiple accept="image/*" onChange={e => setPhotoCount(e.target.files?.length || 0)} style={{ ...S.input, padding: 8, fontSize: 13 }} />
              {photoCount > 0 && <div style={{ fontSize: 12, color: "#1E8449", marginTop: 6, fontWeight: 500 }}>✓ {photoCount} photo{photoCount > 1 ? "s" : ""} selected</div>}
            </div>

            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Impact on operations</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Batch in progress — cannot stop", "Batch halted — awaiting resolution", "No active batch — can wait", "GLP-critical method affected"].map(opt => (
                  <button key={opt} onClick={() => setImpact(opt)} style={{ ...S.urgencyBtn, ...(impact === opt ? { borderColor: "#2471A3", background: "rgba(36,113,163,0.04)" } : {}) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: impact === opt ? "#2471A3" : "#E8ECF0", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <>
            <div style={S.formCard}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Review Your Request</div>
              <div style={S.reviewRow}><span style={S.reviewK}>Instrument</span><span style={S.reviewV}>{inst.model} · {inst.sn}</span></div>
              {inst.systemName && <div style={S.reviewRow}><span style={S.reviewK}>System</span><span style={S.reviewV}>{inst.systemName} ({inst.slot})</span></div>}
              <div style={S.reviewRow}><span style={S.reviewK}>Urgency</span><span style={S.reviewV}>{urgency || "Not set"}</span></div>
              <div style={S.reviewRow}><span style={S.reviewK}>Description</span><span style={{ ...S.reviewV, whiteSpace: "pre-wrap" }}>{description || "—"}</span></div>
              {errorCodes.length > 0 && <div style={S.reviewRow}><span style={S.reviewK}>Error Codes</span><span style={S.reviewV}>{errorCodes.join(", ")}</span></div>}
              {customError && <div style={S.reviewRow}><span style={S.reviewK}>Custom Error</span><span style={S.reviewV}>{customError}</span></div>}
              <div style={S.reviewRow}><span style={S.reviewK}>Photos</span><span style={S.reviewV}>{photoCount || 0} attached</span></div>
              <div style={{ ...S.reviewRow, borderBottom: "none" }}><span style={S.reviewK}>Impact</span><span style={S.reviewV}>{impact || "Not specified"}</span></div>
            </div>

            <div style={{ background: "#FEF9E7", borderRadius: 12, border: "1px solid #F0E5BE", padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7D6608", marginBottom: 4 }}>By submitting:</div>
              <div style={{ fontSize: 12, color: "#4A3F0F", lineHeight: 1.5 }}>
                This instrument will be flagged as "Service Requested." The associated system (if any) will show a warning status. A Sierra Spectra engineer will be dispatched to review.
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={S.bottomAction}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8 }}>
          {step > 1 && <button onClick={() => setStep(step - 1)} style={{ ...S.btnSec, flex: 1 }}>Back</button>}
          {step < 3 && <button onClick={() => setStep(step + 1)} style={{ ...S.btnPrimary, flex: step === 1 ? 1 : 2 }}>Continue</button>}
          {step === 3 && <button onClick={() => { setStep(4); if (onSubmit) onSubmit(); }} style={{ ...S.btnPrimary, flex: 2, background: "#C0392B" }}>Submit Service Request</button>}
        </div>
      </div>
    </div>
  );
}

/* ═══ Instrument Page ═══ */
function InstrumentPage({ data, onBack, onRequestService, onViewSystem }) {
  const [tab, setTab] = useState("history");
  const hasWarning = data._warning;

  return (
    <div style={S.resultPage}>
      <TopBar onBack={onBack} right={data.stId} />

      <div style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", overflow: "hidden" }}>
        <div style={{ height: 100, background: "#F4F6F8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, borderBottom: "1px solid #E8ECF0" }}>
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" opacity="0.35"><rect x="6" y="12" width="36" height="24" rx="3" stroke="#2471A3" strokeWidth="1.5" /><rect x="10" y="16" width="16" height="10" rx="1.5" stroke="#2471A3" strokeWidth="1" /><circle cx="36" cy="21" r="3" stroke="#2471A3" strokeWidth="1" /></svg>
          <span style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "#9CA8B4" }}>{data.model}</span>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <Badge status={hasWarning ? "WARNING" : data.status} />
            {data.qr && <span style={S.qrTag}>QR Tagged</span>}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{data.type}</h2>
          <p style={{ fontSize: 13, color: "#7D8A96", marginBottom: 14 }}>{data.mfg}</p>
          <div style={S.metaGrid}>
            <div style={S.metaCell}><div style={S.metaK}>Serial No.</div><div style={S.metaV}>{data.sn}</div></div>
            <div style={S.metaCell}><div style={S.metaK}>Model</div><div style={S.metaV}>{data.model}</div></div>
            <div style={S.metaCell}><div style={S.metaK}>Last Inspected</div><div style={S.metaV}>{data.lastInspection}</div></div>
            <div style={S.metaCell}><div style={S.metaK}>Category</div><div style={S.metaV}>{data.category}</div></div>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {hasWarning && (
        <div style={{ margin: "8px 12px 0", background: "#FEF9E7", borderRadius: 14, border: "1px solid #F0E5BE", padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#7D6608" }}>Service Requested</span>
            <span style={{ fontSize: 11, color: "#9A8536", fontFamily: "'IBM Plex Mono', monospace" }}>SR-2026-00219</span>
          </div>
          <div style={{ fontSize: 12, color: "#4A3F0F", lineHeight: 1.5 }}>A service request is pending ISO review. This instrument and its associated system are flagged until an engineer confirms or dismisses the issue.</div>
        </div>
      )}

      {/* System banner */}
      {data.systemName && (
        <button onClick={onViewSystem} style={{ margin: "8px 12px 0", background: "#FAFAFF", borderRadius: 14, border: "1px solid #E8E0F4", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, width: "calc(100% - 24px)", textAlign: "left", fontFamily: "inherit", color: "inherit", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F4E6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#8E44AD" strokeWidth="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#8E44AD" strokeWidth="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#8E44AD" strokeWidth="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#8E44AD" strokeWidth="1.5" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Part of {data.systemName}</div>
            <div style={{ fontSize: 12, color: "#7D8A96" }}>{data.slot} slot · Tap to view system</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#9CA8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}

      {/* Tabs */}
      <div style={S.tabRow}>
        {[{ id: "history", l: "History" }, { id: "specs", l: "Specs" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}>{t.l}</button>
        ))}
      </div>

      <div style={{ margin: "8px 12px 0", paddingBottom: 100 }}>
        {tab === "history" && data.history.map((e, i) => {
          const tc = TC[e.type] || TC.service;
          return (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", border: `2px solid ${tc.c}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: tc.c }}>{tc.icon}</div>
                {i < data.history.length - 1 && <div style={{ width: 2, flex: 1, background: "#E8ECF0", minHeight: 16 }} />}
              </div>
              <div style={{ flex: 1, background: "#fff", border: "1px solid #E8ECF0", borderRadius: 12, marginBottom: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#2471A3", fontWeight: 500 }}>{e.date}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{e.title}</div>
                {e.engineer && <div style={{ fontSize: 11, color: "#7D8A96", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{e.engineer}</div>}
                <p style={{ fontSize: 13, color: "#566573", lineHeight: 1.6, marginTop: 8 }}>{e.summary}</p>
                {e.findings?.length > 0 && (
                  <div style={{ background: "#F4F6F8", borderRadius: 8, padding: 12, marginTop: 10 }}>
                    {e.findings.map((f, j) => (
                      <div key={j} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12, color: "#34495E" }}>
                        <span style={{ color: "#9CA8B4", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, width: 14, flexShrink: 0, marginTop: 1 }}>{String(j + 1).padStart(2, "0")}</span>{f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {tab === "specs" && data.specs && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", overflow: "hidden" }}>
            {Object.entries(data.specs).map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: i ? "1px solid #E8ECF0" : "none" }}>
                <span style={{ fontSize: 13, color: "#7D8A96" }}>{k}</span><span style={{ fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service request CTA */}
      <div style={S.bottomAction}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Need service?</div>
            <div style={{ fontSize: 11, color: "#7D8A96" }}>Report an issue to Sierra Spectra</div>
          </div>
          <button onClick={onRequestService} style={{ ...S.btnPrimary, background: "#C0392B", whiteSpace: "nowrap" }}>
            🔧 Request Service
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ System Page ═══ */
function SystemPage({ sys, onBack, onInstrument }) {
  const [tab, setTab] = useState("modules");
  return (
    <div style={S.resultPage}>
      <TopBar onBack={onBack} right={sys.id} />
      <div style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", overflow: "hidden" }}>
        <div style={{ padding: "20px 16px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            <Badge status={sys.status} />
            {sys.qualified && <span style={S.qrTag}>IQ/OQ Qualified</span>}
            <span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 20, background: "#F4E6FF", color: "#8E44AD", fontSize: 11, fontWeight: 600, border: "1px solid rgba(142,68,173,0.15)" }}>System</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{sys.name}</h2>
          <p style={{ fontSize: 13, color: "#7D8A96", marginBottom: 4 }}>{sys.location}</p>
          <p style={{ fontSize: 12, color: "#9CA8B4", marginBottom: 16 }}>{sys.modules.length} active modules · Last qualified {sys.lastQualified}</p>
        </div>
        <div style={{ borderTop: "1px solid #E8ECF0" }}>
          {sys.modules.map((mod, i) => (
            <button key={i} onClick={() => onInstrument(mod.sn)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i ? "1px solid #E8ECF0" : "none", width: "100%", background: "none", border: "none", textAlign: "left", fontFamily: "inherit", color: "inherit", cursor: "pointer" }}>
              <div style={{ width: 72, fontSize: 11, fontWeight: 700, color: "#2471A3", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{mod.slot}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{mod.model} <span style={{ fontWeight: 400, color: "#7D8A96" }}>· {mod.type}</span></div>
                <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#7D8A96", marginTop: 2 }}>S/N {mod.sn}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Badge status={mod.status} sm />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#9CA8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={S.tabRow}>
        {[{ id: "modules", l: "Overview" }, { id: "swaps", l: `Swap History (${sys.swapHistory.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.tabBtn, ...(tab === t.id ? S.tabActive : {}) }}>{t.l}</button>
        ))}
      </div>

      <div style={{ margin: "8px 12px 0", paddingBottom: 40 }}>
        {tab === "modules" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>System Configuration</h3>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", overflow: "hidden" }}>
              {sys.modules.map((mod, i) => (
                <div key={i} style={{ padding: "12px 16px", borderTop: i ? "1px solid #E8ECF0" : "none", display: "flex", justifyContent: "space-between" }}>
                  <div><span style={{ fontSize: 12, color: "#7D8A96", fontWeight: 600 }}>{mod.slot}</span><div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{mod.model} — {mod.type}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#7D8A96" }}>{mod.sn}</div><div style={{ fontSize: 11, color: "#9CA8B4", marginTop: 2 }}>Since {mod.since}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "swaps" && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Module Swap History</h3>
            {sys.swapHistory.map((swap, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8ECF0", padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#2471A3", fontWeight: 500 }}>{swap.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{swap.slot === "All" ? "System Onboarding" : `${swap.slot} Swap`}</div>
                    <div style={{ fontSize: 11, color: "#7D8A96", fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>{swap.engineer}</div>
                  </div>
                  {swap.requalified && <span style={S.qrTag}>Requalified</span>}
                </div>
                {swap.outSN && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#FDECEA", borderRadius: 8, fontSize: 12 }}>
                      <span style={{ color: "#C0392B", fontWeight: 700, fontSize: 11 }}>OUT</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{swap.outModel} · {swap.outSN}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#E8F8EF", borderRadius: 8, fontSize: 12 }}>
                      <span style={{ color: "#1E8449", fontWeight: 700, fontSize: 11 }}>IN</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{swap.inModel} · {swap.inSN}</span>
                    </div>
                    {swap.reason && <div style={{ fontSize: 12, color: "#7D8A96", fontStyle: "italic", marginTop: 2 }}>Reason: {swap.reason}</div>}
                  </div>
                )}
                {swap.notes && (
                  <div style={{ background: "#FAFBFC", borderLeft: "3px solid #2471A3", borderRadius: "0 8px 8px 0", padding: "8px 12px", marginTop: 8 }}>
                    <p style={{ fontSize: 12, color: "#566573", lineHeight: 1.55, fontStyle: "italic" }}>{swap.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Not Found Page ═══ */
function NotFoundPage({ query, onBack, onRegister }) {
  return (
    <div style={S.resultPage}>
      <TopBar onBack={onBack} />
      <div style={{ padding: "24px 16px" }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: "32px 20px", textAlign: "center", marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F4F6F8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#9CA8B4" strokeWidth="1.5" /><path d="M16 16L21 21" stroke="#9CA8B4" strokeWidth="1.5" strokeLinecap="round" /><path d="M8 11H14" stroke="#9CA8B4" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Record Found</h2>
          <p style={{ fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", color: "#566573", marginBottom: 12, background: "#F4F6F8", display: "inline-block", padding: "6px 14px", borderRadius: 8 }}>
            <span style={{ color: "#9CA8B4", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 12 }}>Searched:</span> {query}
          </p>
          <p style={{ fontSize: 14, color: "#7D8A96", lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>This serial number has no SierraTrac history. It may not have been inspected or registered yet.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: 20, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>What does this mean?</h3>
          {["No verified inspection or service history exists for this instrument.", "If purchasing, there is no third-party documentation of its condition.", "The instrument may still be functional — it simply hasn't been documented."].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA8B4", flexShrink: 0, marginTop: 6 }} />
              <p style={{ fontSize: 13, color: "#566573", lineHeight: 1.55 }}>{t}</p>
            </div>
          ))}
        </div>

        {[
          { title: "Register This Instrument", desc: "Add the S/N and basic details to start a SierraTrac record.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#2471A3" strokeWidth="1.5" /><path d="M12 8V16M8 12H16" stroke="#2471A3" strokeWidth="1.5" strokeLinecap="round" /></svg> },
          { title: "Request an Inspection", desc: "Have Sierra Spectra inspect and certify this instrument.", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1E8449" strokeWidth="1.5" /><path d="M12 6V12L16 14" stroke="#1E8449" strokeWidth="1.5" strokeLinecap="round" /></svg> },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: 16, marginBottom: 8, cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F4F6F8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{a.title}</div><div style={{ fontSize: 12, color: "#7D8A96", lineHeight: 1.45 }}>{a.desc}</div></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#9CA8B4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ App ═══ */
export default function SierraTrac() {
  const [view, setView] = useState("search");
  const [inst, setInst] = useState(null);
  const [warning, setWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const search = (q) => {
    setSearchQuery(q);
    // Check system ID
    if (q === SYSTEM.id) { setView("system"); return; }
    // Check instruments
    const found = INSTRUMENTS[q];
    if (found) { setInst({ ...found, _warning: warning && found.sn === "DE83710294" }); setView("instrument"); return; }
    // Not found
    setView("notfound");
  };

  const goHome = () => { setView("search"); setInst(null); setSearchQuery(""); };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #F4F6F8; }
        input::placeholder, textarea::placeholder { color: #9CA8B4; }
        button { cursor: pointer; font-family: inherit; }
        input:focus, textarea:focus { border-color: #2471A3 !important; box-shadow: 0 0 0 3px rgba(36,113,163,0.08); outline: none; }
      `}</style>
      {view === "search" && <SearchPage onSearch={search} />}
      {view === "instrument" && inst && <InstrumentPage data={inst} onBack={goHome} onRequestService={() => setView("request")} onViewSystem={() => setView("system")} />}
      {view === "request" && inst && <ServiceRequestPage inst={inst} onBack={() => { setView("instrument"); setInst({ ...inst, _warning: true }); }} onSubmit={() => setWarning(true)} />}
      {view === "system" && <SystemPage sys={SYSTEM} onBack={goHome} onInstrument={search} />}
      {view === "notfound" && <NotFoundPage query={searchQuery} onBack={goHome} />}
    </div>
  );
}

/* ═══ Styles ═══ */
const S = {
  app: { minHeight: "100vh", background: "#F4F6F8", fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", color: "#1C2833", maxWidth: 480, margin: "0 auto" },
  searchPage: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 24px", background: "#fff" },
  searchInner: { display: "flex", flexDirection: "column", alignItems: "center" },
  logoGroup: { display: "flex", alignItems: "center", gap: 12, marginBottom: 48 },
  searchBox: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#F4F6F8", borderRadius: 12, border: "2px solid #E8ECF0", transition: "all 0.2s" },
  searchBoxF: { borderColor: "#2471A3", background: "#fff", boxShadow: "0 0 0 4px rgba(36,113,163,0.08)" },
  searchInput: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, fontFamily: "'IBM Plex Mono', monospace", color: "#1C2833" },
  searchBtn: { width: "100%", padding: 14, marginTop: 12, background: "#2471A3", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600 },
  tryRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 20 },
  tryChip: { padding: "5px 10px", borderRadius: 6, border: "1px solid #E8ECF0", background: "#F4F6F8", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#2471A3", fontWeight: 500 },
  resultPage: { minHeight: "100vh", background: "#F4F6F8" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E8ECF0", position: "sticky", top: 0, zIndex: 50 },
  backBtn: { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#2471A3", fontSize: 14, fontWeight: 600 },
  tracBadge: { fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#7D8A96", background: "#F4F6F8", padding: "4px 10px", borderRadius: 6 },
  qrTag: { display: "inline-flex", padding: "3px 8px", borderRadius: 20, background: "#EBF5FB", color: "#2471A3", fontSize: 11, fontWeight: 600, border: "1px solid #D4E6F1" },
  metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#E8ECF0", borderRadius: 10, overflow: "hidden" },
  metaCell: { padding: "10px 12px", background: "#FAFBFC" },
  metaK: { fontSize: 10, color: "#7D8A96", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 },
  metaV: { fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 },
  tabRow: { display: "flex", margin: "12px 12px 0", background: "#fff", borderRadius: 10, border: "1px solid #E8ECF0", padding: 3, gap: 2 },
  tabBtn: { flex: 1, padding: "10px 0", background: "none", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#7D8A96" },
  tabActive: { background: "#2471A3", color: "#fff" },
  bottomAction: { position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid #E8ECF0", padding: "12px 16px", zIndex: 50 },
  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", background: "#2471A3", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  btnSec: { display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", background: "#F4F6F8", color: "#566573", border: "1px solid #E8ECF0", borderRadius: 10, fontSize: 14, fontWeight: 600 },
  formCard: { background: "#fff", borderRadius: 14, border: "1px solid #E8ECF0", padding: 16, marginBottom: 12 },
  input: { width: "100%", padding: "10px 12px", background: "#FAFBFC", border: "1.5px solid #E8ECF0", borderRadius: 8, fontSize: 14, color: "#1C2833", outline: "none" },
  textarea: { width: "100%", padding: "10px 12px", background: "#FAFBFC", border: "1.5px solid #E8ECF0", borderRadius: 8, fontSize: 14, color: "#1C2833", outline: "none", resize: "vertical", lineHeight: 1.5, fontFamily: "'IBM Plex Sans', sans-serif", minHeight: 100 },
  urgencyBtn: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E8ECF0", background: "#fff", textAlign: "left", transition: "all 0.15s" },
  errorChip: { padding: "6px 10px", borderRadius: 8, border: "1px solid #E8ECF0", background: "#F4F6F8", fontSize: 12, fontWeight: 500, color: "#566573", textAlign: "left", transition: "all 0.12s" },
  errorChipSel: { background: "#2471A3", color: "#fff", borderColor: "#2471A3" },
  reviewRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F0F2F4", gap: 12, alignItems: "flex-start" },
  reviewK: { fontSize: 12, color: "#7D8A96", fontWeight: 500, flexShrink: 0 },
  reviewV: { fontSize: 13, fontWeight: 500, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" },
  metaRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F0F2F4" },
  metaRowK: { fontSize: 12, color: "#7D8A96" },
  metaRowV: { fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 },
};
