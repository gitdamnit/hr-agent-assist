import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const registerMutation = useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", creds);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/conversations"] });
      navigate("/");
    },
    onError: async (err: any) => {
      const body = await err?.response?.json();
      toast({ title: "Registration failed", description: body?.error || "Could not create account", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = fd.get("username") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    const newErrors: typeof errors = {};
    if (!username.trim()) newErrors.username = "Username is required";
    else if (username.trim().length < 3) newErrors.username = "Must be at least 3 characters";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Must be at least 8 characters";
    if (password && confirm !== password) {
      setErrors({ password: "Passwords do not match" });
      return;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    registerMutation.mutate({ username: username.trim(), password });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/adhdpenguin2.jpeg" alt="HR Agent Assist" className="w-14 h-14 rounded-xl object-cover mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with HR Agent Assist</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Choose a username"
              className={errors.username ? "border-destructive" : ""}
              disabled={registerMutation.isPending}
              data-testid="input-register-username"
            />
            {errors.username && <p className="text-xs text-destructive" data-testid="error-username">{errors.username}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`pr-10${errors.password ? " border-destructive" : ""}`}
                disabled={registerMutation.isPending}
                data-testid="input-register-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive" data-testid="error-password">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              name="confirm"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat your password"
              disabled={registerMutation.isPending}
              data-testid="input-register-confirm"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
            data-testid="button-register-submit"
          >
            {registerMutation.isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-sidebar-primary font-medium hover:underline"
            data-testid="link-login"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}