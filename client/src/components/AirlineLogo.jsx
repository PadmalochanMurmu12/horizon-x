import React, { useState } from 'react';

/**
 * Official Airline Brand Logos for Indian Commercial Carriers.
 * Uses official carrier icons and emblems with graceful fallback.
 */
const LOGO_MAP = {
  '6E': '/airlines/6E.png?v=3',
  'AI': '/airlines/AI.png?v=3',
  'IX': '/airlines/IX.svg?v=3',
  'QP': '/airlines/QP.svg?v=3',
  'SG': '/airlines/SG.png?v=3',
  '9I': '/airlines/9I.png?v=3',
  'S5': '/airlines/S5.svg?v=3',
  'IC': '/airlines/IC.png?v=3',
  'I7': '/airlines/I7.jpg?v=3',
  'Z0': '/airlines/Z0.png?v=3',
  'G8': '/airlines/G8.svg?v=3',
};

function resolveAirlineCode(code = '', name = '') {
  const c = (code || '').toUpperCase().trim();
  if (LOGO_MAP[c]) return c;

  const n = (name || '').toLowerCase();
  if (n.includes('indigo') || c === '6E') return '6E';
  if (n.includes('express') || c === 'IX') return 'IX';
  if (n.includes('air india') || c === 'AI') return 'AI';
  if (n.includes('akasa') || c === 'QP') return 'QP';
  if (n.includes('spicejet') || c === 'SG') return 'SG';
  if (n.includes('alliance') || c === '9I') return '9I';
  if (n.includes('star air') || c === 'S5') return 'S5';
  if (n.includes('fly91') || c === 'IC') return 'IC';
  if (n.includes('indiaone') || c === 'I7') return 'I7';
  if (n.includes('zoom') || n.includes('zooom') || c === 'Z0') return 'Z0';
  if (n.includes('go air') || n.includes('go first') || c === 'G8') return 'G8';

  return c;
}

export default function AirlineLogo({ 
  code = '', 
  carrierCode = '', 
  airlineCode = '', 
  name = '', 
  carrierName = '', 
  airlineName = '', 
  size = 28, 
  className = '' 
}) {
  const [hasError, setHasError] = useState(false);
  const effectiveCode = code || carrierCode || airlineCode || '';
  const effectiveName = name || carrierName || airlineName || '';
  const resolvedCode = resolveAirlineCode(effectiveCode, effectiveName);
  const logoSrc = LOGO_MAP[resolvedCode];

  let pixelSize = size;
  if (typeof size === 'string') {
    if (size === 'sm') pixelSize = 24;
    else if (size === 'md') pixelSize = 36;
    else if (size === 'lg') pixelSize = 48;
    else if (size === 'xl') pixelSize = 56;
    else {
      const parsed = parseInt(size, 10);
      pixelSize = isNaN(parsed) ? 28 : parsed;
    }
  }

  const containerStyle = {
    width: pixelSize,
    height: pixelSize,
    minWidth: pixelSize,
    minHeight: pixelSize
  };

  if (!hasError && logoSrc) {
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-xs shrink-0 select-none ${className}`}
        style={containerStyle}
        title={effectiveName || resolvedCode}
      >
        <img 
          src={logoSrc} 
          alt={effectiveName || resolvedCode} 
          className="w-full h-full object-contain p-0.5" 
          loading="lazy"
          onError={() => setHasError(true)} 
        />
      </div>
    );
  }

  // Graceful Fallback if image fails or code is unmapped
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-lg overflow-hidden bg-blue-600 text-white font-mono font-bold text-[10px] tracking-wider shrink-0 select-none ${className}`}
      style={containerStyle}
      title={effectiveName || effectiveCode}
    >
      {(resolvedCode || effectiveCode || 'FL').slice(0, 2).toUpperCase()}
    </div>
  );
}
