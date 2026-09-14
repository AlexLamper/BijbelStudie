import React from 'react';

interface AiAssistantIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * The one mark for the AI assistant: a robot head. Identifies "this control
 * talks to the AI" without needing letters. Drawn in currentColor on a
 * lucide-style 24 px grid (lucide's own Bot glyph), so it sits next to other
 * lucide icons at the same size and stroke. Used by the floating launcher,
 * the AI tab on /lezen, the AI pill in the /studie flow bar and the
 * assistant's intro.
 */
export default function AiAssistantIcon({ size = 24, strokeWidth = 1.8, className = '' }: AiAssistantIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
