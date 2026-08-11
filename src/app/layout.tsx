import type { Metadata } from "next";
import { Libre_Franklin, Sen } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sen.variable} ${libreFranklin.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
