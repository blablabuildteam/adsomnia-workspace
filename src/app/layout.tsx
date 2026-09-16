import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Libre_Franklin, Sen } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getCurrentUser } from "@/lib/session";
import { THEME_COOKIE, parseThemePreference } from "@/lib/theme";
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

export const metadata: Metadata = {
  title: "Adsomnia Workspace — Production Framework",
  description:
    "Concept previews for the Adsomnia Workspace System — dashboard, initiative intake, initiative tracking, and the Production Framework process map.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, cookieStore] = await Promise.all([getCurrentUser(), cookies()]);
  const theme = parseThemePreference(
    user?.themePreference ?? cookieStore.get(THEME_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      className={`${sen.variable} ${libreFranklin.variable} h-full overflow-x-hidden antialiased${theme === "light" ? " light" : ""}`}
      style={{ colorScheme: theme }}
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
