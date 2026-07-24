"use client";

import { Fragment } from "react";

/**
 * Renders KI-Lagebild text with clickable markdown links [Label](url).
 * Keeps existing typography — no layout change.
 */
export default function AiSummaryWithLinks({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);

  return (
    <div className="whitespace-pre-line text-sm leading-relaxed text-white/55">
      {parts.map((part, index) => {
        const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
        if (!match) {
          return <Fragment key={`t-${index}`}>{part}</Fragment>;
        }
        return (
          <a
            key={`a-${index}`}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-cyber-cyan underline decoration-cyber-cyan/40 underline-offset-2 hover:text-cyber-cyan/90"
          >
            {match[1]}
          </a>
        );
      })}
    </div>
  );
}
