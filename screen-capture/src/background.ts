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

chrome.runtime.onMessage.addListener(
  (message: CropMessage | Record<string, unknown> | unknown, _sender: unknown, sendResponse: (response: unknown) => void) => {
    if (!isRecord(message)) {
      return;
    }

    if (isCaptureMessage(message)) {
      (async () => {
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
            format: "png",
          });

          sendResponse({ ok: true, dataUrl });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error("[CROP_EXT] capture error:", errMsg);
          sendResponse({ ok: false, error: errMsg });
        }
      })();
      return true;
    }

    if (isDownloadMessage(message)) {
      (async () => {
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
            saveAs: true,
          });

          sendResponse({ ok: true });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error("[CROP_EXT] download error:", errMsg);
          sendResponse({ ok: false, error: errMsg });
        }
      })();
      return true;
    }

    return undefined;
  },
);
