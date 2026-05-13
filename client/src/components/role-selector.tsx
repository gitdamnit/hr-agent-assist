import { useState } from "react";
import { UserRound, ShieldCheck, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UserRole = "employee" | "manager" | "hr_professional";

interface RoleOption {
  id: UserRole;
  icon: React.ElementType;
  label: string;
  description: string;
  example: string;
}

const ROLES: RoleOption[] = [
  {
    id: "employee",
    icon: UserRound,
    label: "Employee",
    description: "Understand my rights, entitlements, and how to navigate HR processes.",
    example: "\"What leave am I entitled to?\"",
  },
  {
    id: "manager",
    icon: Briefcase,
    label: "Manager",
    description: "My obligations plus the employee's rights — full compliance picture.",
    example: "\"What must I do when someone requests FMLA?\"",
  },
  {
    id: "hr_professional",
    icon: ShieldCheck,
    label: "HR Professional",
    description: "Full statutory detail, compliance obligations, edge cases, risk flags.",
    example: "\"What are our record retention obligations for I-9 forms?\"",
  },
];

interface RoleSelectorProps {
  onSelect: (role: UserRole) => void;
  isLoading?: boolean;
}

export function RoleSelector({ onSelect, isLoading }: RoleSelectorProps) {
  const [selected, setSelected] = useState<UserRole | null>(null);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 max-w-2xl mx-auto w-full">
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-1.5" data-testid="text-role-selector-heading">
            Before we begin — who are you?
          </h2>
          <p className="text-sm text-muted-foreground">
            Your role shapes how HR Agent Assist answers your questions.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelected(role.id)}
              className={cn(
                "w-full text-left rounded-lg border p-4 transition-colors",
                selected === role.id
                  ? "border-sidebar-primary bg-sidebar-primary/5"
                  : "border-border bg-card hover-elevate"
              )}
              data-testid={`button-role-${role.id}`}
            >
              <div className="flex items-start gap-3.5">
                <div className={cn(
                  "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
                  selected === role.id
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "bg-sidebar-primary/10 text-sidebar-primary"
                )}>
                  <role.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{role.label}</p>
                    {selected === role.id && (
                      <span className="text-xs text-sidebar-primary font-medium">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{role.description}</p>
                  <p className="text-xs text-muted-foreground italic">{role.example}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => selected && onSelect(selected)}
          disabled={!selected || isLoading}
          data-testid="button-confirm-role"
        >
          Start Conversation
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; icon: React.ElementType }> = {
    employee: { label: "Employee", icon: UserRound },
    manager: { label: "Manager", icon: Briefcase },
    hr_professional: { label: "HR Professional", icon: ShieldCheck },
  };
  const { label, icon: Icon } = map[role];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
