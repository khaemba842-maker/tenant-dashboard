import { useState, useEffect, useCallback } from "react";

// ─── Proxy helpers ────────────────────────────────────────────────────────────
// All requests go through /api/airtable, which injects the secret token server-side.
// No API key is ever present in this file.

const BASE_ID = "app7mLVLcLGI3mqKF";

async function proxyFetch(path) {
  const res = await fetch(`/api/airtable${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status} on ${path}`);
  }
  return data;
}

async function fetchAllRecords(tableId) {
  let records = [];
  let offset = null;
  do {
    const qs = offset ? `?offset=${offset}` : "";
    const data = await proxyFetch(`/v0/${BASE_ID}/${tableId}${qs}`);
    records = [...records, ...data.records];
    offset = data.offset || null;
  } while (offset);
  return records;
}

async function discoverTables() {
  return proxyFetch(`/v0/meta/bases/${BASE_ID}/tables`);
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency", currency: "KES", maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
};

// ─── Small components ─────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Paid:    { bg: "#f0faf4", color: "#1a7a45", dot: "#22c55e" },
    Unpaid:  { bg: "#fff5f5", color: "#b91c1c", dot: "#ef4444" },
    Partial: { bg: "#fffbeb", color: "#92400e", dot: "#f59e0b" },
    Overdue: { bg: "#fff5f5", color: "#b91c1c", dot: "#ef4444" },
  };
  const s = map[status] || { bg: "#f5f5f5", color: "#666", dot: "#999" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      letterSpacing: "0.02em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {status || "Unknown"}
    </span>
  );
};

const StatCard = ({ label, value, sub, accent, icon }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid #f0ede8", flex: 1, minWidth: 180,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#9e9690", textTransform: "uppercase", marginBottom: 10 }}>
      {label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: accent || "#1a1714", fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: "#9e9690", marginTop: 6 }}>{sub}</div>}
    <div style={{ position: "absolute", right: 20, top: 20, fontSize: 22, opacity: 0.12 }}>{icon}</div>
  </div>
);

const SectionTitle = ({ children, count }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
    <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", color: "#1a1714", textTransform: "uppercase", margin: 0 }}>
      {children}
    </h2>
    {count !== undefined && (
      <span style={{ background: "#1a1714", color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
        {count}
      </span>
    )}
    <div style={{ flex: 1, height: 1, background: "#f0ede8" }} />
  </div>
);

const TABLE_IDS = {
  TENANTS:  "tblQIfaVVIVw3URwg",
  LEDGER:   "tbl8m62u87N4Ktz74",
  PAYMENTS: "tblNkds8ZZG4DL0Xl",
};

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [tenants, setTenants]   = useState([]);
  const [ledger, setLedger]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch]     = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRecords, ledgerRecords, paymentRecords] = await Promise.all([
        fetchAllRecords(TABLE_IDS.TENANTS),
        fetchAllRecords(TABLE_IDS.LEDGER),
        fetchAllRecords(TABLE_IDS.PAYMENTS),
      ]);
      setTenants(tenantRecords);
      setLedger(ledgerRecords);
      setPayments(paymentRecords);
    } catch (e) {
      setError(e.message || JSON.stringify(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Computed stats ───────────────────────────────────────────────────────
  const totalExpected    = tenants.reduce((s, t) => s + (t.fields["Rent Amount"] || 0), 0);
  const totalOutstanding = tenants.reduce((s, t) => s + (t.fields["Total Outstanding"] || 0), 0);
  const totalCollected   = totalExpected - totalOutstanding;
  const collectionRate   = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const now = new Date();

  const unpaidTenants  = tenants.filter(t => (t.fields["Total Outstanding"] || 0) > 0);
  const dueSoon        = tenants.filter(t => {
    const d = daysUntil(t.fields["next_due_date"]);
    return d !== null && d >= 0 && d <= 7;
  });
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.fields["DueDate"] || 0) - new Date(a.fields["DueDate"] || 0))
    .slice(0, 10);

  const filteredTenants = tenants.filter(t =>
    (t.fields["Name"] || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.fields["House Number"] || "").toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "tenants",  label: "Tenants"  },
    { id: "ledger",   label: "Rent Ledger" },
    { id: "payments", label: "M-Pesa Log"  },
  ];

  // ─── Loading / error states ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #f0ede8", borderTopColor: "#c9a84c", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#9e9690", fontSize: 14, fontFamily: "Georgia, serif", fontStyle: "italic" }}>Loading your property data…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <p style={{ color: "#b91c1c", fontWeight: 600 }}>Failed to load data</p>
      <p style={{ color: "#9e9690", fontSize: 13 }}>{error}</p>
      <button onClick={loadData} style={{ marginTop: 8, padding: "10px 24px", background: "#1a1714", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
        Try Again
      </button>
    </div>
  );

  // ─── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#faf9f7", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#1a1714" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #f0ede8", padding: "0 40px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, background: "#1a1714", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#c9a84c", fontSize: 16 }}>⌂</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17, lineHeight: 1 }}>
                Property Manager
              </div>
              <div style={{ fontSize: 11, color: "#9e9690", letterSpacing: "0.06em", marginTop: 2 }}>
                {tenants.length} UNITS · NAIROBI
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "#9e9690" }}>
              {now.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <button onClick={loadData} style={{ padding: "7px 16px", background: "#f5f3ef", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1a1714" }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#1a1714" : "#9e9690",
              borderBottom: activeTab === tab.id ? "2px solid #c9a84c" : "2px solid transparent",
              transition: "all 0.15s", letterSpacing: "0.01em",
            }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 40px" }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <StatCard label="Total Expected"  value={fmt(totalExpected)}    sub={`${tenants.length} tenants`}                                  icon="💰" />
              <StatCard label="Collected"        value={fmt(totalCollected)}   sub={`${collectionRate}% collection rate`} accent="#1a7a45"         icon="✓"  />
              <StatCard label="Outstanding"      value={fmt(totalOutstanding)} sub={`${unpaidTenants.length} tenants with balance`} accent={totalOutstanding > 0 ? "#b91c1c" : "#1a7a45"} icon="⚠" />
              <StatCard label="Total Units"      value={tenants.length}        sub="Occupied"                                                      icon="⌂"  />
            </div>

            {/* Collection bar */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#9e9690", textTransform: "uppercase" }}>
                  Monthly Collection Progress
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", color: collectionRate >= 80 ? "#1a7a45" : "#b91c1c" }}>
                  {collectionRate}%
                </span>
              </div>
              <div style={{ background: "#f0ede8", borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: collectionRate >= 80
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, #f59e0b, #d97706)",
                  width: `${collectionRate}%`, transition: "width 1s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "#9e9690" }}>
                <span>{fmt(totalCollected)} collected</span>
                <span>{fmt(totalOutstanding)} remaining</span>
              </div>
            </div>

            {/* Unpaid + Due Soon */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8" }}>
                <SectionTitle count={unpaidTenants.length}>Awaiting Payment</SectionTitle>
                {unpaidTenants.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#22c55e", fontSize: 13 }}>🎉 All tenants have paid!</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {unpaidTenants.map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#faf9f7", borderRadius: 10, border: "1px solid #f0ede8" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.fields["Name"] || "—"}</div>
                          <div style={{ fontSize: 11, color: "#9e9690", marginTop: 2 }}>Unit {t.fields["House Number"] || "—"}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: 14 }}>{fmt(t.fields["Total Outstanding"])}</div>
                          <div style={{ fontSize: 11, color: "#9e9690", marginTop: 2 }}>due {fmtDate(t.fields["next_due_date"])}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8" }}>
                <SectionTitle count={dueSoon.length}>Due in 7 Days</SectionTitle>
                {dueSoon.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#9e9690", fontSize: 13 }}>No upcoming due dates</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dueSoon.map(t => {
                      const days = daysUntil(t.fields["next_due_date"]);
                      return (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fef3c7" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.fields["Name"] || "—"}</div>
                            <div style={{ fontSize: 11, color: "#9e9690", marginTop: 2 }}>Unit {t.fields["House Number"] || "—"}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, color: "#92400e", fontSize: 13 }}>{days === 0 ? "Due today" : `${days}d left`}</div>
                            <div style={{ fontSize: 11, color: "#9e9690", marginTop: 2 }}>{fmt(t.fields["Rent Amount"])}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Recent M-Pesa payments */}
            {recentPayments.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8" }}>
                <SectionTitle>Recent M-Pesa Payments</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {recentPayments.map(p => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: 16, padding: "10px 14px", background: "#faf9f7", borderRadius: 10, fontSize: 13, alignItems: "center" }}>
                      <div style={{ fontWeight: 600 }}>
                        {Array.isArray(p.fields["Tenant"]) ? p.fields["Tenant"][0] : (p.fields["Tenant"] || "—")}
                      </div>
                      <div style={{ color: "#1a7a45", fontWeight: 700 }}>{fmt(p.fields["Total Paid"])}</div>
                      <div style={{ color: "#9e9690", fontSize: 12 }}>{fmtDate(p.fields["DueDate"])}</div>
                      <StatusBadge status={p.fields["Status"]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TENANTS */}
        {activeTab === "tenants" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}>All Tenants</div>
              <input
                placeholder="Search by name or unit…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: "9px 16px", border: "1px solid #f0ede8", borderRadius: 10, fontSize: 13, outline: "none", background: "#fff", width: 240, color: "#1a1714" }}
              />
            </div>
            <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 120px 130px 130px 120px" }}>
                {["Tenant", "Unit", "Rent", "Last Payment", "Next Due", "Outstanding"].map(h => (
                  <div key={h} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9e9690", textTransform: "uppercase", borderBottom: "1px solid #f0ede8", background: "#faf9f7" }}>
                    {h}
                  </div>
                ))}
                {filteredTenants.map((t, i) => {
                  const outstanding = t.fields["Total Outstanding"] || 0;
                  return [
                    <div key={`n${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1714", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c9a84c", flexShrink: 0 }}>
                        {(t.fields["Name"] || "?")[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.fields["Name"] || "—"}</span>
                    </div>,
                    <div key={`u${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", fontSize: 13, color: "#9e9690" }}>{t.fields["House Number"] || "—"}</div>,
                    <div key={`r${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", fontWeight: 600, fontSize: 13 }}>{fmt(t.fields["Rent Amount"])}</div>,
                    <div key={`lp${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", fontSize: 12, color: "#9e9690" }}>{fmtDate(t.fields["last_payment_date"])}</div>,
                    <div key={`nd${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", fontSize: 12, color: "#9e9690" }}>{fmtDate(t.fields["next_due_date"])}</div>,
                    <div key={`o${i}`} style={{ padding: "14px 16px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 13, color: outstanding > 0 ? "#b91c1c" : "#1a7a45" }}>
                      {outstanding > 0 ? fmt(outstanding) : "✓ Clear"}
                    </div>,
                  ];
                })}
              </div>
            </div>
          </div>
        )}

        {/* LEDGER */}
        {activeTab === "ledger" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}>Rent Ledger</div>
            {ledger.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#9e9690", border: "1px solid #f0ede8" }}>
                {TABLE_IDS.LEDGER ? "No ledger records found." : "Ledger table could not be discovered. Check table name contains 'ledger'."}
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1.5fr 120px 120px 100px 120px 110px 80px" }}>
                  {["ID", "Tenant", "Rent Due", "Total Paid", "Balance", "Due Date", "Status", "Days Late"].map(h => (
                    <div key={h} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9e9690", textTransform: "uppercase", borderBottom: "1px solid #f0ede8", background: "#faf9f7" }}>
                      {h}
                    </div>
                  ))}
                  {ledger.map((r, i) => {
                    const balance  = r.fields["Balance"]   || 0;
                    const daysLate = r.fields["Days Late"] || 0;
                    return [
                      <div key={`id${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 11, color: "#9e9690", display: "flex", alignItems: "center" }}>{r.fields["LedgerID"] || i + 1}</div>,
                      <div key={`t${i}`}   style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center" }}>
                        {Array.isArray(r.fields["Tenant"]) ? r.fields["Tenant"][0] : (r.fields["Tenant"] || "—")}
                      </div>,
                      <div key={`rd${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, display: "flex", alignItems: "center" }}>{fmt(r.fields["Rent Due"])}</div>,
                      <div key={`tp${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: 600, color: "#1a7a45", display: "flex", alignItems: "center" }}>{fmt(r.fields["Total Paid"])}</div>,
                      <div key={`b${i}`}   style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: 700, color: balance > 0 ? "#b91c1c" : "#1a7a45", display: "flex", alignItems: "center" }}>
                        {balance > 0 ? fmt(balance) : "✓"}
                      </div>,
                      <div key={`dd${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 12, color: "#9e9690", display: "flex", alignItems: "center" }}>{fmtDate(r.fields["DueDate"])}</div>,
                      <div key={`s${i}`}   style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center" }}><StatusBadge status={r.fields["Status"]} /></div>,
                      <div key={`dl${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: daysLate > 0 ? 700 : 400, color: daysLate > 0 ? "#b91c1c" : "#9e9690", display: "flex", alignItems: "center" }}>
                        {daysLate > 0 ? `${daysLate}d` : "—"}
                      </div>,
                    ];
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === "payments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}>M-Pesa Payment Log</div>
              <div style={{ fontSize: 12, color: "#9e9690", background: "#f0ede8", padding: "6px 14px", borderRadius: 20 }}>
                {payments.length} transactions
              </div>
            </div>
            {payments.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: 40, textAlign: "center", color: "#9e9690", border: "1px solid #f0ede8" }}>
                {TABLE_IDS.PAYMENTS ? "No payment records found." : "Payments table could not be discovered. Check table name contains 'payment'."}
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0ede8", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "60px 1.5fr 120px 120px 100px 120px 110px 80px" }}>
                  {["ID", "Tenant", "Rent Due", "Paid", "Balance", "Date", "Status", "Days Late"].map(h => (
                    <div key={h} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9e9690", textTransform: "uppercase", borderBottom: "1px solid #f0ede8", background: "#faf9f7" }}>
                      {h}
                    </div>
                  ))}
                  {payments.map((r, i) => {
                    const balance  = r.fields["Balance"]   || 0;
                    const daysLate = r.fields["Days Late"] || 0;
                    return [
                      <div key={`id${i}`} style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 11, color: "#9e9690", display: "flex", alignItems: "center" }}>{r.fields["LedgerID"] || i + 1}</div>,
                      <div key={`t${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center" }}>
                        {Array.isArray(r.fields["Tenant"]) ? r.fields["Tenant"][0] : (r.fields["Tenant"] || "—")}
                      </div>,
                      <div key={`rd${i}`} style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, display: "flex", alignItems: "center" }}>{fmt(r.fields["Rent Due"])}</div>,
                      <div key={`tp${i}`} style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: 700, color: "#1a7a45", display: "flex", alignItems: "center" }}>{fmt(r.fields["Total Paid"])}</div>,
                      <div key={`b${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: 700, color: balance > 0 ? "#b91c1c" : "#1a7a45", display: "flex", alignItems: "center" }}>
                        {balance > 0 ? fmt(balance) : "✓"}
                      </div>,
                      <div key={`dd${i}`} style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 12, color: "#9e9690", display: "flex", alignItems: "center" }}>{fmtDate(r.fields["DueDate"])}</div>,
                      <div key={`s${i}`}  style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", display: "flex", alignItems: "center" }}><StatusBadge status={r.fields["Status"]} /></div>,
                      <div key={`dl${i}`} style={{ padding: "12px 14px", borderBottom: "1px solid #f9f8f6", fontSize: 13, fontWeight: daysLate > 0 ? 700 : 400, color: daysLate > 0 ? "#b91c1c" : "#9e9690", display: "flex", alignItems: "center" }}>
                        {daysLate > 0 ? `${daysLate}d` : "—"}
                      </div>,
                    ];
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
