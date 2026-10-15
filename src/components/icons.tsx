/* One icon family: 24px grid, 1.6px round strokes, no fills. Drawn for Scopecast. */
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const Mark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="#1F1C17" />
    <path d="M7 24 C 13 24, 13.5 8.5, 25 8" stroke="#F3EEE4" strokeWidth="2" fill="none" strokeLinecap="round" />
    <line x1="19" y1="6" x2="19" y2="26" stroke="#B8502E" strokeWidth="1.6" strokeDasharray="1.5 2.2" />
    <circle cx="19" cy="10.6" r="2.4" fill="#B8502E" />
  </svg>
);

export const PinIcon = () => (
  <svg {...base}>
    <path d="M9 4h6l-1 5 3 3H7l3-3-1-5z" />
    <path d="M12 12v8" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const ArrowRightIcon = () => (
  <svg {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowLeftIcon = () => (
  <svg {...base}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const ArrowUpIcon = () => (
  <svg {...base}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const ArrowDownIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PrintIcon = () => (
  <svg {...base}>
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="7" rx="1.5" />
    <path d="M7 14h10v6H7z" />
  </svg>
);

export const SparkIcon = () => (
  <svg {...base}>
    <path d="M4 18c5 0 6-12 16-12" />
    <circle cx="14" cy="9.2" r="1.6" />
  </svg>
);
