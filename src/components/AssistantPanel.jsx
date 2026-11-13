import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, RotateCcw, ExternalLink, Lock } from 'lucide-react';

function formatSafeMarkdown(md) {
  if (!md) return null;
  const lines = String(md).split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const renderInline = (text, keyPrefix) => {
    const parts = [];
    const regex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[2] && match[3]) {
        parts.push(
          <a
            key={`${keyPrefix}-link-${idx++}`}
            href={match[3]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#278cf5] underline decoration-[#278cf5]/40 underline-offset-2 hover:text-[#1b74d1]"
          >
            {match[2]}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      } else if (match[4]) {
        parts.push(
          <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold">
            {match[4]}
          </strong>
        );
      } else if (match[5]) {
        parts.push(
          <em key={`${keyPrefix}-i-${idx++}`} className="italic opacity-90">
            {match[5]}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="my-1.5 space-y-1 pl-4 list-disc">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      flushList(i);
      return;
    }
    if (/^#{1,4}\s+/.test(line)) {
      flushList(i);
      const heading = line.replace(/^#{1,4}\s+/, '');
      elements.push(
        <h4 key={`h-${i}`} className="mt-1.5 mb-1 text-sm font-bold tracking-tight">
          {renderInline(heading, `h-${i}`)}
        </h4>
      );
      return;
    }
    if (/^([-*•])\s+/.test(line)) {
      const content = line.replace(/^([-*•])\s+/, '');
      listItems.push(
        <li key={`li-${i}`} className="text-[13.5px] leading-relaxed">
          {renderInline(content, `li-${i}`)}
        </li>
      );
    } else {
      flushList(i);
      elements.push(
        <p key={`p-${i}`} className="my-1 text-[13.5px] leading-relaxed">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });
  flushList('end');
  return elements;
}

const DEFAULT_WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text:
    `### Hi! I'm **Qubenix Assistant**\n` +
    `Ask me anything about what's happening with your team right now — intern updates, pending tasks, or work ready for review.`,
  blocked: false,
};

export default function AssistantPanel({
  token,
  stats,
  interns,
  tasks,
  fullHeight = false,
  messages: controlledMessages,
  setMessages: setControlledMessages,
  pendingQuery,
  onClearPendingQuery,
}) {
  const [localMessages, setLocalMessages] = useState(() => [DEFAULT_WELCOME_MESSAGE]);
  const messages = controlledMessages ?? localMessages;
  const setMessages = setControlledMessages ?? setLocalMessages;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const threadRef = useRef(null);
  const lastHandledQueryIdRef = useRef(null);

  const quickQuestions = [
    "What's happening in the team right now?",
    'Show pending tasks',
    'Any work ready for review?',
    'Who is on the team?',
  ];

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendQuestion = async (customQuery) => {
    const q = (customQuery !== undefined ? customQuery : input).trim();
    if (!q || loading) return;

    if (customQuery === undefined) setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      const fullAnswer = data.answer || "I couldn't find an update for that right now.";

      const msgId = `ai-${Date.now()}`;
      const words = fullAnswer.split(/(?=\s)/);
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          text: words.length <= 8 ? fullAnswer : '',
          blocked: Boolean(data.blocked),
        },
      ]);
      setLoading(false);

      if (words.length > 8) {
        let idx = 0;
        const step = Math.max(3, Math.ceil(words.length / 24));
        const timer = setInterval(() => {
          idx = Math.min(words.length, idx + step);
          const partial = words.slice(0, idx).join('');
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, text: partial } : m))
          );
          if (idx >= words.length) clearInterval(timer);
        }, 20);
      }
    } catch (_) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            `### Live Team Summary\n` +
            `- **Interns**: **${interns.length}** total (**${stats.activeInterns}** active)\n` +
            `- **Tasks**: **${tasks.length}** assigned (**${stats.completedTasks}** completed, **${stats.pendingTasks}** pending)`,
        },
      ]);
    }
  };

  useEffect(() => {
    if (pendingQuery?.text && pendingQuery.id !== lastHandledQueryIdRef.current) {
      lastHandledQueryIdRef.current = pendingQuery.id;
      const text = pendingQuery.text;
      onClearPendingQuery?.();
      sendQuestion(text);
    }
  }, [pendingQuery]);

  return (
    <div
      className={`flex flex-col rounded-[28px] bg-white text-[#141a21] shadow-[0_12px_36px_rgba(16,38,68,0.06)] border border-slate-200/70 overflow-hidden ${
        fullHeight ? 'h-[calc(100dvh-145px)] min-h-[520px]' : 'h-[360px]'
      }`}
    >
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#f8fbff] px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#278cf5] text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-tight text-base font-bold tracking-tight">Qubenix Assistant</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#c6e35c] px-2.5 py-0.5 text-[11px] font-bold text-[#1a2605]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2e4705]" />
                Online
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Ask for live updates on interns, tasks, or recent submissions
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages((prev) => prev.slice(0, 1))}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-5 py-2">
        {quickQuestions.map((qp, i) => (
          <button
            key={i}
            onClick={() => sendQuestion(qp)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-[#278cf5] hover:text-[#278cf5] transition"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
          >
            {m.role === 'assistant' && (
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  m.blocked ? 'bg-rose-500 text-white' : 'bg-[#1d1d1d] text-white'
                }`}
              >
                {m.blocked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-[#c6e35c]" />}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                m.role === 'user'
                  ? 'bg-[#278cf5] text-white rounded-br-sm text-[13.5px]'
                  : m.blocked
                  ? 'border border-rose-200 bg-rose-50 text-rose-900'
                  : 'border border-slate-200/80 bg-[#f6f9fc] text-[#141a21]'
              }`}
            >
              {m.role === 'user' ? (
                <p>{m.text}</p>
              ) : (
                <div className="space-y-1">{formatSafeMarkdown(m.text)}</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1d1d1d] text-white">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-[#c6e35c]" />
            </div>
            <div className="rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600">
              Checking latest team updates...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion();
        }}
        className="flex items-center gap-2 border-t border-slate-100 bg-white px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about intern progress, tasks, or submissions..."
          className="flex-1 rounded-full border border-slate-200 bg-[#f2f7fb] px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#278cf5] focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send question"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#278cf5] text-white shadow-sm hover:bg-[#1a7ae0] disabled:opacity-40 transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

