/** Minimal type declarations for Google Identity Services. */

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        error?: string;
        expires_in: number;
        scope: string;
        token_type: string;
      }

      interface TokenClientError {
        type: "popup_failed_to_open" | "popup_closed" | "unknown";
        message?: string;
      }

      interface TokenClient {
        callback: (response: TokenResponse) => void;
        error_callback?: (error: TokenClientError) => void;
        requestAccessToken(options?: { prompt?: string }): void;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: TokenClientError) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}

interface Window {
  google: typeof google;
}
