/**
 * Hand-drawn style चक्की (flour mill), animated.
 *
 * What moves (all CSS / SVG, no JS, no video):
 *  - the top millstone really turns: its grooves are drawn on a flat circle
 *    that rotates inside a group squashed into the stone's ellipse, so the
 *    turn reads in perspective; the wooden handle rides round the rim;
 *  - grain trickles from the hopper, flour pours from the spout and a little
 *    flour dust puffs up out of the sack;
 *  - the wheat stalks sway, the dotted sun-ring drifts.
 * A paper-grain filter roughens the flat fills so it reads as printed, not
 * vector clip-art. Everything stops under `prefers-reduced-motion`.
 */
export function MillIllustration({ className = "" }: { className?: string }) {
  const grooves = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);
  // Top stone: centre (210,152), rx 104, ry 24  →  y-squash 24/104.
  const SQUASH = 24 / 104;

  return (
    <svg viewBox="0 0 420 420" role="img" aria-label="चक्की — flour mill" className={`mill ${className}`}>
      <defs>
        {/* paper grain: soft noise multiplied over the fills */}
        <filter id="mill-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="soft">
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceGraphic" operator="in" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" />
        </filter>
        {/* slightly wobbly ink line */}
        <filter id="mill-ink">
          <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" seed="3" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="2.2" />
        </filter>
        <clipPath id="mill-top-stone">
          <ellipse cx="210" cy="152" rx="102" ry="22.5" />
        </clipPath>
      </defs>

      <g filter="url(#mill-paper)">
        {/* sun-disc backdrop */}
        <circle cx="210" cy="200" r="182" className="fill-haldi-100 dark:fill-earth-900" />
        <g className="mill-ring" style={{ transformOrigin: "210px 200px" }}>
          <circle cx="210" cy="200" r="182" fill="none" strokeWidth="2" strokeDasharray="2 9" className="stroke-haldi-400/70 dark:stroke-earth-700" />
        </g>

        {/* wheat stalks, swaying from their base */}
        {[
          { x: 70, flip: 1, delay: "0s" },
          { x: 350, flip: -1, delay: "-1.6s" },
        ].map(({ x, flip, delay }) => (
          <g
            key={x}
            className="mill-sway fill-haldi-500 stroke-haldi-600 dark:fill-haldi-600 dark:stroke-haldi-700"
            style={{ transformOrigin: `${x}px 360px`, animationDelay: delay }}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d={`M${x} 360 Q ${x + 8 * flip} 270 ${x - 4 * flip} 200`} fill="none" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <ellipse cx={x - 4 * flip - 9} cy={214 + i * 18} rx="6" ry="11" transform={`rotate(-28 ${x - 4 * flip - 9} ${214 + i * 18})`} />
                <ellipse cx={x - 4 * flip + 9} cy={214 + i * 18} rx="6" ry="11" transform={`rotate(28 ${x - 4 * flip + 9} ${214 + i * 18})`} />
              </g>
            ))}
            <ellipse cx={x - 4 * flip} cy="198" rx="5" ry="10" />
            <path d={`M${x - 4 * flip} 190 l -6 -18 M${x - 4 * flip} 190 l 0 -20 M${x - 4 * flip} 190 l 6 -18`} fill="none" strokeWidth="1.4" />
          </g>
        ))}

        {/* stand */}
        <path d="M120 212 L110 300 M300 212 L310 300 M115 262 L305 262" className="stroke-earth-600 dark:stroke-earth-700" strokeWidth="6" strokeLinecap="round" filter="url(#mill-ink)" />

        {/* wooden handle, BACK half of its round: behind the hopper */}
        <Handle half="back" />

        {/* hopper with grain */}
        <path d="M150 60 L270 60 L236 122 L184 122 Z" className="fill-clay-600 stroke-clay-800 dark:fill-clay-700 dark:stroke-clay-950" strokeWidth="3" strokeLinejoin="round" filter="url(#mill-ink)" />
        <path d="M160 66 Q 210 46 260 66 L 252 80 L 168 80 Z" className="fill-haldi-300 dark:fill-haldi-600" />
        {[172, 188, 204, 220, 236, 248].map((cx, i) => (
          <ellipse key={cx} cx={cx} cy={70 - (i % 2) * 4} rx="4" ry="6" className="fill-haldi-500 dark:fill-haldi-700" transform={`rotate(${i % 2 ? 25 : -20} ${cx} ${70 - (i % 2) * 4})`} />
        ))}

        {/* trickle of grain into the eye of the stone */}
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx={205 + (i % 2) * 6}
            cy="124"
            rx="2.6"
            ry="4.4"
            className="mill-grain fill-haldi-600 dark:fill-haldi-400"
            style={{ animationDelay: `${i * 0.32}s` }}
          />
        ))}

        {/* bottom stone (still) */}
        <ellipse cx="210" cy="182" rx="112" ry="26" className="fill-earth-300 stroke-earth-600 dark:fill-earth-700 dark:stroke-earth-950" strokeWidth="3" />
        <path d="M98 182 L98 206 A112 26 0 0 0 322 206 L322 182" className="fill-earth-400 stroke-earth-600 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" />
        {/* flour dusting on the bottom stone's lip */}
        <path d="M104 186 Q 160 196 210 197 Q 270 196 318 186" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-earth-50/80 dark:stroke-earth-300/60" />

        {/* top stone body */}
        <path d="M106 152 L106 176 A104 24 0 0 0 314 176 L314 152" className="fill-earth-300 stroke-earth-600 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" />
        <ellipse cx="210" cy="152" rx="104" ry="24" className="fill-earth-200 dark:fill-earth-500" />

        {/* turning grooves: a flat circle rotating inside the squashed group */}
        <g clipPath="url(#mill-top-stone)">
          <g transform={`translate(210 152) scale(1 ${SQUASH})`}>
            <g className="mill-turn">
              {grooves.map((deg) => {
                const r = (deg * Math.PI) / 180;
                return (
                  <line
                    key={deg}
                    x1={Math.cos(r) * 22}
                    y1={Math.sin(r) * 22}
                    x2={Math.cos(r) * 100}
                    y2={Math.sin(r) * 100}
                    className="stroke-earth-400 dark:stroke-earth-700"
                    strokeWidth="1.6"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {/* a chip in the stone so the turn is easy to see */}
              <circle cx="68" cy="0" r="10" className="fill-earth-500 dark:fill-earth-800" />
              <circle cx="-48" cy="30" r="6" className="fill-earth-400 dark:fill-earth-700" />
            </g>
          </g>
        </g>
        <ellipse cx="210" cy="152" rx="104" ry="24" fill="none" className="stroke-earth-600 dark:stroke-earth-950" strokeWidth="3" />
        <ellipse cx="210" cy="152" rx="16" ry="5" className="fill-earth-700 dark:fill-earth-950" />

        {/* wooden handle, FRONT half of its round: drawn over the stone */}
        <Handle half="front" />

        {/* spout */}
        <path d="M300 206 L338 236 L326 248 L292 220 Z" className="fill-earth-500 stroke-earth-700 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" strokeLinejoin="round" filter="url(#mill-ink)" />

        {/* flour stream */}
        <path d="M332 246 Q 336 262 330 286" className="mill-flour stroke-earth-50 dark:stroke-earth-200" strokeWidth="9" strokeLinecap="round" fill="none" />

        {/* sack */}
        <path
          d="M286 300 Q 282 282 300 280 L 360 280 Q 378 282 374 300 L 384 372 Q 386 390 366 390 L 294 390 Q 274 390 276 372 Z"
          className="fill-haldi-200 stroke-haldi-700 dark:fill-haldi-900 dark:stroke-haldi-950"
          strokeWidth="3"
          strokeLinejoin="round"
          filter="url(#mill-ink)"
        />
        {/* stitch line on the sack */}
        <path d="M290 372 Q 330 380 370 372" fill="none" strokeDasharray="4 4" strokeWidth="1.6" className="stroke-haldi-700/70 dark:stroke-haldi-950" />
        <path d="M296 284 Q 330 268 364 284 Q 330 298 296 284 Z" className="fill-earth-50 dark:fill-earth-200" />
        <text x="330" y="350" textAnchor="middle" className="fill-clay-700 dark:fill-clay-400" style={{ font: "400 26px var(--font-display)" }}>
          पीठ
        </text>

        {/* ground line */}
        <path d="M40 392 Q 210 380 392 392" fill="none" className="stroke-earth-400 dark:stroke-earth-700" strokeWidth="2" strokeLinecap="round" filter="url(#mill-ink)" />
      </g>

      {/* flour dust puffing out of the sack (unfiltered, so it stays soft) */}
      {[
        { x: 318, d: "0s" },
        { x: 334, d: "0.9s" },
        { x: 346, d: "1.7s" },
        { x: 326, d: "2.4s" },
      ].map(({ x, d }) => (
        <circle key={x + d} cx={x} cy="282" r="3.2" className="mill-dust fill-earth-50 dark:fill-earth-200" style={{ animationDelay: d }} />
      ))}
    </svg>
  );
}

/**
 * The handle travels round the top stone's rim (6 s, same as the grooves).
 * The path starts at the right and runs clockwise, so the first half of each
 * turn is the FRONT of the stone and the second half the BACK. Two copies with
 * discrete opacity let the back one sit behind the hopper while the front one
 * sits on top of the stone — a real occlusion, not a handle floating over it.
 */
function Handle({ half }: { half: "front" | "back" }) {
  return (
    <g opacity={half === "front" ? 1 : 0}>
      <rect x="-6" y="-40" width="12" height="44" rx="6" className="fill-haldi-700 stroke-haldi-900 dark:fill-haldi-800" strokeWidth="2.5" />
      <animateMotion dur="6s" repeatCount="indefinite" path="M 290 152 A 80 18.5 0 1 1 130 152 A 80 18.5 0 1 1 290 152" />
      <animate
        attributeName="opacity"
        dur="6s"
        repeatCount="indefinite"
        calcMode="discrete"
        keyTimes="0;0.5"
        values={half === "front" ? "1;0" : "0;1"}
      />
    </g>
  );
}
