import { useState, useRef, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { CopilotResponse } from '../types';
import { clockTime } from '../services/formatters';

interface MessageItem {
  id: string;
  question: string;
  response?: CopilotResponse;
  loading?: boolean;
  error?: string;
  timestamp: number;
}

export function CopilotPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Why is my device slow?',
    "What's using my RAM?",
    'Why is my temperature increasing?',
    'Is an application affecting performance?',
    'Is my network causing the problem?',
    'Why is my battery draining?',
    'What should I do right now?',
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async (qText?: string) => {
    const query = (qText || question).trim();
    if (!query || isSubmitting) return;

    if (!qText) setQuestion('');
    setIsSubmitting(true);

    const msgId = `msg-${Date.now()}`;
    const newMsg: MessageItem = {
      id: msgId,
      question: query,
      loading: true,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      const res = await apiClient.askCopilot(query);
      if (res) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, loading: false, response: res }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  loading: false,
                  error: 'Unable to fetch performance analysis. Verify backend service is running.',
                }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                loading: false,
                error: 'Network error connecting to Copilot service.',
              }
            : m
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Performance Copilot</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Understand what's happening on your device using live system telemetry.
          </p>
        </div>
        {messages.length > 0 ? (
          <button
            onClick={handleClear}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Clear conversation
          </button>
        ) : null}
      </header>

      {/* Main Ask Card Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex flex-col gap-3"
        >
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Ask about your device...
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What is causing my current slowdown? (Press Enter to ask)..."
              className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50/50 p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !question.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Analyzing...' : 'Ask'}
              </button>
            </div>
          </div>
        </form>

        {/* Suggested Questions List */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-400 block mb-2">
            Suggested questions
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Copilot Analysis Conversation Section */}
      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No active analysis requested yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Type a question above or click one of the suggested questions to inspect live hardware metrics.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-2">
            Copilot Analysis History
          </h3>

          {messages.map((msg) => {
            const resp = msg.response;
            const answerText = resp?.answer || resp?.explanation;
            const evidenceItems = resp?.evidence || [];
            const recsItems = resp?.recommendations || (resp?.recommendation ? [resp.recommendation] : []);
            const severity = resp?.severity || 'ok';

            return (
              <div
                key={msg.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                {/* User Question Row */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                      Q
                    </span>
                    <span className="text-sm font-bold text-slate-900">{msg.question}</span>
                  </div>
                  <span className="text-xs text-slate-400">{clockTime(msg.timestamp)}</span>
                </div>

                {/* Loading State */}
                {msg.loading ? (
                  <div className="py-4 text-center text-xs font-medium text-slate-500 animate-pulse">
                    Analyzing live device telemetry (CPU, RAM, GPU, Temperature, Network)...
                  </div>
                ) : msg.error ? (
                  /* Error State */
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {msg.error}
                  </div>
                ) : resp ? (
                  /* Response Output Card */
                  <div className="flex flex-col gap-4">
                    {/* Severity Badge & Natural Language Answer */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Copilot Analysis
                        </span>
                        {severity === 'critical' ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
                            Critical Issue
                          </span>
                        ) : severity === 'warning' ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                            Warning
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            Normal / OK
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                        {answerText}
                      </p>
                    </div>

                    {/* Evidence Section */}
                    {evidenceItems.length > 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                          Evidence
                        </span>
                        <ul className="grid gap-1.5 sm:grid-cols-2 text-xs font-medium text-slate-700">
                          {evidenceItems.map((ev, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-slate-400 font-bold">•</span>
                              <span>{ev}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Recommendations Section */}
                    {recsItems.length > 0 ? (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block mb-2">
                          Recommendation
                        </span>
                        <ul className="flex flex-col gap-1.5 text-xs font-medium text-indigo-900">
                          {recsItems.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-600">💡</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
