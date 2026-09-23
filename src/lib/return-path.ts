/** Same-origin path Slack and login can safely send someone back to. */
export function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value, "http://local");
  } catch {
    return null;
  }
  if (url.origin !== "http://local") return null;

  const path = `${url.pathname}${url.search}`;
  if (
    path.startsWith("/login") ||
    path.startsWith("/api/") ||
    path.startsWith("/complete-profile")
  ) {
    return null;
  }
  return path;
}

export function loginPath(next: string | null): string {
  if (!next) return "/login";
  return `/login?next=${encodeURIComponent(next)}`;
}
