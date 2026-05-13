import { Link, useLocation } from "wouter";
import { MessageSquare, Plus, Trash2, Info, BookOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Document } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: documents } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      return res.json();
    },
    onSuccess: (conv: Conversation) => {
      qc.invalidateQueries({ queryKey: ["/api/conversations"] });
      navigate(`/chat/${conv.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      return id;
    },
    onSuccess: (id: number) => {
      qc.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (location === `/chat/${id}`) navigate("/");
      toast({ title: "Conversation deleted" });
    },
  });

  const activeId = location.startsWith("/chat/") ? parseInt(location.split("/")[2]) : null;
  const docCount = documents?.length ?? 0;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" data-testid="link-home-logo">
          <img
            src="/adhdpenguin2.jpeg"
            alt="HR Agent Assist"
            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-tight tracking-wide">HR Agent Assist</p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">HR Compliance and Rights Engine</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">AI-Powered HR Assistant</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 pt-3 pb-1">
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              onClick={() => createMutation.mutate()}
              data-testid="button-new-conversation"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>
          </div>

          <SidebarGroupLabel className="px-4 mt-2">Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading && (
                <>
                  {[1, 2, 3].map((i) => (
                    <SidebarMenuItem key={i}>
                      <div className="px-3 py-2">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                </>
              )}
              {!isLoading && (!conversations || conversations.length === 0) && (
                <SidebarMenuItem>
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    No conversations yet.
                  </div>
                </SidebarMenuItem>
              )}
              {conversations?.map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeId === conv.id}
                    data-testid={`nav-conversation-${conv.id}`}
                  >
                    <Link href={`/chat/${conv.id}`} className="flex items-center gap-2 group/item">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm">{conv.title}</span>
                      <button
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded-sm hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteMutation.mutate(conv.id);
                        }}
                        data-testid={`button-delete-conversation-${conv.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/knowledge-base"}>
              <Link href="/knowledge-base" data-testid="nav-knowledge-base">
                <BookOpen className="w-4 h-4" />
                <span className="flex-1">Knowledge Base</span>
                {docCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5">{docCount}</Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/about"}>
              <Link href="/about" data-testid="nav-about">
                <Info className="w-4 h-4" />
                <span>About the Creator</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
