import { useEffect, useId, useState } from "react";

// SVG coordinates share the room plate's viewBox. `slice` follows object-fit:
// cover on full-screen transitions; the room canvas keeps the original ratio.
export default function OceanWindows({ roomImage = "/art/palace-room.webp" }) {
  const id = `ocean-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const [paused, setPaused] = useState(() => document.hidden);
  useEffect(() => {
    const update = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return <svg className={`ocean-windows ${paused ? "ocean-paused" : ""}`} viewBox="0 0 1875 839" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-testid="living-ocean">
    <defs>
      <clipPath id={`${id}-panes`}><path d="M88 552V192Q88 116 168 73Q250 30 334 178V552Z M1540 552V178Q1624 30 1707 73Q1787 116 1787 192V552Z"/></clipPath>
      <linearGradient id={`${id}-fish`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#214f65"/><stop offset=".5" stopColor="#79b5c4"/><stop offset="1" stopColor="#1d5268"/></linearGradient>
      <linearGradient id={`${id}-beam`}><stop stopColor="#b6edff" stopOpacity="0"/><stop offset=".5" stopColor="#b6edff" stopOpacity=".12"/><stop offset="1" stopColor="#b6edff" stopOpacity="0"/></linearGradient>
      <g id={`${id}-swimmer`} fill={`url(#${id}-fish)`}><path d="M0 0C8-10 28-13 45-2Q52 1 45 5C28 16 8 12 0 2L-13 13L-10-12Z"/><path d="M16-8 23-18 31-9M16 8 23 17 30 9" opacity=".7"/><circle cx="39" cy="0" r="1.6" fill="#092c40"/></g>
    </defs>
    <g clipPath={`url(#${id}-panes)`}>
      <image className="ocean-refraction" href={roomImage} width="1875" height="839" opacity=".38"/>
      <g className="ocean-caustic-light" fill={`url(#${id}-beam)`}><path d="M40 35 145 45 335 620 255 640Z"/><path d="M165 15 235 40 285 600 205 630Z"/><path d="M1510 45 1610 15 1810 610 1720 640Z"/><path d="M1660 20 1720 30 1760 630 1680 620Z"/></g>
      {[{x:88,side:"left"},{x:1540,side:"right"}].map(({x,side})=><g transform={`translate(${x} 70)`} key={side}>
        <g className={`ocean-school ocean-school-${side}`} style={{"--swim-time": side==="left"?"24s":"29s","--swim-delay":side==="left"?"-7s":"-19s"}}>
          {[{x:0,y:170,s:.58},{x:48,y:145,s:.42},{x:63,y:200,s:.48},{x:110,y:175,s:.34}].map((fish,i)=><use key={i} href={`#${id}-swimmer`} transform={`translate(${fish.x} ${fish.y}) scale(${fish.s})`}/>)}</g>
        <g className={`ocean-school ocean-school-far ocean-school-${side}`} style={{"--swim-time":"39s","--swim-delay":side==="left"?"-25s":"-10s"}}>
          {[0,1,2].map(i=><use key={i} href={`#${id}-swimmer`} transform={`translate(${i*38} ${285+(i%2)*22}) scale(.27)`}/>)}</g>
        <g transform="translate(120 340)"><g className="ocean-jelly" style={{"--jelly-delay":side==="left"?"-3s":"-9s"}} opacity=".78"><image className="ocean-jelly-photo" href="/art/jellyfish-realistic.webp" x="-34" y="-45" width="82" height="123" preserveAspectRatio="xMidYMid meet"/></g></g>
        {[0,1,2,3,4,5].map(i=><circle key={i} className="ocean-drifting-speck" cx={22+i*39} cy={430-i*48} r={i%2?1.5:2.3} fill="#c2f3ff" opacity=".45" style={{"--speck-delay":`${-i*2.7}s`}}/>)}
      </g>)}
    </g>
  </svg>;
}
