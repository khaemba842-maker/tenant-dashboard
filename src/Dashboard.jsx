import { useState, useEffect, useCallback } from "react";

const BASE_ID = "app7mLVLcLGI3mqKF";
const TABLE_IDS = {
  TENANTS:  "tblQIfaVVIVw3URwg",
  LEDGER:   "tbl8m62u87N4Ktz74",
  PAYMENTS: "tblNkds8ZZG4DL0Xl",
};

async function proxyFetch(path) {
  const res = await fetch(`/api/airtable${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed: ${res.status} on ${path}`);
  return data;
}

async function fetchAllRecords(tableId) {
  let records = [], offset = null;
  do {
    const qs = offset ? `?offset=${offset}` : "";
    const data = await proxyFetch(`/v0/${BASE_ID}/${tableId}${qs}`);
    records = [...records, ...data.records];
    offset = data.offset || null;
  } while (offset);
  return records;
}

const fmt = (n) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0c0c0d; --bg2: #111113; --bg3: #161618;
    --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.1);
    --gold: #c9a84c; --gold-dim: #9a7a32; --gold-glow: rgba(201,168,76,0.15);
    --ivory: #f0ebe0; --muted: rgba(240,235,224,0.4); --muted2: rgba(240,235,224,0.2);
    --green: #3d9970; --green-bg: rgba(61,153,112,0.1);
    --red: #e05252; --red-bg: rgba(224,82,82,0.1);
    --amber: #d4821a; --amber-bg: rgba(212,130,26,0.1);
    --font-display: 'Cormorant Garamond', Georgia, serif;
    --font-body: 'Outfit', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  body { background: var(--bg); color: var(--ivory); font-family: var(--font-body); }
  .grain { position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 128px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes barFill { from { width: 0; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .fade-up { animation: fadeUp 0.5s ease both; }
  .fade-up-1 { animation-delay:0.05s; } .fade-up-2 { animation-delay:0.12s; }
  .fade-up-3 { animation-delay:0.19s; } .fade-up-4 { animation-delay:0.26s; }
  .fade-up-5 { animation-delay:0.33s; } .fade-up-6 { animation-delay:0.40s; }
  .card { background:var(--bg2); border:1px solid var(--border); border-radius:16px; transition:border-color 0.2s; }
  .card:hover { border-color: var(--border2); }
  .stat-card { background:var(--bg2); border:1px solid var(--border); border-radius:16px;
    padding:28px 28px 24px; position:relative; overflow:hidden;
    transition:border-color 0.2s, transform 0.2s; cursor:default; }
  .stat-card:hover { border-color:var(--border2); transform:translateY(-2px); }
  .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--gold-dim),transparent); opacity:0; transition:opacity 0.3s; }
  .stat-card:hover::before { opacity:1; }
  .money { font-family:var(--font-mono); font-weight:400; letter-spacing:-0.02em; }
  .gold { color:var(--gold); }
  .tab-btn { background:none; border:none; cursor:pointer; font-family:var(--font-body);
    font-size:13px; font-weight:500; color:var(--muted); padding:14px 20px;
    border-bottom:2px solid transparent; letter-spacing:0.04em; text-transform:uppercase;
    transition:color 0.2s, border-color 0.2s; }
  .tab-btn:hover { color:var(--ivory); }
  .tab-btn.active { color:var(--ivory); border-bottom-color:var(--gold); }
  .badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px;
    font-size:11px; font-weight:600; letter-spacing:0.04em; }
  .badge-dot { width:5px; height:5px; border-radius:50%; }
  .badge-paid { background:var(--green-bg); color:var(--green); }
  .badge-unpaid { background:var(--red-bg); color:var(--red); }
  .badge-partial { background:var(--amber-bg); color:var(--amber); }
  .tenant-row { display:grid; grid-template-columns:1.8fr 72px 130px 130px 130px 130px;
    border-bottom:1px solid var(--border); transition:background 0.15s; }
  .tenant-row:last-child { border-bottom:none; }
  .tenant-row:hover { background:rgba(255,255,255,0.02); }
  .ledger-row { display:grid; grid-template-columns:56px 1.6fr 120px 120px 110px 120px 110px 72px;
    border-bottom:1px solid var(--border); transition:background 0.15s; }
  .ledger-row:last-child { border-bottom:none; }
  .ledger-row:hover { background:rgba(255,255,255,0.02); }
  .cell { padding:14px 16px; display:flex; align-items:center; }
  .search-input { background:var(--bg3); border:1px solid var(--border); color:var(--ivory);
    border-radius:10px; padding:9px 16px; font-size:13px; outline:none;
    font-family:var(--font-body); width:240px; transition:border-color 0.2s; }
  .search-input::placeholder { color:var(--muted2); }
  .search-input:focus { border-color:var(--border2); }
  .refresh-btn { background:var(--bg3); border:1px solid var(--border); color:var(--muted);
    border-radius:8px; padding:8px 16px; font-size:12px; cursor:pointer;
    font-family:var(--font-body); font-weight:500; letter-spacing:0.04em; text-transform:uppercase;
    transition:all 0.2s; }
  .refresh-btn:hover { color:var(--ivory); border-color:var(--border2); }
  .avatar { width:34px; height:34px; border-radius:50%; background:var(--bg3);
    border:1px solid var(--border); display:flex; align-items:center; justify-content:center;
    font-family:var(--font-display); font-size:14px; font-weight:600; color:var(--gold);
    flex-shrink:0; letter-spacing:0.02em; }
  .unpaid-item { padding:12px 16px; border-radius:10px; border:1px solid var(--border);
    background:var(--bg3); display:flex; justify-content:space-between; align-items:center;
    transition:border-color 0.2s; }
  .unpaid-item:hover { border-color:rgba(224,82,82,0.3); }
  .due-item { padding:12px 16px; border-radius:10px; border:1px solid rgba(212,130,26,0.15);
    background:rgba(212,130,26,0.04); display:flex; justify-content:space-between; align-items:center; }
  .section-label { font-size:10px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase;
    color:var(--muted); display:flex; align-items:center; gap:10px; margin-bottom:18px; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--border); }
  .section-count { background:var(--border2); color:var(--ivory); border-radius:20px;
    padding:2px 8px; font-size:10px; font-weight:600; }
  .th { padding:12px 16px; font-size:10px; font-weight:600; letter-spacing:0.1em;
    color:var(--muted); text-transform:uppercase; border-bottom:1px solid var(--border); background:var(--bg3); }
  .bar-fill { animation:barFill 1.2s cubic-bezier(0.16,1,0.3,1) both; }
  .live-dot { width:6px; height:6px; border-radius:50%; background:var(--green);
    animation:pulse 2s ease infinite; display:inline-block; }
`;

const Badge = ({ status }) => {
  const map = {
    Paid:    ["badge-paid",    "#3d9970"],
    Unpaid:  ["badge-unpaid",  "#e05252"],
    Partial: ["badge-partial", "#d4821a"],
    Overdue: ["badge-unpaid",  "#e05252"],
  };
  const [cls, dot] = map[status] || ["badge-partial", "#9e9690"];
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" style={{ background: dot }} />
      {status || "Unknown"}
    </span>
  );
};

export default function Dashboard() {
  const [tenants, setTenants]     = useState([]);
  const [ledger, setLedger]       = useState([]);
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch]       = useState("");

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, l, p] = await Promise.all([
        fetchAllRecords(TABLE_IDS.TENANTS),
        fetchAllRecords(TABLE_IDS.LEDGER),
        fetchAllRecords(TABLE_IDS.PAYMENTS),
      ]);
      setTenants(t); setLedger(l); setPayments(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalExpected    = tenants.reduce((s, t) => s + (t.fields["Rent Amount"] || 0), 0);
  const totalOutstanding = tenants.reduce((s, t) => s + (t.fields["Total Outstanding"] || 0), 0);
  const totalCollected   = totalExpected - totalOutstanding;
  const rate             = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const unpaid           = tenants.filter(t => (t.fields["Total Outstanding"] || 0) > 0);
  const dueSoon          = tenants.filter(t => { const d = daysUntil(t.fields["next_due_date"]); return d !== null && d >= 0 && d <= 7; });
  const recentPay        = [...payments].sort((a,b) => new Date(b.fields["DueDate"]||0) - new Date(a.fields["DueDate"]||0)).slice(0,8);
  const filtered         = tenants.filter(t =>
    (t.fields["Name"]||"").toLowerCase().includes(search.toLowerCase()) ||
    (t.fields["House Number"]||"").toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const monthLabel = now.toLocaleString("en-KE", { month: "long", year: "numeric" });

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="grain" />
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20, background:"var(--bg)" }}>
        <div style={{ width:36, height:36, border:"2px solid rgba(201,168,76,0.2)", borderTopColor:"var(--gold)", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
        <p style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--muted)", fontStyle:"italic", fontWeight:300 }}>Loading property data…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <style>{css}</style>
      <div className="grain" />
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, background:"var(--bg)" }}>
        <p style={{ color:"var(--red)", fontWeight:600 }}>Failed to load data</p>
        <p style={{ color:"var(--muted)", fontSize:13 }}>{error}</p>
        <button onClick={loadData} className="refresh-btn" style={{ marginTop:8 }}>Retry</button>
      </div>
    </>
  );

  const tabs = [
    { id:"overview", label:"Overview" },
    { id:"tenants",  label:"Tenants"  },
    { id:"ledger",   label:"Ledger"   },
    { id:"payments", label:"M-Pesa Log" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="grain" />
      <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--ivory)" }}>

        <header style={{ borderBottom:"1px solid var(--border)", background:"rgba(12,12,13,0.9)", position:"sticky", top:0, zIndex:50, backdropFilter:"blur(12px)" }}>
          <div style={{ maxWidth:1360, margin:"0 auto", padding:"0 40px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:68 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1a1710,#2a2418)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ color:"var(--gold)", fontSize:16 }}>⌂</span>
                </div>
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:500, letterSpacing:"0.02em", lineHeight:1 }}>Property Manager</div>
                  <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:"0.12em", marginTop:3, textTransform:"uppercase", display:"flex", alignItems:"center", gap:6 }}>
                    <span className="live-dot" />
                    {tenants.length} units · Nairobi · {monthLabel}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>
                  {now.toLocaleDateString("en-KE", { weekday:"short", day:"numeric", month:"short" })}
                </span>
                <button onClick={loadData} className="refresh-btn">↻ Refresh</button>
              </div>
            </div>
            <nav style={{ display:"flex" }}>
              {tabs.map(t => (
                <button key={t.id} className={`tab-btn${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main style={{ maxWidth:1360, margin:"0 auto", padding:"44px 40px" }}>

          {activeTab==="overview" && (
            <div style={{ display:"flex", flexDirection:"column", gap:36 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
                {[
                  { label:"Total Expected",  value:fmt(totalExpected),    sub:`${tenants.length} active tenants`,      delay:"fade-up-1", accent:"var(--gold)"  },
                  { label:"Collected",        value:fmt(totalCollected),   sub:`${rate}% collection rate`,              delay:"fade-up-2", accent:"var(--green)" },
                  { label:"Outstanding",      value:fmt(totalOutstanding), sub:`${unpaid.length} tenants with balance`, delay:"fade-up-3", accent:totalOutstanding>0?"var(--red)":"var(--green)" },
                  { label:"Occupied Units",   value:tenants.length,        sub:"All units",                             delay:"fade-up-4", accent:"var(--ivory)" },
                ].map((s,i) => (
                  <div key={i} className={`stat-card fade-up ${s.delay}`}>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", color:"var(--muted)", textTransform:"uppercase", marginBottom:14 }}>{s.label}</div>
                    <div className="money" style={{ fontSize:30, fontWeight:400, color:s.accent, lineHeight:1, letterSpacing:"-0.03em" }}>{s.value}</div>
                    <div style={{ fontSize:12, color:"var(--muted)", marginTop:8, fontWeight:300 }}>{s.sub}</div>
                    <div style={{ position:"absolute", right:20, top:20, width:40, height:40, borderRadius:"50%", background:`radial-gradient(circle, ${s.accent}18, transparent)`, opacity:0.6 }} />
                  </div>
                ))}
              </div>

              <div className="card fade-up fade-up-5" style={{ padding:"28px 32px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", color:"var(--muted)", textTransform:"uppercase", marginBottom:6 }}>Monthly Collection — {monthLabel}</div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:15, color:"var(--muted)", fontWeight:300, fontStyle:"italic" }}>
                      {rate===100?"Full collection achieved":`${100-rate}% outstanding`}
                    </div>
                  </div>
                  <div className="money" style={{ fontSize:48, fontWeight:300, color:rate>=80?"var(--green)":"var(--amber)", letterSpacing:"-0.04em", lineHeight:1 }}>
                    {rate}<span style={{ fontSize:24, color:"var(--muted)" }}>%</span>
                  </div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:99, height:6, overflow:"hidden" }}>
                  <div className="bar-fill" style={{ height:"100%", borderRadius:99,
                    background:rate>=80?"linear-gradient(90deg,#2d7a5a,var(--green))":"linear-gradient(90deg,#a86010,var(--amber))",
                    width:`${rate}%` }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>
                  <span>{fmt(totalCollected)} collected</span>
                  <span>{fmt(totalOutstanding)} remaining</span>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div className="card fade-up fade-up-5" style={{ padding:"28px" }}>
                  <div className="section-label">Awaiting Payment{unpaid.length>0&&<span className="section-count">{unpaid.length}</span>}</div>
                  {unpaid.length===0
                    ? <div style={{ textAlign:"center", padding:"32px 0", color:"var(--green)", fontFamily:"var(--font-display)", fontSize:16, fontStyle:"italic", fontWeight:300 }}>All tenants have settled ✓</div>
                    : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {unpaid.map(t=>(
                          <div key={t.id} className="unpaid-item">
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div className="avatar">{(t.fields["Name"]||"?")[0].toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight:500, fontSize:14 }}>{t.fields["Name"]||"—"}</div>
                                <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>Unit {t.fields["House Number"]||"—"}</div>
                              </div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div className="money" style={{ fontWeight:500, color:"var(--red)", fontSize:14 }}>{fmt(t.fields["Total Outstanding"])}</div>
                              <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>due {fmtDate(t.fields["next_due_date"])}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>

                <div className="card fade-up fade-up-6" style={{ padding:"28px" }}>
                  <div className="section-label">Due Within 7 Days{dueSoon.length>0&&<span className="section-count">{dueSoon.length}</span>}</div>
                  {dueSoon.length===0
                    ? <div style={{ textAlign:"center", padding:"32px 0", color:"var(--muted)", fontFamily:"var(--font-display)", fontSize:16, fontStyle:"italic", fontWeight:300 }}>No upcoming due dates</div>
                    : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {dueSoon.map(t=>{
                          const d=daysUntil(t.fields["next_due_date"]);
                          return (
                            <div key={t.id} className="due-item">
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                <div className="avatar">{(t.fields["Name"]||"?")[0].toUpperCase()}</div>
                                <div>
                                  <div style={{ fontWeight:500, fontSize:14 }}>{t.fields["Name"]||"—"}</div>
                                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>Unit {t.fields["House Number"]||"—"}</div>
                                </div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontWeight:600, color:"var(--amber)", fontSize:12, letterSpacing:"0.02em" }}>{d===0?"Due today":`${d}d left`}</div>
                                <div className="money" style={{ fontSize:13, color:"var(--muted)", marginTop:1 }}>{fmt(t.fields["Rent Amount"])}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              </div>

              {recentPay.length>0&&(
                <div className="card fade-up fade-up-6" style={{ overflow:"hidden" }}>
                  <div style={{ padding:"24px 28px 16px" }}>
                    <div className="section-label">Recent M-Pesa Transactions</div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr 100px" }}>
                    {["Tenant","Amount","Date","Status"].map(h=><div key={h} className="th">{h}</div>)}
                    {recentPay.map((p,i)=>[
                      <div key={`n${i}`} className="cell" style={{ gap:10, fontSize:14, fontWeight:500 }}>
                        <div className="avatar" style={{ width:28, height:28, fontSize:12 }}>
                          {((Array.isArray(p.fields["Tenant"])?p.fields["Tenant"][0]:p.fields["Tenant"])||"?")[0]?.toUpperCase()}
                        </div>
                        {Array.isArray(p.fields["Tenant"])?p.fields["Tenant"][0]:(p.fields["Tenant"]||"—")}
                      </div>,
                      <div key={`a${i}`} className="cell money" style={{ color:"var(--green)", fontWeight:400, fontSize:14 }}>{fmt(p.fields["Total Paid"])}</div>,
                      <div key={`d${i}`} className="cell" style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{fmtDate(p.fields["DueDate"])}</div>,
                      <div key={`s${i}`} className="cell"><Badge status={p.fields["Status"]} /></div>,
                    ])}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="tenants"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }} className="fade-up">
                <div>
                  <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:400, letterSpacing:"0.01em" }}>Tenants</h1>
                  <p style={{ fontSize:13, color:"var(--muted)", marginTop:4, fontWeight:300 }}>{tenants.length} registered tenants</p>
                </div>
                <input className="search-input" placeholder="Search by name or unit…" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <div className="card fade-up fade-up-2" style={{ overflow:"hidden" }}>
                <div className="tenant-row">
                  {["Tenant","Unit","Monthly Rent","Last Payment","Next Due","Outstanding"].map(h=><div key={h} className="th">{h}</div>)}
                </div>
                {filtered.map((t,i)=>{
                  const out=t.fields["Total Outstanding"]||0;
                  return (
                    <div key={t.id} className="tenant-row">
                      <div className="cell" style={{ gap:12 }}>
                        <div className="avatar">{(t.fields["Name"]||"?")[0].toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:14 }}>{t.fields["Name"]||"—"}</div>
                          <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>Since {fmtDate(t.fields["MoveInDate"])}</div>
                        </div>
                      </div>
                      <div className="cell" style={{ fontSize:13, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{t.fields["House Number"]||"—"}</div>
                      <div className="cell money" style={{ fontSize:14, fontWeight:400 }}>{fmt(t.fields["Rent Amount"])}</div>
                      <div className="cell" style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{fmtDate(t.fields["last_payment_date"])}</div>
                      <div className="cell" style={{ fontSize:12, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{fmtDate(t.fields["next_due_date"])}</div>
                      <div className="cell money" style={{ fontSize:14, fontWeight:500, color:out>0?"var(--red)":"var(--green)" }}>{out>0?fmt(out):"Settled"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab==="ledger"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div className="fade-up">
                <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:400 }}>Rent Ledger</h1>
                <p style={{ fontSize:13, color:"var(--muted)", marginTop:4, fontWeight:300 }}>{ledger.length} entries</p>
              </div>
              <div className="card fade-up fade-up-2" style={{ overflow:"hidden" }}>
                <div className="ledger-row">
                  {["ID","Tenant","Rent Due","Paid","Balance","Due Date","Status","Days Late"].map(h=><div key={h} className="th">{h}</div>)}
                </div>
                {ledger.length===0
                  ? <div style={{ padding:48, textAlign:"center", color:"var(--muted)", fontFamily:"var(--font-display)", fontStyle:"italic" }}>No ledger records yet</div>
                  : ledger.map((r,i)=>{
                    const bal=r.fields["Balance"]||0, late=r.fields["Days Late"]||0;
                    return (
                      <div key={r.id} className="ledger-row">
                        <div className="cell" style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{r.fields["LedgerID"]||i+1}</div>
                        <div className="cell" style={{ fontWeight:500, fontSize:13 }}>{Array.isArray(r.fields["Tenant"])?r.fields["Tenant"][0]:(r.fields["Tenant"]||"—")}</div>
                        <div className="cell money" style={{ fontSize:13 }}>{fmt(r.fields["Rent Due"])}</div>
                        <div className="cell money" style={{ fontSize:13, color:"var(--green)", fontWeight:400 }}>{fmt(r.fields["Total Paid"])}</div>
                        <div className="cell money" style={{ fontSize:13, fontWeight:500, color:bal>0?"var(--red)":"var(--green)" }}>{bal>0?fmt(bal):"✓"}</div>
                        <div className="cell" style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{fmtDate(r.fields["DueDate"])}</div>
                        <div className="cell"><Badge status={r.fields["Status"]} /></div>
                        <div className="cell" style={{ fontSize:12, fontWeight:late>0?600:300, color:late>0?"var(--red)":"var(--muted)", fontFamily:"var(--font-mono)" }}>{late>0?`${late}d`:"—"}</div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

          {activeTab==="payments"&&(
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }} className="fade-up">
                <div>
                  <h1 style={{ fontFamily:"var(--font-display)", fontSize:32, fontWeight:400 }}>M-Pesa Log</h1>
                  <p style={{ fontSize:13, color:"var(--muted)", marginTop:4, fontWeight:300 }}>Verified transaction audit trail</p>
                </div>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--muted)", fontWeight:300 }}>{payments.length} transactions</div>
              </div>
              <div className="card fade-up fade-up-2" style={{ overflow:"hidden" }}>
                <div className="ledger-row">
                  {["ID","Tenant","Rent Due","Paid","Balance","Date","Status","Days Late"].map(h=><div key={h} className="th">{h}</div>)}
                </div>
                {payments.length===0
                  ? <div style={{ padding:48, textAlign:"center", color:"var(--muted)", fontFamily:"var(--font-display)", fontStyle:"italic" }}>No payment records yet</div>
                  : payments.map((r,i)=>{
                    const bal=r.fields["Balance"]||0, late=r.fields["Days Late"]||0;
                    return (
                      <div key={r.id} className="ledger-row">
                        <div className="cell" style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)" }}>{r.fields["LedgerID"]||i+1}</div>
                        <div className="cell" style={{ fontWeight:500, fontSize:13 }}>{Array.isArray(r.fields["Tenant"])?r.fields["Tenant"][0]:(r.fields["Tenant"]||"—")}</div>
                        <div className="cell money" style={{ fontSize:13 }}>{fmt(r.fields["Rent Due"])}</div>
                        <div className="cell money" style={{ fontSize:13, color:"var(--green)", fontWeight:400 }}>{fmt(r.fields["Total Paid"])}</div>
                        <div className="cell money" style={{ fontSize:13, fontWeight:500, color:bal>0?"var(--red)":"var(--green)" }}>{bal>0?fmt(bal):"✓"}</div>
                        <div className="cell" style={{ fontSize:11, color:"var(--muted)", fontFamily:"var(--font-mono)", fontWeight:300 }}>{fmtDate(r.fields["DueDate"])}</div>
                        <div className="cell"><Badge status={r.fields["Status"]} /></div>
                        <div className="cell" style={{ fontSize:12, fontWeight:late>0?600:300, color:late>0?"var(--red)":"var(--muted)", fontFamily:"var(--font-mono)" }}>{late>0?`${late}d`:"—"}</div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
}
