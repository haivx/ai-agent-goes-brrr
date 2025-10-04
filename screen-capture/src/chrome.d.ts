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
      query: (queryInfo: {
        active?: boolean;
        lastFocusedWindow?: boolean;
      }) => Promise<Array<{ id?: number }>>;
    };
    downloads: {
      download: (options: { url: string; filename?: string; saveAs?: boolean }) => Promise<number>;
    };
    scripting: {
      executeScript: (options: {
        target: { tabId: number };
        func: () => void;
      }) => Promise<unknown>;
    };
    action: {
      onClicked: {
        addListener: (callback: (tab: { id?: number }) => void) => void;
      };
    };
    commands: {
      onCommand: {
        addListener: (callback: (command: string) => void) => void;
      };
    };
  };
}
