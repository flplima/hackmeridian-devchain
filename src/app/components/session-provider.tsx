"use client"

import { AuthProvider } from "@/lib/auth-context"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}