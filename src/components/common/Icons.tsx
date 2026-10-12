import type { ReactNode, SVGProps } from "react";

/**
 * Small stroke icons used instead of emoji. Emoji render differently on every
 * phone (and as tofu on some older Android builds the mill's customers use),
 * so the UI draws its own: 24×24, 2px round strokes, `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Svg({ children, className = "h-4 w-4", ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

export const IconPrinter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </Svg>
);

export const IconCamera = (p: IconProps) => (
  <Svg {...p}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

export const IconCard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </Svg>
);

export const IconChevron = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

/**
 * The mill's mark: a wheat ear on a terracotta tile — the same drawing as the
 * PWA icon (`scripts/generate-icons.mjs`), scaled for inline use.
 */
export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  const grains = [
    { y: 352, rx: 23, ry: 40, d: 38, a: 26 },
    { y: 302, rx: 23, ry: 40, d: 38, a: 28 },
    { y: 252, rx: 22, ry: 38, d: 36, a: 30 },
    { y: 204, rx: 20, ry: 34, d: 33, a: 32 },
    { y: 160, rx: 17, ry: 28, d: 28, a: 34 },
  ];
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <rect width="512" height="512" rx="112" fill="#a8482a" />
      <g fill="#f9ebc4">
        <line x1="256" y1="420" x2="256" y2="150" stroke="#f9ebc4" strokeWidth="15" strokeLinecap="round" />
        {grains.flatMap((g) =>
          [-1, 1].map((s) => (
            <ellipse
              key={`${g.y}${s}`}
              cx={256 + s * g.d}
              cy={g.y}
              rx={g.rx}
              ry={g.ry}
              transform={`rotate(${s * -g.a} ${256 + s * g.d} ${g.y})`}
            />
          )),
        )}
        <ellipse cx="256" cy="118" rx="16" ry="30" />
        <path
          d="M242 130 210 74M256 108V62M270 130l32-56"
          stroke="#f9ebc4"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
