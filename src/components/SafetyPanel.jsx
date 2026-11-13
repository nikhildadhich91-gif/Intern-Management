import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Play, RefreshCw, KeyRound, Link2, MessageSquareLock, FileCheck, Clock } from 'lucide-react';

export default function SafetyPanel({ token, auditLogs, onRefresh }) {
  const [checkResult, setCheckResult] = useState(null);
  const [running, setRunning] = useState(false);

  const runSafetyCheck = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/security/pentest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setCheckResult(data);
        if (onRefresh) onRefresh();
      }
    } catch (_) {
      // ignore
    } finally {
      setRunning(false);
    }
  };

  const protections = [
    {
      title: 'Protected Sign-In',
      desc: 'Passwords are locked safely so only approved team members can sign in.',
      icon: KeyRound,
    },
    {
      title: 'Private Admin & Intern Access',
      desc: 'Admins can manage all records, while interns only see and submit their own work.',
      icon: Lock,
    },
    {
      title: 'Safe Web Links Only',
      desc: 'Checks every project and document link so only valid website addresses are saved.',
      icon: Link2,
    },
    {
      title: 'Safe Form Entries',
      desc: 'Automatically inspects typed text and blocks harmful or broken entries.',
      icon: FileCheck,
    },
    {
      title: 'Assistant Privacy',
      desc: 'Keeps private account settings hidden and answers only work-related questions.',
      icon: MessageSquareLock,
    },
    {
      title: 'Sign-In Attempt Limit',
      desc: 'Slows down repeated wrong password guesses to keep accounts safe.',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-gradient-to-r from-[#163452] to-[#235789] p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#c6e35c] text-[#142003] shadow-sm p-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-[#c6e35c]/20 border border-[#c6e35c]/40 px-3 py-0.5 text-[11px] font-bold text-[#c6e35c]">
              Admin Only
            </span>
            <h2 className="font-tight mt-1.5 text-2xl font-semibold tracking-tight">
              Workspace Safety &amp; Activity
            </h2>
            <p className="mt-1 text-sm text-white/85 max-w-2xl">
              Keep your team&apos;s accounts, links, and records safe. Run a quick check anytime to make sure all protections are working properly.
            </p>
          </div>
        </div>

        <button
          onClick={runSafetyCheck}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full bg-[#c6e35c] px-5 py-3 text-sm font-bold text-[#142003] shadow-md hover:bg-[#d5f06e] transition disabled:opacity-60"
        >
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
          {running ? 'Checking Workspace...' : 'Run Safety Check'}
        </button>
      </div>

      {/* Results if Run Safety Check clicked */}
      {checkResult && (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5 text-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h3 className="font-tight text-lg font-bold">{checkResult.score}</h3>
            </div>
            <span className="text-xs text-slate-500">
              Checked at {new Date(checkResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {checkResult.tests.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl bg-white border border-emerald-200 p-3.5 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{t.name}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                    Passed
                  </span>
                </div>
                <p className="mt-1.5 text-[12px] text-slate-600">{t.mitigation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Everyday Protection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {protections.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="rounded-[22px] bg-white p-5 text-slate-900 border border-slate-200/80 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#278cf5]/15 text-[#278cf5]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              </div>
              <h4 className="font-tight mt-3 text-base font-semibold">{item.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Log */}
      <div className="rounded-[24px] bg-white p-5 text-slate-900 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-tight text-lg font-semibold">Recent Activity</h3>
            <p className="text-xs text-slate-500">
              A live record of sign-ins, intern updates, task assignments, and blocked actions.
            </p>
          </div>
          <span className="rounded-full bg-[#278cf5]/10 px-3 py-1 text-xs font-semibold text-[#278cf5]">
            {auditLogs.length} Events
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            No activity recorded yet. Sign-ins, intern additions, and task updates will show up here.
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/60 px-3.5 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      log.severity === 'BLOCKED'
                        ? 'bg-rose-100 text-rose-700'
                        : log.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-700'
                        : log.severity === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {log.event}
                  </span>
                  <span className="text-slate-700">{log.details}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{log.actor}</span>
                  <span>•</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

