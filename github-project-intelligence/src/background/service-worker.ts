chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'gpi:open-side-panel') return;

  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    sendResponse({ ok: false, message: 'No active tab found.' });
    return;
  }

  chrome.sidePanel
    .open({ tabId })
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        message: 'Click the Project Intelligence icon in the toolbar to open the panel.',
        error: String(error),
      });
    });

  return true;
});
