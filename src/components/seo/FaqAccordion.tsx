"use client";

import { useState } from "react";
import type { ToolFaq } from "@/lib/seo/tool-landings";

export default function FaqAccordion({ faqs }: { faqs: ToolFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => {
        const isOpen = open === index;
        return (
          <div
            key={faq.question}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02]"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : index)}
            >
              <span className="text-sm font-medium text-white/90">
                {faq.question}
              </span>
              <span
                className="font-mono text-cyber-cyan/70"
                aria-hidden="true"
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-white/[0.05] px-5 py-4 text-sm leading-relaxed text-white/55">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
