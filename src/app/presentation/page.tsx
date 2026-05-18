"use client";

import { useState, useEffect, useRef } from "react";

const T = { navy: "#0A1628", teal: "#028090", mint: "#02C39A", orange: "#E07B39", red: "#DC2626", amber: "#D97706", purple: "#7C3AED", white: "#F0F6FF", dim: "#4A6280", muted: "#1E3050" };
const MODULE = { M1: { color: "#028090", label: "Procurement to Payment" }, M2: { color: "#2563EB", label: "Project Progress" }, M3: { color: "#E07B39", label: "Safety Compliance" }, M4: { color: "#7C3AED", label: "HR & Manpower" }, M5: { color: "#02C39A", label: "AI Intelligence Layer" } };
const W = 1080, H = 590;

const NODES = {
  ceo: { x: 452, y: 16, w: 152, h: 52, name: "Joseph Lim", role: "CEO", tier: 0, hi: "#C4841E", bg: "#2A1505", before: ["No real-time operations visibility", "Relies on WhatsApp for all status updates", "Manual consolidated reports from all departments"], after: ["Daily Management Dashboard ready by 7AM", "AI-generated exception alerts feed", "Full cross-entity view across P&H, J&P, Goodman"] },
  eileen: { x: 38, y: 130, w: 155, h: 54, name: "Eileen Fang", role: "Business Director", tier: 1, hi: "#7B5BC4", bg: "#1A0E38", before: ["No unified view across HR, Finance, Procurement", "Data arrives via email and Excel manually", "Oversees 5 departments with no integrated reporting"], after: ["Business overview dashboard across all functions", "M1 Procurement + M4 HR module rollup", "Exception alerts escalated automatically to her"] },
  mary: { x: 308, y: 130, w: 145, h: 52, name: "Mary Goh", role: "QAQC Manager", tier: 1, hi: "#37A06A", bg: "#0C2818", before: ["Quality records maintained on paper", "Site evidence shared via WhatsApp photos", "No digital audit trail for QA/QC activities"], after: ["Digital QA/QC evidence tracking per job", "Site photos linked to job records via M2", "Automated compliance report generation"] },
  kenny: { x: 558, y: 130, w: 145, h: 52, name: "Kenny Oh", role: "HSE Manager", tier: 1, hi: "#C4641A", bg: "#2A1005", before: ["MSRA records are paper-based", "Toolbox meeting logs done manually", "No automated certification expiry or safety alerts"], after: ["M3 Safety Compliance module owner", "MSRA digitally tracked with site evidence", "Automated certification expiry and safety alerts"] },
  paul: { x: 818, y: 130, w: 162, h: 52, name: "Paul Lim", role: "Technical Director", tier: 1, hi: "#4A90D9", bg: "#06142A", before: ["Operations updates come via WhatsApp", "No real-time job completion visibility", "Hard Svcs, Soft Svcs, IT each fully siloed"], after: ["M2 Project Progress dashboard owner", "Real-time job completion % per project", "AI scheduling assistant for all technicians"] },
  hr: { x: 8, y: 262, w: 120, h: 70, name: "HR", role: "Albert Hsu", tier: 2, hi: "#9B4DBB", bg: "#16082A", mod: "M4", before: ["NHGP timesheet reconciliation fully manual", "Worker certifications tracked in disparate files", "Inter-entity tenure resets when staff transfers between group companies"], after: ["Automated 3-step timesheet reconciliation (Ingest → Audit → Validate)", "Centralised certification database for all 160 staff", "Continuous cross-entity tenure tracking"] },
  fin: { x: 136, y: 262, w: 120, h: 70, name: "Finance", role: "Yee Nee / Stella", tier: 2, hi: "#4A90D9", bg: "#06142A", mod: "M1", before: ["Manual 3-way invoice matching (PO / GRN / Invoice)", "SOA distribution done by hand every billing cycle", "No exception flagging for overdue or mismatched payments"], after: ["Automated 3-way invoice matching with variance alerts", "Auto SOA distribution to all clients on schedule", "Real-time overdue payment and mismatch notifications"] },
  pro: { x: 264, y: 262, w: 120, h: 70, name: "Procurement", role: "Sandra Ng / Louise", tier: 2, hi: "#028090", bg: "#001820", mod: "M1", before: ["~1,300 materials sitting idle in warehouse due to poor visibility", "PO tracking fragmented across P&H and J&P entities", "Material follow-up done by phone and WhatsApp daily"], after: ["Full Quotation → PR → PO → GRN → Invoice flow digitised", "Materials availability visible in real-time across entities", "Automated alerts for pending PRs and overdue POs"] },
  qs: { x: 392, y: 262, w: 120, h: 70, name: "QS", role: "Geralyn", tier: 2, hi: "#37A06A", bg: "#0C2818", mod: "M2", before: ["Site surveys conducted entirely on paper", "Survey photos shared via WhatsApp with no structure", "Method of Statement (MOS) documents generated manually"], after: ["Digital site evidence capture per activity per job", "OCR extraction from site survey photos", "AI-assisted MOS document drafting from scope database"] },
  saf: { x: 537, y: 262, w: 120, h: 70, name: "Safety", role: "Azriffin / Jayabal", tier: 2, hi: "#E07B39", bg: "#2A1005", mod: "M3", before: ["MSRA forms completed entirely on paper", "Toolbox meetings not digitally logged or tracked", "No compliance dashboard or automated alert system"], after: ["Digital MSRA records with evidence photo upload", "Toolbox meeting tracker with attendance log", "Automated safety compliance dashboard and escalation alerts"] },
  hard: { x: 665, y: 262, w: 120, h: 70, name: "Hard Svcs", role: "Naresh / Gary Yun", tier: 2, hi: "#4A90D9", bg: "#06142A", mod: "M2", before: ["50–100 live jobs tracked by memory and WhatsApp", "Job status updates only available via WhatsApp", "Staff skills and certifications not searchable in any system"], after: ["Live job completion % dashboard ready every 7AM", "FSOR digital updates per activity per job in real-time", "Searchable staff skills and certification database"] },
  it: { x: 793, y: 262, w: 120, h: 70, name: "IT", role: "Chen Zhen Yu", tier: 2, hi: "#02C39A", bg: "#001A10", mod: "M5", before: ["ERP data exports done manually each time data is needed", "Manages multiple fragmented WhatsApp groups for comms", "No automation or integration platform in place"], after: ["Owns and manages the ERP overnight extract process", "M5 AI Intelligence Layer custodian and platform admin", "Config, users, data access control, and security oversight"] },
  soft: { x: 921, y: 262, w: 120, h: 70, name: "Soft Svcs", role: "Khairul", tier: 2, hi: "#7B5BC4", bg: "#1A0E38", mod: "M2", before: ["200+ staff managed across 6 operations executives", "Staff deployment tracked manually with no dashboard", "Productivity not formally measured or reported anywhere"], after: ["Staff deployment dashboard across all active sites", "Daily attendance auto-tracked and reported to management", "Productivity metrics visible and benchmarked over time"] },
  hub: { x: 390, y: 445, w: 258, h: 78, name: "On3oard AI Platform", role: "Overnight Extract · AI Processing · Dept Briefings · Ready by 7AM", tier: 3, hi: "#02C39A", bg: "#001E28", before: [], after: ["Processes scheduled ERP extract every midnight", "Generates department-specific AI briefings automatically", "Delivers all 5 module dashboards by 7AM every day", "Flags anomalies, invoice mismatches and exceptions", "Feeds management summary reports and AI alerts feed"] },
};

const cx = (id: string) => NODES[id as keyof typeof NODES].x + NODES[id as keyof typeof NODES].w / 2;
const cy = (id: string) => NODES[id as keyof typeof NODES].y + NODES[id as keyof typeof NODES].h / 2;
const nt = (id: string) => [cx(id), NODES[id as keyof typeof NODES].y];
const nb = (id: string) => [cx(id), NODES[id as keyof typeof NODES].y + NODES[id as keyof typeof NODES].h];
const nr = (id: string) => [NODES[id as keyof typeof NODES].x + NODES[id as keyof typeof NODES].w, cy(id)];
const nl = (id: string) => [NODES[id as keyof typeof NODES].x, cy(id)];
const bz = ([x1, y1]: number[], [x2, y2]: number[]) => { const my = (y1 + y2) / 2; return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`; };
const qz = ([x1, y1]: number[], mx: number, my: number, [x2, y2]: number[]) => `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;

const ORG = [['ceo', 'eileen'], ['ceo', 'mary'], ['ceo', 'kenny'], ['ceo', 'paul'], ['eileen', 'hr'], ['eileen', 'fin'], ['eileen', 'pro'], ['eileen', 'qs'], ['paul', 'saf'], ['paul', 'hard'], ['paul', 'it'], ['paul', 'soft']];

const CHAOS = [
  { path: qz(nb('hard'), 790, 165, nb('ceo')), stroke: T.red, w: 1.8, dash: "5,3", lbl: "📱 WhatsApp status", lx: 766, ly: 158 },
  { path: qz(nb('soft'), 1060, 90, nb('ceo')), stroke: T.red, w: 1.8, dash: "5,3", lbl: "📱 WhatsApp", lx: 1038, ly: 82 },
  { path: qz(nr('fin'), 258, 382, nl('pro')), stroke: T.amber, w: 1.8, dash: "4,3", lbl: "Manual 3-way match", lx: 210, ly: 375 },
  { path: qz(nb('it'), 690, 412, nb('fin')), stroke: T.purple, w: 1.6, dash: "4,3", lbl: "Manual ERP export", lx: 635, ly: 408 },
  { path: qz(nb('it'), 615, 430, nb('pro')), stroke: T.purple, w: 1.4, dash: "4,3" },
  { path: qz(nb('it'), 530, 445, nb('hr')), stroke: T.purple, w: 1.4, dash: "4,3" },
  { path: qz(nb('qs'), 360, 412, nb('fin')), stroke: T.amber, w: 1.6, dash: "4,3", lbl: "Manual invoice", lx: 302, ly: 410 },
  { path: qz(nt('saf'), 715, 190, nb('paul')), stroke: T.red, w: 1.6, dash: "5,3", lbl: "📄 Paper reports", lx: 720, ly: 182 },
  { path: qz(nt('hr'), 40, 212, nb('eileen')), stroke: T.amber, w: 1.6, dash: "4,3", lbl: "Excel sheets", lx: 8, ly: 202 },
];

const HT = nt('hub');
const CLEAN = [
  { path: `M${cx('ceo')},${NODES.ceo.y} L${cx('ceo')},65 L${HT[0]},65 L${HT[0]},${HT[1]}`, stroke: "#4B5563", w: 1.5, dash: "8,4", lbl: "ERP overnight extract", lx: HT[0] + 10, ly: 72 },
  { path: bz(HT, nb('ceo')), stroke: T.mint, w: 2.8, lbl: "Mgmt Dashboard", lx: HT[0] + 10, ly: 328 },
  { path: bz(HT, nb('eileen')), stroke: T.mint, w: 1.8 },
  { path: bz(HT, nb('paul')), stroke: T.mint, w: 1.8 },
  { path: bz(HT, nb('hr')), stroke: MODULE.M4.color, w: 2.2, lbl: "M4", lx: 14, ly: 415 },
  { path: bz(HT, nb('fin')), stroke: MODULE.M1.color, w: 2.2, lbl: "M1", lx: 153, ly: 420 },
  { path: bz(HT, nb('pro')), stroke: MODULE.M1.color, w: 2.2 },
  { path: bz(HT, nb('qs')), stroke: MODULE.M2.color, w: 2.2, lbl: "M2", lx: 414, ly: 422 },
  { path: bz(HT, nb('saf')), stroke: MODULE.M3.color, w: 2.2, lbl: "M3", lx: 559, ly: 422 },
  { path: bz(HT, nb('hard')), stroke: MODULE.M2.color, w: 2.2 },
  { path: bz(HT, nb('it')), stroke: MODULE.M5.color, w: 2.2, lbl: "M5", lx: 830, ly: 415 },
  { path: bz(HT, nb('soft')), stroke: MODULE.M2.color, w: 2.2 },
];

function getTooltipPos(node: any, itemCount: number) {
  const PW = 262, PH = itemCount * 34 + 72;
  let left = node.x + node.w + 14;
  if (left + PW > W - 6) left = node.x - PW - 14;
  left = Math.max(4, Math.min(W - PW - 4, left));
  let top = node.y;
  if (top + PH > H - 6) top = H - PH - 6;
  top = Math.max(4, top);
  return { left, top, width: PW };
}

export default function PresentationPage() {
  const [mode, setMode] = useState("before");
  const [hovered, setHovered] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const r = () => { if (wrapRef.current) { const a = wrapRef.current.clientWidth - 24; setScale(Math.min(1, a / W)); } };
    r(); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r);
  }, []);

  const isAfter = mode === "after";
  const hovNode = hovered ? NODES[hovered as keyof typeof NODES] : null;
  const tipItems = hovNode ? (isAfter ? (hovNode.after || []) : (hovNode.before || [])) : [];

  return (
    <div style={{ background: T.navy, minHeight: "100vh", fontFamily: "'Outfit', 'DM Sans', sans-serif", color: T.white }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .nc{transition:transform .15s ease,border-color .2s ease;cursor:pointer;}
        .nc:hover{transform:scale(1.07);z-index:99!important;}
        .hg{animation:hp 2.8s ease-in-out infinite;}
        @keyframes hp{0%,100%{box-shadow:0 0 18px #02C39A55,0 0 40px #028090AA;}50%{box-shadow:0 0 32px #02C39A88,0 0 60px #028090CC;}}
        .tb{transition:all .2s;letter-spacing:.06em;} .tb:hover{transform:translateY(-2px);}
        .tip{animation:tfade .14s ease;}
        @keyframes tfade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
      `}</style>

      {/* Header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.muted}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.teal, letterSpacing: "0.18em", marginBottom: 3 }}>ON3OARD AI CONSULTING  ·  PNH GROUP</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>Organisation Workflow Architecture</h1>
          <p style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>Hover any node to see full details. Toggle to compare Before vs After.</p>
        </div>
        <div style={{ display: "flex", background: T.muted, borderRadius: 10, padding: 3, gap: 3 }}>
          {["before", "after"].map(m => (
            <button key={m} className="tb" onClick={() => setMode(m)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", background: mode === m ? (m === "before" ? T.red : T.teal) : "transparent", color: mode === m ? "#fff" : T.dim }}>
              {m === "before" ? "⚠ BEFORE" : "✦ AFTER ON3OARD"}
            </button>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ padding: "9px 22px", background: isAfter ? "#001E18" : "#1A0808", borderBottom: `1px solid ${isAfter ? "#024030" : "#3A1010"}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", transition: "background .5s" }}>
        {isAfter ? (
          <>
            <span style={{ fontSize: 10, color: T.mint, fontWeight: 700 }}>✦ ERP EXTRACT (MIDNIGHT)</span>
            <span style={{ color: T.dim, fontSize: 10 }}>→</span>
            <span style={{ fontSize: 10, color: T.mint, fontWeight: 700 }}>ON3OARD AI PROCESSING</span>
            <span style={{ color: T.dim, fontSize: 10 }}>→</span>
            <span style={{ fontSize: 10, color: T.mint, fontWeight: 700 }}>ALL DASHBOARDS READY BY 7AM</span>
            {Object.entries(MODULE).map(([k, v]) => (
              <span key={k} style={{ fontSize: 9, fontWeight: 700, color: v.color, background: v.color + "22", border: `1px solid ${v.color}55`, borderRadius: 4, padding: "2px 6px" }}>{k}</span>
            ))}
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>⚠ FRAGMENTED WORKFLOWS ACROSS ALL DEPARTMENTS</span>
            {["📱 Status via WhatsApp", "📊 Manual Excel exports", "📄 Paper records", "~1,300 idle materials", "No real-time visibility"].map(s => (
              <span key={s} style={{ fontSize: 10, color: T.amber }}>{s}</span>
            ))}
          </>
        )}
      </div>

      {/* Canvas */}
      <div ref={wrapRef} style={{ padding: "14px 12px 0" }}>
        <div style={{ position: "relative", width: W, height: H, transformOrigin: "top left", transform: `scale(${scale})`, marginBottom: scale < 1 ? H * scale - H : 0 }}>

          {/* SVG lines */}
          <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible", zIndex: 1 }}>
            {ORG.map(([a, b], i) => (
              <path key={i} d={bz(nb(a), nt(b))} fill="none" stroke="#3A5070" strokeWidth={1.3} strokeOpacity={isAfter ? 0.15 : 0.5} />
            ))}
            {!isAfter && CHAOS.map((c, i) => (
              <g key={i}>
                <path d={c.path} fill="none" stroke={c.stroke} strokeWidth={c.w} strokeDasharray={c.dash || ""} strokeOpacity={.78} />
                {c.lbl && <text x={c.lx} y={c.ly} fill={c.stroke} fontSize={9} fontFamily="Outfit,sans-serif" fontWeight={600} opacity={.85}>{c.lbl}</text>}
              </g>
            ))}
            {isAfter && CLEAN.map((c, i) => (
              <g key={i}>
                <path d={c.path} fill="none" stroke={c.stroke} strokeWidth={c.w} strokeDasharray={c.dash || ""} strokeOpacity={.72} />
                {c.lbl && <text x={c.lx} y={c.ly} fill={c.stroke} fontSize={9.5} fontFamily="Outfit,sans-serif" fontWeight={700} opacity={.9}>{c.lbl}</text>}
              </g>
            ))}
          </svg>

          {/* Node cards */}
          {Object.entries(NODES).map(([id, n]) => {
            if (id === "hub" && !isAfter) return null;
            const isHub = id === "hub", isHov = hovered === id;
            return (
              <div key={id} className={`nc ${isHub && isAfter ? "hg" : ""}`}
                onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)}
                style={{ position: "absolute", left: n.x, top: n.y, width: n.w, height: n.h, background: n.bg, border: `1.5px solid ${isHov ? n.hi : n.hi + "44"}`, borderRadius: isHub ? 12 : 8, display: "flex", flexDirection: "column", justifyContent: "center", padding: isHub ? "0 14px" : "0 9px", zIndex: isHub ? 10 : isHov ? 20 : (id === "ceo" ? 5 : 2) }}>
                {isHub ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 15, color: T.mint }}>✦</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.mint }}>{n.name}</span>
                    </div>
                    <div style={{ fontSize: 9, color: T.teal, marginTop: 3, lineHeight: 1.5 }}>{n.role}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {Object.entries(MODULE).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 8, fontWeight: 700, color: v.color, background: v.color + "22", border: `1px solid ${v.color}55`, borderRadius: 3, padding: "1px 5px" }}>{k}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
                      <div>
                        <div style={{ fontSize: n.tier === 2 ? 11 : 12, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>{n.name}</div>
                        <div style={{ fontSize: n.tier === 2 ? 9 : 9.5, color: n.hi, marginTop: 2, lineHeight: 1.3 }}>{n.role}</div>
                      </div>
                      {"mod" in n && n.mod && (
                        <div style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 4, flexShrink: 0, marginTop: 1, color: isAfter ? MODULE[n.mod as keyof typeof MODULE].color : T.red, background: isAfter ? MODULE[n.mod as keyof typeof MODULE].color + "22" : T.red + "22", border: `1px solid ${isAfter ? MODULE[n.mod as keyof typeof MODULE].color + "66" : T.red + "66"}` }}>
                          {isAfter ? n.mod : "⚠"}
                        </div>
                      )}
                    </div>
                    {"before" in n && n.before && (
                      <div style={{ marginTop: 4, fontSize: 8.5, color: isAfter ? T.mint + "AA" : T.red + "AA", fontWeight: 500 }}>
                        {isAfter ? `${(n.after || []).length} capabilities` : `${(n.before || []).length} pain points`} — hover to view
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* ── HTML TOOLTIP ─────────────── */}
          {hovered && hovNode && tipItems.length > 0 && (() => {
            const { left, top, width } = getTooltipPos(hovNode, tipItems.length);
            return (
              <div className="tip" style={{ position: "absolute", left, top, width, zIndex: 500, background: "#040E1C", border: `2px solid ${hovNode.hi}`, borderRadius: 12, padding: "14px 16px", pointerEvents: "none", boxShadow: `0 12px 40px #00000099, 0 0 0 1px ${hovNode.hi}33` }}>
                {/* Tooltip header */}
                <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid #1A2E42` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: hovNode.hi, lineHeight: 1.3, marginBottom: 3 }}>{hovNode.name}</div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 6 }}>{hovNode.role}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: isAfter ? T.mint : T.red, background: isAfter ? "#02C39A18" : "#DC262618", border: `1px solid ${isAfter ? T.mint + "44" : T.red + "44"}`, borderRadius: 4, padding: "2px 7px" }}>
                      {isAfter ? "✦ AFTER ON3OARD" : "⚠ CURRENT STATE"}
                    </span>
                    {"mod" in hovNode && hovNode.mod && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: MODULE[hovNode.mod as keyof typeof MODULE].color, background: MODULE[hovNode.mod as keyof typeof MODULE].color + "22", border: `1px solid ${MODULE[hovNode.mod as keyof typeof MODULE].color}55`, borderRadius: 4, padding: "2px 7px" }}>{hovNode.mod} — {MODULE[hovNode.mod as keyof typeof MODULE].label}</span>
                    )}
                  </div>
                </div>
                {/* Tooltip items */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {tipItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, color: isAfter ? T.mint : T.red, flexShrink: 0, lineHeight: 1.1, marginTop: 1 }}>{isAfter ? "✓" : "✗"}</span>
                      <span style={{ fontSize: 11.5, color: isAfter ? "#C0EDD8" : "#EDBBBB", lineHeight: 1.55, fontWeight: 400 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ERP label */}
          {isAfter && (
            <div style={{ position: "absolute", left: W - 285, top: 12, background: "#111827", border: "1px dashed #4B5563", borderRadius: 6, padding: "5px 12px", zIndex: 5, pointerEvents: "none" }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em" }}>ERP SYSTEM  ·  EXISTING · UNTOUCHED</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ padding: "14px 22px 18px", borderTop: `1px solid ${T.muted}`, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: scale < 1 ? 16 : 0 }}>
        {isAfter ? (
          <>
            <span style={{ fontSize: 10, color: T.dim, fontWeight: 700, letterSpacing: "0.1em" }}>MODULE KEY</span>
            {Object.entries(MODULE).map(([k, v]) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                <span style={{ width: 26, height: 3, background: v.color, borderRadius: 2, display: "inline-block" }} />
                <span style={{ color: v.color, fontWeight: 700 }}>{k}</span>
                <span style={{ color: T.dim }}>{v.label}</span>
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 9.5, color: T.teal, fontWeight: 600 }}>— Hover any node for capabilities —</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 10, color: T.dim, fontWeight: 700, letterSpacing: "0.1em" }}>CONNECTION KEY</span>
            {[{ c: T.red, lbl: "WhatsApp / Informal" }, { c: T.amber, lbl: "Manual / Excel" }, { c: T.purple, lbl: "Manual ERP export" }].map(({ c, lbl }) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                <svg width={26} height={10}><line x1={0} y1={5} x2={26} y2={5} stroke={c} strokeWidth={2} strokeDasharray="5,3" /></svg>
                <span style={{ color: T.dim }}>{lbl}</span>
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 9.5, color: T.dim, fontWeight: 600 }}>— Hover any node for pain points —</span>
          </>
        )}
      </div>
    </div>
  );
}
