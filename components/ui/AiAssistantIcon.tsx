import React from 'react';

interface AiAssistantIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * The one mark for the AI assistant: a speech bubble with the letters "AI" in
 * it. The bubble says "you can ask something here", the letters say who
 * answers - so it identifies the control instead of decorating it. Drawn in
 * currentColor on a lucide-style 24 px grid, so it sits next to lucide icons
 * at the same size and stroke. Used by the floating launcher, the AI tab on
 * /lezen, the AI pill in the /studie flow bar and the assistant's intro.
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
      {/* Bubble with a tail bottom-left */}
      <path d="M6 3.5h12a3 3 0 0 1 3 3v7.5a3 3 0 0 1-3 3h-7l-4.5 3.5V17H6a3 3 0 0 1-3-3V6.5a3 3 0 0 1 3-3z" />
      {/* A */}
      <path d="M8.25 13.25 10.5 7.25l2.25 6M9 11.25h3" />
      {/* I */}
      <path d="M15.75 7.25v6" />
    </svg>
  );
}
