import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '../models/types';
import { DEFAULT_SETTINGS, clearCache, getSettings, saveSettings } from '../services/storage';

const fieldClass =
  'w-full rounded-md border border-[#30363d] bg-[#0d1117] px-2.5 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]';

export function OptionsApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getSettings().then((value) => {
      setSettings(value);
      setLoaded(true);
    });
  }, []);

  function update(patch: Partial<ExtensionSettings>): void {
    setSettings((current) => ({ ...current, ...patch }));
  }

  async function persist(next: ExtensionSettings = settings): Promise<void> {
    await saveSettings(next);
    setStatus('Saved.');
    window.setTimeout(() => setStatus(null), 2500);
  }

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-lg font-bold text-[#e6edf3]">GitHub Project Intelligence</h1>
      <p className="mb-6 text-[13px] text-[#8b949e]">
        Settings are stored locally in <code>chrome.storage.local</code>. Nothing is uploaded —
        requests only go to the GitHub API.
      </p>

      <section className="mb-6 rounded-lg border border-[#30363d] bg-[#161b22] p-4">
        <h2 className="mb-3 text-[11px] font-semibold tracking-wider text-[#8b949e] uppercase">
          GitHub API
        </h2>
        <label className="mb-1 block text-[12px] text-[#c9d1d9]" htmlFor="token">
          Personal access token (optional)
        </label>
        <input
          id="token"
          type="password"
          className={fieldClass}
          value={settings.githubToken}
          placeholder="ghp_… or github_pat_…"
          onChange={(event) => update({ githubToken: event.target.value.trim() })}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-[#8b949e]">
          Without a token you get 60 API requests/hour; with a read-only token 5,000/hour. A token
          also enables <strong>private repository analysis</strong>: create a fine-grained token with{' '}
          <strong>read-only</strong> access to the repositories you want to analyze (Repository
          contents → Read-only):{' '}
          <a
            className="text-[#58a6ff] underline"
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
          >
            github.com/settings/tokens
          </a>
        </p>

        <label className="mt-4 block text-[12px] text-[#c9d1d9]" htmlFor="ttl">
          Cache lifetime (minutes): {settings.cacheTtlMinutes}
        </label>
        <input
          id="ttl"
          type="range"
          min={1}
          max={360}
          value={settings.cacheTtlMinutes}
          className="mt-2 w-full accent-[#238636]"
          onChange={(event) => update({ cacheTtlMinutes: Number(event.target.value) })}
        />
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void persist()}
          className="rounded-md bg-[#238636] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2ea043]"
        >
          Save settings
        </button>
        <button
          type="button"
          onClick={() => {
            void clearCache().then(() => {
              setStatus('Cache cleared.');
              window.setTimeout(() => setStatus(null), 2500);
            });
          }}
          className="rounded-md border border-[#30363d] bg-[#21262d] px-4 py-2 text-[13px] text-[#c9d1d9] hover:border-[#58a6ff]"
        >
          Clear analysis cache
        </button>
        {status ? <span className="text-[12px] text-[#3fb950]">{status}</span> : null}
      </div>
    </div>
  );
}
