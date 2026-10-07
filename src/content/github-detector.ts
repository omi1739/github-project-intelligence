import { parseRepoPath } from '../utils/repoPath';

const BUTTON_ID = 'gpi-analyze-button';
const TOAST_ID = 'gpi-toast';

let currentKey = '';

function showToast(message: string): void {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:2147483647',
      'background:#161b22',
      'color:#e6edf3',
      'border:1px solid #30363d',
      'border-radius:8px',
      'padding:10px 14px',
      'font:13px/1.4 system-ui,sans-serif',
      'box-shadow:0 8px 24px rgba(0,0,0,.35)',
      'max-width:320px',
    ].join(';');
    document.documentElement.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = 'block';
  window.setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 4000);
}

async function openPanel(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'gpi:open-side-panel' });
    if (response && response.ok === false) {
      showToast(response.message ?? 'Click the toolbar icon to open Project Intelligence.');
    }
  } catch {
    showToast('Click the toolbar icon to open Project Intelligence.');
  }
}

function renderButton(repo: { fullName: string }): void {
  let button = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:2147483646',
      'display:inline-flex',
      'align-items:center',
      'gap:8px',
      'background:#238636',
      'color:#fff',
      'border:1px solid rgba(240,246,252,.1)',
      'border-radius:8px',
      'padding:9px 14px',
      'font:600 13px/1 system-ui,sans-serif',
      'cursor:pointer',
      'box-shadow:0 8px 24px rgba(1,4,9,.8)',
    ].join(';');
    button.addEventListener('mouseenter', () => {
      if (button) button.style.background = '#2ea043';
    });
    button.addEventListener('mouseleave', () => {
      if (button) button.style.background = '#238636';
    });
    button.addEventListener('click', () => void openPanel());
    document.documentElement.appendChild(button);
  }
  button.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>' +
    'Analyze Repository';
  button.title = `Open Project Intelligence for ${repo.fullName}`;
}

function removeButton(): void {
  document.getElementById(BUTTON_ID)?.remove();
  currentKey = '';
}

function update(): void {
  const ref = parseRepoPath(window.location.pathname);
  if (!ref) {
    removeButton();
    return;
  }
  if (currentKey !== ref.fullName) {
    currentKey = ref.fullName;
    renderButton(ref);
  }
}

let scheduled = false;
function scheduleUpdate(): void {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    update();
  }, 150);
}

const observer = new MutationObserver(scheduleUpdate);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', scheduleUpdate);
window.addEventListener('turbo:load', scheduleUpdate);
window.addEventListener('turbo:before-render', scheduleUpdate);
document.addEventListener('visibilitychange', scheduleUpdate);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'gpi:get-repo') {
    const ref = parseRepoPath(window.location.pathname);
    if (ref) sendResponse({ ok: true, repo: ref });
    else sendResponse({ ok: false });
  }
  return undefined;
});

update();
