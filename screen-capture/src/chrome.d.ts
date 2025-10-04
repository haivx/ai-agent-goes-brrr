export {};

declare global {
  const chrome: {
    runtime: {
      sendMessage: (message: unknown) => Promise<unknown>;
      onMessage: {
        addListener(
          callback: (
            message: unknown,
            sender: unknown,
            sendResponse: (response: unknown) => void,
          ) => void,
        ): void;
      };
    };
    tabs: {
      captureVisibleTab: (
        windowId?: number,
        options?: { format?: "jpeg" | "png"; quality?: number },
      ) => Promise<string>;
    };
    downloads: {
      download: (options: { url: string; filename?: string; saveAs?: boolean }) => Promise<number>;
    };
  };
}
