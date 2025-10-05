import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Sales Lead Snapshot",
  description: "Upload screenshots and capture lead details in seconds"
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold uppercase tracking-widest text-primary/80">
                  Sales Lead Snapshot
                </span>
                <span className="text-sm text-muted-foreground">
                  Turn screenshots into ready-to-send outreach in minutes.
                </span>
              </div>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Beta
              </span>
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-5xl grow flex-col px-6 py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
