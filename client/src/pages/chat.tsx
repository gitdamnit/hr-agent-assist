import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, FileText, Scale, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble, StreamingMessage } from "@/components/message-bubble";
import { RoleSelector, RoleBadge, type UserRole } from "@/components/role-selector";
import type { Conversation, Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SUGGESTED_QUESTIONS: Record<UserRole, Array<{ icon: React.ElementType; label: string }>> = {
  employee: [
    { icon: FileText, label: "What is our bereavement leave policy?" },
    { icon: Scale, label: "What are my FMLA rights?" },
    { icon: Sparkles, label: "How do I request a workplace accommodation?" },
    { icon: HelpCircle, label: "How does the performance review process work?" },
  ],
  manager: [
    { icon: FileText, label: "What are my obligations when an employee requests FMLA?" },
    { icon: Scale, label: "How should I document a performance improvement plan?" },
    { icon: Sparkles, label: "What steps must I follow before terminating an employee?" },
    { icon: HelpCircle, label: "How do I handle a harassment complaint on my team?" },
  ],
  hr_professional: [
    { icon: FileText, label: "What are our I-9 record retention obligations?" },
    { icon: Scale, label: "Walk me through FMLA intermittent leave compliance requirements" },
    { icon: Sparkles, label: "What are the ADA interactive process requirements?" },
    { icon: HelpCircle, label: "What documentation is required for a RIF?" },
  ],
};

const DEFAULT_SUGGESTIONS = [
  { icon: FileText, label: "What is our bereavement leave policy?" },
  { icon: Scale, label: "What are my FMLA rights as an employee?" },
  { icon: Sparkles, label: "How do I submit a workplace accommodation request?" },
  { icon: HelpCircle, label: "What are the steps for the annual performance review process?" },
];

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      return res.json();
    },
    enabled: !!conversationId,
  });

  const setRoleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      const res = await apiRequest("PATCH", `/api/conversations/${conversationId}`, {
        sessionData: { role },
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streamingContent]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;

    setInput("");
    setIsSending(true);
    setStreamingContent("");

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              accumulated += event.content;
              setStreamingContent(accumulated);
            }
            if (event.done) {
              setStreamingContent(null);
              qc.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
              qc.invalidateQueries({ queryKey: ["/api/conversations"] });
            }
            if (event.error) throw new Error(event.error);
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
      setStreamingContent(null);
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }, [conversationId, isSending, qc, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
              <img src="/adhdpenguin2.jpeg" alt="HR Agent Assist" className="w-5 h-5 rounded-sm object-cover animate-pulse" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const sessionData = conversation?.sessionData as any;
  const role: UserRole | undefined = sessionData?.role;
  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0 || streamingContent !== null;

  // Show role selector if no role has been set yet and no messages
  if (!role && !hasMessages) {
    return (
      <RoleSelector
        onSelect={(r) => setRoleMutation.mutate(r)}
        isLoading={setRoleMutation.isPending}
      />
    );
  }

  const suggestions = role ? SUGGESTED_QUESTIONS[role] : DEFAULT_SUGGESTIONS;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-3 flex-shrink-0 flex items-center justify-between gap-4">
        <h1 className="text-sm font-medium text-foreground truncate" data-testid="text-conversation-title">
          {conversation?.title || "Conversation"}
        </h1>
        {role && <RoleBadge role={role} />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-8 max-w-2xl mx-auto text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
                <img src="/adhdpenguin2.jpeg" alt="HR Agent Assist" className="w-7 h-7 rounded-full object-cover" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">HR Agent Assist</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {role === "employee" && "Ask me about your rights, leave, benefits, or how to navigate any HR process."}
                  {role === "manager" && "Ask me about your obligations, team management, compliance, and HR processes."}
                  {role === "hr_professional" && "Ask me about statutory requirements, compliance, documentation, and HR best practices."}
                  {!role && "Ask me anything about HR policies, leave, benefits, or employment law."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {suggestions.map((q) => (
                <button
                  key={q.label}
                  onClick={() => sendMessage(q.label)}
                  className="flex items-start gap-3 text-left p-3.5 rounded-lg border border-border bg-card hover-elevate"
                  data-testid={`button-suggestion-${q.label.slice(0, 10).replace(/\s/g, "-")}`}
                >
                  <q.icon className="w-4 h-4 text-sidebar-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground leading-snug">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {streamingContent !== null && <StreamingMessage content={streamingContent} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4 flex-shrink-0 bg-background">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about HR policies, leave, benefits, employment law…"
              className="resize-none min-h-[44px] max-h-[160px] text-sm"
              rows={1}
              disabled={isSending}
              data-testid="input-message"
            />
          </div>
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 max-w-3xl mx-auto">
          HR Agent Assist provides general guidance. Verify critical matters with your HR department or legal counsel.
        </p>
      </div>
    </div>
  );
}
