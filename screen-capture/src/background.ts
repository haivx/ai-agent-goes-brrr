type CaptureMessage = { type: "CROP_EXT::CAPTURE" };
type DownloadMessage = {
  type: "CROP_EXT::DOWNLOAD";
  dataUrl: unknown;
  fileName?: unknown;
};

type CropMessage = CaptureMessage | DownloadMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCaptureMessage(message: Record<string, unknown>): message is CaptureMessage {
  return message.type === "CROP_EXT::CAPTURE";
}

function isDownloadMessage(message: Record<string, unknown>): message is DownloadMessage {
  return message.type === "CROP_EXT::DOWNLOAD";
}

async function dispatchToggleEvent(tabId?: number): Promise<void> {
  try {
    const targetTabId =
      typeof tabId === "number"
        ? tabId
        : (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id;

    if (typeof targetTabId !== "number") {
      console.warn("[CROP_EXT] Unable to determine active tab for toggle action");
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: () => {
        window.dispatchEvent(new CustomEvent("CROP_EXT::TOGGLE"));
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[CROP_EXT] toggle error:", errMsg);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (typeof tab.id !== "number") {
    await dispatchToggleEvent();
    return;
  }

  await dispatchToggleEvent(tab.id);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-crop-overlay") {
    await dispatchToggleEvent();
  }
});

chrome.runtime.onMessage.addListener((message: CropMessage | Record<string, unknown> | unknown) => {
  if (!isRecord(message)) {
    return undefined;
  }

  if (isCaptureMessage(message)) {
    return (async () => {
      try {
        const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
          format: "png",
        });

        return { ok: true, dataUrl };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[CROP_EXT] capture error:", errMsg);
        return { ok: false, error: errMsg };
      }
    })();
  }

  if (isDownloadMessage(message)) {
    return (async () => {
      try {
        if (typeof message.dataUrl !== "string") {
          throw new Error("Missing dataUrl");
        }

        const filename =
          typeof message.fileName === "string" && message.fileName.length > 0
            ? message.fileName
            : `capture_${Date.now()}.png`;

        await chrome.downloads.download({
          url: message.dataUrl,
          filename,
          saveAs: false,
        });

        return { ok: true };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error("[CROP_EXT] download error:", errMsg);
        return { ok: false, error: errMsg };
      }
    })();
  }

  return undefined;
});
