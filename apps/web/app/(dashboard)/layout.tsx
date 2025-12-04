'use client'

import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandBar } from "@/components/layout/CommandBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopNav } from "@/components/layout/TopNav";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthSessionMonitor } from "@/components/auth/AuthSessionMonitor";

function DashboardLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"
          aria-label="Loading"
        />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AuthSessionMonitor />
      <CommandBar />
      <Sidebar />
      <div className="lg:pl-64 min-h-screen pb-20 lg:pb-8 flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Suspense fallback={<DashboardLoadingFallback />}>
            {children}
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </ProtectedRoute>
  );
}

