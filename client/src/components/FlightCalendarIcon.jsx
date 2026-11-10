import React from 'react';

/**
 * Custom Flight Schedule Icon (Calendar with Overlapping Airplane)
 * Pixel-precise vector matching the user reference graphic (media_1794301237249_e44bbecf.png).
 * Clean stroke line-art with round caps and joins, works seamlessly in Dark and Light modes.
 */
export default function FlightCalendarIcon({ size = 16, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 256 256" 
      fill="none" 
      stroke="currentColor"
      strokeWidth="11" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {/* 1. Binder Top Connecting Bar Segments */}
      <path d="M 16 26 H 38" />
      <path d="M 62 26 H 80" />
      <path d="M 104 26 H 122" />
      <path d="M 146 26 H 164" />
      <path d="M 188 26 H 202" />

      {/* 2. Top Binder Loop Rings (4 Capsule Loops) */}
      <rect x="38" y="7" width="24" height="38" rx="12" />
      <rect x="80" y="7" width="24" height="38" rx="12" />
      <rect x="122" y="7" width="24" height="38" rx="12" />
      <rect x="164" y="7" width="24" height="38" rx="12" />

      {/* 3. Calendar Outer Frame (Leaves clean clearance for the airplane) */}
      {/* Top right corner down to Y=105 */}
      <path d="M 194 26 A 18 18 0 0 1 212 44 V 104" />
      {/* Top left corner down along left edge and across bottom to X=88 */}
      <path d="M 28 26 A 18 18 0 0 0 10 44 V 196 A 18 18 0 0 0 28 214 H 88" />

      {/* 4. Calendar Interior Date Grid Squares */}
      {/* Row 1 (Cols 2, 3, 4) */}
      <rect x="76" y="66" width="32" height="32" rx="7" />
      <rect x="120" y="66" width="32" height="32" rx="7" />
      <rect x="164" y="66" width="32" height="32" rx="7" />

      {/* Row 2 (Cols 1, 2) */}
      <rect x="32" y="114" width="32" height="32" rx="7" />
      <rect x="76" y="114" width="32" height="32" rx="7" />

      {/* Row 3 (Cols 1, 2) */}
      <rect x="32" y="162" width="32" height="32" rx="7" />
      <rect x="76" y="162" width="32" height="32" rx="7" />

      {/* 5. Ascending Airplane in Foreground */}
      <path d="
        M 248 114
        C 240 114, 222 118, 202 124
        L 110 122
        A 6 6 0 0 0 102 129
        A 6 6 0 0 0 108 135
        L 165 158
        C 172 165, 166 182, 156 200
        L 96 208
        A 5 5 0 0 0 92 214
        A 5 5 0 0 0 98 219
        L 142 232
        L 148 248
        A 6 6 0 0 0 156 248
        L 164 238
        C 172 230, 185 220, 196 208
        L 236 234
        A 6 6 0 0 0 244 230
        A 6 6 0 0 0 240 222
        L 214 192
        C 220 180, 226 166, 232 150
        L 246 130
        A 9 9 0 0 0 248 114 Z
      " />
    </svg>
  );
}
