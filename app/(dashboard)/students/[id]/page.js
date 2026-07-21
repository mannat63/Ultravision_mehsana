"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Calendar, BookOpen, TrendingUp, Clock, CreditCard, ChevronDown, ChevronUp, AlertTriangle, PauseCircle } from "lucide-react";
import toast from "react-hot-toast";

const FREQ_LABELS = { MONTHLY: "Monthly", QUARTERLY: "Quarterly", HALF_YEARLY: "Half-Yearly", YEARLY: "Yearly" };

const TABS = ["Overview", "Performance", "Attendance", "Fees"];

function StatCard({ label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="card !p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function PctRing({ pct, size = 80 }) {
  if (pct === null || pct === undefined) return <div className="text-gray-400 text-sm">—</div>;
  const r  = (size / 2) - 8;
  const c  = 2 * Math.PI * r;
  const fill = (pct / 100) * c;
  const color = pct < 50 ? "#ef4444" : pct < 75 ? "#f59e0b" : "#10b981";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${fill} ${c}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const router  = useRouter();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [tab, setTab]           = useState("Overview");
  const [expandedTest, setExpandedTest] = useState(null);
  const [creatingFee, setCreatingFee]   = useState(false);

  async function loadStudent() {
    try {
      const r = await fetch(`/api/students/${id}`);
      const d = await r.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch {
      setError("Failed to load");
    }
  }

  useEffect(() => {
    loadStudent().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * Resume a paused/completed billing cycle and raise the next invoice from the
   * student's plan. The server enforces that no unsettled or duplicate record exists.
   */
  async function handleCreateFeeRecord() {
    setCreatingFee(true);
    try {
      const res = await fetch("/api/fees/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Could not create fee record");
        return;
      }
      toast.success("Fee record created — billing resumed");
      await loadStudent();
    } catch {
      toast.error("Network error");
    } finally {
      setCreatingFee(false);
    }
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="h-8 w-32 animate-shimmer rounded-lg" />
      <div className="card !p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl animate-shimmer" />
          <div className="space-y-2"><div className="h-5 w-40 animate-shimmer rounded" /><div className="h-3 w-28 animate-shimmer rounded" /></div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto">
      <Link href="/students" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"><ArrowLeft size={16} /> Back to Students</Link>
      <div className="card py-16 text-center"><AlertTriangle size={32} className="mx-auto mb-3 text-red-400" /><p className="text-red-600 font-semibold">{error}</p></div>
    </div>
  );

  const { student, fee, payments, attendance, results, avgPerformance } = data;

  // Billing cycle: PAUSED/COMPLETED means no invoices are raised until an admin
  // explicitly creates the next one (which resumes the cycle).
  const cycleStatus = student.fee_cycle_status || "ACTIVE";
  const cycleStopped = cycleStatus === "PAUSED" || cycleStatus === "COMPLETED";
  const planLabel = FREQ_LABELS[student?.fee_frequency] || "Monthly";

  const name    = student.user_id?.name || "Unknown";
  const contact = student.user_id?.phoneOrEmail || "—";
  const section = student.section_id ? `${student.section_id.class_id?.name || "?"} · ${student.section_id.name}` : "No Section";
  const COLORS = ["bg-indigo-600", "bg-violet-600", "bg-blue-600", "bg-teal-600", "bg-rose-600", "bg-amber-600", "bg-slate-700"];
  const aColor  = COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/students" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> Back to Students
      </Link>

      {/* Hero card */}
      <div className="card !p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl ${aColor} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{section}</p>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Phone size={12} />{contact}</span>
              {student.parent_name && <span className="flex items-center gap-1"><User size={12} />Parent: {student.parent_name}</span>}
              {student.parent_phone && <span className="flex items-center gap-1"><Phone size={12} />{student.parent_phone}</span>}
              {student.admission_date && <span className="flex items-center gap-1"><Calendar size={12} />Admitted {new Date(student.admission_date).toLocaleDateString("en-GB")}</span>}
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <PctRing pct={attendance?.last30?.pct} size={64} />
              <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase">Att. 30D</p>
            </div>
            <div className="text-center">
              <PctRing pct={avgPerformance} size={64} />
              <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase">Avg Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === t ? "border-slate-800 text-slate-900" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{t}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="30-Day Attendance" value={attendance?.last30?.pct !== null ? `${attendance.last30.pct.toFixed(1)}%` : "—"} sub={`${attendance?.last30?.present}/${attendance?.last30?.total} days`} color={attendance?.last30?.pct < 75 ? "text-amber-600" : "text-emerald-600"} />
            <StatCard label="90-Day Attendance" value={attendance?.last90?.pct !== null ? `${attendance.last90.pct.toFixed(1)}%` : "—"} sub={`${attendance?.last90?.present}/${attendance?.last90?.total} days`} />
            <StatCard label="Avg Score" value={avgPerformance !== null ? `${avgPerformance.toFixed(1)}%` : "—"} sub={`${results.length} tests`} color={avgPerformance < 40 ? "text-red-600" : avgPerformance < 60 ? "text-amber-600" : "text-emerald-600"} />
            <StatCard label="Fee Due" value={fee ? `₹${(fee.due_amount || 0).toLocaleString()}` : "—"} sub={fee ? `of ₹${(fee.total_amount || 0).toLocaleString()}` : "No record"} color={(fee?.due_amount || 0) > 0 ? "text-red-600" : "text-emerald-600"} />
          </div>
          {results.length > 0 && (
            <div className="card !p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Recent Tests</h3>
              <div className="space-y-2">
                {results.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{r.testName}</div>
                      <div className="text-xs text-gray-400">{r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-700">{r.earned}/{r.max}</div>
                      <div className={`text-xs font-bold ${r.pct < 40 ? "text-red-500" : r.pct < 60 ? "text-amber-500" : "text-emerald-500"}`}>{r.pct.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Performance ─── */}
      {tab === "Performance" && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="card py-16 text-center border-dashed"><BookOpen size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm text-gray-500">No test results yet</p></div>
          ) : results.map((r, i) => (
            <div key={i} className="card !p-0 overflow-hidden">
              <div onClick={() => setExpandedTest(expandedTest === i ? null : i)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{r.testName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"} · {r.section || ""}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-700">{r.earned}/{r.max}</div>
                    <div className={`text-xs font-bold ${r.pct < 40 ? "text-red-500" : r.pct < 60 ? "text-amber-500" : "text-emerald-500"}`}>{r.pct.toFixed(1)}%</div>
                  </div>
                  {expandedTest === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>
              {expandedTest === i && r.subjects?.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-gray-100"><th className="text-left px-5 py-2 text-gray-500 font-semibold uppercase tracking-wide">Subject</th><th className="text-right px-5 py-2 text-gray-500 font-semibold uppercase tracking-wide">Max</th><th className="text-right px-5 py-2 text-gray-500 font-semibold uppercase tracking-wide">Scored</th><th className="text-right px-5 py-2 text-gray-500 font-semibold uppercase tracking-wide">%</th></tr></thead>
                    <tbody>
                      {r.subjects.map((sm, j) => (
                        <tr key={j} className="border-b border-gray-100 last:border-0">
                          <td className="px-5 py-2 font-medium text-gray-700">{sm.subject}</td>
                          <td className="px-5 py-2 text-right text-gray-400 font-mono">{sm.max}</td>
                          <td className="px-5 py-2 text-right font-bold text-gray-800 font-mono">{sm.marks}</td>
                          <td className={`px-5 py-2 text-right font-bold ${sm.pct < 40 ? "text-red-600" : sm.pct < 60 ? "text-amber-600" : "text-emerald-600"}`}>{sm.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Attendance ─── */}
      {tab === "Attendance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card !p-5 flex items-center gap-4">
              <PctRing pct={attendance?.last30?.pct} size={80} />
              <div>
                <p className="text-sm font-bold text-gray-700">Last 30 Days</p>
                <p className="text-xs text-gray-400 mt-1">{attendance?.last30?.present} present / {attendance?.last30?.total} total</p>
                {attendance?.last30?.pct !== null && attendance.last30.pct < 75 && (
                  <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1"><AlertTriangle size={11} /> Below 75%</p>
                )}
              </div>
            </div>
            <div className="card !p-5 flex items-center gap-4">
              <PctRing pct={attendance?.last90?.pct} size={80} />
              <div>
                <p className="text-sm font-bold text-gray-700">Last 90 Days</p>
                <p className="text-xs text-gray-400 mt-1">{attendance?.last90?.present} present / {attendance?.last90?.total} total</p>
              </div>
            </div>
          </div>
          <div className="card !p-5">
            <p className="text-xs text-gray-400 text-center">Detailed day-by-day attendance available in the Attendance module.</p>
          </div>
        </div>
      )}

      {/* ─── Fees ─── */}
      {tab === "Fees" && (
        <div className="space-y-4">
          {/* Cycle is paused/ended — offer to resume it and raise the next invoice. */}
          {cycleStopped && (
            <div className="card !p-4 border border-amber-200 bg-amber-50/60 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <PauseCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-amber-800">
                    Billing {cycleStatus === "COMPLETED" ? "ended" : "paused"}
                  </div>
                  <p className="text-xs text-amber-700/80 mt-0.5 max-w-md">
                    No fee records are being generated for this student. Creating one resumes
                    the {planLabel.toLowerCase()} cycle from their existing plan.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateFeeRecord}
                disabled={creatingFee}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {creatingFee ? "Creating…" : "Create Fee Record"}
              </button>
            </div>
          )}

          {fee ? (
            <>
              <div className="card !py-3 !px-4 flex items-center justify-between bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Billing Plan</div>
                  <div className="text-sm font-bold text-slate-700">
                    {planLabel}
                    {student?.monthly_fee ? <span className="text-gray-400 font-medium"> · ₹{Number(student.monthly_fee).toLocaleString()}/month</span> : null}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-600">
                  ₹{(fee.total_amount || 0).toLocaleString()} / invoice
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Invoice Total" value={`₹${(fee.total_amount || 0).toLocaleString()}`} />
                <StatCard label="Paid" value={`₹${(fee.paid_amount || 0).toLocaleString()}`} color="text-emerald-600" />
                <StatCard label="Due" value={`₹${(fee.due_amount || 0).toLocaleString()}`} color={(fee.due_amount || 0) > 0 ? "text-red-600" : "text-emerald-600"} sub={fee.status} />
              </div>
              {payments?.length > 0 && (
                <div className="card !p-0">
                  <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-700">Payment History</h3></div>
                  <div className="divide-y divide-gray-100">
                    {payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">₹{(p.amount || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-400">{p.method || "—"}</div>
                        </div>
                        <div className="text-xs text-gray-400">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB") : "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card py-16 text-center border-dashed"><CreditCard size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-sm text-gray-500">No fee record found</p></div>
          )}
        </div>
      )}
    </div>
  );
}
