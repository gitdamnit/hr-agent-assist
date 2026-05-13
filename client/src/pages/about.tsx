import {
  GraduationCap, Linkedin, CheckCircle,
  TrendingUp, Users, BookOpen, Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const EDUCATION = [
  { title: "Master of Science, Human Resource Management (MSHRM)", org: "Capella University" },
  { title: "Bachelor of Science, Business Management", org: "Western Governors University" },
  { title: "Associate of Arts, Human Resource Management", org: "American Public University" },
];

const ACHIEVEMENTS = [
  { icon: TrendingUp, metric: "$2.6MM+", label: "Revenue generated in FY2022 through strategic recruiting" },
  { icon: Star, metric: "9.9 / 10", label: "Candidate NPS — top-ranked recruiter experience" },
  { icon: Users, metric: "500+", label: "Candidates placed and onboarded in 14 months" },
  { icon: BookOpen, metric: "#1", label: "Nationally ranked recruiter for Charles Schwab & Co., Jan 2022" },
];

export default function AboutPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
          <img
            src="/images/evan-zellner.jpg"
            alt="Evan G. Zellner"
            className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-border"
            data-testid="img-creator-photo"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1" data-testid="text-creator-name">
              Evan G. Zellner
            </h1>
            <p className="text-sm text-muted-foreground mb-3">
              MSHRM · PHR · SHRM-CP · Six Sigma Green Belt · Certified Life Coach
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary">MSHRM</Badge>
              <Badge variant="secondary">PHR</Badge>
              <Badge variant="secondary">SHRM-CP</Badge>
              <Badge variant="secondary">TSC / CSP</Badge>
              <Badge variant="secondary">Six Sigma Green Belt</Badge>
              <Badge variant="outline">6+ Years HR & Recruiting</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <a
                href="https://linkedin.com/in/evanzellner"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-linkedin"
              >
                <Linkedin className="w-3.5 h-3.5" />
                linkedin.com/in/evanzellner
              </a>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">About</h2>
          <div className="bg-card border border-card-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Evan Zellner is a strategic HR professional and full-cycle recruiter with 6+ years of technical and corporate recruitment experience and 2+ years in team leadership. He has a proven track record sourcing top-tier talent across IT, engineering, and corporate functions — generating <strong className="text-foreground">$2.6MM+ in revenue</strong> and earning a <strong className="text-foreground">9.9/10 candidate NPS</strong>.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Holding an MS in Human Resource Management from Capella University and a suite of professional certifications including SHRM-CP, PHR, TSC, CSP, Project+, and Six Sigma Green Belt, Evan brings both the academic grounding and real-world execution that modern HR demands.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              HR Agent Assist is built on the same philosophy Evan applies in his practice: be accurate, be transparent, be the resource you wish you had. The agent is designed to give every employee access to the same quality of HR guidance that top organizations provide to their people leaders.
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Impact & Recognition</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.metric}
                className="bg-card border border-card-border rounded-lg p-4 text-center"
                data-testid={`card-achievement-${a.metric.replace(/[^a-z0-9]/gi, "-")}`}
              >
                <div className="w-7 h-7 rounded-md bg-sidebar-primary/10 flex items-center justify-center mx-auto mb-2">
                  <a.icon className="w-3.5 h-3.5 text-sidebar-primary" />
                </div>
                <p className="text-base font-bold text-foreground leading-none mb-1">{a.metric}</p>
                <p className="text-xs text-muted-foreground leading-snug">{a.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sidebar-primary" />
            Education
          </h2>
          <div className="bg-card border border-card-border rounded-lg divide-y divide-border">
            {EDUCATION.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 px-4 py-3">
                <CheckCircle className="w-3.5 h-3.5 text-sidebar-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="mb-6" />

        <p className="text-xs text-center text-muted-foreground">
          HR Agent Assist was designed and built by Evan G. Zellner — bringing enterprise-grade HR intelligence to every employee, manager, and HR team.
        </p>
      </div>
    </div>
  );
}
