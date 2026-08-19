import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Shield,
  Cpu,
  Layers,
  ShieldCheck,
  UserCheck,
  Search,
  BookOpen,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { PageContainer } from "../layout/PageContainer";
import { MethodologyCarousel } from "./MethodologyCarousel";
import { ParticleBackground } from "./ParticleBackground";

interface LandingPageProps {
  onStartReview: () => void;
  onExploreCases: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartReview,
  onExploreCases,
}) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cinematic scroll calculations for hero rocket image
  // 1. Initial load (0px): image opacity ~0.78, overlay opacity ~0.30
  // 2. Scrolling 0 -> 350px: image clarifies (opacity -> 1.0, overlay -> 0.0), subtle translateY (0 -> -8px)
  // 3. Scrolling 350px -> 700px: image gently dissolves to 0, completely gone before next section
  const heroClarifyProgress = Math.min(scrollY / 300, 1);
  const heroDissolveProgress = Math.max(0, Math.min((scrollY - 320) / 320, 1));

  // Rocket image styles based on scroll position
  const rocketBaseOpacity = 0.78 + 0.22 * heroClarifyProgress;
  const rocketFinalOpacity = Math.max(0, rocketBaseOpacity * (1 - heroDissolveProgress));
  const darkOverlayOpacity = Math.max(0, 0.3 * (1 - heroClarifyProgress));
  const subtleTranslateY = -8 * heroClarifyProgress;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden border-b border-slate-900 pt-10 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32">
        <ParticleBackground className="opacity-90 mix-blend-screen" />
        <PageContainer variant="wide" className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: Brand & Problem Statement (approx 52%) */}
            <div className="lg:col-span-7 space-y-8 z-10">
              {/* Institutional Tag */}
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3.5 py-1 text-xs font-mono text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="tracking-wide uppercase font-semibold text-[11px]">
                  Aerospace Flight Readiness Decision Support
                </span>
              </div>

              {/* Main Title & Tagline */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-100 font-sans">
                  PRECEDENT
                </h1>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-slate-200 leading-snug">
                  Learning from yesterday.
                  <br />
                  <span className="text-slate-400 font-normal">
                    Deciding for tomorrow.
                  </span>
                </p>
              </div>

              {/* Problem Statement */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-2xl text-justify-left">
                Every critical aerospace mission begins with a decision. PRECEDENT helps mission review teams compare today's situation against verified historical aerospace investigations, revealing patterns, similarities, and lessons before critical decisions are made. It strengthens engineering judgment through historical evidence—not prediction.
              </p>

              {/* Primary Call to Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  type="button"
                  onClick={onStartReview}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-slate-100 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-lg hover:bg-white active:scale-[0.99] transition-all font-sans"
                >
                  <span>Begin Flight Readiness Review</span>
                  <ArrowRight className="h-4 w-4 text-slate-950 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={onExploreCases}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-3.5 text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-900 transition-colors font-sans"
                >
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span>Verified Case Base</span>
                </button>
              </div>

              {/* Subtle Invariant Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Zero Predictive Go/No-Go
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  100% Deterministic Reasoning
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  Engineering Judgment Final
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Dedicated Rocket Imagery (approx 48%) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div
                className="relative w-full max-w-md lg:max-w-none transition-transform duration-300 ease-out"
                style={{
                  transform: `translateY(${subtleTranslateY}px)`,
                  opacity: rocketFinalOpacity,
                }}
              >
                {/* Natural Soft Gradients to blend image seamlessly into dark background */}
                {/* Left blend */}
                <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />
                {/* Top blend */}
                <div className="absolute inset-x-0 top-0 h-16 sm:h-20 bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent pointer-events-none z-10" />
                {/* Right blend */}
                <div className="absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-slate-950 via-slate-950/50 to-transparent pointer-events-none z-10" />
                {/* Bottom blend */}
                <div className="absolute inset-x-0 bottom-0 h-20 sm:h-28 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none z-10" />

                {/* Dark Overlay that gently fades out on scroll */}
                <div
                  className="absolute inset-0 bg-slate-950 pointer-events-none z-10 transition-opacity duration-300"
                  style={{ opacity: darkOverlayOpacity }}
                />

                {/* Rocket Image: Full rocket, nose cone, engines, tower visible */}
                <img
                  src="/assets/rocket-hero.jpg"
                  alt="Aerospace launch vehicle on launch pad preparing for liftoff"
                  className="w-full h-auto max-h-[580px] lg:max-h-[640px] object-contain mx-auto select-none"
                  loading="eager"
                />

                {/* Understated Caption Under Image */}
                <p className="mt-4 text-center font-sans text-xs text-slate-400 italic max-w-sm mx-auto leading-relaxed">
                  Every mission begins with a decision. PRECEDENT helps ensure history is part of that decision.
                </p>
              </div>
            </div>

          </div>
        </PageContainer>
      </section>

      {/* ========================================================================= */}
      {/* 2. SIGNATURE STATEMENT SECTION                                            */}
      {/* ========================================================================= */}
      <section className="border-b border-slate-900 bg-slate-950 py-28 sm:py-36">
        <PageContainer variant="wide" className="text-center">
          <p className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-slate-100 font-sans leading-tight">
            History doesn't repeat itself.
            <br />
            <span className="text-amber-400/95 font-normal">
              Decision patterns do.
            </span>
          </p>
        </PageContainer>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW PRECEDENT WORKS (HORIZONTAL WORKFLOW)                              */}
      {/* ========================================================================= */}
      <MethodologyCarousel />

      {/* ========================================================================= */}
      {/* 4. WHY PRECEDENT EXISTS (THREE PREMIUM CARDS)                             */}
      {/* ========================================================================= */}
      <section className="border-b border-slate-900 bg-slate-950 py-24 sm:py-32">
        <PageContainer variant="wide" className="space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
              Purpose & Constitutional Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
              Why PRECEDENT Exists
            </h2>
            <p className="text-sm text-slate-400 font-sans">
              Built to combat risk normalization, institutional memory loss, and organizational silence during critical flight reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-cyan-400">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-sans">
                Detect Patterns
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                Compare today's mission review against verified aerospace investigations rather than relying on institutional memory.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-amber-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-sans">
                Explain Why
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                Reveal exactly which technical, environmental, organizational, and human decision factors align with historical incidents.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-sans">
                Preserve Human Judgment
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                PRECEDENT never predicts mission success. Never recommends GO/NO-GO. Never replaces engineering expertise.
              </p>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ========================================================================= */}
      {/* 5. POWERED BY IBM GRANITE (STRICT BOUNDARY BREAKDOWN)                      */}
      {/* ========================================================================= */}
      <section className="border-b border-slate-900 bg-slate-950 py-24 sm:py-32">
        <PageContainer variant="wide" className="space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400">
              AI Safety & Determinism
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-sans">
              Powered by IBM Granite
            </h2>
            <p className="text-sm text-slate-400 font-sans">
              Strict architectural separation ensures artificial intelligence operates solely as a translation interface, never as a decision-maker.
            </p>
          </div>

          {/* Dual Responsibility Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Left: IBM Granite Responsibilities */}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-bold text-base text-slate-100">
                      IBM Granite (watsonx.ai)
                    </h3>
                  </div>
                  <span className="rounded bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                    ibm/granite-3-8b-instruct
                  </span>
                </div>

                <ul className="space-y-3 text-sm text-slate-300 font-sans">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Extracts structured factors:</strong> Parses messy mission review transcripts and extracts 8 canonical factor values with verbatim quotes.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Generates grounded explanations:</strong> Synthesizes factual narrative anchored strictly in matched historical report citations.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Greedy decoding (temperature=0.0):</strong> Ensures consistent, deterministic natural language extraction without creative deviation.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-slate-950/80 p-3.5 border border-cyan-500/20 text-xs font-mono text-cyan-300">
                BOUNDARY: Natural language translation interface only.
              </div>
            </div>

            {/* Right: Deterministic Engine Responsibilities */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-5 w-5 text-amber-400" />
                    <h3 className="font-bold text-base text-slate-100">
                      Deterministic Reasoning Engine
                    </h3>
                  </div>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-300 border border-amber-500/20">
                    Pure Python Service
                  </span>
                </div>

                <ul className="space-y-3 text-sm text-slate-300 font-sans">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Matches precedents deterministically:</strong> Computes factor overlap score <code className="font-mono text-xs text-amber-200">μ(S, H)</code> across canonical categories.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Calculates multi-category breadth:</strong> Evaluates technical, environmental, human, and organizational factor distribution.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Calculates discrete confidence & abstention:</strong> Employs categorical rules (HIGH / MEDIUM / LOW / NONE) and abstains cleanly when data is sparse.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-500/20 text-xs font-mono text-amber-300">
                BOUNDARY: 100% mathematical logic with zero LLM in scoring or ranking.
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ========================================================================= */}
      {/* 6. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 py-16 border-t border-slate-900">
        <PageContainer variant="wide">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span className="font-mono text-base font-bold tracking-wider text-slate-100">
                  PRECEDENT
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Learning from yesterday. Deciding for tomorrow.
              </p>
            </div>

            <div className="flex flex-col md:items-end gap-1 text-xs text-slate-400 font-mono">
              <span>Deterministic Aerospace Precedent Analysis</span>
              <span className="text-cyan-400">Powered by IBM Granite</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-900 text-center text-[11px] text-slate-400 font-mono">
            PRECEDENT ADVISORY: Historical precedent analysis only. Not a recommendation, predictive model, or GO/NO-GO determination. Engineering judgment remains final.
          </div>
        </PageContainer>
      </footer>
    </div>
  );
};
