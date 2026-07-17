"use client";

import InfoTooltip from "./InfoTooltip";

interface InfoHeadingProps {
  label: string;
  info: string;
  className?: string;
  as?: "span" | "p" | "h2" | "h3";
  id?: string;
}

export default function InfoHeading({
  label,
  info,
  className = "",
  as: Tag = "span",
  id,
}: InfoHeadingProps) {
  return (
    <Tag id={id} className={`inline-flex items-center gap-2 ${className}`}>
      {label}
      <InfoTooltip label={label}>{info}</InfoTooltip>
    </Tag>
  );
}
