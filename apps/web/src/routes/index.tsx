import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bot, GitGraph, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-background text-foreground py-24 px-6 sm:px-12 lg:px-24">
        <div className="mx-auto max-w-6xl flex flex-col items-start space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-zap-canvas-soft px-4 py-1.5 text-body-sm-strong text-zap-ink">
            <span className="bg-primary size-2 rounded-full"></span>
            Local personal operator
          </div>
          
          <h1 className="text-display-xl max-w-4xl text-zap-ink">
            Meet Kabeer OS
          </h1>
          
          <p className="text-body-lg max-w-2xl text-zap-body">
            Get from opening your laptop to meaningful work in under 30 seconds. 
            Automated signals, prioritized attention, and intelligent actions.
          </p>

          <Link
            to="/dashboard"
            className="group inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-body-md-strong text-zap-on-primary transition-colors hover:bg-primary/90"
          >
            Launch dashboard
            <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="content-band-cream">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16">
            <h2 className="text-eyebrow mb-4 text-zap-body">Core Features</h2>
            <p className="text-display-lg max-w-2xl text-zap-ink">
              Everything you need to automate your morning routine.
            </p>
          </div>
          <div className="grid w-full gap-6 sm:grid-cols-3">
            <FeatureCard 
              icon={<GitGraph className="size-6 text-primary" />}
              title="GitHub sync"
              description="Instantly fetch PRs, issues, and workflows needing your attention."
              variant="cream"
            />
            <FeatureCard 
              icon={<Zap className="size-6 text-zap-primary" />}
              title="30-second morning"
              description="A comprehensive morning brief that prioritizes your day."
              variant="dark"
            />
            <FeatureCard 
              icon={<Bot className="size-6 text-primary" />}
              title="Approved actions"
              description="Draft and execute complex Codex tasks with simple approvals."
              variant="cream"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, variant }: { icon: React.ReactNode, title: string, description: string, variant: "cream" | "dark" }) {
  const isDark = variant === "dark";
  return (
    <div className={`${isDark ? "card-feature-dark" : "card-feature-cream"} flex flex-col items-start space-y-4`}>
      <div className={`flex size-12 items-center justify-center rounded-md ${isDark ? 'bg-zap-on-primary/10' : 'bg-background'}`}>
        {icon}
      </div>
      <h3 className={isDark ? "text-display-sub-sm text-zap-on-primary" : "text-display-sub-sm text-zap-ink"}>{title}</h3>
      <p className={isDark ? "text-body-md text-zap-mute" : "text-body-md text-zap-body"}>{description}</p>
    </div>
  );
}
