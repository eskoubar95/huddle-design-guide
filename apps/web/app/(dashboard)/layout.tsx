'use client'

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandBar } from "@/components/layout/CommandBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandBar />
      <Sidebar />
      <div className="lg:pl-64 min-h-screen pb-20 lg:pb-8">
        {children}
      </div>
      <BottomNav />
    </>
  );
}

