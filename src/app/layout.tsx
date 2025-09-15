import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./components/session-provider";

export const metadata: Metadata = {
  title: "DevChain - Verifiable Developer Portfolio",
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
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
