// Base palette: Chakra v2 default scales 50-900 + an added 950 step.
// Tweak any value later — semantic resolution will follow.
window.PALETTE = {
  // Warm stone scale (replaces the cool Chakra default gray).
  // 50 + 100 anchored to FDFDFC / FAF9F6; rest of the ramp tuned by hand
  // to keep a faint warm taupe hue (R ≥ G ≥ B) at every step.
  gray: {
    50: "#FDFDFC", 100: "#F8F7F4", 200: "#F1EFEC", 300: "#D6D3D1",
    400: "#ACA8A4", 500: "#84807A", 600: "#65625C", 700: "#4D4A45",
    800: "#302D27", 900: "#1A1915", 950: "#131210"
  },
  red: {
    50: "#FFF5F5", 100: "#FED7D7", 200: "#FEB2B2", 300: "#FC8181",
    400: "#F56565", 500: "#E53E3E", 600: "#C53030", 700: "#9B2C2C",
    800: "#822727", 900: "#63171B", 950: "#3F0D11"
  },
  orange: {
    50: "#FFFAF0", 100: "#FEEBC8", 200: "#FBD38D", 300: "#F6AD55",
    400: "#ED8936", 500: "#DD6B20", 600: "#C05621", 700: "#9C4221",
    800: "#7B341E", 900: "#652B19", 950: "#3F1A0E"
  },
  yellow: {
    50: "#FFFFF0", 100: "#FEFCBF", 200: "#FAF089", 300: "#F6E05E",
    400: "#ECC94B", 500: "#D69E2E", 600: "#B7791F", 700: "#975A16",
    800: "#744210", 900: "#5F370E", 950: "#3D2308"
  },
  green: {
    50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0", 300: "#86EFAC",
    400: "#4ADE80", 500: "#22C55E", 600: "#16A34A", 700: "#15803D",
    800: "#166534", 900: "#14532D", 950: "#052E16"
  },
  teal: {
    50: "#E6FFFA", 100: "#B2F5EA", 200: "#81E6D9", 300: "#4FD1C5",
    400: "#38B2AC", 500: "#319795", 600: "#2C7A7B", 700: "#285E61",
    800: "#234E52", 900: "#1D4044", 950: "#0F2528"
  },
  blue: {
    50: "#EBF8FF", 100: "#BEE3F8", 200: "#90CDF4", 300: "#63B3ED",
    400: "#4299E1", 500: "#3182CE", 600: "#2B6CB0", 700: "#2C5282",
    800: "#2A4365", 900: "#1A365D", 950: "#0E2240"
  },
  cyan: {
    50: "#EDFDFD", 100: "#C4F1F9", 200: "#9DECF9", 300: "#76E4F7",
    400: "#0BC5EA", 500: "#00B5D8", 600: "#00A3C4", 700: "#0987A0",
    800: "#086F83", 900: "#065666", 950: "#033844"
  },
  purple: {
    50: "#FAF5FF", 100: "#E9D8FD", 200: "#D6BCFA", 300: "#B794F4",
    400: "#9F7AEA", 500: "#805AD5", 600: "#6B46C1", 700: "#553C9A",
    800: "#44337A", 900: "#322659", 950: "#1F1538"
  },
  pink: {
    50: "#FFF5F7", 100: "#FED7E2", 200: "#FBB6CE", 300: "#F687B3",
    400: "#ED64A6", 500: "#D53F8C", 600: "#B83280", 700: "#97266D",
    800: "#702459", 900: "#521B41", 950: "#341029"
  },
  // Placeholder Talin green scale — tune values once brand green is locked.
  talin: {
    50: "#F1FBF5", 100: "#DBF4E4", 200: "#B4E6C5", 300: "#82D2A1",
    400: "#4DB87B", 500: "#2A9C5E", 600: "#1E814C", 700: "#1A683E",
    800: "#175334", 900: "#13422A", 950: "#0A2818"
  },
  // Chakra v2 alpha scales — same opacity steps for black & white. Steps 50-900.
  blackAlpha: {
    50:  "rgba(0, 0, 0, 0.04)",
    100: "rgba(0, 0, 0, 0.06)",
    200: "rgba(0, 0, 0, 0.08)",
    300: "rgba(0, 0, 0, 0.16)",
    400: "rgba(0, 0, 0, 0.24)",
    500: "rgba(0, 0, 0, 0.36)",
    600: "rgba(0, 0, 0, 0.48)",
    700: "rgba(0, 0, 0, 0.64)",
    800: "rgba(0, 0, 0, 0.80)",
    900: "rgba(0, 0, 0, 0.92)"
  },
  whiteAlpha: {
    50:  "rgba(255, 255, 255, 0.04)",
    100: "rgba(255, 255, 255, 0.06)",
    200: "rgba(255, 255, 255, 0.08)",
    300: "rgba(255, 255, 255, 0.16)",
    400: "rgba(255, 255, 255, 0.24)",
    500: "rgba(255, 255, 255, 0.36)",
    600: "rgba(255, 255, 255, 0.48)",
    700: "rgba(255, 255, 255, 0.64)",
    800: "rgba(255, 255, 255, 0.80)",
    900: "rgba(255, 255, 255, 0.92)"
  },
  // Special-purpose tokens that don't follow a 50-950 scale.
  chart: {
    primary: "#4D4F91"
  },
  black: "#000000",
  white: "#FFFFFF"
};

window.ALPHA_ORDER = ["blackAlpha", "whiteAlpha"];
window.ALPHA_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

// Resolves a token reference like "{colors.gray.500}" or a literal "white"
// against PALETTE. Returns a hex string.
window.resolveRef = function (ref) {
  if (!ref) return null;
  if (ref === "white") return "#FFFFFF";
  if (ref === "black") return "#000000";
  const m = ref.match(/^\{colors\.([a-zA-Z]+)(?:\.(\w+))?\}$/);
  if (!m) return ref; // assume literal
  const [, hue, step] = m;
  const node = window.PALETTE[hue];
  if (!node) return null;
  if (step == null) return typeof node === "string" ? node : null;
  return node[step] || null;
};

// Semantic tokens — mirrors the user's defineSemanticTokens file 1:1.
// Adds a `talin` color group and a `chart` group.
window.SEMANTIC = {
  bg: {
    DEFAULT:    { light: "{colors.white}",     dark: "{colors.black}" },
    subtle:     { light: "{colors.gray.50}",   dark: "{colors.gray.950}" },
    muted:      { light: "{colors.gray.100}",  dark: "{colors.gray.950}" },
    emphasized: { light: "{colors.gray.200}",  dark: "{colors.gray.800}" },
    inverted:   { light: "{colors.black}",     dark: "{colors.white}" },
    panel:      { light: "{colors.white}",     dark: "{colors.gray.900}" },
    error:      { light: "{colors.red.50}",    dark: "{colors.red.950}" },
    warning:    { light: "{colors.orange.50}", dark: "{colors.orange.950}" },
    success:    { light: "{colors.green.50}",  dark: "{colors.green.950}" },
    info:       { light: "{colors.blue.50}",   dark: "{colors.blue.950}" }
  },
  fg: {
    DEFAULT:    { light: "{colors.gray.950}",    dark: "{colors.gray.50}" },
    muted:      { light: "{colors.gray.600}",    dark: "{colors.gray.400}" },
    subtle:     { light: "{colors.gray.400}",    dark: "{colors.gray.500}" },
    inverted:   { light: "{colors.gray.50}",     dark: "{colors.black}" },
    error:      { light: "{colors.red.500}",     dark: "{colors.red.400}" },
    warning:    { light: "{colors.orange.600}",  dark: "{colors.orange.300}" },
    success:    { light: "{colors.green.600}",   dark: "{colors.green.300}" },
    info:       { light: "{colors.blue.600}",    dark: "{colors.blue.300}" }
  },
  border: {
    DEFAULT:    { light: "{colors.blackAlpha.200}", dark: "{colors.whiteAlpha.200}" },
    muted:      { light: "{colors.gray.100}",   dark: "{colors.gray.900}" },
    subtle:     { light: "{colors.blackAlpha.100}", dark: "{colors.whiteAlpha.100}" },
    emphasized: { light: "{colors.gray.300}",   dark: "{colors.gray.700}" },
    inverted:   { light: "{colors.gray.800}",   dark: "{colors.gray.200}" },
    error:      { light: "{colors.red.500}",    dark: "{colors.red.400}" },
    warning:    { light: "{colors.orange.500}", dark: "{colors.orange.400}" },
    success:    { light: "{colors.green.500}",  dark: "{colors.green.400}" },
    info:       { light: "{colors.blue.500}",   dark: "{colors.blue.400}" }
  }
};

// Per-color (gray/red/.../talin) semantic role mapping.
// Roles: contrast, fg, subtle, muted, emphasized, solid, focusRing, border.
const role = (hue, lightStep, darkStep) => ({
  light: `{colors.${hue}.${lightStep}}`,
  dark:  `{colors.${hue}.${darkStep}}`
});
const stdScaleRoles = (hue, opts = {}) => ({
  contrast:   { light: opts.contrastLight || "white", dark: opts.contrastDark || "white" },
  fg:         role(hue, opts.fg?.[0] || 900, opts.fg?.[1] || 300),
  subtle:     role(hue, 50, 900),
  muted:      role(hue, 100, 800),
  emphasized: role(hue, 200, 700),
  solid:      role(hue, opts.solid?.[0] || 600, opts.solid?.[1] || 600),
  focusRing:  role(hue, 500, 500),
  border:     role(hue, 500, 400)
});

window.SCALE_SEMANTIC = {
  gray: {
    contrast:   { light: "{colors.white}",      dark: "{colors.black}" },
    fg:         { light: "{colors.gray.900}",   dark: "{colors.gray.200}" },
    subtle:     { light: "{colors.gray.50}",    dark: "{colors.gray.900}" },
    muted:      { light: "{colors.gray.100}",   dark: "{colors.gray.800}" },
    emphasized: { light: "{colors.gray.200}",   dark: "{colors.gray.700}" },
    solid:      { light: "{colors.gray.900}",   dark: "{colors.white}" },
    focusRing:  { light: "{colors.gray.400}",   dark: "{colors.gray.400}" },
    border:     { light: "{colors.gray.200}",   dark: "{colors.gray.800}" }
  },
  // Mirrors the gray scale but uses alpha values: blackAlpha in light mode
  // (darkens the light surface), whiteAlpha in dark mode (lightens the dark
  // surface). contrast inverts because it sits on top of `solid`.
  alpha: {
    contrast:   { light: "{colors.whiteAlpha.800}", dark: "{colors.blackAlpha.800}" },
    fg:         { light: "{colors.blackAlpha.900}", dark: "{colors.whiteAlpha.900}" },
    subtle:     { light: "{colors.blackAlpha.50}",  dark: "{colors.whiteAlpha.50}" },
    muted:      { light: "{colors.blackAlpha.100}", dark: "{colors.whiteAlpha.100}" },
    emphasized: { light: "{colors.blackAlpha.200}", dark: "{colors.whiteAlpha.200}" },
    solid:      { light: "{colors.blackAlpha.700}", dark: "{colors.whiteAlpha.700}" },
    focusRing:  { light: "{colors.blackAlpha.400}", dark: "{colors.whiteAlpha.400}" },
    border:     { light: "{colors.blackAlpha.200}", dark: "{colors.whiteAlpha.200}" }
  },
  red:    stdScaleRoles("red"),
  orange: { ...stdScaleRoles("orange"), contrast: { light: "white", dark: "black" }, solid: role("orange", 600, 500) },
  yellow: {
    contrast:   { light: "black", dark: "black" },
    fg:         role("yellow", 900, 300),
    subtle:     role("yellow", 50, 900),
    muted:      role("yellow", 100, 800),
    emphasized: role("yellow", 200, 700),
    solid:      role("yellow", 300, 300),
    focusRing:  role("yellow", 500, 500),
    border:     { light: "{colors.yellow.500}", dark: "{colors.yellow.500}" }
  },
  green:  stdScaleRoles("green"),
  teal:   stdScaleRoles("teal"),
  blue:   stdScaleRoles("blue"),
  cyan:   stdScaleRoles("cyan"),
  purple: stdScaleRoles("purple"),
  pink:   stdScaleRoles("pink"),
  // New Talin scale — same role shape as the others, but tuned to use
  // lighter steps for solid/focusRing/border so the brand reads softer.
  talin: {
    ...stdScaleRoles("talin"),
    solid:     role("talin", 500, 400),
    focusRing: role("talin", 400, 300),
    border:    role("talin", 400, 300)
  }
};

window.SCALE_ORDER = [
  "gray","alpha","talin","red","orange","yellow","green","teal","blue","cyan","purple","pink"
];
window.SCALE_STEPS = [50,100,200,300,400,500,600,700,800,900,950];
window.SEMANTIC_ROLE_ORDER = ["contrast","fg","subtle","muted","emphasized","solid","focusRing","border"];

// Regenerate a full 50-950 ramp from a single base hex (treated as the .500 step)
// using OKLab color-mix resolved by the browser. Returns { 50: "#…", … }.
window.regenerateScale = function (baseHex) {
  const mixes = {
    50:  `color-mix(in oklab, white 94%, ${baseHex})`,
    100: `color-mix(in oklab, white 86%, ${baseHex})`,
    200: `color-mix(in oklab, white 72%, ${baseHex})`,
    300: `color-mix(in oklab, white 52%, ${baseHex})`,
    400: `color-mix(in oklab, white 26%, ${baseHex})`,
    500: baseHex,
    600: `color-mix(in oklab, black 18%, ${baseHex})`,
    700: `color-mix(in oklab, black 36%, ${baseHex})`,
    800: `color-mix(in oklab, black 52%, ${baseHex})`,
    900: `color-mix(in oklab, black 68%, ${baseHex})`,
    950: `color-mix(in oklab, black 82%, ${baseHex})`
  };
  // Use a 1x1 canvas: setting fillStyle to a color-mix() expression lets the
  // browser resolve it to sRGB bytes for us, regardless of the user's color
  // space settings (getComputedStyle can return color() / oklab() floats).
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const out = {};
  for (const [step, expr] of Object.entries(mixes)) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = expr; // silently rejected if unsupported; previous value kept
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    out[step] = "#" + [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("").toUpperCase();
  }
  return out;
};
