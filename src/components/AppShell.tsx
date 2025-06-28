"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Main Content */}
      <div className={cn("container mx-auto px-4 py-6", className)}>
        {children}
      </div>

    </div>
  );
} 