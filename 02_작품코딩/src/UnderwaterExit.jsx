import { useEffect, useId, useState } from "react";
import OceanWindows from "./OceanWindows";

// This plate shares the photograph's cover crop. Refraction stops at the inner
// arch and excludes the foreground chest, so the room stays solid.
export default function UnderwaterExit() {
  const id = `exit-water-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMoving(!document.hidden && !media.matches);
    update(); media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <div className={`exit-underwater ${moving ? "water-moving" : "water-still"}`} aria-hidden="true" data-testid="exit-underwater" data-moving={moving}>
    <OceanWindows roomImage="/art/palace-exit-open.webp" />
    <svg className="exit-water-plate" viewBox="0 0 1875 839" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <clipPath id={`${id}-arch`}><path d="M736 577V193Q739 122 937 112Q1136 122 1138 193V577H1063L1052 517H814L803 577Z"/></clipPath>
        <filter id={`${id}-refraction`} filterUnits="userSpaceOnUse" x="725" y="100" width="425" height="490" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".009 .018" numOctaves="2" seed="8" result="water">
            {moving && <animate attributeName="baseFrequency" values=".009 .018;.012 .015;.009 .018" dur="18s" repeatCount="indefinite"/>}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="water" scale="9" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b5f0ff" stopOpacity=".06"/><stop offset=".5" stopColor="#5bbdd9" stopOpacity=".13"/><stop offset="1" stopColor="#087eaa" stopOpacity=".04"/></linearGradient>
        <radialGradient id={`${id}-beam`}><stop stopColor="#d5fbff" stopOpacity=".38"/><stop offset="1" stopColor="#bbf6ff" stopOpacity="0"/></radialGradient>
        <filter id={`${id}-caustics`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feTurbulence type="turbulence" baseFrequency=".026 .034" numOctaves="1" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 .7 0 0 0 0 .94 0 0 0 0 1 4 4 4 0 -6.3"/><feGaussianBlur stdDeviation=".8"/></filter>
        <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <g clipPath={`url(#${id}-arch)`} data-testid="exit-water-mask">
        <image className="exit-refracted-view" href="/art/palace-exit-open.webp" width="1875" height="839" filter={moving ? `url(#${id}-refraction)` : undefined}/>
        <path d="M730 105H1145V580H730Z" fill={`url(#${id}-depth)`}/>
        <g className="exit-water-sunshafts" filter={`url(#${id}-soft)`}>
          {[0,1,2].map(i=><ellipse key={i} cx={820+i*115} cy="270" rx={30+i*6} ry="235" fill={`url(#${id}-beam)`} transform={`rotate(${i*9-8} ${820+i*115} 110)`}/>)}
        </g>
        <rect className="exit-water-caustics" x="710" y="90" width="455" height="515" filter={`url(#${id}-caustics)`} opacity=".12"/>
        <g className="exit-water-motes">{Array.from({length:20},(_,i)=><circle className="exit-water-mote" key={i} cx={750+(i*83)%375} cy={150+(i*61)%350} r={i%3===0?1.5:.8} fill="#dbfaff" style={{"--mote-delay":`${-i*1.7}s`,"--mote-speed":`${15+i%5*3}s`}}/>)}</g>
      </g>
    </svg>
  </div>;
}
