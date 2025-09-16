import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./components/session-provider";
import { QueryProvider } from "./components/query-provider";

export const metadata: Metadata = {
  title: "ProofChain - Verifiable Developer Portfolio",
  description: "Build your verifiable on-chain developer portfolio with certificates and job history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueryProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
