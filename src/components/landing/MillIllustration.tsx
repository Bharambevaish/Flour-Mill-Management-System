/**
 * Hand-drawn style चक्की (flour mill): a hopper of grain feeding two
 * millstones, flour pouring from the spout into an open sack. Pure SVG in the
 * theme's colours; the falling grains and flour stream are a gentle CSS loop
 * (`.mill-grain`, `.mill-flour` in globals.css) that stops for anyone who asks
 * for reduced motion.
 */
export function MillIllustration({ className = "" }: { className?: string }) {
  const grooves = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);
  return (
    <svg viewBox="0 0 420 420" role="img" aria-label="चक्की — flour mill" className={className}>
      {/* sun-disc backdrop */}
      <circle cx="210" cy="200" r="182" className="fill-haldi-100 dark:fill-earth-900" />
      <circle cx="210" cy="200" r="182" fill="none" strokeWidth="2" strokeDasharray="2 9" className="stroke-haldi-400/70 dark:stroke-earth-700" />

      {/* wheat stalks, left and right */}
      {[
        { x: 70, flip: 1 },
        { x: 350, flip: -1 },
      ].map(({ x, flip }) => (
        <g key={x} className="fill-haldi-500 stroke-haldi-600 dark:fill-haldi-600 dark:stroke-haldi-700" strokeWidth="2" strokeLinecap="round">
          <path d={`M${x} 360 Q ${x + 8 * flip} 270 ${x - 4 * flip} 200`} fill="none" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <ellipse cx={x - 4 * flip - 9} cy={214 + i * 18} rx="6" ry="11" transform={`rotate(-28 ${x - 4 * flip - 9} ${214 + i * 18})`} />
              <ellipse cx={x - 4 * flip + 9} cy={214 + i * 18} rx="6" ry="11" transform={`rotate(28 ${x - 4 * flip + 9} ${214 + i * 18})`} />
            </g>
          ))}
          <ellipse cx={x - 4 * flip} cy="198" rx="5" ry="10" />
        </g>
      ))}

      {/* hopper with grain */}
      <path d="M150 60 L270 60 L236 122 L184 122 Z" className="fill-clay-600 stroke-clay-800 dark:fill-clay-700 dark:stroke-clay-950" strokeWidth="3" strokeLinejoin="round" />
      <path d="M160 66 Q 210 46 260 66 L 252 80 L 168 80 Z" className="fill-haldi-300 dark:fill-haldi-600" />
      {[172, 188, 204, 220, 236, 248].map((cx, i) => (
        <ellipse key={cx} cx={cx} cy={70 - (i % 2) * 4} rx="4" ry="6" className="fill-haldi-500 dark:fill-haldi-700" transform={`rotate(${i % 2 ? 25 : -20} ${cx} ${70 - (i % 2) * 4})`} />
      ))}

      {/* falling grains */}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={204 + i * 6} cy="128" rx="3" ry="5" className="mill-grain fill-haldi-600 dark:fill-haldi-400" style={{ animationDelay: `${i * 0.45}s` }} />
      ))}

      {/* millstones */}
      <ellipse cx="210" cy="182" rx="112" ry="26" className="fill-earth-300 stroke-earth-600 dark:fill-earth-700 dark:stroke-earth-950" strokeWidth="3" />
      <path d="M98 182 L98 206 A112 26 0 0 0 322 206 L322 182" className="fill-earth-400 stroke-earth-600 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" />
      <ellipse cx="210" cy="152" rx="104" ry="24" className="fill-earth-200 stroke-earth-600 dark:fill-earth-500 dark:stroke-earth-950" strokeWidth="3" />
      <path d="M106 152 L106 176 A104 24 0 0 0 314 176 L314 152" className="fill-earth-300 stroke-earth-600 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" />
      <ellipse cx="210" cy="152" rx="104" ry="24" fill="none" className="stroke-earth-600 dark:stroke-earth-950" strokeWidth="3" />
      {grooves.map((deg) => {
        const r = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={210 + Math.cos(r) * 22}
            y1={152 + Math.sin(r) * 5}
            x2={210 + Math.cos(r) * 92}
            y2={152 + Math.sin(r) * 21}
            className="stroke-earth-400 dark:stroke-earth-700"
            strokeWidth="1.5"
          />
        );
      })}
      <ellipse cx="210" cy="152" rx="16" ry="5" className="fill-earth-700 dark:fill-earth-950" />
      {/* wooden handle on the top stone */}
      <rect x="282" y="112" width="12" height="44" rx="6" className="fill-haldi-700 stroke-haldi-900 dark:fill-haldi-800" strokeWidth="2.5" />

      {/* spout */}
      <path d="M300 206 L338 236 L326 248 L292 220 Z" className="fill-earth-500 stroke-earth-700 dark:fill-earth-600 dark:stroke-earth-950" strokeWidth="3" strokeLinejoin="round" />

      {/* flour stream */}
      <path d="M332 246 Q 336 262 330 286" className="mill-flour stroke-earth-50 dark:stroke-earth-200" strokeWidth="9" strokeLinecap="round" fill="none" />

      {/* sack */}
      <path
        d="M286 300 Q 282 282 300 280 L 360 280 Q 378 282 374 300 L 384 372 Q 386 390 366 390 L 294 390 Q 274 390 276 372 Z"
        className="fill-haldi-200 stroke-haldi-700 dark:fill-haldi-900 dark:stroke-haldi-950"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M296 284 Q 330 268 364 284 Q 330 298 296 284 Z" className="fill-earth-50 dark:fill-earth-200" />
      <text x="330" y="350" textAnchor="middle" className="fill-clay-700 dark:fill-clay-400" style={{ font: "400 26px var(--font-display)" }}>
        पीठ
      </text>

      {/* ground line */}
      <path d="M40 392 Q 210 380 392 392" fill="none" className="stroke-earth-400 dark:stroke-earth-700" strokeWidth="2" strokeLinecap="round" />
      {/* stand */}
      <path d="M120 212 L110 300 M300 212 L310 300 M115 262 L305 262" className="stroke-earth-600 dark:stroke-earth-700" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
