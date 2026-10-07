import { useEffect, useRef, useState } from 'react';
import type { AiSettings, AnalysisReport } from '../../../models/types';
import { AI_SUGGESTIONS, AiError, PROVIDERS, askAboutRepository } from '../../../services/ai';
import { getSettings, saveSettings } from '../../../services/storage';
import { Card, Spinner } from '../ui';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiSection({ report }: { report: AnalysisReport }) {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void getSettings().then((loaded) => setSettings(loaded.ai));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function ask(question: string): Promise<void> {
    if (!settings || busy || !question.trim()) return;
    setBusy(true);
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');

    try {
      const answer = await askAboutRepository(settings, report, question);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err instanceof AiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <Spinner label="Loading AI settings" />;

  if (!settings.enabled) {
    return (
      <Card title="AI Repository Assistant">
        <p className="mb-3 text-[12px] leading-relaxed text-[#8b949e]">
          AI features are turned off. Enable a provider in Options â€” your analysis report is used as
          context, secrets stay redacted, and nothing is shared without your action.
        </p>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="rounded-md bg-[#238636] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2ea043]"
        >
          Open Options
        </button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card
        title={`Ask about ${report.repo.fullName}`}
        right={
          <span className="text-[10px] text-[#6e7681]">
            {PROVIDERS[settings.provider].label}
          </span>
        }
      >
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="text-[12px] text-[#8b949e]">
              Suggested questions â€” answers are grounded in the analysis report:
            </p>
          ) : null}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[92%] whitespace-pre-wrap rounded-lg px-2.5 py-2 text-[12px] leading-relaxed ${
                message.role === 'user'
                  ? 'self-end bg-[#1f6feb]/20 text-[#c9d1d9]'
                  : 'self-start bg-[#21262d] text-[#e6edf3]'
              }`}
            >
              {message.content}
            </div>
          ))}
          {busy ? <Spinner label="Thinkingâ€¦" /> : null}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {AI_SUGGESTIONS.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                className="rounded-full border border-[#30363d] bg-[#0d1117] px-2 py-1 text-[10px] text-[#8b949e] hover:border-[#58a6ff] hover:text-[#58a6ff]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything about this repositoryâ€¦"
            className="min-w-0 flex-1 rounded-md border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md bg-[#238636] px-3 py-1.5 text-[12px] font-semibold text-white enabled:hover:bg-[#2ea043] disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {error ? <p className="mt-2 text-[11px] text-[#f85149]">{error}</p> : null}
      </Card>

      <Card title="AI settings">
        <div className="flex flex-col gap-2 text-[12px] text-[#c9d1d9]">
          <label className="flex items-center justify-between gap-2">
            Enabled
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => {
                const next = { ...settings, enabled: event.target.checked };
                setSettings(next);
                void getSettings().then((loaded) => saveSettings({ ...loaded, ai: next }));
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => chrome.runtime.openOptionsPage()}
            className="rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-[12px] text-[#c9d1d9] hover:border-[#58a6ff]"
          >
            Configure provider, key and model
          </button>
        </div>
      </Card>
    </div>
  );
}
