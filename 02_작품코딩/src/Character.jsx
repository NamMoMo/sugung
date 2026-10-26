import { useEffect, useRef } from "react";
import base from "./character-base.svg?raw";
import { renderCharacter } from "./character-renderer";

export function Character({ answers, svgRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    renderCharacter(svg, answers);
    if (svgRef) svgRef.current = svg;
  }, [answers, svgRef]);
  return (
    <div
      className="character-svg"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: base }}
    />
  );
}
