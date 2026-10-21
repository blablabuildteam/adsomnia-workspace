import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Libre_Franklin, Sen } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getCurrentUser } from "@/lib/session";
import { THEME_COOKIE, isSharePath, parseThemePreference } from "@/lib/theme";
import "./globals.css";

const sen = Sen({
  variable: "--font-sen",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const libreFranklin = Libre_Franklin({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

export const metadata: Metadata = {
  // Link previews (Slack, WhatsApp) need absolute image URLs; on Vercel,
  // Next falls back to the deployment URL when no app URL is configured.
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
  title: "Adsomnia Workspace — Production Framework",
  description:
    "Concept previews for the Adsomnia Workspace System — dashboard, initiative intake, initiative tracking, and the Production Framework process map.",
  openGraph: {
    type: "website",
    siteName: "Adsomnia Workspace",
    title: "Adsomnia Workspace — Production Framework",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, cookieStore, headerStore] = await Promise.all([
    getCurrentUser(),
    cookies(),
    headers(),
  ]);
  const theme = parseThemePreference(
    user?.themePreference ?? cookieStore.get(THEME_COOKIE)?.value,
  );
  const documentTheme = isSharePath(headerStore.get("x-pathname"))
    ? "light"
    : theme;

  return (
    <html
      lang="en"
      className={`${sen.variable} ${libreFranklin.variable} h-full overflow-x-hidden antialiased${documentTheme === "light" ? " light" : ""}`}
      style={{ colorScheme: documentTheme }}
      suppressHydrationWarning
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        <ThemeProvider initialTheme={theme} canPersist={Boolean(user)}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
