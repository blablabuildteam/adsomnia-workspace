const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const STORAGE_KEY = "adsomnia-drive-oauth";

export type DriveOAuthPending = {
  state: string;
  initiativeId: number;
  driveName: string;
  returnTo: string;
};

export function getDriveOAuthRedirectUri(origin = window.location.origin): string {
  return `${origin.replace(/\/$/, "")}/integrations/google-drive/callback`;
}

export function readDriveOAuthPending(): DriveOAuthPending | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DriveOAuthPending;
    if (
      !parsed.state ||
      !parsed.driveName ||
      !Number.isFinite(parsed.initiativeId) ||
      !parsed.returnTo
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDriveOAuthPending(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Full-page Google consent — same pattern as login, not a GIS popup. */
export function startGoogleDriveCreateOAuth(input: {
  initiativeId: number;
  driveName: string;
  returnTo: string;
}): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    throw new Error(
      "Google Drive is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
    );
  }

  const state =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `drive-${Date.now()}`;
  const pending: DriveOAuthPending = {
    state,
    initiativeId: input.initiativeId,
    driveName: input.driveName.trim(),
    returnTo: input.returnTo,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getDriveOAuthRedirectUri(),
    response_type: "token",
    scope: DRIVE_SCOPE,
    state,
    prompt: "consent",
    include_granted_scopes: "true",
  });

  window.location.assign(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

export function parseDriveOAuthCallback(hash: string, search: string): {
  accessToken?: string;
  state?: string;
  error?: string;
} {
  const fromHash = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash,
  );
  const fromQuery = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  const error =
    fromHash.get("error") ||
    fromQuery.get("error") ||
    fromHash.get("error_description") ||
    fromQuery.get("error_description") ||
    undefined;

  return {
    accessToken:
      fromHash.get("access_token") || fromQuery.get("access_token") || undefined,
    state: fromHash.get("state") || fromQuery.get("state") || undefined,
    error: error || undefined,
  };
}

export function driveOAuthReturnUrl(
  returnTo: string,
  error?: string,
): string {
  const url = new URL(returnTo, window.location.origin);
  if (error) url.searchParams.set("driveError", error);
  else url.searchParams.delete("driveError");
  return `${url.pathname}${url.search}${url.hash}`;
}
