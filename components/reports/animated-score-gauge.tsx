"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getRiskColors(score: number) {
  if (score >= 90) {
    return {
      foreground: "hsl(160 84% 39%)",
      glow: "hsl(160 84% 39% / 0.3)",
      label: "Low Risk",
    };
  }
  if (score >= 70) {
    return {
      foreground: "hsl(38 92% 50%)",
      glow: "hsl(38 92% 50% / 0.3)",
      label: "Medium Risk",
    };
  }
  return {
    foreground: "hsl(var(--destructive))",
    glow: "hsl(var(--destructive) / 0.3)",
    label: "High Risk",
  };
}

export function AnimatedScoreGauge({
  score,
  size = 280,
  strokeWidth = 18,
  className,
}: AnimatedScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<SVGSVGElement>(null);
  const scoreMotion = useMotionValue(0);
  const pathLength = useMotionValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const center = size / 2;

  const animatedPathLength = useTransform(pathLength, (v) => v * circumference);

  useEffect(() => {
    const controls = animate(scoreMotion, score, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        setDisplayScore(Math.round(v));
      },
      onComplete: () => {
        setIsComplete(true);
      },
    });

    const pathControls = animate(pathLength, 1, {
      duration: 0.6,
      ease: "easeOut",
    });

    return () => {
      controls.stop();
      pathControls.stop();
    };
  }, [score, scoreMotion, pathLength]);

  const riskColors = getRiskColors(score);

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <svg
        ref={containerRef}
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        className="overflow-visible"
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={riskColors.foreground} stopOpacity="0.8" />
            <stop offset="100%" stopColor={riskColors.foreground} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <path
          d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.2"
        />

        {/* Foreground arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            pathLength: animatedPathLength,
            filter: "url(#glow)",
          }}
        />

        {/* Start/end markers */}
        <circle cx={strokeWidth / 2} cy={center} r={strokeWidth / 2 + 2} fill="hsl(var(--muted))" opacity="0.3" />
        <circle cx={size - strokeWidth / 2} cy={center} r={strokeWidth / 2 + 2} fill="hsl(var(--muted))" opacity="0.3" />
      </svg>

      {/* Center score text */}
      <div className="absolute bottom-0 flex flex-col items-center">
        <motion.div
          initial={false}
          animate={isComplete ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="font-mono"
        >
          <span
            className="text-5xl font-bold tracking-tighter"
            style={{ color: riskColors.foreground }}
          >
            {displayScore}
          </span>
          <span className="text-2xl font-bold text-muted-foreground/60">%</span>
        </motion.div>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Original Content
        </span>
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={isComplete ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.3 }}
          className={cn(
            "mt-2 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            score >= 90 && "bg-emerald-500/10 text-emerald-500",
            score >= 70 && score < 90 && "bg-amber-500/10 text-amber-500",
            score < 70 && "bg-destructive/10 text-destructive"
          )}
        >
          {riskColors.label}
        </motion.span>
      </div>
    </div>
  );
}
