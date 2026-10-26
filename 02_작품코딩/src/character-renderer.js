import { legacyData } from "./character-data";
const svgNamespace = "http://www.w3.org/2000/svg";
function createSvgElement(tag, attributes, text) {
  const element = document.createElementNS(svgNamespace, tag);
  Object.entries(attributes || {}).forEach(([key, value]) =>
    element.setAttribute(key, String(value)),
  );
  if (text !== undefined) element.textContent = text;
  return element;
}
function getStrengthStyles(strengths) {
  const eyeStyles = {
    keen: "M0 13Q15 2 31 12Q16 20 0 13ZM3 12Q16 8 28 12",
    focused: "M0 13L8 5H24L31 13Q16 18 0 13ZM4 12H27",
    bright: "M1 12Q15 -1 30 12Q15 26 1 12ZM4 12Q15 6 27 12",
    soft: "M1 13Q15 3 30 13Q15 20 1 13",
    clear: "M0 12Q15 0 31 12Q15 23 0 12ZM4 12Q15 7 27 12",
    paired: "M1 12Q15 2 30 12Q15 22 1 12ZM5 12Q15 7 26 12",
    balanced: "M1 12Q15 4 30 12Q15 20 1 12",
    bold: "M0 13L9 3H23L31 13Q15 18 0 13ZM5 12H26",
    steady: "M1 12Q15 7 30 12Q15 17 1 12",
    detail: "M1 12Q15 2 30 12Q15 22 1 12ZM5 12Q15 8 26 12",
  };
  const mouthStyles = {
    calm: "M187 228Q200 233 213 228",
    even: "M188 228H212",
    smile: "M185 222Q200 241 215 222",
    warm: "M184 221Q200 243 216 221",
    open: "M187 221Q200 239 213 221Q200 234 187 221Z",
    confident: "M185 222Q200 237 215 222",
    gentle: "M187 224Q200 237 213 224",
  };
  const first = strengths[0];
  const second = strengths[1];
  return {
    first,
    second,
    eyePath: eyeStyles[first.eye] || eyeStyles.clear,
    mouthPath: mouthStyles[second.mouth] || mouthStyles.gentle,
  };
}

function addStrengthBadge(group, option, x, y) {
  group.append(
    createSvgElement("circle", {
      cx: x,
      cy: y,
      r: 10,
      fill: "#172338",
      stroke: "#d5b47a",
      "stroke-width": 1.3,
    }),
  );
  group.append(
    createSvgElement(
      "text",
      {
        x,
        y: y + 3.5,
        fill: "#f3e2ba",
        "font-size": 8,
        "font-family": "Noto Sans KR, sans-serif",
        "text-anchor": "middle",
      },
      option.mark,
    ),
  );
}

function addAuraMotif(group, option, index) {
  const offset = index === 0 ? -1 : 1;
  const cx = 200 + offset * 128;
  const cy = 280 + (index === 0 ? 10 : -8);
  const color = option.color;
  group.append(
    createSvgElement("circle", {
      cx,
      cy,
      r: 96,
      fill: color,
      opacity: 0.12,
      filter: "url(#soft-light)",
    }),
  );
  group.append(
    createSvgElement("ellipse", {
      cx,
      cy,
      rx: index === 0 ? 151 : 166,
      ry: 188,
      fill: "none",
      stroke: color,
      "stroke-width": 1.8,
      "stroke-opacity": 0.72,
      transform: `rotate(${index === 0 ? -13 : 13} ${cx} ${cy})`,
    }),
  );
  const sparkX = index === 0 ? 82 : 318;
  const sparkY = index === 0 ? 252 : 292;
  if (option.motif === "waves" || option.motif === "current") {
    group.append(
      createSvgElement("path", {
        d: `M${sparkX - 20} ${sparkY}q20-17 40 0t40 0`,
        fill: "none",
        stroke: color,
        "stroke-width": 2.2,
        "stroke-linecap": "round",
      }),
    );
    group.append(
      createSvgElement("path", {
        d: `M${sparkX - 8} ${sparkY + 11}q18-12 36 0`,
        fill: "none",
        stroke: color,
        "stroke-width": 1.3,
        "stroke-linecap": "round",
        opacity: 0.75,
      }),
    );
  } else if (option.motif === "grid" || option.motif === "facets") {
    group.append(
      createSvgElement("path", {
        d: `M${sparkX} ${sparkY - 17}l16 17-16 17-16-17zM${sparkX - 22} ${sparkY}h44M${sparkX} ${sparkY - 23}v46`,
        fill: "none",
        stroke: color,
        "stroke-width": 1.4,
      }),
    );
  } else if (option.motif === "pearls" || option.motif === "bubbles") {
    [-14, 0, 14].forEach((delta, pearlIndex) => {
      group.append(
        createSvgElement("circle", {
          cx: sparkX + delta,
          cy: sparkY + (pearlIndex === 1 ? -9 : 6),
          r: pearlIndex === 1 ? 5 : 4,
          fill: color,
          opacity: 0.86,
          stroke: "#f2e5c5",
          "stroke-width": 0.8,
        }),
      );
    });
  } else if (option.motif === "leaves") {
    group.append(
      createSvgElement("path", {
        d: `M${sparkX - 20} ${sparkY + 17}Q${sparkX - 19} ${sparkY - 16} ${sparkX + 14} ${sparkY - 19}Q${sparkX + 22} ${sparkY + 10} ${sparkX - 20} ${sparkY + 17}ZM${sparkX - 15} ${sparkY + 12}l27-26m-17 16 1-12m8 2 10 1`,
        fill: "none",
        stroke: color,
        "stroke-width": 2,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    );
  } else if (option.motif === "orbit") {
    group.append(
      createSvgElement("ellipse", {
        cx: sparkX,
        cy: sparkY,
        rx: 23,
        ry: 10,
        fill: "none",
        stroke: color,
        "stroke-width": 1.7,
        transform: `rotate(-32 ${sparkX} ${sparkY})`,
      }),
    );
    group.append(
      createSvgElement("ellipse", {
        cx: sparkX,
        cy: sparkY,
        rx: 23,
        ry: 10,
        fill: "none",
        stroke: color,
        "stroke-width": 1.3,
        transform: `rotate(32 ${sparkX} ${sparkY})`,
      }),
    );
  } else {
    group.append(
      createSvgElement("path", {
        d: `M${sparkX} ${sparkY - 20}l5 14 14 5-14 5-5 14-5-14-14-5 14-5z`,
        fill: color,
        opacity: 0.84,
        stroke: "#f2e5c5",
        "stroke-width": 1,
      }),
    );
  }
  group.append(
    createSvgElement(
      "text",
      {
        x: sparkX,
        y: sparkY + 39,
        fill: color,
        "font-size": 12,
        "font-family": "Noto Sans KR, sans-serif",
        "text-anchor": "middle",
        "letter-spacing": 1,
      },
      option.mark,
    ),
  );
}

function addOutfitMotif(group, option, index) {
  const left = index === 0;
  const x = left ? 126 : 200;
  const paths = {
    lantern: "M19 16q14-14 28 0v22H19Zm0 8h28M33 10v34",
    compass: "M33 7 40 29 62 36 40 42 33 64 26 42 4 36 26 29Z",
    petals:
      "M33 12q13 15 0 27Q20 27 33 12Zm-19 23q20-7 25 11-19 7-25-11Zm39 0q-20-7-25 11 19 7 25-11",
    ribbon: "M8 18q23 5 45-4-5 24 7 35-22-5-45 5 5-22-7-36Z",
    stitch: "M7 17h52M7 28h52M7 39h52M12 12v32m14-32v32m14-32v32m14-32v32",
    grid: "M10 12h46M10 26h46M10 40h46M20 8v40m15-40v40m15-40v40",
    leaf: "M33 11q25 5 18 29-18 14-34-1Q10 18 33 11Zm-15 28q12-12 28-20m-20 8 1 12m9-18 1 11",
    knot: "M12 22q12-21 24 0t24 0M12 37q12 21 24 0t24 0M15 30h42",
    pages: "M9 14q13-8 24 1v34q-12-9-24-2Zm48 0q-13-8-24 1v34q12-9 24-2Z",
    shield: "M33 8 55 16v17q-4 17-22 26Q15 50 11 33V16Zm0 12v25m-12-14h24",
  };
  group.append(
    createSvgElement("path", {
      d: paths[option.motif] || paths.stitch,
      transform: `translate(${x} 354) scale(.72)`,
      fill: "none",
      stroke: "#f2dfb1",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      opacity: 0.88,
    }),
  );
  group.append(
    createSvgElement(
      "text",
      {
        x: left ? 158 : 242,
        y: 444,
        fill: "#f2dfb1",
        "font-size": 10,
        "font-family": "Noto Sans KR, sans-serif",
        "text-anchor": "middle",
        "letter-spacing": 0.5,
      },
      option.mark,
    ),
  );
}

export function renderCharacter(svg, selections) {
  const $ = (id) => svg.querySelector(`#${id}`);
  const data = legacyData;
  const getOptions = (category) =>
    selections[category].map((id) =>
      legacyData.categories
        .find((c) => c.id === category)
        .options.find((o) => o.id === id),
    );
  const auraLayer = $("aura-layer");
  const outfitLayer = $("outfit-layer");
  const expressionLayer = $("expression-layer");
  auraLayer.replaceChildren();
  outfitLayer.replaceChildren();
  expressionLayer.replaceChildren();

  const auras = getOptions("aura");
  const outfits = getOptions("outfit");
  const strengths = getOptions("strength");
  auras.forEach((option, index) => addAuraMotif(auraLayer, option, index));

  const garmentPanels = [
    "M126 287Q157 267 200 285L200 469Q157 475 119 451L130 341Z",
    "M274 287Q243 267 200 285L200 469Q243 475 281 451L270 341Z",
  ];
  outfits.forEach((option, index) => {
    outfitLayer.append(
      createSvgElement("path", {
        d: garmentPanels[index],
        fill: option.color,
        "fill-opacity": 0.71,
        stroke: "#e5ca91",
        "stroke-width": 1.2,
      }),
    );
    addOutfitMotif(outfitLayer, option, index);
  });
  outfitLayer.append(
    createSvgElement("path", {
      d: "M184 286 200 306 216 286M200 306v154M145 452q55 18 110 0",
      fill: "none",
      stroke: "#f0dcae",
      "stroke-width": 2,
      "stroke-opacity": 0.86,
    }),
  );
  outfitLayer.append(
    createSvgElement("circle", {
      cx: 200,
      cy: 327,
      r: 9,
      fill: "url(#pearl-shine)",
      stroke: "#f3dfb2",
      "stroke-width": 1.2,
    }),
  );
  outfitLayer.append(
    createSvgElement("circle", {
      cx: 200,
      cy: 327,
      r: 2.3,
      fill: "#916e42",
    }),
  );

  const style = getStrengthStyles(strengths);
  [158, 211].forEach((x) => {
    const eye = createSvgElement("g", { transform: `translate(${x} 182)` });
    eye.append(
      createSvgElement("path", {
        d: style.eyePath,
        fill: "#f2eadb",
        "fill-opacity": 0.96,
        stroke: "#5a5150",
        "stroke-width": 1.3,
        "stroke-linejoin": "round",
      }),
    );
    eye.append(
      createSvgElement("ellipse", {
        cx: 15.5,
        cy: 12,
        rx: 4.1,
        ry: 5.3,
        fill: "#182335",
      }),
    );
    eye.append(
      createSvgElement("circle", {
        cx: 16.8,
        cy: 10.2,
        r: 1.4,
        fill: "#fff8e8",
      }),
    );
    expressionLayer.append(eye);
  });
  expressionLayer.append(
    createSvgElement("path", {
      d: "M194 211q6-7 12 0-6 7-12 0",
      fill: "#987c78",
      stroke: "#7e6663",
      "stroke-width": 0.8,
    }),
  );
  expressionLayer.append(
    createSvgElement("path", {
      d: style.mouthPath,
      fill: style.second.mouth === "open" ? "#9b625f" : "none",
      stroke: "#765958",
      "stroke-width": 2,
      "stroke-linecap": "round",
    }),
  );
  addStrengthBadge(expressionLayer, strengths[0], 139, 183);
  addStrengthBadge(expressionLayer, strengths[1], 261, 183);
  if (strengths.some((option) => option.id === "craft")) {
    expressionLayer.append(
      createSvgElement("path", {
        d: "M143 224q-8 10-2 19m116-19q8 10 2 19",
        fill: "none",
        stroke: "#d5b47a",
        "stroke-width": 1.5,
      }),
    );
  }

  $("character-art-title").textContent = data.characterArtwork.name;
  $("character-art-description").textContent =
    `의상은 ${outfits.map((option) => option.label).join("과 ")}, 표정은 ${strengths.map((option) => option.label).join("과 ")}, 아우라는 ${auras.map((option) => option.label).join("과 ")} 선택을 반영했습니다.`;
}
