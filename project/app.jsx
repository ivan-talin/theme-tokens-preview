// Color preview app — semantic surface tokens, semantic color groups,
// base palette, and chart tokens. Swatches resolve dynamically to the
// active mode (light/dark); light/dark refs are shown as text below each.

const { useState, useEffect } = React;

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
  const slug = (group, role) =>
    role === "DEFAULT" ? `--${group}` : `--${group}-${role}`;
  const lines = { light: [], dark: [] };
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
  lines.light.push(
    `  --shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);`,
    `  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`,
    `  --swatch-ring: rgba(0, 0, 0, 0.08);`
  );
  lines.dark.push(
    `  --shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);`,
    `  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);`,
    `  --swatch-ring: rgba(255, 255, 255, 0.06);`
  );
  const css =
    `html[data-mode="light"] {\n${lines.light.join("\n")}\n}\n` +
    `html[data-mode="dark"] {\n${lines.dark.join("\n")}\n}\n`;
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
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function readableOn(hex) {
  return relLum(hex) > 0.5 ? "#0B0D10" : "#FFFFFF";
}
function shortRef(ref) {
  return ref.
  replace(/^\{colors\./, "{").
  replace(/^\{(white|black)\}$/, "{$1}")
  // bare keywords stay bare
  .replace(/^white$/, "white").
  replace(/^black$/, "black");
}

// ── primitives ──────────────────────────────────────────────────────────────
function Swatch({ hex, height = 80 }) {
  const [copied, setCopied] = useState(false);
  if (!hex) {
    return <div className="swatch swatch-empty" style={{ height }} />;
  }
  const isAlpha = /^rgba?\(/i.test(hex);
  const label = isAlpha ? hex : hex.toUpperCase();
  const copy = () => {
    navigator.clipboard?.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 900);
  };
  if (isAlpha) {
    return (
      <button
        className="swatch swatch--alpha"
        style={{ height }}
        onClick={copy}
        title={`Copy ${hex}`}>

        <span className="swatch-checker" />
        <span className="swatch-fill" style={{ background: hex }} />
        <span className={`swatch-hex ${copied ? "is-copied" : ""}`}>
          {copied ? "copied" : hex}
        </span>
      </button>);

  }
  return (
    <button
      className="swatch"
      style={{ background: hex, height, color: readableOn(hex) }}
      onClick={copy}
      title={`Copy ${label}`}>

      <span className={`swatch-hex ${copied ? "is-copied" : ""}`}>
        {copied ? "copied" : label}
      </span>
    </button>);

}

function TokenCard({ name, hex, lightRef, darkRef, swatchHeight }) {
  return (
    <div className="token-card">
      <Swatch hex={hex} height={swatchHeight} />
      <div className="token-card-meta">
        <div className="token-name mono">{name}</div>
        {lightRef ?
        <div className="token-ref mono">
            <span className="token-ref-key">light:</span>{" "}
            <span className="token-ref-val">{shortRef(lightRef)}</span>
          </div> :
        null}
        {darkRef ?
        <div className="token-ref mono">
            <span className="token-ref-key">dark:</span>{" "}
            <span className="token-ref-val">{shortRef(darkRef)}</span>
          </div> :
        null}
      </div>
    </div>);

}

function PaletteCard({ name, hex }) {
  return (
    <div className="token-card token-card--palette">
      <Swatch hex={hex} height={64} />
      <div className="token-card-meta">
        <div className="token-name mono">{name}</div>
        <div className="token-ref mono">
          <span className="token-ref-val">{hex.toUpperCase()}</span>
        </div>
      </div>
    </div>);

}

function AlphaSwatch({ rgba, height = 64 }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="swatch swatch--alpha"
      style={{ height }}
      onClick={() => {
        navigator.clipboard?.writeText(rgba);
        setCopied(true);
        setTimeout(() => setCopied(false), 900);
      }}
      title={`Copy ${rgba}`}>
      
      <span className="swatch-checker" />
      <span className="swatch-fill" style={{ background: rgba }} />
      <span className={`swatch-hex ${copied ? "is-copied" : ""}`}>
        {copied ? "copied" : rgba}
      </span>
    </button>);

}

function AlphaCard({ name, rgba }) {
  return (
    <div className="token-card token-card--palette">
      <AlphaSwatch rgba={rgba} height={64} />
      <div className="token-card-meta">
        <div className="token-name mono">{name}</div>
        <div className="token-ref mono">
          <span className="token-ref-val">{rgba}</span>
        </div>
      </div>
    </div>);

}

// ── panels ─────────────────────────────────────────────────────────────────
function GroupPanel({ title, badge, children, hue }) {
  return (
    <div
      className={`group-panel ${badge ? "group-panel--featured" : ""}`}
      data-hue={hue || title}>
      
      <header className="group-panel-head">
        <h3 className="group-title">{title}</h3>
        {badge ? <span className="badge badge-new">{badge}</span> : null}
      </header>
      <div className="group-panel-body">{children}</div>
    </div>);

}

function SectionHeader({ kicker, title, hint }) {
  return (
    <header className="section-header">
      <div className="kicker">{kicker}</div>
      <h2>{title}</h2>
      {hint ? <p className="section-hint">{hint}</p> : null}
    </header>);

}

// ── sections ───────────────────────────────────────────────────────────────
function SemanticSection({ mode }) {
  const groups = ["bg", "fg", "border"];
  return (
    <section className="block">
      <SectionHeader
        kicker="01"
        title="Semantic surface tokens"
        hint="Should make up the majority of the UI — includes app surface, text on them, as well as utility colors like errors, etc." data-comment-anchor="f97347e2da-p-150-15" />
      
      <div className="group-stack">
        {groups.map((g) => {
          const entries = Object.entries(window.SEMANTIC[g]);
          return (
            <GroupPanel key={g} title={g}>
              <div className="token-row">
                {entries.map(([role, refs]) => {
                  const hex = window.resolveRef(refs[mode]);
                  const tokenName = role === "DEFAULT" ? g : `${g}.${role}`;
                  return (
                    <TokenCard
                      key={role}
                      name={tokenName}
                      hex={hex}
                      lightRef={refs.light}
                      darkRef={refs.dark}
                      swatchHeight={88} />);


                })}
              </div>
            </GroupPanel>);

        })}
      </div>
    </section>);

}

function ColorGroupsSection({ mode }) {
  return (
    <section className="block">
      <SectionHeader
        kicker="03"
        title="Color group semantics"
        hint="Will not be used that often, but useful for elements like badges. Includes a dedicated Alpha semantic group for layered elements and hover states — handy for things like the sidebar." data-comment-anchor="e54780575e-p-150-15" />
      
      <div className="group-stack">
        {window.SCALE_ORDER.map((hue) => {
          const semantic = window.SCALE_SEMANTIC[hue];
          const isAlpha = hue === "alpha";
          return (
            <GroupPanel
              key={hue}
              title={hue} data-comment-anchor="178c41a9b8-span-138-18">

              <div className={`token-row${isAlpha ? ` token-row--alpha mode-${mode}` : ""}`}>
                {window.SEMANTIC_ROLE_ORDER.map((role) => {
                  const refs = semantic[role];
                  const hex = window.resolveRef(refs[mode]);
                  return (
                    <TokenCard
                      key={role}
                      name={`${hue}.${role}`}
                      hex={hex}
                      lightRef={refs.light}
                      darkRef={refs.dark}
                      swatchHeight={88} />);


                })}
              </div>
            </GroupPanel>);

        })}
      </div>
    </section>);

}

function TalinTuner({ baseHex, onChange }) {
  const [draft, setDraft] = useState(baseHex);
  useEffect(() => {setDraft(baseHex);}, [baseHex]);
  const valid = /^#[0-9a-fA-F]{6}$/.test(draft);
  const commit = (v) => {if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);};
  return (
    <div className="talin-tuner">
      <div className="talin-tuner-meta">
        <div className="talin-tuner-label mono">talin.500 — brand base</div>
        <p className="talin-tuner-hint">
          Plug in a hex value and the entire <span className="mono">talin</span> scale
          regenerates around it. Used by every <span className="mono">talin.*</span>
          semantic token across the system.
        </p>
      </div>
      <div className="talin-tuner-controls">
        <label className="talin-color-input" style={{ background: valid ? draft : baseHex }}>
          <input
            type="color"
            value={valid ? draft : baseHex}
            onChange={(e) => {setDraft(e.target.value.toUpperCase());commit(e.target.value);}} />
          
        </label>
        <input
          className="talin-hex-input mono"
          value={draft}
          onChange={(e) => {
            let v = e.target.value.toUpperCase();
            if (v && !v.startsWith("#")) v = "#" + v;
            setDraft(v);
            commit(v);
          }}
          spellCheck={false}
          maxLength={7} />
        
        <button
          className="talin-reset"
          onClick={() => onChange("#2A9C5E")}
          title="Reset to default">
          
          Reset
        </button>
      </div>
    </div>);

}

function BasePaletteSection({ mode, talinBase, setTalinBase }) {
  // Render talin first, then the rest of the scales in their normal order.
  const ordered = ["talin", ...window.SCALE_ORDER.filter((h) => h !== "talin" && h !== "alpha")];
  return (
    <section className="block">
      <SectionHeader
        kicker="04"
        title="Base palette"
        hint="Mostly Chakra v2 defaults, with two changes: (1) gray is retoned to a warm stone — anchored at 50 = #FDFDFC and 100 = #F8F7F4, with a faint taupe hue carried through the rest of the ramp; (2) a talin scale is added, in case we want to change or adjust the brand color down the line." data-comment-anchor="edecaff787-p-150-15" />
      
      <div className="group-stack">
        {ordered.map((hue) => {
          const palette = window.PALETTE[hue];
          return (
            <GroupPanel
              key={hue}
              title={hue}>
              
              {hue === "talin" ?
              <TalinTuner baseHex={talinBase} onChange={setTalinBase} /> :
              null}
              <div className="token-row token-row--palette">
                {window.SCALE_STEPS.map((step) =>
                <PaletteCard
                  key={step}
                  name={`${hue}.${step}`}
                  hex={palette[step]} />

                )}
              </div>
            </GroupPanel>);

        })}

        {window.ALPHA_ORDER.map((hue) => {
          const palette = window.PALETTE[hue];
          return (
            <GroupPanel
              key={hue}
              title={hue}>
              
              <p className="alpha-note mono">
                Alpha ramp — swatches render against a checkerboard so transparency is
                visible. Toggle the page mode to see how each alpha sits over a light
                vs. dark surface.
              </p>
              <div className={`token-row token-row--palette token-row--alpha mode-${mode}`}>
                {window.ALPHA_STEPS.map((step) =>
                <AlphaCard
                  key={step}
                  name={`${hue}.${step}`}
                  rgba={palette[step]} />

                )}
              </div>
            </GroupPanel>);

        })}
      </div>
    </section>);

}

function ChartSection() {
  const tokens = window.PALETTE.chart;
  return (
    <section className="block" data-comment-anchor="263221fd0b-section-297-5">
      <SectionHeader
        kicker="02"
        title="Chart tokens"
        hint="For data visualization — e.g. the Campaigns charts." data-comment-anchor="2a6120429d-p-150-15" />
      
      <GroupPanel title="chart">
        <div className="token-row">
          {Object.entries(tokens).map(([k, hex]) =>
          <div key={k} className="token-card">
              <Swatch hex={hex} height={88} />
              <div className="token-card-meta">
                <div className="token-name mono">chart.{k}</div>
                <div className="token-ref mono">
                  <span className="token-ref-val">{hex.toUpperCase()}</span>
                </div>
                <div className="token-ref mono">
                  <span className="token-ref-key">light &amp; dark</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </GroupPanel>
    </section>);

}

// ── header ─────────────────────────────────────────────────────────────────
const EXAMPLE_LINKS = [
  { id: "home", label: "Example 1", sub: "Home" },
  { id: "campaigns", label: "Example 2", sub: "Campaigns" },
  { id: "create", label: "Example 3", sub: "Create campaign" },
];

function examplePageHref(id, mode) {
  const query = `ex=${encodeURIComponent(id)}&mode=${encodeURIComponent(mode)}`;
  if (typeof window === "undefined") return `project/example.html?${query}`;
  const path = window.location.pathname || "";
  const marker = "/project/";
  const projectIndex = path.lastIndexOf(marker);
  const base = projectIndex >= 0
    ? path.slice(0, projectIndex + marker.length)
    : `${path.replace(/\/[^/]*$/, "/")}project/`;
  return `${base}example.html?${query}`;
}

function ExamplesMenu({ mode }) {
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
  const href = (id) => examplePageHref(id, mode);
  return (
    <div
      className={`examples-menu ${open ? "is-open" : ""}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}>
      <button
        className="examples-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        Examples
        <svg className="examples-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="examples-popover" role="menu" aria-hidden={!open}>
        {EXAMPLE_LINKS.map((it) => (
          <a
            key={it.id}
            className="examples-item"
            role="menuitem"
            href={href(it.id)}>
            <span className="examples-item-label">{it.label}</span>
            <span className="examples-item-sub">{it.sub}</span>
            <span className="examples-item-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </div>);

}

function PageHeader({ mode, setMode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`page-header ${scrolled ? "is-scrolled" : ""}`}
      data-comment-anchor="page-header">
      <div className="page-header-inner">
        <div className="brand">
          <div className="brand-text">
            <div className="brand-line">Talin Theme Tokens</div>
          </div>
        </div>

        <nav className="page-nav" aria-label="Primary">
          <ExamplesMenu mode={mode} />
        </nav>

        <div className="header-actions">
          <div className="mode-switch" role="tablist" aria-label="Color mode">
            <button
              role="tab"
              aria-selected={mode === "light"}
              className={mode === "light" ? "active" : ""}
              onClick={() => setMode("light")}>
              Light
            </button>
            <button
              role="tab"
              aria-selected={mode === "dark"}
              className={mode === "dark" ? "active" : ""}
              onClick={() => setMode("dark")}>
              Dark
            </button>
          </div>
        </div>
      </div>
    </header>);

}

function Intro({ mode }) {
  return (
    <section className="intro" data-comment-anchor="7ba2ee9f40-section-359-5">
      <p>
        Preview of the proposed semantic + scale token system. Swatches resolve
        to the <strong>{mode}</strong> mode; the light and dark source refs are
        listed beneath each. Click any swatch to copy its hex.
      </p>
      <ul className="intro-meta mono">
        <li><span className="dim">scales</span> {window.SCALE_ORDER.length}</li>
        <li><span className="dim">steps / scale</span> {window.SCALE_STEPS.length} (50–950)</li>
      </ul>
    </section>);

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

  return (
    <div className="page">
      <PageHeader mode={mode} setMode={setMode} />
      <SemanticSection mode={mode} />
      <ChartSection />
      <ColorGroupsSection mode={mode} />
      <BasePaletteSection mode={mode} talinBase={talinBase} setTalinBase={setTalinBase} />
    </div>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
