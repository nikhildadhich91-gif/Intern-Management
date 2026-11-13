import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, CheckCircle2, Clock, Presentation, Github, FileText, Award } from 'lucide-react';

export default function MeetingPresenterModal({
  tasks,
  interns,
  isAdmin,
  onClose,
  onReviewUpdate,
}) {
  const presentable = tasks.filter((t) => t.submission && t.submission.description);
  const slides = presentable.length > 0 ? presentable : tasks;
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!slides || slides.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center text-[#141a21] shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fc] text-[#278cf5]">
            <Presentation className="h-6 w-6" />
          </div>
          <h3 className="font-tight mt-4 text-xl font-bold">Team Meeting View</h3>
          <p className="mt-2 text-xs text-slate-500">
            No tasks or work submissions are ready to present yet. Once an intern submits their work, you can review and showcase it right here during meetings.
          </p>
          <button
            onClick={onClose}
            className="mt-5 rounded-full bg-[#14171a] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#278cf5] transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const current = slides[index % slides.length] || slides[0];
  const intern = interns.find((i) => i.id === current.internId);

  const handleStatusChange = async (newStatus) => {
    if (!isAdmin || !onReviewUpdate) return;
    setSaving(true);
    await onReviewUpdate(current.id, {
      status: newStatus,
      reviewerNote: note.trim() || current.submission?.reviewerNote || `Marked ${newStatus} during team meeting.`,
      featuredInMeeting: true,
    });
    setNote('');
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] bg-white p-6 sm:p-8 text-[#141a21] shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c6e35c] px-3 py-1 text-xs font-bold text-[#152202]">
              <Presentation className="h-3.5 w-3.5" />
              Team Meeting View
            </span>
            <span className="text-xs text-slate-500">
              Item {(index % slides.length) + 1} of {slides.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            aria-label="Close Team Meeting View"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Slide Body */}
        <div className="my-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Intern & Task Details */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#f8fbff] p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <img
                  src={intern?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(current.internName)}`}
                  alt={current.internName}
                  className="h-14 w-14 rounded-full object-cover border-2 border-[#278cf5] bg-white"
                />
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#278cf5]">
                    {current.department}
                  </span>
                  <h4 className="font-tight text-lg font-bold">{current.internName}</h4>
                  <p className="text-xs text-slate-500">{intern?.email || ''}</p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-100">
                  <span className="text-slate-500">Priority</span>
                  <span className="font-bold text-amber-600">{current.priority}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-100">
                  <span className="text-slate-500">Due Date</span>
                  <span className="font-semibold">{current.deadline}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold ${
                      current.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : current.status === 'In Progress'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {current.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#eaf3fc] p-3 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-[#185a9d]">
                <Award className="h-4 w-4" />
                Review Notes
              </div>
              <p className="mt-1">
                {current.submission?.reviewerNote || 'Ready for live review during the meeting.'}
              </p>
            </div>
          </div>

          {/* Right 2 Columns: Deliverable Details & Review Controls */}
          <div className="lg:col-span-2 flex flex-col justify-between space-y-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Task Details
              </span>
              <h2 className="font-tight mt-1 text-2xl font-bold leading-tight">
                {current.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {current.description}
              </p>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-[#f9fbfd] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8fa832]">
                    Submitted Work
                  </span>
                  {current.submission?.submittedAt && (
                    <span className="text-[11px] text-slate-400">
                      Submitted {new Date(current.submission.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {current.submission?.description || 'No work summary submitted yet.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {current.submission?.githubUrl && (
                    <a
                      href={current.submission.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[#14171a] text-white px-4 py-2 text-xs font-bold hover:bg-[#278cf5] transition"
                    >
                      <Github className="h-4 w-4" />
                      Open Project Link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {current.submission?.documentUrl && (
                    <a
                      href={current.submission.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
                    >
                      <FileText className="h-4 w-4" />
                      Open Document
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Meeting Decision &amp; Feedback
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add feedback note (optional)..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#278cf5]"
                  />
                  <button
                    disabled={saving}
                    onClick={() => handleStatusChange('Completed')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#8fa832] px-4 py-2 text-xs font-bold text-white hover:bg-[#7b9228] transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve &amp; Complete
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleStatusChange('In Progress')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-300 transition"
                  >
                    <Clock className="h-4 w-4" />
                    Needs Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setIndex(idx)}
                aria-label={`Item ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === index % slides.length ? 'w-7 bg-[#278cf5]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
            className="inline-flex items-center gap-2 rounded-full bg-[#278cf5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a7ae0] transition"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
