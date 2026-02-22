"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--background)] text-slate-900 flex">
        <Sidebar />

        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <Header />

          <main
            className="flex-1 p-8 max-w-7xl mx-auto w-full"
            style={{ viewTransitionName: "main-content" }}
          >
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </ProtectedRoute>
  );
}
