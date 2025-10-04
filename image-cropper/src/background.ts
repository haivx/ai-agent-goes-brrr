const dispatchToggleEvent = () => {
  window.dispatchEvent(new CustomEvent('CROP_EXT::TOGGLE'));
};

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: dispatchToggleEvent,
    });
  } catch (error) {
    console.error('action.onClicked error:', error);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'CROP_EXT::CAPTURE') {
        const dataUrl = await chrome.tabs.captureVisibleTab({
          format: 'png',
        });

        sendResponse({ ok: true, dataUrl });
        return;
      }

      if (message?.type === 'CROP_EXT::DOWNLOAD') {
        const { dataUrl, fileName } = message as {
          dataUrl: string;
          fileName?: string;
        };

        if (!dataUrl) {
          throw new Error('Missing dataUrl for download');
        }

        await chrome.downloads.download({
          url: dataUrl,
          filename: fileName || `capture_${Date.now()}.png`,
          saveAs: true,
        });

        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: 'Unsupported message type' });
    } catch (error) {
      console.error('background handler error:', error);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  })();

  return true;
});
