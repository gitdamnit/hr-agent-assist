import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import HomePage from "@/pages/home";
import ChatPage from "@/pages/chat";
import AboutPage from "@/pages/about";
import KnowledgeBasePage from "@/pages/knowledge-base";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import { AuthProvider, useRequireAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

function ProtectedShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <img src="/adhdpenguin2.jpeg" alt="HR Agent Assist" className="w-5 h-5 rounded-sm object-cover animate-pulse" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background flex-shrink-0 h-12">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/">
        <ProtectedShell>
          <HomePage />
        </ProtectedShell>
      </Route>
      <Route path="/chat/:id">
        <ProtectedShell>
          <ChatPage />
        </ProtectedShell>
      </Route>
      <Route path="/knowledge-base">
        <ProtectedShell>
          <KnowledgeBasePage />
        </ProtectedShell>
      </Route>
      <Route path="/about">
        <ProtectedShell>
          <AboutPage />
        </ProtectedShell>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}