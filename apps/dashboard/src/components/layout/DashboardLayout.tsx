"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className="min-h-screen bg-[var(--background)] text-slate-900 flex">
          <Sidebar />

          <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
            <Header />

            <main
              className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden"
              style={{ viewTransitionName: "main-content" }}
            >
              {children}
            </main>

            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
