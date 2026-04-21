import React from 'react';

export function BrandLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Gold 'Z' and 'T' Integration */}
      <path 
        d="M25 35H75L30 75H75" 
        stroke="#D4AF37" 
        strokeWidth="14" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M58 35V80" 
        stroke="#D4AF37" 
        strokeWidth="14" 
        strokeLinecap="round" 
        opacity="0.9"
      />

      {/* Lightning Bolt - Transparently cutting through or striking */}
      <path 
        d="M65 15L40 55H70L45 95" 
        stroke="#0F172A" 
        strokeWidth="5" 
        fill="#0F172A" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M65 15L40 55H70L45 95" 
        stroke="white" 
        strokeWidth="1.5" 
        opacity="0.4"
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
