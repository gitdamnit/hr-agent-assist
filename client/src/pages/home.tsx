import { FileText, Scale, Shield, Zap, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Conversation } from "@shared/schema";

const FEATURES = [
  {
    icon: FileText,
    title: "Policy Guidance",
    description: "Accurate answers grounded in company policies with direct citations and source references.",
  },
  {
    icon: Scale,
    title: "Legal Baselines",
    description: "Law-aware guidance referencing authoritative government sources with effective dates.",
  },
  {
    icon: Shield,
    title: "Safe Escalation",
    description: "High-risk topics trigger cautious, cited responses and automatic escalation recommendations.",
  },
  {
    icon: Zap,
    title: "Action Requests",
    description: "Process HR actions like ticket creation and document routing with full audit logging.",
  },
];

export default function HomePage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center">
        {/* Hero */}
        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-6">
          <img src="/adhdpenguin2.jpeg" alt="HR Agent Assist" className="w-full h-full object-cover" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-1" data-testid="text-home-title">
          HR Agent Assist
        </h1>
        <p className="text-xs text-muted-foreground mb-3">HR Compliance and Rights Engine</p>
        <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-lg">
          A channel-agnostic HR assistant grounded in company policy and employment law. Ask anything — get cited, accurate, safe answers.
        </p>

        <Button
          size="lg"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="gap-2 mb-14"
          data-testid="button-start-conversation"
        >
          <MessageSquare className="w-4 h-4" />
          Start a Conversation
        </Button>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-lg border border-border bg-card"
              data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-md bg-sidebar-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-3.5 h-3.5 text-sidebar-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Always verify critical HR matters with your HR department or qualified legal counsel.
        </p>
      </div>
    </div>
  );
}
