import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Holder Churn CRM",
  description: "Birdeye-powered retention analytics for tokenized communities."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <div className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-graphite-950/78 backdrop-blur-xl">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-signal-cyan/40 bg-signal-cyan/10 text-sm font-bold text-signal-cyan">HC</span>
              <span className="text-sm font-semibold tracking-wide text-white">Holder Churn CRM</span>
            </Link>
            <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
              <Link className="hover:text-white" href="/dashboard">Dashboard</Link>
              <Link className="hover:text-white" href="/tokens/new">Add token</Link>
              <Link className="hover:text-white" href="/methodology">Methodology</Link>
              <Link className="hover:text-white" href="/settings">Settings</Link>
            </div>
            <Link href="/dashboard" className="rounded-md bg-white px-3 py-2 text-sm font-medium text-graphite-950 transition hover:bg-signal-cyan">
              View demo
            </Link>
          </nav>
        </div>
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
