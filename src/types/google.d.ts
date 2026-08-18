/** Minimal type declarations for Google Picker API + Google Identity Services. */

declare namespace google {
  namespace picker {
    enum Action {
      PICKED = "picked",
      CANCEL = "cancel",
    }

    enum ViewId {
      DOCS = "all",
      RECENTLY_PICKED = "recently-picked",
    }

    enum Feature {
      MULTISELECT_ENABLED = "multiselectEnabled",
    }

    interface Document {
      id: string;
      name: string;
      mimeType: string;
      url: string;
      sizeBytes?: number;
    }

    interface ResponseObject {
      action: Action;
      docs: Document[];
    }

    class DocsView {
      constructor(viewId?: ViewId);
      setIncludeFolders(include: boolean): this;
      setSelectFolderEnabled(enabled: boolean): this;
      setMimeTypes(mimeTypes: string): this;
    }

    class PickerBuilder {
      addView(view: DocsView): this;
      setOAuthToken(token: string): this;
      setDeveloperKey(key: string): this;
      setCallback(callback: (data: ResponseObject) => void): this;
      setTitle(title: string): this;
      enableFeature(feature: Feature): this;
      build(): Picker;
    }

    interface Picker {
      setVisible(visible: boolean): void;
    }
  }

  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        error?: string;
        expires_in: number;
        scope: string;
        token_type: string;
      }

      interface TokenClient {
        callback: (response: TokenResponse) => void;
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}

interface Window {
  gapi: {
    load(api: string, config: { callback: () => void }): void;
  };
  google: typeof google;
}
