"use server";

import { normalizeUrl } from "@/lib/validation-data";

const GENERIC_TITLES = new Set([
  "google docs",
  "google sheets",
  "google slides",
  "google forms",
  "google drive",
  "google accounts",
  "sign in",
  "sign-in",
  "login",
  "docs",
]);

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }

  return false;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(
      /\s*[-–—|:]\s*Google (Docs|Sheets|Slides|Forms|Drive|Accounts)\s*$/i,
      "",
    )
    .replace(/^Google (Docs|Sheets|Slides|Forms|Drive):\s*/i, "")
    .trim();
}

function isGenericTitle(title: string, url: string): boolean {
  const normalized = title.toLowerCase();
  if (!normalized || GENERIC_TITLES.has(normalized)) return true;
  if (/^https?:\/\//i.test(title)) return true;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(title)) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (normalized === host) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function metaContent(html: string, key: string): string | null {
  const property = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named =
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name|itemprop)=["']${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ??
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${property}["']`,
        "i",
      ),
    );
  return named?.[1] ? decodeEntities(named[1]) : null;
}

function extractTitle(html: string): string | null {
  const og = metaContent(html, "og:title");
  if (og) return og;

  const twitter = metaContent(html, "twitter:title");
  if (twitter) return twitter;

  const itemprop = metaContent(html, "name");
  if (itemprop) return itemprop;

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]) return decodeEntities(title[1]);

  return null;
}

function googleCanonicalUrls(url: string): string[] {
  try {
    const parsed = new URL(url);
    const id =
      parsed.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
      parsed.searchParams.get("id");
    if (!id || !parsed.hostname.includes("google.com")) return [url];

    if (parsed.pathname.includes("/document/")) {
      return [url, `https://docs.google.com/document/d/${id}`];
    }
    if (parsed.pathname.includes("/spreadsheets/")) {
      return [url, `https://docs.google.com/spreadsheets/d/${id}`];
    }
    if (parsed.pathname.includes("/presentation/")) {
      return [url, `https://docs.google.com/presentation/d/${id}`];
    }
    if (parsed.pathname.includes("/forms/")) {
      return [url, `https://docs.google.com/forms/d/${id}`];
    }
    return [url, `https://drive.google.com/file/d/${id}/view`];
  } catch {
    return [url];
  }
}

async function fetchHtml(url: string, userAgent: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": userAgent,
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }

    return (await response.text()).slice(0, 80_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function usableTitle(raw: string | null, url: string): string | null {
  if (!raw) return null;
  const title = cleanTitle(raw);
  if (!title || isGenericTitle(title, url)) return null;
  return title.slice(0, 160);
}

/** Fetch the public page title for a link chip. Returns null if unavailable. */
export async function fetchPageTitle(rawUrl: string): Promise<string | null> {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  if (isBlockedHost(hostname)) return null;

  const candidates = googleCanonicalUrls(url);
  const agents = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (compatible; AdsomniaWorkspace/1.0; +https://adsomnia.com)",
  ];

  for (const agent of agents) {
    for (const candidate of candidates) {
      const html = await fetchHtml(candidate, agent);
      if (!html) continue;
      const title = usableTitle(extractTitle(html), url);
      if (title) return title;
    }
  }

  return null;
}
