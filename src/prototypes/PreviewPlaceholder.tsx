import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PreviewPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  accentClassName: string;
  icon: LucideIcon;
  foundationPath: string;
  foundationLabel: string;
  built: string[];
  remaining: string[];
}

const PreviewPlaceholder: React.FC<PreviewPlaceholderProps> = ({
  eyebrow,
  title,
  description,
  accentClassName,
  icon: Icon,
  foundationPath,
  foundationLabel,
  built,
  remaining,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <Link to="/prototypes" className="mb-6 text-sm text-white/60 transition hover:text-white">
          ← Back to prototype lab
        </Link>

        <div className={`rounded-[2rem] border border-white/10 bg-gradient-to-br ${accentClassName} p-8 shadow-2xl`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-sm text-white/85">
            <Icon className="h-4 w-4" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/80 sm:text-lg">{description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={foundationPath}>
                Open current foundation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/prototypes">Compare all prototypes</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Built now</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              {built.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-white/10 bg-white/5 p-6 text-white backdrop-blur-xl">
            <div className="flex items-center gap-2 text-amber-300">
              <Clock3 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Still to build</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              {remaining.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs uppercase tracking-[0.22em] text-white/45">Foundation route: {foundationLabel}</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PreviewPlaceholder;
