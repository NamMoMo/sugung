export function ChestArt({ theme = "amber", open = false }) {
  const colors = {
    amber: ["#a97435", "#d5b771", "#79522e"],
    sage: ["#4e7d75", "#a9c7ac", "#315d58"],
    lavender: ["#82769c", "#c9b9db", "#5d5677"],
  };
  const [main, light, dark] = colors[theme];
  const id = `chest-${theme}-${open ? "open" : "closed"}`;
  return (
    <svg
      className={`chest-art ${open ? "is-open" : ""}`}
      viewBox="0 0 360 195"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${id}-body`}
          x1="118"
          y1="73"
          x2="235"
          y2="157"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={main} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient
          id={`${id}-lid`}
          x1="130"
          y1="52"
          x2="224"
          y2="96"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={light} />
          <stop offset="1" stopColor={main} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor={light} stopOpacity=".55" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="181" cy="161" rx="88" ry="11" fill={dark} opacity=".09" />
      <circle cx="180" cy="93" r="86" fill={`url(#${id}-glow)`} />
      <circle
        cx="180"
        cy="93"
        r="75"
        stroke={main}
        opacity=".12"
        strokeDasharray="2 9"
      />
      <path
        d="M72 145q13-33 2-52m-1 32-15-13m17 3 12-15M287 151q-10-29 1-54m-3 32 15-17m-13 4-10-15"
        stroke={main}
        strokeWidth="2"
        opacity=".3"
        strokeLinecap="round"
      />
      <path
        d="m116 92 64-16 65 17v57l-65 18-64-19Z"
        fill={`url(#${id}-body)`}
        stroke={dark}
        strokeWidth="1.5"
      />
      <path d="m180 111 65-18v57l-65 18Z" fill={dark} opacity=".25" />
      <g
        className="chest-lid-art"
        style={
          open
            ? {
                transform: "translateY(-14px) rotate(-7deg)",
                transformOrigin: "180px 93px",
              }
            : undefined
        }
      >
        <path
          d="M116 92V76c0-21 23-37 64-37s65 16 65 37v17l-65 19Z"
          fill={`url(#${id}-lid)`}
          stroke={dark}
          strokeWidth="1.5"
        />
        <path
          d="M116 76c28 12 43 16 64 19l65-19M180 95v17"
          stroke={light}
          strokeWidth="2"
        />
        <path
          d="M139 49c-7 7-9 17-9 33v12m88-45c8 7 10 17 10 33v16"
          stroke={light}
          strokeWidth="7"
          opacity=".8"
        />
        <path
          d="M154 57q26-16 51 1m-49 9q24-13 47 1"
          stroke={light}
          strokeWidth="1.3"
          opacity=".8"
        />
      </g>
      <path
        d="m130 105 1 46 13 3v-46m74-5v45l12-4v-44"
        stroke={light}
        strokeWidth="5"
        opacity=".8"
      />
      <path d="m119 142 61 16 62-17M180 116v39" stroke={light} opacity=".6" />
      <path d="m167 108 13 3 13-4v21l-13 9-13-8Z" fill={light} stroke={dark} />
      <circle cx="180" cy="120" r="3.5" fill={dark} />
      <path d="M180 122v5" stroke={dark} strokeWidth="2" />
      <path
        d="M153 123q-4 8 3 13m49-14q7 5 1 11"
        stroke={light}
        strokeWidth="1.5"
        opacity=".8"
      />
      <path
        d="m91 66 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm171-23 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
        fill={light}
      />
      <circle cx="115" cy="38" r="2" fill={main} opacity=".5" />
      <circle cx="273" cy="103" r="3" fill={light} />
      <circle cx="90" cy="112" r="2" fill={light} />
    </svg>
  );
}

