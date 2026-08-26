import { RECOMMENDED_DRIVE_FOLDERS } from "@/lib/validation-data";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

let gisReady: Promise<void> | null = null;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function waitFor(check: () => boolean, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (check()) {
      resolve();
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      if (check()) {
        window.clearInterval(id);
        resolve();
      } else if (Date.now() - started > 8000) {
        window.clearInterval(id);
        reject(new Error(`${label} failed to initialize`));
      }
    }, 40);
  });
}

async function ensureGoogleIdentity(): Promise<void> {
  if (!gisReady) {
    gisReady = (async () => {
      await loadScript("https://accounts.google.com/gsi/client");
      await waitFor(
        () => Boolean(window.google?.accounts?.oauth2),
        "Google Identity",
      );
    })().catch((error) => {
      gisReady = null;
      throw error;
    });
  }
  await gisReady;
}

async function getDriveAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
    );
  }
  await ensureGoogleIdentity();

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: () => {},
    });
  }

  return new Promise((resolve, reject) => {
    tokenClient!.callback = (response) => {
      if (response.error) {
        reject(
          new Error(
            response.error === "access_denied"
              ? "Google Drive access was denied. Allow Drive in the Google popup and try again."
              : response.error,
          ),
        );
        return;
      }
      accessToken = response.access_token;
      resolve(response.access_token);
    };
    tokenClient!.requestAccessToken({
      prompt: accessToken ? "" : "consent",
    });
  });
}

export function parseGoogleDriveFolderId(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  const folderMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;
  return null;
}

export function canCreateDriveFolders(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

/** Same OAuth client powers folder structure and project Drive creation. */
export function canCreateProjectDrive(): boolean {
  return canCreateDriveFolders();
}

export async function fetchDriveFolderName(
  driveUrl: string,
): Promise<string | null> {
  const folderId = parseGoogleDriveFolderId(driveUrl);
  if (!folderId) return null;

  const token = await getDriveAccessToken();
  const response = await driveFetch(
    token,
    `files/${folderId}?fields=name&includeItemsFromAllDrives=true`,
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { name?: string };
  return payload.name?.trim() || null;
}

type DriveFile = { id: string; name: string };

async function driveFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `https://www.googleapis.com/drive/v3/${path}${separator}supportsAllDrives=true`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function listChildFolders(
  token: string,
  parentId: string,
): Promise<DriveFile[]> {
  const query = encodeURIComponent(
    `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
  );
  const response = await driveFetch(
    token,
    `files?q=${query}&fields=files(id,name)&includeItemsFromAllDrives=true`,
  );
  if (!response.ok) {
    throw await driveError(response);
  }
  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files ?? [];
}

function driveFolderUrl(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

async function createFolder(
  token: string,
  parentId: string,
  name: string,
): Promise<DriveFile> {
  const response = await driveFetch(token, "files", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  });
  if (!response.ok) {
    throw await driveError(response);
  }
  const payload = (await response.json()) as { id?: string; name?: string };
  if (!payload.id) {
    throw new Error(`Google Drive created ${name} but did not return a folder id.`);
  }
  return { id: payload.id, name: payload.name || name };
}

async function driveError(response: Response): Promise<Error> {
  let message = `Google Drive request failed (${response.status}).`;
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    if (payload.error?.message) message = payload.error.message;
  } catch {
    /* keep default */
  }
  if (response.status === 403) {
    return new Error(
      `${message} Confirm the Drive API is enabled and that your Google account can edit this folder.`,
    );
  }
  if (response.status === 404) {
    return new Error(
      "That Drive folder was not found, or this Google account cannot open it.",
    );
  }
  return new Error(message);
}

export type CreatedDriveFolder = {
  name: string;
  id: string;
  url: string;
};

export type CreateDriveFoldersResult = {
  created: string[];
  skipped: string[];
  folders: CreatedDriveFolder[];
};

export type ProjectDriveKind = "shared_drive" | "folder";

export type CreatedProjectDrive = {
  id: string;
  name: string;
  url: string;
  kind: ProjectDriveKind;
};

async function createSharedDrive(
  token: string,
  name: string,
): Promise<CreatedProjectDrive> {
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `adsomnia-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const response = await driveFetch(
    token,
    `drives?requestId=${encodeURIComponent(requestId)}`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  if (!response.ok) {
    throw await driveError(response);
  }
  const payload = (await response.json()) as { id?: string; name?: string };
  if (!payload.id) {
    throw new Error("Google Drive created a Shared Drive but did not return an id.");
  }
  return {
    id: payload.id,
    name: payload.name || name,
    url: driveFolderUrl(payload.id),
    kind: "shared_drive",
  };
}

async function createRootFolder(
  token: string,
  name: string,
): Promise<CreatedProjectDrive> {
  const response = await driveFetch(token, "files", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
    }),
  });
  if (!response.ok) {
    throw await driveError(response);
  }
  const payload = (await response.json()) as { id?: string; name?: string };
  if (!payload.id) {
    throw new Error("Google Drive created a folder but did not return an id.");
  }
  return {
    id: payload.id,
    name: payload.name || name,
    url: driveFolderUrl(payload.id),
    kind: "folder",
  };
}

/**
 * Creates a Shared Drive when the signed-in Workspace account allows it;
 * otherwise creates a project folder in that account's My Drive.
 */
export async function createProjectDrive(
  name: string,
): Promise<CreatedProjectDrive> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Drive name is required.");
  }

  const token = await getDriveAccessToken();

  try {
    return await createSharedDrive(token, trimmed);
  } catch {
    try {
      return await createRootFolder(token, trimmed);
    } catch (folderError) {
      throw folderError instanceof Error
        ? folderError
        : new Error("Could not create a Google Drive for this project.");
    }
  }
}

export async function createRecommendedDriveFolders(
  driveUrl: string,
): Promise<CreateDriveFoldersResult> {
  const folderId = parseGoogleDriveFolderId(driveUrl);
  if (!folderId) {
    throw new Error(
      "Create or link the project Drive first, then create the folder structure.",
    );
  }

  const token = await getDriveAccessToken();
  const existing = await listChildFolders(token, folderId);
  const existingByName = new Map(existing.map((folder) => [folder.name, folder]));

  const created: string[] = [];
  const skipped: string[] = [];
  const folders: CreatedDriveFolder[] = [];

  for (const folder of RECOMMENDED_DRIVE_FOLDERS) {
    const already = existingByName.get(folder.name);
    if (already) {
      skipped.push(folder.name);
      folders.push({
        name: folder.name,
        id: already.id,
        url: driveFolderUrl(already.id),
      });
      continue;
    }
    const createdFolder = await createFolder(token, folderId, folder.name);
    created.push(folder.name);
    folders.push({
      name: folder.name,
      id: createdFolder.id,
      url: driveFolderUrl(createdFolder.id),
    });
  }

  return { created, skipped, folders };
}
