import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="cuestalo-logo" x1="4" y1="4" x2="44" y2="44">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="0.55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill="url(#cuestalo-logo)"
        opacity="0.16"
      />
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill="none"
        stroke="url(#cuestalo-logo)"
        strokeWidth="1.6"
        opacity="0.55"
      />
      <path
        d="M24 11c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z"
        fill="url(#cuestalo-logo)"
      />
      <circle cx="15.5" cy="33" r="2.4" fill="url(#cuestalo-logo)" opacity="0.85" />
      <circle cx="33" cy="15.5" r="1.8" fill="url(#cuestalo-logo)" opacity="0.7" />
    </svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10.5H13L13 2Z" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v4c0 1.66 2.69 3 6 3s6-1.34 6-3V7" />
      <path d="M3 11v4c0 1.66 2.69 3 6 3 1.2 0 2.32-.17 3.25-.46" />
      <ellipse cx="16" cy="17" rx="5" ry="2.5" />
      <path d="M11 17v3.5c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5V17" />
    </Svg>
  );
}

export function IconTokens(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M8.5 9h7M8.5 12h7M8.5 15h4" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7.5" y="13" width="3" height="4" rx="1" />
      <rect x="12.5" y="9" width="3" height="8" rx="1" />
      <rect x="17.5" y="6" width="3" height="11" rx="1" />
    </Svg>
  );
}

export function IconCompare(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18" />
      <path d="M6 7 3 12h6L6 7Z" />
      <path d="M18 7l-3 5h6l-3-5Z" />
      <path d="M3 12v3a3 3 0 0 0 3 3h1" />
      <path d="M21 12v3a3 3 0 0 1-3 3h-1" />
    </Svg>
  );
}

export function IconCalculator(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M8.5 7h7" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15v3M8.5 18h3" />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12.5 12 21l8.5-8.5V4.5h-8L3.5 12.5Z" />
      <circle cx="16" cy="8" r="1.4" />
    </Svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.5l3 1.8" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 6.5" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 3 19h18L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h7l5 5v13H6V3Z" />
      <path d="M13 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </Svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4c.6 3 2.4 4.8 5.4 5.4-3 .6-4.8 2.4-5.4 5.4-.6-3-2.4-4.8-5.4-5.4C9.6 8.8 11.4 7 12 4Z" />
      <path d="M18.5 15.5c.3 1.4 1.1 2.2 2.5 2.5-1.4.3-2.2 1.1-2.5 2.5-.3-1.4-1.1-2.2-2.5-2.5 1.4-.3 2.2-1.1 2.5-2.5Z" />
    </Svg>
  );
}

export function IconSignal(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20v-5M10 20V9M16 20V4" />
      <path d="M20 20h.01" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 7.8 7 9.5 4.1-1.7 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function IconLink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
      <path d="M14 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </Svg>
  );
}
