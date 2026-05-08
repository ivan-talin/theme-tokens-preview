// Color preview app — semantic surface tokens, semantic color groups,
// base palette, and chart tokens. Swatches resolve dynamically to the
// active mode (light/dark); light/dark refs are shown as text below each.

const {
  useState,
  useEffect
} = React;

// ── Runtime CSS variables (single source of truth = tokens.js) ─────────────
// Loops window.SEMANTIC and emits one --<group>[-<role>] custom property
// per role, scoped to html[data-mode="light"|"dark"]. Existing CSS in
// styles.css / examples.css keeps working unchanged. --border-strong is
// emitted as an alias of --border-emphasized for backward compat.
// --shadow and --swatch-ring vary by mode but have no token equivalent,
// so they're folded in here as static mode-specific values.
(function applySemanticVars() {
  if (typeof document === "undefined") return;
  const SEMANTIC = window.SEMANTIC;
  if (!SEMANTIC || !window.resolveRef) return;
  const slug = (group, role) => role === "DEFAULT" ? `--${group}` : `--${group}-${role}`;
  const lines = {
    light: [],
    dark: []
  };
  for (const [group, roles] of Object.entries(SEMANTIC)) {
    for (const [role, refs] of Object.entries(roles)) {
      const name = slug(group, role);
      lines.light.push(`  ${name}: ${window.resolveRef(refs.light)};`);
      lines.dark.push(`  ${name}: ${window.resolveRef(refs.dark)};`);
    }
  }
  if (SEMANTIC.border && SEMANTIC.border.emphasized) {
    const refs = SEMANTIC.border.emphasized;
    lines.light.push(`  --border-strong: ${window.resolveRef(refs.light)};`);
    lines.dark.push(`  --border-strong: ${window.resolveRef(refs.dark)};`);
  }
  lines.light.push(`  --shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);`, `  --swatch-ring: rgba(0, 0, 0, 0.08);`);
  lines.dark.push(`  --shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);`, `  --swatch-ring: rgba(255, 255, 255, 0.06);`);
  const css = `html[data-mode="light"] {\n${lines.light.join("\n")}\n}\n` + `html[data-mode="dark"] {\n${lines.dark.join("\n")}\n}\n`;
  let style = document.getElementById("__semantic-tokens__");
  if (!style) {
    style = document.createElement("style");
    style.id = "__semantic-tokens__";
    document.head.appendChild(style);
  }
  style.textContent = css;
})();

// ── helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function readableOn(hex) {
  return relLum(hex) > 0.5 ? "#0B0D10" : "#FFFFFF";
}
function shortRef(ref) {
  return ref.replace(/^\{colors\./, "{").replace(/^\{(white|black)\}$/, "{$1}")
  // bare keywords stay bare
  .replace(/^white$/, "white").replace(/^black$/, "black");
}

// ── primitives ──────────────────────────────────────────────────────────────
function Swatch({
  hex,
  height = 80
}) {
  const [copied, setCopied] = useState(false);
  if (!hex) {
    return /*#__PURE__*/React.createElement("div", {
      className: "swatch swatch-empty",
      style: {
        height
      }
    });
  }
  return /*#__PURE__*/React.createElement("button", {
    className: "swatch",
    style: {
      background: hex,
      height,
      color: readableOn(hex)
    },
    onClick: () => {
      navigator.clipboard?.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    },
    title: `Copy ${hex.toUpperCase()}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `swatch-hex ${copied ? "is-copied" : ""}`
  }, copied ? "copied" : hex.toUpperCase()));
}
function TokenCard({
  name,
  hex,
  lightRef,
  darkRef,
  swatchHeight
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "token-card"
  }, /*#__PURE__*/React.createElement(Swatch, {
    hex: hex,
    height: swatchHeight
  }), /*#__PURE__*/React.createElement("div", {
    className: "token-card-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "token-name mono"
  }, name), lightRef ? /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-key"
  }, "light:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "token-ref-val"
  }, shortRef(lightRef))) : null, darkRef ? /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-key"
  }, "dark:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "token-ref-val"
  }, shortRef(darkRef))) : null));
}
function PaletteCard({
  name,
  hex
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "token-card token-card--palette"
  }, /*#__PURE__*/React.createElement(Swatch, {
    hex: hex,
    height: 64
  }), /*#__PURE__*/React.createElement("div", {
    className: "token-card-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "token-name mono"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-val"
  }, hex.toUpperCase()))));
}
function AlphaSwatch({
  rgba,
  height = 64
}) {
  const [copied, setCopied] = useState(false);
  return /*#__PURE__*/React.createElement("button", {
    className: "swatch swatch--alpha",
    style: {
      height
    },
    onClick: () => {
      navigator.clipboard?.writeText(rgba);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    },
    title: `Copy ${rgba}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "swatch-checker"
  }), /*#__PURE__*/React.createElement("span", {
    className: "swatch-fill",
    style: {
      background: rgba
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: `swatch-hex ${copied ? "is-copied" : ""}`
  }, copied ? "copied" : rgba));
}
function AlphaCard({
  name,
  rgba
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "token-card token-card--palette"
  }, /*#__PURE__*/React.createElement(AlphaSwatch, {
    rgba: rgba,
    height: 64
  }), /*#__PURE__*/React.createElement("div", {
    className: "token-card-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "token-name mono"
  }, name), /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-val"
  }, rgba))));
}

// ── panels ─────────────────────────────────────────────────────────────────
function GroupPanel({
  title,
  badge,
  children,
  hue
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `group-panel ${badge ? "group-panel--featured" : ""}`,
    "data-hue": hue || title
  }, /*#__PURE__*/React.createElement("header", {
    className: "group-panel-head"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "group-title"
  }, title), badge ? /*#__PURE__*/React.createElement("span", {
    className: "badge badge-new"
  }, badge) : null), /*#__PURE__*/React.createElement("div", {
    className: "group-panel-body"
  }, children));
}
function SectionHeader({
  kicker,
  title,
  hint
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "section-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kicker"
  }, kicker), /*#__PURE__*/React.createElement("h2", null, title), hint ? /*#__PURE__*/React.createElement("p", {
    className: "section-hint"
  }, hint) : null);
}

// ── sections ───────────────────────────────────────────────────────────────
function SemanticSection({
  mode
}) {
  const groups = ["bg", "fg", "border"];
  return /*#__PURE__*/React.createElement("section", {
    className: "block"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    kicker: "01",
    title: "Semantic surface tokens",
    hint: "Should make up the majority of the UI \u2014 includes app surface, text on them, as well as utility colors like errors, etc.",
    "data-comment-anchor": "f97347e2da-p-150-15"
  }), /*#__PURE__*/React.createElement("div", {
    className: "group-stack"
  }, groups.map(g => {
    const entries = Object.entries(window.SEMANTIC[g]);
    return /*#__PURE__*/React.createElement(GroupPanel, {
      key: g,
      title: g
    }, /*#__PURE__*/React.createElement("div", {
      className: "token-row"
    }, entries.map(([role, refs]) => {
      const hex = window.resolveRef(refs[mode]);
      const tokenName = role === "DEFAULT" ? g : `${g}.${role}`;
      return /*#__PURE__*/React.createElement(TokenCard, {
        key: role,
        name: tokenName,
        hex: hex,
        lightRef: refs.light,
        darkRef: refs.dark,
        swatchHeight: 88
      });
    })));
  })));
}
function ColorGroupsSection({
  mode
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "block"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    kicker: "03",
    title: "Color group semantics",
    hint: "Will not be used that often, but useful for elements like badges.",
    "data-comment-anchor": "e54780575e-p-150-15"
  }), /*#__PURE__*/React.createElement("div", {
    className: "group-stack"
  }, window.SCALE_ORDER.map(hue => {
    const semantic = window.SCALE_SEMANTIC[hue];
    return /*#__PURE__*/React.createElement(GroupPanel, {
      key: hue,
      title: hue,
      "data-comment-anchor": "178c41a9b8-span-138-18"
    }, /*#__PURE__*/React.createElement("div", {
      className: "token-row"
    }, window.SEMANTIC_ROLE_ORDER.map(role => {
      const refs = semantic[role];
      const hex = window.resolveRef(refs[mode]);
      return /*#__PURE__*/React.createElement(TokenCard, {
        key: role,
        name: `${hue}.${role}`,
        hex: hex,
        lightRef: refs.light,
        darkRef: refs.dark,
        swatchHeight: 88
      });
    })));
  })));
}
function TalinTuner({
  baseHex,
  onChange
}) {
  const [draft, setDraft] = useState(baseHex);
  useEffect(() => {
    setDraft(baseHex);
  }, [baseHex]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(draft);
  const commit = v => {
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "talin-tuner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "talin-tuner-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "talin-tuner-label mono"
  }, "talin.500 \u2014 brand base"), /*#__PURE__*/React.createElement("p", {
    className: "talin-tuner-hint"
  }, "Plug in a hex value and the entire ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "talin"), " scale regenerates around it. Used by every ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "talin.*"), "semantic token across the system.")), /*#__PURE__*/React.createElement("div", {
    className: "talin-tuner-controls"
  }, /*#__PURE__*/React.createElement("label", {
    className: "talin-color-input",
    style: {
      background: valid ? draft : baseHex
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: valid ? draft : baseHex,
    onChange: e => {
      setDraft(e.target.value.toUpperCase());
      commit(e.target.value);
    }
  })), /*#__PURE__*/React.createElement("input", {
    className: "talin-hex-input mono",
    value: draft,
    onChange: e => {
      let v = e.target.value.toUpperCase();
      if (v && !v.startsWith("#")) v = "#" + v;
      setDraft(v);
      commit(v);
    },
    spellCheck: false,
    maxLength: 7
  }), /*#__PURE__*/React.createElement("button", {
    className: "talin-reset",
    onClick: () => onChange("#2A9C5E"),
    title: "Reset to default"
  }, "Reset")));
}
function BasePaletteSection({
  mode,
  talinBase,
  setTalinBase
}) {
  // Render talin first, then the rest of the scales in their normal order.
  const ordered = ["talin", ...window.SCALE_ORDER.filter(h => h !== "talin")];
  return /*#__PURE__*/React.createElement("section", {
    className: "block"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    kicker: "04",
    title: "Base palette",
    hint: "Mostly Chakra v2 defaults, with two changes: (1) gray is retoned to a warm stone \u2014 anchored at 50 = #FDFDFC and 100 = #F8F7F4, with a faint taupe hue carried through the rest of the ramp; (2) a talin scale is added, in case we want to change or adjust the brand color down the line.",
    "data-comment-anchor": "edecaff787-p-150-15"
  }), /*#__PURE__*/React.createElement("div", {
    className: "group-stack"
  }, ordered.map(hue => {
    const palette = window.PALETTE[hue];
    return /*#__PURE__*/React.createElement(GroupPanel, {
      key: hue,
      title: hue
    }, hue === "talin" ? /*#__PURE__*/React.createElement(TalinTuner, {
      baseHex: talinBase,
      onChange: setTalinBase
    }) : null, /*#__PURE__*/React.createElement("div", {
      className: "token-row token-row--palette"
    }, window.SCALE_STEPS.map(step => /*#__PURE__*/React.createElement(PaletteCard, {
      key: step,
      name: `${hue}.${step}`,
      hex: palette[step]
    }))));
  }), window.ALPHA_ORDER.map(hue => {
    const palette = window.PALETTE[hue];
    return /*#__PURE__*/React.createElement(GroupPanel, {
      key: hue,
      title: hue
    }, /*#__PURE__*/React.createElement("p", {
      className: "alpha-note mono"
    }, "Alpha ramp \u2014 swatches render against a checkerboard so transparency is visible. Toggle the page mode to see how each alpha sits over a light vs. dark surface."), /*#__PURE__*/React.createElement("div", {
      className: `token-row token-row--palette token-row--alpha mode-${mode}`
    }, window.ALPHA_STEPS.map(step => /*#__PURE__*/React.createElement(AlphaCard, {
      key: step,
      name: `${hue}.${step}`,
      rgba: palette[step]
    }))));
  })));
}
function ChartSection() {
  const tokens = window.PALETTE.chart;
  return /*#__PURE__*/React.createElement("section", {
    className: "block",
    "data-comment-anchor": "263221fd0b-section-297-5"
  }, /*#__PURE__*/React.createElement(SectionHeader, {
    kicker: "02",
    title: "Chart tokens",
    hint: "For data visualization \u2014 e.g. the Campaigns charts.",
    "data-comment-anchor": "2a6120429d-p-150-15"
  }), /*#__PURE__*/React.createElement(GroupPanel, {
    title: "chart"
  }, /*#__PURE__*/React.createElement("div", {
    className: "token-row"
  }, Object.entries(tokens).map(([k, hex]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "token-card"
  }, /*#__PURE__*/React.createElement(Swatch, {
    hex: hex,
    height: 88
  }), /*#__PURE__*/React.createElement("div", {
    className: "token-card-meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "token-name mono"
  }, "chart.", k), /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-val"
  }, hex.toUpperCase())), /*#__PURE__*/React.createElement("div", {
    className: "token-ref mono"
  }, /*#__PURE__*/React.createElement("span", {
    className: "token-ref-key"
  }, "light & dark"))))))));
}

// ── header ─────────────────────────────────────────────────────────────────
const EXAMPLE_LINKS = [{
  id: "home",
  label: "Example 1",
  sub: "Home"
}, {
  id: "campaigns",
  label: "Example 2",
  sub: "Campaigns"
}, {
  id: "create",
  label: "Example 3",
  sub: "Create campaign"
}];
function ExamplesMenu({
  mode
}) {
  const [open, setOpen] = useState(false);
  const closeRef = React.useRef(null);
  const onEnter = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    setOpen(true);
  };
  const onLeave = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpen(false), 120);
  };
  const href = id => `example.html?ex=${id}&mode=${mode}`;
  return /*#__PURE__*/React.createElement("div", {
    className: `examples-menu ${open ? "is-open" : ""}`,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onFocus: onEnter,
    onBlur: onLeave
  }, /*#__PURE__*/React.createElement("button", {
    className: "examples-trigger",
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: () => setOpen(v => !v)
  }, "Examples", /*#__PURE__*/React.createElement("svg", {
    className: "examples-caret",
    width: "10",
    height: "10",
    viewBox: "0 0 10 10",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 3.5L5 6.5L8 3.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "examples-popover",
    role: "menu",
    "aria-hidden": !open
  }, /*#__PURE__*/React.createElement("div", {
    className: "examples-popover-head mono"
  }, "Open as page"), EXAMPLE_LINKS.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.id,
    className: "examples-item",
    role: "menuitem",
    href: href(it.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "examples-item-label"
  }, it.label), /*#__PURE__*/React.createElement("span", {
    className: "examples-item-sub"
  }, it.sub), /*#__PURE__*/React.createElement("span", {
    className: "examples-item-arrow",
    "aria-hidden": "true"
  }, "\u2192"))), /*#__PURE__*/React.createElement("div", {
    className: "examples-popover-foot mono"
  }, "\u2318-click to open in a new tab")));
}
function PageHeader({
  mode,
  setMode
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("header", {
    className: `page-header ${scrolled ? "is-scrolled" : ""}`,
    "data-comment-anchor": "page-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-text"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-line"
  }, "Talin Theme Tokens"))), /*#__PURE__*/React.createElement("nav", {
    className: "page-nav",
    "aria-label": "Primary"
  }, /*#__PURE__*/React.createElement(ExamplesMenu, {
    mode: mode
  })), /*#__PURE__*/React.createElement("div", {
    className: "header-actions"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mode-switch",
    role: "tablist",
    "aria-label": "Color mode"
  }, /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": mode === "light",
    className: mode === "light" ? "active" : "",
    onClick: () => setMode("light")
  }, "Light"), /*#__PURE__*/React.createElement("button", {
    role: "tab",
    "aria-selected": mode === "dark",
    className: mode === "dark" ? "active" : "",
    onClick: () => setMode("dark")
  }, "Dark")))));
}
function Intro({
  mode
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "intro",
    "data-comment-anchor": "7ba2ee9f40-section-359-5"
  }, /*#__PURE__*/React.createElement("p", null, "Preview of the proposed semantic + scale token system. Swatches resolve to the ", /*#__PURE__*/React.createElement("strong", null, mode), " mode; the light and dark source refs are listed beneath each. Click any swatch to copy its hex."), /*#__PURE__*/React.createElement("ul", {
    className: "intro-meta mono"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "dim"
  }, "scales"), " ", window.SCALE_ORDER.length), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
    className: "dim"
  }, "steps / scale"), " ", window.SCALE_STEPS.length, " (50\u2013950)")));
}

// ── app ────────────────────────────────────────────────────────────────────
function App() {
  const [mode, setMode] = useState("light");
  const [talinBase, setTalinBase] = useState(window.PALETTE.talin[500]);

  // Regenerate talin BEFORE children read window.PALETTE.
  React.useMemo(() => {
    if (typeof document === "undefined") return;
    window.PALETTE.talin = window.regenerateScale(talinBase);
  }, [talinBase]);
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement(PageHeader, {
    mode: mode,
    setMode: setMode
  }), /*#__PURE__*/React.createElement(SemanticSection, {
    mode: mode
  }), /*#__PURE__*/React.createElement(ChartSection, null), /*#__PURE__*/React.createElement(ColorGroupsSection, {
    mode: mode
  }), /*#__PURE__*/React.createElement(BasePaletteSection, {
    mode: mode,
    talinBase: talinBase,
    setTalinBase: setTalinBase
  }), /*#__PURE__*/React.createElement("footer", {
    className: "page-footer mono"
  }, /*#__PURE__*/React.createElement("span", null, "talin \xB7 theme tokens preview"), /*#__PURE__*/React.createElement("span", {
    className: "dim"
  }, "edit values in tokens.js")));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));