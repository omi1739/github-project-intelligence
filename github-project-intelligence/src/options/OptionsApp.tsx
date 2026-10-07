import { useEffect, useState } from 'react';
import type { ExtensionSettings, ProviderId } from '../models/types';
import { PROVIDERS } from '../services/ai';
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

  function updateAi(patch: Partial<ExtensionSettings['ai']>): void {
    setSettings((current) => ({ ...current, ai: { ...current.ai, ...patch } }));
  }

  async function persist(next: ExtensionSettings = settings): Promise<void> {
    await saveSettings(next);
    setStatus('Saved.');
    window.setTimeout(() => setStatus(null), 2500);
  }

  async function toggleAi(enabled: boolean): Promise<void> {
    if (enabled && typeof chrome !== 'undefined' && chrome.permissions?.request) {
      try {
        await chrome.permissions.request({ origins: ['https://*/*'] });
      } catch {
        /* user may decline; fetches will fail with a clear error */
      }
    }
    const next = { ...settings, ai: { ...settings.ai, enabled } };
    setSettings(next);
    await persist(next);
  }

  if (!loaded) return null;

  const provider = PROVIDERS[settings.ai.provider];

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-lg font-bold text-[#e6edf3]">GitHub Project Intelligence</h1>
      <p className="mb-6 text-[13px] text-[#8b949e]">
        Settings are stored locally in <code>chrome.storage.local</code> and never leave your
        browser unless you enable an AI provider.
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
          Without a token you get 60 API requests/hour; with a read-only token 5,000/hour. Create a
          fine-grained token with <strong>read-only</strong> access to public repositories:{' '}
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

      <section className="mb-6 rounded-lg border border-[#30363d] bg-[#161b22] p-4">
        <h2 className="mb-3 text-[11px] font-semibold tracking-wider text-[#8b949e] uppercase">
          AI provider (V4)
        </h2>

        <label className="mb-3 flex items-center justify-between gap-3 text-[13px] text-[#c9d1d9]">
          Enable AI assistant
          <input
            type="checkbox"
            checked={settings.ai.enabled}
            onChange={(event) => void toggleAi(event.target.checked)}
            className="h-4 w-4 accent-[#238636]"
          />
        </label>

        <label className="mb-1 block text-[12px] text-[#c9d1d9]" htmlFor="provider">
          Provider
        </label>
        <select
          id="provider"
          className={fieldClass}
          value={settings.ai.provider}
          onChange={(event) => updateAi({ provider: event.target.value as ProviderId })}
        >
          {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
            <option key={id} value={id}>
              {PROVIDERS[id].label}
            </option>
          ))}
        </select>

        {settings.ai.provider !== 'ollama' ? (
          <>
            <label className="mt-3 block text-[12px] text-[#c9d1d9]" htmlFor="apiKey">
              API key
            </label>
            <input
              id="apiKey"
              type="password"
              className={fieldClass}
              value={settings.ai.apiKey}
              onChange={(event) => updateAi({ apiKey: event.target.value.trim() })}
            />
          </>
        ) : null}

        <label className="mt-3 block text-[12px] text-[#c9d1d9]" htmlFor="baseUrl">
          Base URL <span className="text-[#6e7681]">(default: {provider.defaultBaseUrl || 'required'})</span>
        </label>
        <input
          id="baseUrl"
          className={fieldClass}
          placeholder={provider.defaultBaseUrl}
          value={settings.ai.baseUrl}
          onChange={(event) => updateAi({ baseUrl: event.target.value.trim() })}
        />

        <label className="mt-3 block text-[12px] text-[#c9d1d9]" htmlFor="model">
          Model <span className="text-[#6e7681]">(default: {provider.defaultModel})</span>
        </label>
        <input
          id="model"
          className={fieldClass}
          placeholder={provider.defaultModel}
          value={settings.ai.model}
          onChange={(event) => updateAi({ model: event.target.value.trim() })}
        />

        <p className="mt-3 text-[11px] leading-relaxed text-[#8b949e]">
          The AI receives a redacted digest of the analysis report — never raw repository contents.
        </p>
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
