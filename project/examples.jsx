// project/examples.jsx — Talin product example screens.
//
// Registers on `window`:
//   ExampleHome      — full Talin home (built from Figma node 1:6440)
//   ExampleCampaigns — stub (built in a follow-up session)
//   ExampleCreate    — stub
//   TokenPill        — cursor-follow tooltip showing project tokens for the
//                      element under the cursor (reads `data-tk-*` attrs).
//                      Re-resolves when [data-mode] flips, so it tracks
//                      light/dark mode without needing a mouse-move.
//
// Loaded by example.html BEFORE example-page.js so the globals are present
// when ExamplePage renders.

(function () {
  const { useState, useEffect, useRef } = React;

  // ── Runtime CSS variables (single source of truth = tokens.js) ─────────
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
    // Per-hue scale-semantic vars: emits e.g. --green-subtle, --talin-solid.
    // Lets components consume scale tokens via CSS vars so dark-mode swaps
    // happen automatically without re-reading the token registry.
    const SCALE_SEMANTIC = window.SCALE_SEMANTIC;
    if (SCALE_SEMANTIC) {
      for (const [hue, roles] of Object.entries(SCALE_SEMANTIC)) {
        for (const [role, refs] of Object.entries(roles)) {
          const name = `--${hue}-${role}`;
          lines.light.push(`  ${name}: ${window.resolveRef(refs.light)};`);
          lines.dark.push(`  ${name}: ${window.resolveRef(refs.dark)};`);
        }
      }
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

  // ── Token resolution ───────────────────────────────────────────────────
  // Returns { hex, base } where `base` is the underlying palette ref
  // (e.g. "gray.950", "talin.500", "white") that the semantic token
  // resolves to in the active mode. Powers the TokenPill display.
  function resolveToken(tokenPath, mode) {
    if (!tokenPath) return { hex: null, base: null };
    const parts = tokenPath.split(".");
    const head = parts[0];
    const tail = parts.slice(1).join(".");

    const baseFromRef = (ref) => {
      if (!ref) return null;
      if (ref === "white" || ref === "black") return ref;
      const m = ref.match(/^\{colors\.([a-zA-Z]+)(?:\.(\w+))?\}$/);
      if (m) return m[2] ? `${m[1]}.${m[2]}` : m[1];
      return ref;
    };

    if (window.SEMANTIC && window.SEMANTIC[head]) {
      const role = tail || "DEFAULT";
      const refs = window.SEMANTIC[head][role];
      if (refs) return { hex: window.resolveRef(refs[mode]), base: baseFromRef(refs[mode]) };
    }
    if (window.SCALE_SEMANTIC && window.SCALE_SEMANTIC[head]) {
      const refs = window.SCALE_SEMANTIC[head][tail];
      if (refs) return { hex: window.resolveRef(refs[mode]), base: baseFromRef(refs[mode]) };
    }
    if (window.PALETTE && window.PALETTE[head]) {
      const node = window.PALETTE[head];
      if (typeof node === "string") return { hex: node, base: head };
      return {
        hex: tail ? node[tail] || null : null,
        base: tail ? `${head}.${tail}` : null,
      };
    }
    return { hex: null, base: null };
  }

  function readMode() {
    return document.documentElement.dataset.mode || "light";
  }

  // ── Color normalization ────────────────────────────────────────────────
  // Canonicalize any CSS color string ("rgb(...)", "rgba(...)", "#abc",
  // "#abcdef", "transparent") to a stable key:
  //   - opaque colors → "#RRGGBB" uppercase
  //   - translucent colors → "rgba(R, G, B, A)" with single-space formatting
  //     and alpha rounded to 2 decimal places (matches the format stored
  //     in window.PALETTE.blackAlpha / .whiteAlpha so reverse-lookup hits)
  //   - fully transparent / unparseable → null
  function alphaKey(r, g, b, a) {
    if (a >= 0.999) {
      const hex = (n) => n.toString(16).padStart(2, "0");
      return ("#" + hex(r) + hex(g) + hex(b)).toUpperCase();
    }
    if (a <= 0.001) return null;
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`;
  }
  function normalizeColor(input) {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();
    if (!s || s === "transparent" || s === "none") return null;
    let m = s.match(/^#([0-9a-f]{3})$/);
    if (m) {
      const c = m[1];
      return ("#" + c[0] + c[0] + c[1] + c[1] + c[2] + c[2]).toUpperCase();
    }
    m = s.match(/^#([0-9a-f]{6})$/);
    if (m) return ("#" + m[1]).toUpperCase();
    m = s.match(/^#([0-9a-f]{8})$/);
    if (m) {
      const r = parseInt(m[1].slice(0, 2), 16);
      const g = parseInt(m[1].slice(2, 4), 16);
      const b = parseInt(m[1].slice(4, 6), 16);
      const a = parseInt(m[1].slice(6, 8), 16) / 255;
      return alphaKey(r, g, b, a);
    }
    m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/);
    if (m) {
      const r = Math.round(parseFloat(m[1]));
      const g = Math.round(parseFloat(m[2]));
      const b = Math.round(parseFloat(m[3]));
      const a = m[4] != null ? parseFloat(m[4]) : 1;
      return alphaKey(r, g, b, a);
    }
    return null;
  }

  // ── Reverse-lookup index ───────────────────────────────────────────────
  // Maps a normalized color key → ordered candidates. A single base value can
  // be used by multiple semantic tokens (e.g. blackAlpha.100 is both
  // border.subtle and alpha.muted), so the renderer picks by CSS property.
  let tokenIndexCache = null;
  function buildTokenIndex(mode) {
    const talinKey = window.PALETTE && window.PALETTE.talin ? window.PALETTE.talin[500] : null;
    if (tokenIndexCache && tokenIndexCache.mode === mode && tokenIndexCache.talin === talinKey) {
      return tokenIndexCache.map;
    }
    const map = new Map();
    const add = (key, value) => {
      if (!key) return;
      const candidates = map.get(key) || [];
      if (!candidates.some((candidate) => candidate.token === value.token)) {
        candidates.push(value);
      }
      map.set(key, candidates);
    };
    const baseFromRef = (ref) => {
      if (!ref) return null;
      if (ref === "white" || ref === "black") return ref;
      const m = ref.match(/^\{colors\.([a-zA-Z]+)(?:\.(\w+))?\}$/);
      if (m) return m[2] ? `${m[1]}.${m[2]}` : m[1];
      return ref;
    };

    if (window.SEMANTIC) {
      for (const [group, roles] of Object.entries(window.SEMANTIC)) {
        for (const [role, refs] of Object.entries(roles)) {
          if (role === "DEFAULT") continue;
          const ref = refs[mode];
          add(normalizeColor(window.resolveRef(ref)), {
            token: `${group}.${role}`,
            base: baseFromRef(ref),
            group,
            family: "semantic",
          });
        }
      }
      for (const [group, roles] of Object.entries(window.SEMANTIC)) {
        const refs = roles.DEFAULT;
        if (!refs) continue;
        const ref = refs[mode];
        add(normalizeColor(window.resolveRef(ref)), {
          token: group,
          base: baseFromRef(ref),
          group,
          family: "semantic",
        });
      }
    }
    if (window.SCALE_SEMANTIC) {
      for (const [hue, roles] of Object.entries(window.SCALE_SEMANTIC)) {
        for (const [role, refs] of Object.entries(roles)) {
          const ref = refs[mode];
          add(normalizeColor(window.resolveRef(ref)), {
            token: `${hue}.${role}`,
            base: baseFromRef(ref),
            group: hue,
            family: "scale",
          });
        }
      }
    }
    if (window.PALETTE) {
      for (const [hue, node] of Object.entries(window.PALETTE)) {
        if (typeof node === "string") {
          add(normalizeColor(node), { token: hue, base: hue, group: hue, family: "palette" });
          continue;
        }
        if (hue === "blackAlpha" || hue === "whiteAlpha" || hue === "chart") continue;
        for (const [step, hex] of Object.entries(node)) {
          add(normalizeColor(hex), { token: `${hue}.${step}`, base: `${hue}.${step}`, group: hue, family: "palette" });
        }
      }
      for (const hue of ["blackAlpha", "whiteAlpha"]) {
        const node = window.PALETTE[hue];
        if (!node) continue;
        for (const [step, rgba] of Object.entries(node)) {
          add(normalizeColor(rgba), { token: `${hue}.${step}`, base: `${hue}.${step}`, group: hue, family: "palette" });
        }
      }
    }

    tokenIndexCache = { mode, talin: talinKey, map };
    return map;
  }

  function pickTokenCandidate(candidates, prop) {
    if (!candidates || candidates.length === 0) return null;
    const normalizedProp = String(prop || "").toLowerCase();
    const preferredGroup =
      normalizedProp === "stroke" ? "border" :
      normalizedProp === "border" ? "border" :
      normalizedProp === "fg" ? "fg" :
      normalizedProp === "bg" ? "bg" :
      null;
    if (preferredGroup) {
      const direct = candidates.find((candidate) => candidate.group === preferredGroup);
      if (direct) return direct;
    }
    if (normalizedProp === "bg") {
      const scale = candidates.find((candidate) => candidate.family === "scale");
      if (scale) return scale;
    }
    return candidates.find((candidate) => candidate.family !== "palette") || candidates[0];
  }

  // ── Effective background ───────────────────────────────────────────────
  // Walks up from `el` until it finds an element with a non-transparent
  // computed backgroundColor — i.e. the bg the user actually sees behind
  // the cursor, including CSS :hover paint on `el` itself and inherited
  // surfaces from parent cards/panels.
  function findEffectiveBg(el) {
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      const cs = window.getComputedStyle(cur);
      const key = normalizeColor(cs.backgroundColor);
      if (key) {
        return {
          color: cs.backgroundColor,
          key,
          source: cur === el ? "self" : "ancestor",
          element: cur,
          declaredToken:
            cur.matches(":hover") && cur.getAttribute("data-tk-bg-hover")
              ? cur.getAttribute("data-tk-bg-hover")
              : cur.getAttribute("data-tk-bg"),
        };
      }
      cur = cur.parentElement;
    }
    return null;
  }

  // ── Row assembly ───────────────────────────────────────────────────────
  // Builds the rows shown in the TokenPill for `el`:
  //   1. Collect explicit data-tk-* attributes (existing behaviour).
  //   2. Compute the effective BG via getComputedStyle. If a declared
  //      data-tk-bg already matches, leave it alone; if missing, synthesize
  //      a row preferring the painting element's declared token, falling
  //      back to a reverse-lookup against the token index.
  //   3. Tag the row's `source` so the renderer can show an inheritance
  //      indicator when the bg comes from an ancestor.
  function buildRows(el, mode) {
    const tokenIndex = buildTokenIndex(mode);
    // data-tk-tooltip is a free-form description rendered above the rows
    // by TokenPill — exclude it from the token-row builder so it doesn't
    // appear as a misleading "TOOLTIP" prop with no resolvable hex.
    const attrs = Array.from(el.attributes).filter(
      (a) =>
        a.name.indexOf("data-tk-") === 0 &&
        a.name !== "data-tk-tooltip" &&
        a.name !== "data-tk-bg-hover",
    );
    const rows = attrs.map((a) => {
      const prop = a.name.replace(/^data-tk-/, "").toUpperCase();
      const token = a.value;
      const { hex, base } = resolveToken(token, mode);
      return { prop, token, hex, base, source: "declared" };
    });

    const effective = findEffectiveBg(el);
    if (!effective) return rows;

    const synthBgRow = () => {
      if (effective.declaredToken) {
        const { hex, base } = resolveToken(effective.declaredToken, mode);
        if (hex && normalizeColor(hex) === effective.key) {
          return { prop: "BG", token: effective.declaredToken, hex, base, source: effective.source };
        }
      }
      const matched = pickTokenCandidate(tokenIndex.get(effective.key), "BG");
      if (matched) {
        const { hex } = resolveToken(matched.token, mode);
        return {
          prop: "BG",
          token: matched.token,
          hex: hex || effective.key,
          base: matched.base,
          source: effective.source,
        };
      }
      return {
        prop: "BG",
        token: null,
        hex: effective.key,
        base: null,
        source: effective.source,
      };
    };

    const existingBgIdx = rows.findIndex((r) => r.prop === "BG");
    if (existingBgIdx >= 0) {
      const existingKey = rows[existingBgIdx].hex ? normalizeColor(rows[existingBgIdx].hex) : null;
      if (existingKey !== effective.key) {
        rows[existingBgIdx] = synthBgRow();
      }
      return rows;
    }
    const fgIdx = rows.findIndex((r) => r.prop === "FG");
    rows.splice(fgIdx >= 0 ? fgIdx + 1 : rows.length, 0, synthBgRow());
    return rows;
  }

  // ── TokenPill — cursor-follow inspector ────────────────────────────────
  function TokenPill() {
    const [state, setState] = useState({ visible: false, x: 0, y: 0, label: "", tooltip: "", rows: [] });
    const [, setMode] = useState(readMode());
    const elRef = useRef(null);

    // Re-resolve current rows whenever [data-mode] flips so the pill stays
    // accurate without requiring a mousemove. Re-runs buildRows against
    // the cached element so the BG row picks up the new mode's hex.
    useEffect(() => {
      const observer = new MutationObserver(() => {
        const mode = readMode();
        setMode(mode);
        setState((s) => {
          if (!s.visible || !elRef.current) return s;
          const rows = buildRows(elRef.current, mode);
          if (rows.length === 0) return { ...s, visible: false };
          return { ...s, rows };
        });
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-mode"],
      });
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      let raf = null;
      let pending = null;

      const flush = () => {
        raf = null;
        const ev = pending;
        pending = null;
        if (!ev) return;

        // Walk up to nearest ancestor carrying any data-tk-* attribute.
        let el = ev.target;
        while (el && el.nodeType === 1 && el !== document.body) {
          const has =
            el.attributes &&
            Array.from(el.attributes).some((a) => a.name.indexOf("data-tk-") === 0);
          if (has) break;
          el = el.parentElement;
        }
        if (!el || el === document.body || el.nodeType !== 1) {
          elRef.current = null;
          setState((s) => (s.visible ? { ...s, visible: false } : s));
          return;
        }

        const mode = readMode();
        const rows = buildRows(el, mode);
        if (rows.length === 0) {
          elRef.current = null;
          setState((s) => (s.visible ? { ...s, visible: false } : s));
          return;
        }
        elRef.current = el;

        // Position near cursor with edge-clamp.
        const pillW = 440;
        const pillH = 40 + rows.length * 24;
        const offset = 16;
        let x = ev.clientX + offset;
        let y = ev.clientY - offset - pillH;
        if (x + pillW > window.innerWidth - 8) x = ev.clientX - offset - pillW;
        if (x < 8) x = 8;
        if (y < 8) y = ev.clientY + offset;
        if (y + pillH > window.innerHeight - 8) y = window.innerHeight - 8 - pillH;

        const tag = el.tagName.toLowerCase();
        const cls = ((el.className && el.className.toString) ? el.className.toString() : "")
          .split(" ")
          .filter(Boolean)[0];
        const label = cls ? `${tag}.${cls}` : tag;
        const tooltip = el.getAttribute("data-tk-tooltip") || "";

        setState({ visible: true, x, y, label, tooltip, rows });
      };

      const onMove = (e) => {
        pending = { clientX: e.clientX, clientY: e.clientY, target: e.target };
        if (!raf) raf = requestAnimationFrame(flush);
      };
      const onLeave = () => {
        elRef.current = null;
        setState((s) => (s.visible ? { ...s, visible: false } : s));
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseleave", onLeave);
      return () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseleave", onLeave);
        if (raf) cancelAnimationFrame(raf);
      };
    }, []);

    if (!state.visible || state.rows.length === 0) return null;

    return (
      <div className="tk-pill" style={{ left: state.x, top: state.y, width: 440 }}>
        <div className="tk-pill-label">{state.label}</div>
        {state.tooltip ? <div className="tk-pill-tooltip">{state.tooltip}</div> : null}
        <div className="tk-pill-rows">
          {state.rows.map((r, i) => {
            const isAlpha = r.hex && r.hex.toLowerCase().startsWith("rgba");
            return (
              <div
                className={`tk-pill-row${r.source === "ancestor" ? " tk-pill-row--inherited" : ""}`}
                key={i}
                style={{ gridTemplateColumns: "44px minmax(112px, 1fr) minmax(180px, auto)" }}>
                <span className="tk-pill-prop">
                  {r.prop}
                  {r.source === "ancestor" ? (
                    <span className="tk-pill-inh" title="Inherited from ancestor"> ↑</span>
                  ) : null}
                </span>
                <span className="tk-pill-token">{r.token || "—"}</span>
                <span className="tk-pill-hex">
                  {r.base && r.base !== r.token ? (
                    <span style={{ color: "#6A7280", marginRight: 8 }}>{r.base}</span>
                  ) : null}
                  <span
                    className="tk-pill-swatch"
                    style={isAlpha ? { backgroundColor: r.hex } : { background: r.hex || "transparent" }}
                  />
                  {r.hex ? r.hex.toUpperCase() : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phosphor duotone icons (sidebar) ───────────────────────────────────
  // Each icon is a 256x256 SVG with two paths: a low-opacity fill
  // (the duotone layer) and the full-opacity outline. Both use
  // currentColor so they theme via parent text color.
  function PhosphorIcon({ size = 20, children, ...rest }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        aria-hidden="true"
        {...rest}>
        <g fill="currentColor">{children}</g>
      </svg>
    );
  }

  const HouseLineIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M216 116.69V216h-64v-64h-48v64H40v-99.31l82.34-82.35a8 8 0 0 1 11.32 0Z" opacity=".2" />
      <path d="M240 208h-16v-72l2.34 2.34A8 8 0 0 0 237.66 127l-98.35-98.32a16 16 0 0 0-22.62 0L18.34 127a8 8 0 0 0 11.32 11.31L32 136v72H16a8 8 0 0 0 0 16h224a8 8 0 0 0 0-16M48 120l80-80l80 80v88h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48Zm96 88h-32v-48h32Z" />
    </PhosphorIcon>
  );

  const PaperPlaneTiltIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2" />
      <path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z" />
    </PhosphorIcon>
  );

  const EnvelopeIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="m224 56l-96 88l-96-88Z" opacity=".2" />
      <path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-96 85.15L52.57 64h150.86ZM98.71 128L40 181.81V74.19Zm11.84 10.85l12 11.05a8 8 0 0 0 10.82 0l12-11.05l58 53.15H52.57ZM157.29 128L216 74.18v107.64Z" />
    </PhosphorIcon>
  );

  const GearIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="m207.86 123.18l16.78-21a99 99 0 0 0-10.07-24.29l-26.7-3a81 81 0 0 0-6.81-6.81l-3-26.71a99.4 99.4 0 0 0-24.3-10l-21 16.77a82 82 0 0 0-9.64 0l-21-16.78a99 99 0 0 0-24.21 10.07l-3 26.7a81 81 0 0 0-6.81 6.81l-26.71 3a99.4 99.4 0 0 0-10 24.3l16.77 21a82 82 0 0 0 0 9.64l-16.78 21a99 99 0 0 0 10.07 24.29l26.7 3a81 81 0 0 0 6.81 6.81l3 26.71a99.4 99.4 0 0 0 24.3 10l21-16.77a82 82 0 0 0 9.64 0l21 16.78a99 99 0 0 0 24.29-10.07l3-26.7a81 81 0 0 0 6.81-6.81l26.71-3a99.4 99.4 0 0 0 10-24.3l-16.77-21a82 82 0 0 0-.08-9.64M128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2" />
      <path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06a107.6 107.6 0 0 0-10.88-26.25a8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6a107.3 107.3 0 0 0-26.25-10.86a8 8 0 0 0-7.06 1.48L130.16 40h-4.32L107.2 25.11a8 8 0 0 0-7.06-1.48a107.6 107.6 0 0 0-26.25 10.88a8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94a107.7 107.7 0 0 0-10.87 26.25a8 8 0 0 0 1.49 7.06L40 125.84v4.32L25.11 148.8a8 8 0 0 0-1.48 7.06a107.6 107.6 0 0 0 10.88 26.25a8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6a107.7 107.7 0 0 0 26.25 10.87a8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48a107.2 107.2 0 0 0 26.25-10.88a8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3l23.78-2.8a8 8 0 0 0 6-3.94a107.7 107.7 0 0 0 10.87-26.25a8 8 0 0 0-1.49-7.06Zm-16.1-6.5a74 74 0 0 1 0 8.68a8 8 0 0 0 1.74 5.48l14.19 17.73a91.6 91.6 0 0 1-6.23 15l-22.6 2.56a8 8 0 0 0-5.1 2.64a74 74 0 0 1-6.14 6.14a8 8 0 0 0-2.64 5.1l-2.51 22.58a91.3 91.3 0 0 1-15 6.23l-17.74-14.19a8 8 0 0 0-5-1.75h-.48a74 74 0 0 1-8.68 0a8.06 8.06 0 0 0-5.48 1.74l-17.78 14.2a91.6 91.6 0 0 1-15-6.23L82.89 187a8 8 0 0 0-2.64-5.1a74 74 0 0 1-6.14-6.14a8 8 0 0 0-5.1-2.64l-22.58-2.52a91.3 91.3 0 0 1-6.23-15l14.19-17.74a8 8 0 0 0 1.74-5.48a74 74 0 0 1 0-8.68a8 8 0 0 0-1.74-5.48L40.2 100.45a91.6 91.6 0 0 1 6.23-15L69 82.89a8 8 0 0 0 5.1-2.64a74 74 0 0 1 6.14-6.14A8 8 0 0 0 82.89 69l2.51-22.57a91.3 91.3 0 0 1 15-6.23l17.74 14.19a8 8 0 0 0 5.48 1.74a74 74 0 0 1 8.68 0a8.06 8.06 0 0 0 5.48-1.74l17.77-14.19a91.6 91.6 0 0 1 15 6.23L173.11 69a8 8 0 0 0 2.64 5.1a74 74 0 0 1 6.14 6.14a8 8 0 0 0 5.1 2.64l22.58 2.51a91.3 91.3 0 0 1 6.23 15l-14.19 17.74a8 8 0 0 0-1.74 5.53Z" />
    </PhosphorIcon>
  );

  const BookOpenIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M224 48v144h-64a32 32 0 0 0-32 32V80a32 32 0 0 1 32-32Z" opacity=".2" />
      <path d="M224 40h-64a40 40 0 0 0-32 16a40 40 0 0 0-32-16H32a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h64a24 24 0 0 1 24 24a8 8 0 0 0 16 0a24 24 0 0 1 24-24h64a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M96 200H32V56h64a24 24 0 0 1 24 24v136a39.8 39.8 0 0 0-24-16m128 0h-64a39.8 39.8 0 0 0-24 8V80a24 24 0 0 1 24-24h64Z" />
    </PhosphorIcon>
  );

  const QuestionIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" />
      <path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
    </PhosphorIcon>
  );

  const MagnifyingGlassIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
      <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
    </PhosphorIcon>
  );

  const SidebarSimpleIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M88 48v160H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8Z" opacity=".2" />
      <path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M40 56h40v144H40Zm176 144H96V56h120z" />
    </PhosphorIcon>
  );

  // Bold weight (single solid path, no duotone layer).
  const CaretRightIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M184.49 136.49l-80 80a12 12 0 0 1-17-17L159 128L87.51 56.49a12 12 0 0 1 17-17l80 80a12 12 0 0 1 0 17Z" />
    </PhosphorIcon>
  );

  // ── Other icons (non-sidebar utility) ──────────────────────────────────
  function StrokeIcon({ size = 20, viewBox = "0 0 24 24", strokeWidth = 1.5, fill = "none", children, ...rest }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill={fill}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}>
        {children}
      </svg>
    );
  }

  const CaretDownIcon = (p) => (
    <StrokeIcon {...p} fill="currentColor" stroke="none">
      <polygon points="6 9 12 15 18 9" />
    </StrokeIcon>
  );
  // Phosphor bold-weight carets — used by the sortable headers. Mirrors
  // the style of CaretRightIcon above (12px arc radii, single solid path).
  // The existing CaretDownIcon (chunky polygon) is kept for dropdown
  // affordances elsewhere; sort headers use CaretDownBoldIcon instead.
  const CaretUpIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M136.49,71.51l80,80a12,12,0,0,1-17,17L128,97L56.49,168.49a12,12,0,0,1-17-17l80-80a12,12,0,0,1,17,0Z" />
    </PhosphorIcon>
  );
  const CaretDownBoldIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M119.51,184.49l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.49a12,12,0,0,1,17,17l-80,80a12,12,0,0,1-17,0Z" />
    </PhosphorIcon>
  );
  const CaretUpDownIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M183.51,167.51l-48,48a12,12,0,0,1-17,0l-48-48a12,12,0,0,1,17-17L128,189.51l39.51-39.51a12,12,0,0,1,17,17ZM88.49,89.51a12,12,0,0,1-17-17l48-48a12,12,0,0,1,17,0l48,48a12,12,0,0,1-17,17L128,66.49,88.49,89.51Z" />
    </PhosphorIcon>
  );
  // Phosphor hash + percent — the inline indicator on Replies / Positive
  // replies headers showing whether the column is being sorted by the
  // count value (hash) or the percentage (percent).
  const HashIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M224,88H175.4l8.47-47.92a8,8,0,1,0-15.74-2.78L159.14,88H111.4l8.47-47.92a8,8,0,1,0-15.74-2.78L95.14,88H48a8,8,0,0,0,0,16H92.32L85.36,152H32a8,8,0,0,0,0,16H82.54L74,216.92a8,8,0,0,0,6.5,9.27A7.6,7.6,0,0,0,82,226a8,8,0,0,0,7.87-6.61L98.81,168h47.74l-8.51,48.92a8,8,0,0,0,6.5,9.27A7.6,7.6,0,0,0,146,226a8,8,0,0,0,7.87-6.61L162.81,168H208a8,8,0,0,0,0-16H165.65l7-48H224a8,8,0,0,0,0-16ZM149.45,152H101.71l7-48h47.74Z" />
    </PhosphorIcon>
  );
  const PercentIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M195.31,76.69a8,8,0,0,1,0,11.31l-112,112a8,8,0,0,1-11.31-11.31l112-112A8,8,0,0,1,195.31,76.69ZM72,104A32,32,0,1,0,40,72,32,32,0,0,0,72,104Zm0-48A16,16,0,1,1,56,72,16,16,0,0,1,72,56Zm112,96a32,32,0,1,0,32,32A32,32,0,0,0,184,152Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,184,200Z" />
    </PhosphorIcon>
  );
  const ArrowRightIcon = ({ size = 20, ...rest }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      {...rest}>
      <path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L191,140H40a12,12,0,0,1,0-24H191L135.51,64.49a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z" />
    </svg>
  );
  const CheckIcon = (p) => (
    <StrokeIcon {...p}>
      <polyline points="5 12 10 17 19 8" />
    </StrokeIcon>
  );
  const PlayIcon = (p) => (
    <StrokeIcon {...p} fill="currentColor" stroke="none">
      <polygon points="6 4 20 12 6 20" />
    </StrokeIcon>
  );

  // Phosphor duotone icons used by the campaigns view.
  const UserCircleIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M128 24a104 104 0 1 0 104 104A104 104 0 0 0 128 24m4 96a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
      <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24M74.08 197.5a64 64 0 0 1 119.84 0a87.83 87.83 0 0 1-119.84 0M96 120a32 32 0 1 1 32 32a32 32 0 0 1-32-32m107.76 66.41a79.66 79.66 0 0 0-36.6-28.7a48 48 0 1 0-78.32 0a79.66 79.66 0 0 0-36.6 28.7a88 88 0 1 1 151.52 0" />
    </PhosphorIcon>
  );

  const BriefcaseIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M216 56v144H40V56Z" opacity=".2" />
      <path d="M216 56h-40V48a16 16 0 0 0-16-16H96a16 16 0 0 0-16 16v8H40a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V72a16 16 0 0 0-16-16M96 48h64v8H96Zm120 24v41.61A184 184 0 0 1 128 136a184.07 184.07 0 0 1-88-22.38V72Zm0 128H40v-67.93a200.06 200.06 0 0 0 88 21.93a200 200 0 0 0 88-21.93V200Zm-112-88a8 8 0 0 1 8-8h32a8 8 0 0 1 0 16h-32a8 8 0 0 1-8-8" />
    </PhosphorIcon>
  );

  const UserIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M200 152a72 72 0 1 0-144 0a72 72 0 0 0 144 0" opacity=".2" />
      <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
    </PhosphorIcon>
  );

  const CalendarBlankIcon = ({ size = 20, style, ...p }) => (
    <PhosphorIcon {...p} size={size} style={{ display: "block", overflow: "visible", ...style }}>
      <path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
      <path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 168H48V96h160z" />
    </PhosphorIcon>
  );

  const XCircleIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104" opacity=".2" />
      <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m37.66 130.34a8 8 0 0 1-11.32 11.32L128 139.31l-26.34 26.35a8 8 0 0 1-11.32-11.32L116.69 128L90.34 101.66a8 8 0 0 1 11.32-11.32L128 116.69l26.34-26.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
    </PhosphorIcon>
  );

  const ArrowUpRightIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M200 64v128L64 56Z" opacity=".2" />
      <path d="M200 56v128a8 8 0 0 1-16 0V83.31L69.66 197.66a8 8 0 0 1-11.32-11.32L172.69 72H64a8 8 0 0 1 0-16h128a8 8 0 0 1 8 8" />
    </PhosphorIcon>
  );

  const ArrowDownRightIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M200 192H64L200 56Z" opacity=".2" />
      <path d="M200 64v128a8 8 0 0 1-8 8H64a8 8 0 0 1 0-16h108.69L58.34 69.66a8 8 0 0 1 11.32-11.32L184 172.69V64a8 8 0 0 1 16 0" />
    </PhosphorIcon>
  );

  const FunnelSimpleIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M216 56H40l72 80v60l32 16v-76Z" opacity=".2" />
      <path d="M216 48H40a8 8 0 0 0-5.91 13.39L104 138.85V196a8 8 0 0 0 4.42 7.16l32 16A8 8 0 0 0 152 212v-73.15l69.91-77.46A8 8 0 0 0 216 48m-77.92 84.6A8 8 0 0 0 136 138v59L120 189v-51a8 8 0 0 0-2.08-5.39L58 64h140Z" />
    </PhosphorIcon>
  );

  const PlusIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M216 128a8 8 0 0 1-8 8h-72v72a8 8 0 0 1-16 0v-72H48a8 8 0 0 1 0-16h72V48a8 8 0 0 1 16 0v72h72a8 8 0 0 1 8 8" />
    </PhosphorIcon>
  );

  // Home prototype icon style config mirrors the newer Talin Home DialKit shape.
  const INTENSITY_NEUTRAL = 0.3;
  const ICON_PRESET_OPTIONS = ["green", "red", "blue", "pink", "orange", "purple", "custom"];
  const DEFAULT_ICON_STYLE = {
    gradientStop1: "#f5fff6",
    gradientStop2: "#afe4b0",
    borderColor: "#508650",
    borderOpacity: 0.5,
    glyphColor: "#093e0f",
    glyphOpacity: 0.87,
    shadowColor: "#1b551e",
    shadowOpacity: 0.3,
  };
  const PRESET_PALETTES = {
    green: {
      gradientStop1: "#f5fff6",
      gradientStop2: "#afe4b0",
      borderColor: "#508650",
      glyphColor: "#093e0f",
      shadowColor: "#1b551e",
    },
    red: {
      gradientStop1: "#fff5f5",
      gradientStop2: "#e4b0b0",
      borderColor: "#865050",
      glyphColor: "#3e0909",
      shadowColor: "#551b1b",
    },
    blue: {
      gradientStop1: "#f5faff",
      gradientStop2: "#b0c8e4",
      borderColor: "#506886",
      glyphColor: "#091f3e",
      shadowColor: "#1b3855",
    },
    pink: {
      gradientStop1: "#fff5fa",
      gradientStop2: "#e4b0cf",
      borderColor: "#865070",
      glyphColor: "#3e0926",
      shadowColor: "#551b3e",
    },
    orange: {
      gradientStop1: "#fff9f5",
      gradientStop2: "#e4c4b0",
      borderColor: "#866850",
      glyphColor: "#3e1f09",
      shadowColor: "#553b1b",
    },
    purple: {
      gradientStop1: "#faf5ff",
      gradientStop2: "#c8b0e4",
      borderColor: "#685086",
      glyphColor: "#1f093e",
      shadowColor: "#381b55",
    },
  };
  const CHECKMARK_PALETTE = PRESET_PALETTES.green;
  const HOMEPAGE_PROTOTYPE_CONFIG = {
    setup: {
      extensionInstalled: true,
      linkedinConnected: true,
      mailboxConnected: false,
      signatureSet: false,
      checklistDismissed: false,
      completionExpired: false,
    },
    hasCampaigns: {
      type: "select",
      options: ["none", "one_draft", "one_active", "multiple"],
      default: "none",
    },
    hasUnreadReplies: {
      type: "select",
      options: ["none", "few", "many"],
      default: "none",
    },
    hasPendingTasks: {
      type: "select",
      options: ["none", "one_2fa", "multiple_manual"],
      default: "none",
    },
    accountHealth: {
      type: "select",
      options: ["ok", "linkedin_expired", "mailbox_failing", "quota_near_limit"],
      default: "ok",
    },
    ats: {
      connected: false,
      recommendationDismissed: false,
    },
    todaysActivityFilter: {
      type: "select",
      options: ["my_campaigns", "all_campaigns"],
      default: "my_campaigns",
    },
    video: {
      dismissed: false,
      tab: {
        type: "select",
        options: ["candidates", "prospects"],
        default: "candidates",
      },
    },
    iconStyle: {
      preset: {
        type: "select",
        options: ICON_PRESET_OPTIONS,
        default: "green",
      },
      intensity: [0.3, 0, 1, 0.01],
      gradient: {
        stop1: DEFAULT_ICON_STYLE.gradientStop1,
        stop2: DEFAULT_ICON_STYLE.gradientStop2,
      },
      border: {
        color: DEFAULT_ICON_STYLE.borderColor,
        opacity: [DEFAULT_ICON_STYLE.borderOpacity, 0, 1, 0.01],
      },
      glyph: {
        color: DEFAULT_ICON_STYLE.glyphColor,
        opacity: [DEFAULT_ICON_STYLE.glyphOpacity, 0, 1, 0.01],
      },
      shadow: {
        color: DEFAULT_ICON_STYLE.shadowColor,
        opacity: [DEFAULT_ICON_STYLE.shadowOpacity, 0, 1, 0.01],
      },
    },
  };
  const ICON_PALETTE_KEYS = [
    "gradientStop1",
    "gradientStop2",
    "borderColor",
    "glyphColor",
    "shadowColor",
  ];

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function parseHexColor(hex) {
    const cleaned = String(hex || "").replace("#", "").trim();
    const full =
      cleaned.length === 3
        ? cleaned
            .split("")
            .map((c) => c + c)
            .join("")
        : cleaned.padEnd(6, "0").slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0,
    };
  }

  function rgbToHex({ r, g, b }) {
    const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbToHsl({ r, g, b }) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    return { h: h / 6, s, l };
  }

  function hslToRgb({ h, s, l }) {
    if (s === 0) {
      const v = l * 255;
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p, q, t) => {
      let next = t;
      if (next < 0) next += 1;
      if (next > 1) next -= 1;
      if (next < 1 / 6) return p + (q - p) * 6 * next;
      if (next < 1 / 2) return q;
      if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: hue2rgb(p, q, h + 1 / 3) * 255,
      g: hue2rgb(p, q, h) * 255,
      b: hue2rgb(p, q, h - 1 / 3) * 255,
    };
  }

  function mixHex(a, b, amount) {
    const c1 = parseHexColor(a);
    const c2 = parseHexColor(b);
    const t = clamp(amount, 0, 1);
    return rgbToHex({
      r: c1.r + (c2.r - c1.r) * t,
      g: c1.g + (c2.g - c1.g) * t,
      b: c1.b + (c2.b - c1.b) * t,
    });
  }

  function adjustHsl(hex, satMultiplier, lightnessDelta) {
    const hsl = rgbToHsl(parseHexColor(hex));
    return rgbToHex(
      hslToRgb({
        h: hsl.h,
        s: clamp(hsl.s * satMultiplier, 0, 1),
        l: clamp(hsl.l + lightnessDelta, 0, 1),
      })
    );
  }

  function rgba(hex, alpha) {
    const { r, g, b } = parseHexColor(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applyIntensity(hex, intensity) {
    const delta = intensity - INTENSITY_NEUTRAL;
    if (Math.abs(delta) < 0.005) return hex;
    if (delta > 0) {
      const t = delta / (1 - INTENSITY_NEUTRAL);
      return adjustHsl(hex, 1 + t * 1.4, -t * 0.04);
    }
    const t = -delta / INTENSITY_NEUTRAL;
    const desaturated = adjustHsl(hex, 1 - t * 0.7, 0);
    return mixHex(desaturated, "#ffffff", t * 0.3);
  }

  function clonePalette(palette) {
    return ICON_PALETTE_KEYS.reduce((next, key) => {
      next[key] = palette[key];
      return next;
    }, {});
  }

  function deriveIconStyle(basePalette, intensity, opacitySource = DEFAULT_ICON_STYLE) {
    return {
      gradientStop1: applyIntensity(basePalette.gradientStop1, intensity),
      gradientStop2: applyIntensity(basePalette.gradientStop2, intensity),
      borderColor: applyIntensity(basePalette.borderColor, intensity),
      borderOpacity: opacitySource.borderOpacity ?? DEFAULT_ICON_STYLE.borderOpacity,
      glyphColor: applyIntensity(basePalette.glyphColor, intensity),
      glyphOpacity: opacitySource.glyphOpacity ?? DEFAULT_ICON_STYLE.glyphOpacity,
      shadowColor: applyIntensity(basePalette.shadowColor, intensity),
      shadowOpacity: opacitySource.shadowOpacity ?? DEFAULT_ICON_STYLE.shadowOpacity,
    };
  }

  const homePrototypeIconState = {
    config: HOMEPAGE_PROTOTYPE_CONFIG,
    basePalette: clonePalette(PRESET_PALETTES.green),
    iconPreset: HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.preset.default,
    iconIntensity: HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.intensity[0],
    iconStyle: { ...DEFAULT_ICON_STYLE },
  };

  function recomputeHomePrototypeIconStyle() {
    homePrototypeIconState.iconStyle = deriveIconStyle(
      homePrototypeIconState.basePalette,
      homePrototypeIconState.iconIntensity,
      homePrototypeIconState.iconStyle
    );
  }

  function setHomePrototypeIconPreset(preset) {
    if (!ICON_PRESET_OPTIONS.includes(preset)) return;
    homePrototypeIconState.iconPreset = preset;
    if (preset !== "custom") {
      homePrototypeIconState.basePalette = clonePalette(PRESET_PALETTES[preset]);
    }
    recomputeHomePrototypeIconStyle();
  }

  function setHomePrototypeIconIntensity(intensity) {
    homePrototypeIconState.iconIntensity = clamp(Number(intensity) || 0, 0, 1);
    recomputeHomePrototypeIconStyle();
  }

  function setHomePrototypeIconColor(field, value) {
    if (!ICON_PALETTE_KEYS.includes(field)) return;
    homePrototypeIconState.iconPreset = "custom";
    homePrototypeIconState.basePalette[field] = value;
    homePrototypeIconState.iconStyle[field] = value;
  }

  function setHomePrototypeIconOpacity(field, value) {
    if (!["borderOpacity", "glyphOpacity", "shadowOpacity"].includes(field)) return;
    homePrototypeIconState.iconStyle[field] = clamp(Number(value) || 0, 0, 1);
  }

  function resetHomePrototypeIconStyle() {
    homePrototypeIconState.basePalette = clonePalette(PRESET_PALETTES.green);
    homePrototypeIconState.iconPreset = HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.preset.default;
    homePrototypeIconState.iconIntensity = HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.intensity[0];
    homePrototypeIconState.iconStyle = { ...DEFAULT_ICON_STYLE };
  }

  function getHomePrototypeIconState() {
    return homePrototypeIconState;
  }

  const HOME_PROTOTYPE_PANEL_WIDTH = 306;
  const HOME_PROTOTYPE_PANEL_PREFS_KEY = "talin.homePrototype.panel";
  const HOME_PROTOTYPE_VERSION_LIMIT = 12;

  function defaultHomePrototypePanelPosition() {
    if (typeof window === "undefined") return { x: 16, y: 16 };
    return {
      x: Math.max(16, window.innerWidth - HOME_PROTOTYPE_PANEL_WIDTH - 16),
      y: 16,
    };
  }

  function clampHomePrototypePanelPosition(position, size = {}) {
    if (typeof window === "undefined") return position;
    const width = size.width || HOME_PROTOTYPE_PANEL_WIDTH;
    const height = size.height || 56;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - height - 8);
    return {
      x: clamp(position.x, 8, maxX),
      y: clamp(position.y, 8, maxY),
    };
  }

  function readHomePrototypePanelPrefs() {
    const fallback = {
      collapsed: true,
      position: defaultHomePrototypePanelPosition(),
      versions: [],
    };
    try {
      const raw = localStorage.getItem(HOME_PROTOTYPE_PANEL_PREFS_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        collapsed: Boolean(parsed.collapsed),
        position: parsed.position
          ? clampHomePrototypePanelPosition(parsed.position)
          : fallback.position,
        versions: Array.isArray(parsed.versions)
          ? parsed.versions.slice(0, HOME_PROTOTYPE_VERSION_LIMIT)
          : [],
      };
    } catch (_) {
      return fallback;
    }
  }

  function writeHomePrototypePanelPrefs(nextPrefs) {
    try {
      localStorage.setItem(HOME_PROTOTYPE_PANEL_PREFS_KEY, JSON.stringify(nextPrefs));
    } catch (_) {}
  }

  function getHomePrototypeIconSnapshot({ id = "current", name = "Current config", savedAt = null } = {}) {
    return {
      id,
      name,
      savedAt,
      iconPreset: homePrototypeIconState.iconPreset,
      iconIntensity: homePrototypeIconState.iconIntensity,
      basePalette: { ...homePrototypeIconState.basePalette },
      iconStyle: { ...homePrototypeIconState.iconStyle },
    };
  }

  function applyHomePrototypeIconSnapshot(snapshot) {
    if (!snapshot) return;
    const iconStyle = { ...DEFAULT_ICON_STYLE, ...(snapshot.iconStyle || {}) };
    const sourcePalette = snapshot.basePalette || snapshot.iconStyle || {};
    homePrototypeIconState.iconPreset = ICON_PRESET_OPTIONS.includes(snapshot.iconPreset)
      ? snapshot.iconPreset
      : "custom";
    homePrototypeIconState.iconIntensity = clamp(Number(snapshot.iconIntensity) || 0, 0, 1);
    homePrototypeIconState.basePalette = ICON_PALETTE_KEYS.reduce((next, key) => {
      next[key] = sourcePalette[key] || iconStyle[key] || DEFAULT_ICON_STYLE[key];
      return next;
    }, {});
    homePrototypeIconState.iconStyle = iconStyle;
  }

  function getHomePrototypeConfigPayload(snapshot) {
    return {
      iconStyle: {
        preset: snapshot.iconPreset,
        intensity: snapshot.iconIntensity,
        gradient: {
          stop1: snapshot.iconStyle.gradientStop1,
          stop2: snapshot.iconStyle.gradientStop2,
        },
        border: {
          color: snapshot.iconStyle.borderColor,
          opacity: snapshot.iconStyle.borderOpacity,
        },
        glyph: {
          color: snapshot.iconStyle.glyphColor,
          opacity: snapshot.iconStyle.glyphOpacity,
        },
        shadow: {
          color: snapshot.iconStyle.shadowColor,
          opacity: snapshot.iconStyle.shadowOpacity,
        },
        basePalette: snapshot.basePalette,
      },
    };
  }

  function formatHomePrototypeConfig(snapshot) {
    return JSON.stringify(getHomePrototypeConfigPayload(snapshot), null, 2);
  }

  function copyHomePrototypeTextFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand?.("copy");
    } finally {
      document.body.removeChild(textarea);
    }
    if (!copied) throw new Error("Copy command failed");
  }

  function HomePrototypeControls({ onConfigChange }) {
    const panelPrefsRef = useRef(null);
    if (!panelPrefsRef.current) panelPrefsRef.current = readHomePrototypePanelPrefs();
    const panelRef = useRef(null);
    const dragStateRef = useRef(null);
    const [, forceUpdate] = useState(0);
    const [collapsed, setCollapsed] = useState(panelPrefsRef.current.collapsed);
    const [versions, setVersions] = useState(panelPrefsRef.current.versions);
    const [selectedVersionId, setSelectedVersionId] = useState("");
    const [panelNotice, setPanelNotice] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [panelPosition, setPanelPositionState] = useState(panelPrefsRef.current.position);
    const panelPositionRef = useRef(panelPrefsRef.current.position);
    const state = getHomePrototypeIconState();
    const style = state.iconStyle;

    const persistPanelPrefs = (patch = {}) => {
      writeHomePrototypePanelPrefs({
        collapsed,
        position: panelPositionRef.current,
        versions,
        ...patch,
      });
    };

    const updatePanelPosition = (nextPosition) => {
      const rawPosition =
        typeof nextPosition === "function" ? nextPosition(panelPositionRef.current) : nextPosition;
      const rect = panelRef.current?.getBoundingClientRect();
      const clampedPosition = clampHomePrototypePanelPosition(rawPosition, rect || {});
      panelPositionRef.current = clampedPosition;
      setPanelPositionState(clampedPosition);
    };

    const update = (fn, { keepVersionSelection = false } = {}) => {
      fn();
      if (!keepVersionSelection) setSelectedVersionId("");
      forceUpdate((tick) => tick + 1);
      if (onConfigChange) onConfigChange();
    };

    const copySelectedConfig = async () => {
      const text = formatHomePrototypeConfig(getHomePrototypeIconSnapshot());
      try {
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(text);
          } catch (_) {
            copyHomePrototypeTextFallback(text);
          }
        } else {
          copyHomePrototypeTextFallback(text);
        }
        setPanelNotice("Copied current config");
      } catch (_) {
        setPanelNotice("Copy failed");
      }
    };

    const saveVersion = () => {
      const savedAt = new Date().toISOString();
      const name = `Version ${versions.length + 1}`;
      const snapshot = getHomePrototypeIconSnapshot({
        id: `version-${Date.now()}`,
        name,
        savedAt,
      });
      setVersions((prevVersions) => {
        const nextVersions = [...prevVersions, snapshot].slice(-HOME_PROTOTYPE_VERSION_LIMIT);
        writeHomePrototypePanelPrefs({
          collapsed,
          position: panelPositionRef.current,
          versions: nextVersions,
        });
        return nextVersions;
      });
      setSelectedVersionId(snapshot.id);
      setPanelNotice(`Saved ${name}`);
    };

    const loadSavedVersion = (versionId) => {
      setSelectedVersionId(versionId);
      if (!versionId) {
        setPanelNotice("");
        return;
      }
      const savedVersion = versions.find((version) => version.id === versionId);
      if (!savedVersion) return;
      applyHomePrototypeIconSnapshot(savedVersion);
      forceUpdate((tick) => tick + 1);
      if (onConfigChange) onConfigChange();
      setPanelNotice(`Loaded ${savedVersion.name}`);
    };

    const toggleCollapsed = () => {
      setCollapsed((prevCollapsed) => {
        const nextCollapsed = !prevCollapsed;
        const nextPosition = nextCollapsed
          ? panelPositionRef.current
          : clampHomePrototypePanelPosition(panelPositionRef.current, {
              width: HOME_PROTOTYPE_PANEL_WIDTH,
              height: panelRef.current?.getBoundingClientRect().height || 56,
            });
        panelPositionRef.current = nextPosition;
        setPanelPositionState(nextPosition);
        persistPanelPrefs({ collapsed: nextCollapsed, position: nextPosition });
        return nextCollapsed;
      });
    };

    const beginPanelDrag = (event) => {
      const target = event.target;
      if (event.button !== 0) return;
      if (target instanceof Element && target.closest("button, input, select, textarea")) return;
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panelX: panelPositionRef.current.x,
        panelY: panelPositionRef.current.y,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const movePanel = (event) => {
      if (!dragStateRef.current) return;
      const nextPosition = {
        x: dragStateRef.current.panelX + event.clientX - dragStateRef.current.startX,
        y: dragStateRef.current.panelY + event.clientY - dragStateRef.current.startY,
      };
      updatePanelPosition(nextPosition);
    };

    const endPanelDrag = (event) => {
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      persistPanelPrefs({ position: panelPositionRef.current });
    };

    const beginPanelMouseDrag = (event) => {
      const target = event.target;
      if (dragStateRef.current || event.button !== 0) return;
      if (target instanceof Element && target.closest("button, input, select, textarea")) return;
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        panelX: panelPositionRef.current.x,
        panelY: panelPositionRef.current.y,
      };
      setIsDragging(true);
      event.preventDefault();
      const handleMouseMove = (moveEvent) => {
        if (!dragStateRef.current) return;
        updatePanelPosition({
          x: dragStateRef.current.panelX + moveEvent.clientX - dragStateRef.current.startX,
          y: dragStateRef.current.panelY + moveEvent.clientY - dragStateRef.current.startY,
        });
      };
      const handleMouseUp = () => {
        if (!dragStateRef.current) return;
        dragStateRef.current = null;
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        persistPanelPrefs({ position: panelPositionRef.current });
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    useEffect(() => {
      const handleResize = () => {
        updatePanelPosition(panelPositionRef.current);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const colorFields = [
      ["gradientStop1", "Gradient stop 1"],
      ["gradientStop2", "Gradient stop 2"],
      ["borderColor", "Border"],
      ["glyphColor", "Glyph"],
      ["shadowColor", "Shadow"],
    ];
    const opacityFields = [
      ["borderOpacity", "Border opacity"],
      ["glyphOpacity", "Glyph opacity"],
      ["shadowOpacity", "Shadow opacity"],
    ];
    const labelStyle = {
      display: "grid",
      gap: 6,
      color: "var(--fg-muted)",
      fontSize: 11,
      fontWeight: 600,
    };
    const controlStyle = {
      width: "100%",
      minWidth: 0,
      accentColor: "var(--talin-solid, #348435)",
    };
    const buttonStyle = {
      border: "1px solid var(--border)",
      borderRadius: 6,
      background: "var(--bg-subtle)",
      color: "var(--fg)",
      fontSize: 11,
      fontWeight: 600,
      padding: "5px 7px",
      cursor: "pointer",
    };
    return (
      <aside
        ref={panelRef}
        aria-label="Homepage prototype icon controls"
        style={{
          position: "fixed",
          top: panelPosition.y,
          left: panelPosition.x,
          zIndex: 40,
          width: collapsed ? 236 : HOME_PROTOTYPE_PANEL_WIDTH,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflow: collapsed ? "hidden" : "auto",
          display: "grid",
          gap: collapsed ? 0 : 12,
          padding: 14,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--bg-panel)",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.14)",
          color: "var(--fg)",
        }}>
        <div
          onPointerDown={beginPanelDrag}
          onPointerMove={movePanel}
          onPointerUp={endPanelDrag}
          onPointerCancel={endPanelDrag}
          onMouseDown={beginPanelMouseDrag}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
          }}>
          <strong style={{ fontSize: 13, fontWeight: 650 }}>Icon colour config</strong>
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
            style={buttonStyle}>
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {!collapsed ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              <button type="button" onClick={copySelectedConfig} style={buttonStyle}>
                Copy config
              </button>
              <button type="button" onClick={saveVersion} style={buttonStyle}>
                Save version
              </button>
              <button
                type="button"
                onClick={() => update(resetHomePrototypeIconStyle)}
                style={buttonStyle}>
                Reset
              </button>
            </div>

            {panelNotice ? (
              <div style={{ color: "var(--fg-muted)", fontSize: 11, fontWeight: 600 }}>
                {panelNotice}
              </div>
            ) : null}

            <label style={labelStyle}>
              Saved version
              <select
                aria-label="Saved icon version"
                disabled={!versions.length}
                value={selectedVersionId}
                onChange={(event) => loadSavedVersion(event.target.value)}
                style={{ ...controlStyle, height: 30, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)" }}>
                <option value="">{versions.length ? "Current unsaved config" : "Save a version first"}</option>
                {versions.slice().reverse().map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Preset
              <select
                aria-label="Icon preset"
                value={state.iconPreset}
                onChange={(event) => update(() => setHomePrototypeIconPreset(event.target.value))}
                style={{ ...controlStyle, height: 30, borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--fg)" }}>
                {ICON_PRESET_OPTIONS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>Intensity</span>
                <span>{state.iconIntensity.toFixed(2)}</span>
              </span>
              <input
                aria-label="Icon intensity"
                type="range"
                min={HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.intensity[1]}
                max={HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.intensity[2]}
                step={HOMEPAGE_PROTOTYPE_CONFIG.iconStyle.intensity[3]}
                value={state.iconIntensity}
                onChange={(event) => update(() => setHomePrototypeIconIntensity(event.target.value))}
                style={controlStyle}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {colorFields.map(([field, label]) => (
                <label key={field} style={labelStyle}>
                  {label}
                  <input
                    aria-label={label}
                    type="color"
                    value={style[field]}
                    onChange={(event) => update(() => setHomePrototypeIconColor(field, event.target.value))}
                    style={{ ...controlStyle, height: 32, padding: 2, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}
                  />
                </label>
              ))}
            </div>

            {opacityFields.map(([field, label]) => (
              <label key={field} style={labelStyle}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{label}</span>
                  <span>{style[field].toFixed(2)}</span>
                </span>
                <input
                  aria-label={label}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={style[field]}
                  onChange={(event) => update(() => setHomePrototypeIconOpacity(field, event.target.value))}
                  style={controlStyle}
                />
              </label>
            ))}
          </div>
        ) : null}
      </aside>
    );
  }

  // Campaign options: Recruit Candidates / Find Prospects.
  function BrandedIconShell({ size = 32, children }) {
    const { iconStyle } = getHomePrototypeIconState();
    const visiblePx = (size * 22) / 32;
    const offsetXPx = (size * 4.8126) / 32;
    const offsetYPx = (size * 2.61252) / 32;
    const rxPx = (size * 5.5) / 32;
    const shadowOpacity = iconStyle.shadowOpacity;
    return (
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-block",
          width: size,
          height: size,
          flexShrink: 0,
        }}>
        <span
          style={{
            position: "absolute",
            top: offsetYPx,
            left: offsetXPx,
            width: visiblePx,
            height: visiblePx,
            borderRadius: rxPx,
            background: `radial-gradient(ellipse 130% 180% at 50% -10%, ${iconStyle.gradientStop1} 0%, ${iconStyle.gradientStop2} 100%)`,
            boxShadow: [
              "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
              `0 0 0 0.6px ${rgba(iconStyle.borderColor, iconStyle.borderOpacity)}`,
              `0 0.5px 1px -0.5px ${rgba(iconStyle.shadowColor, shadowOpacity)}`,
              `0 1px 2px 0 ${rgba(iconStyle.shadowColor, shadowOpacity * 0.667)}`,
            ].join(", "),
          }}
        />
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          aria-hidden="true">
          {children({
            glyphColor: iconStyle.glyphColor,
            glyphOpacity: iconStyle.glyphOpacity,
          })}
        </svg>
      </span>
    );
  }

  function RecruitCandidatesIcon({ size = 32 }) {
    return (
      <BrandedIconShell size={size}>
        {({ glyphColor, glyphOpacity }) => (
          <>
            <path
              d="M17.738 10.3321C17.738 8.56017 16.3016 7.12375 14.5297 7.12375C12.7577 7.12375 11.3213 8.56017 11.3213 10.3321C11.3213 12.104 12.7577 13.5404 14.5297 13.5404C16.3016 13.5404 17.738 12.104 17.738 10.3321Z"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21.588 19.3157L20.6255 18.3532M20.9463 16.749C20.9463 15.6858 20.0845 14.824 19.0213 14.824C17.9581 14.824 17.0963 15.6858 17.0963 16.749C17.0963 17.8122 17.9581 18.674 19.0213 18.674C20.0845 18.674 20.9463 17.8122 20.9463 16.749Z"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.0376 18.0323C10.0376 15.5517 12.0486 13.5407 14.5293 13.5407C15.2182 13.5407 15.8708 13.6958 16.4543 13.9729"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </BrandedIconShell>
    );
  }

  function FindProspectsIcon({ size = 32 }) {
    return (
      <BrandedIconShell size={size}>
        {({ glyphColor, glyphOpacity }) => (
          <>
            <path
              d="M13.5665 9.6906C13.5665 8.7894 13.5665 8.3387 13.7828 8.015C13.8764 7.8749 13.9967 7.7546 14.1368 7.661C14.4605 7.4447 14.9111 7.4447 15.8124 7.4447C16.7136 7.4447 17.1641 7.4447 17.4878 7.661C17.6279 7.7546 17.7482 7.8749 17.8419 8.015C18.0582 8.3387 18.0582 8.7894 18.0582 9.6906"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22.2297 14.5031V14.1823C22.2297 12.065 22.2297 11.0063 21.5719 10.3485C20.914 9.6907 19.8553 9.6907 17.7381 9.6907H13.888C11.7706 9.6907 10.7119 9.6907 10.0541 10.3485C9.3963 11.0063 9.3963 12.065 9.3963 14.1823V14.5031C9.3963 16.6205 9.3963 17.6793 10.0541 18.337C10.7119 18.9949 11.7706 18.9949 13.888 18.9949H17.7381C19.8553 18.9949 20.914 18.9949 21.5719 18.337C22.2297 17.6793 22.2297 16.6205 22.2297 14.5031Z"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.7752 14.503C20.6723 14.1882 22.0689 11.9363 22.0689 11.9363M9.5564 11.9363C9.5564 11.9363 10.953 14.1882 14.8502 14.503"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14.8502 14.5031V13.8614C14.8502 13.6842 14.9938 13.5406 15.1709 13.5406H16.4543C16.6314 13.5406 16.7752 13.6842 16.7752 13.8614V14.5031C16.7752 15.0347 16.3442 15.4657 15.8126 15.4657C15.281 15.4657 14.8502 15.0347 14.8502 14.5031Z"
              stroke={glyphColor}
              strokeOpacity={glyphOpacity}
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </BrandedIconShell>
    );
  }

  function BrandedCheckIcon({ size = 20 }) {
    const { iconStyle, iconIntensity } = getHomePrototypeIconState();
    const visiblePx = (size * 13) / 16;
    const offsetPx = (size * 1.5) / 16;
    const shadowOpacity = iconStyle.shadowOpacity;
    const stop1 = applyIntensity(CHECKMARK_PALETTE.gradientStop1, iconIntensity);
    const stop2 = applyIntensity(CHECKMARK_PALETTE.gradientStop2, iconIntensity);
    const borderColor = applyIntensity(CHECKMARK_PALETTE.borderColor, iconIntensity);
    const shadowColor = applyIntensity(CHECKMARK_PALETTE.shadowColor, iconIntensity);
    const glyphColor = applyIntensity(CHECKMARK_PALETTE.glyphColor, iconIntensity);
    return (
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          display: "inline-block",
          width: size,
          height: size,
          flexShrink: 0,
        }}>
        <span
          style={{
            position: "absolute",
            top: offsetPx,
            left: offsetPx,
            width: visiblePx,
            height: visiblePx,
            borderRadius: "50%",
            background: `radial-gradient(ellipse 130% 180% at 50% -10%, ${stop1} 0%, ${stop2} 100%)`,
            boxShadow: [
              "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
              `0 0 0 0.3px ${rgba(borderColor, iconStyle.borderOpacity)}`,
              `0 0.5px 1px -0.5px ${rgba(shadowColor, shadowOpacity)}`,
              `0 1px 2px 0 ${rgba(shadowColor, shadowOpacity * 0.667)}`,
            ].join(", "),
          }}
        />
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="none"
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          aria-hidden="true">
          <polyline
            points="5.4 8.2 7.1 9.9 10.6 6.4"
            stroke={glyphColor}
            strokeOpacity={iconStyle.glyphOpacity}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </span>
    );
  }

  // Learn link icons (smaller — 35x35 viewBox).
  function TalinDocumentationIcon({ size = 32 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#td_ddii)">
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#td_grad)" shapeRendering="crispEdges" />
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" strokeOpacity="0.4" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M12.8055 8.35001C14.4458 8.34772 16.029 8.9414 17.25 10.0167V20.35C16.029 19.2747 14.4458 18.6811 12.8055 18.6833C11.7642 18.6833 11.2435 18.6833 11.0135 18.5361C10.8754 18.4477 10.819 18.3913 10.7306 18.2531C10.5833 18.0231 10.5833 17.6127 10.5833 16.7919V10.6188C10.5833 9.66696 10.5833 9.19103 10.9491 8.80525C11.315 8.41946 11.6895 8.39955 12.4385 8.35974C12.56 8.35328 12.6824 8.35001 12.8055 8.35001Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.6945 8.35001C20.0541 8.34772 18.471 8.9414 17.25 10.0167V20.35C18.471 19.2747 20.0541 18.6811 21.6945 18.6833C22.7358 18.6833 23.2565 18.6833 23.4865 18.5361C23.6246 18.4477 23.681 18.3913 23.7694 18.2531C23.9167 18.0231 23.9167 17.6127 23.9167 16.7919V10.6188C23.9167 9.66696 23.9167 9.19103 23.5509 8.80525C23.185 8.41946 22.8105 8.39955 22.0615 8.35974C21.94 8.35328 21.8176 8.35001 21.6945 8.35001Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.9167 11.2338C21.8429 11.2314 21.7688 11.2302 21.6945 11.2302C21.3199 11.2297 20.9483 11.2603 20.5833 11.3205M21.9167 13.6878C21.8429 13.6855 21.7688 13.6843 21.6945 13.6843C20.8507 13.6831 20.022 13.8396 19.25 14.1383M21.9167 16.0174C21.8429 16.015 21.7688 16.0138 21.6945 16.0138C20.8507 16.0126 20.022 16.1692 19.25 16.4678" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5833 11.2338C12.6571 11.2314 12.7312 11.2302 12.8055 11.2302C13.1801 11.2297 13.5517 11.2603 13.9166 11.3205M12.5833 13.6878C12.6571 13.6855 12.7312 13.6843 12.8055 13.6843C13.6493 13.6831 14.478 13.8396 15.25 14.1383M12.5833 16.0174C12.6571 16.015 12.7312 16.0138 12.8055 16.0138C13.6493 16.0126 14.478 16.1692 15.25 16.4678" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="td_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow" />
            <feOffset />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect3_innerShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
          </filter>
          <radialGradient id="td_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
            <stop stopColor="#E9FAEB" />
            <stop offset="1" stopColor="#97D898" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  function AskAQuestionIcon({ size = 32 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#aq_ddii)">
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#aq_grad)" shapeRendering="crispEdges" />
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" strokeOpacity="0.4" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M17.25 20.0167C22.0052 20.0167 23.9166 17.3304 23.9166 14.0167C23.9166 10.703 22.6718 8.01666 17.25 8.01666C12.0052 8.01666 10.5833 10.703 10.5833 14.0167C10.5833 15.3975 10.8302 16.6694 11.4977 17.6833C12.3385 19.0167 11.9117 20.2389 11.25 20.6833C12.327 20.6833 13.0514 20.3405 13.5116 20.0011C13.8383 19.76 14.2546 19.6409 14.6489 19.7377C15.3879 19.9189 16.2494 20.0167 17.25 20.0167Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.3332 14.0167H17.2499M20 14.0167H19.9167M14.6667 14.0167H14.5834M17.4166 14.0167C17.4166 14.1087 17.342 14.1833 17.2499 14.1833C17.1579 14.1833 17.0832 14.1087 17.0832 14.0167C17.0832 13.9246 17.1579 13.85 17.2499 13.85C17.342 13.85 17.4166 13.9246 17.4166 14.0167ZM20.0834 14.0167C20.0834 14.1087 20.0088 14.1833 19.9167 14.1833C19.8246 14.1833 19.75 14.1087 19.75 14.0167C19.75 13.9246 19.8246 13.85 19.9167 13.85C20.0088 13.85 20.0834 13.9246 20.0834 14.0167ZM14.75 14.0167C14.75 14.1087 14.6754 14.1833 14.5834 14.1833C14.4913 14.1833 14.4167 14.1087 14.4167 14.0167C14.4167 13.9246 14.4913 13.85 14.5834 13.85C14.6754 13.85 14.75 13.9246 14.75 14.0167Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="aq_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow" />
            <feOffset />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect3_innerShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
          </filter>
          <radialGradient id="aq_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
            <stop stopColor="#E9FAEB" />
            <stop offset="1" stopColor="#97D898" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  function ScheduleADemoIcon({ size = 32 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#sd_ddii)">
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#sd_grad)" shapeRendering="crispEdges" />
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" strokeOpacity="0.4" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M19.9166 7.68335V10.35M14.5833 7.68335V10.35" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.9167 9.01666H16.5833C14.0692 9.01666 12.8121 9.01666 12.031 9.79771C11.25 10.5788 11.25 11.8358 11.25 14.35V15.6833C11.25 18.1975 11.25 19.4546 12.031 20.2356C12.8121 21.0167 14.0692 21.0167 16.5833 21.0167H17.9167C20.4308 21.0167 21.6879 21.0167 22.4689 20.2356C23.25 19.4546 23.25 18.1975 23.25 15.6833V14.35C23.25 11.8358 23.25 10.5788 22.4689 9.79771C21.6879 9.01666 20.4308 9.01666 17.9167 9.01666Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.25 13.0167H23.25" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19.5833 16.6833V18.0167M20.5833 17.35C20.5833 17.9023 20.1356 18.35 19.5833 18.35C19.031 18.35 18.5833 17.9023 18.5833 17.35C18.5833 16.7977 19.031 16.35 19.5833 16.35C20.1356 16.35 20.5833 16.7977 20.5833 17.35Z" stroke="#022B07" strokeOpacity="0.9" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="sd_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow" />
            <feOffset />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect3_innerShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="0.6" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
          </filter>
          <radialGradient id="sd_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
            <stop stopColor="#E9FAEB" />
            <stop offset="1" stopColor="#97D898" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // Talin brand mark — full wordmark + green diamond icon.
  function TalinLogo() {
    return (
      <svg
        className="ex-brand-logo"
        width="73"
        height="20"
        viewBox="0 0 73 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Talin">
        <path d="M31.1606 2.25922V19.6296H27.8421V2.25922H31.1606ZM22.2939 3.73699V0.677736H36.7088V3.73699H22.2939Z" fill="#111111" />
        <path d="M38.5236 19.9666C37.1755 19.9666 36.1039 19.6037 35.3088 18.8777C34.531 18.1345 34.1422 17.1666 34.1422 15.974C34.1422 14.7987 34.5483 13.8654 35.3607 13.174C36.1903 12.4654 37.3656 12.0506 38.8866 11.9296L42.7236 11.6185V11.3333C42.7236 10.7456 42.6113 10.279 42.3866 9.93329C42.1792 9.57033 41.8767 9.31107 41.4792 9.15551C41.0817 8.98267 40.615 8.89625 40.0792 8.89625C39.1459 8.89625 38.4286 9.08638 37.9273 9.46662C37.4261 9.82959 37.1755 10.3481 37.1755 11.0222H34.4792C34.4792 10.0888 34.7125 9.28514 35.1792 8.61107C35.6631 7.91971 36.3372 7.38391 37.2014 7.00366C38.0829 6.62341 39.094 6.43329 40.2347 6.43329C41.3928 6.43329 42.3866 6.6407 43.2162 7.05551C44.0459 7.45304 44.6854 8.05798 45.1347 8.87033C45.5841 9.66539 45.8088 10.6592 45.8088 11.8518V19.6296H43.0347L42.8014 17.737C42.5249 18.3938 41.9891 18.9296 41.194 19.3444C40.4162 19.7592 39.5261 19.9666 38.5236 19.9666ZM39.5347 17.5814C40.5199 17.5814 41.2977 17.3049 41.8681 16.7518C42.4557 16.1987 42.7496 15.4296 42.7496 14.4444V13.7703L40.0792 13.9777C39.094 14.0642 38.394 14.2716 37.9792 14.6C37.5644 14.9111 37.357 15.3259 37.357 15.8444C37.357 16.4148 37.5471 16.8469 37.9273 17.1407C38.3076 17.4345 38.8434 17.5814 39.5347 17.5814Z" fill="#111111" />
        <path d="M50.8272 19.6296H47.6902V0.340698H50.8272V19.6296Z" fill="#111111" />
        <path d="M53.0525 19.6296V6.82218H56.2155V19.6296H53.0525ZM54.6081 4.25551C54.0723 4.25551 53.6142 4.07403 53.234 3.71107C52.871 3.33082 52.6895 2.8728 52.6895 2.33699C52.6895 1.80119 52.871 1.35181 53.234 0.988846C53.6142 0.625883 54.0723 0.444402 54.6081 0.444402C55.1439 0.444402 55.5933 0.625883 55.9562 0.988846C56.3365 1.35181 56.5266 1.80119 56.5266 2.33699C56.5266 2.8728 56.3365 3.33082 55.9562 3.71107C55.5933 4.07403 55.1439 4.25551 54.6081 4.25551Z" fill="#111111" />
        <path d="M61.5537 19.6296H58.3908V6.82218H61.3204L61.5797 8.48144C61.9772 7.84193 62.5389 7.3407 63.2648 6.97774C64.008 6.61477 64.8117 6.43329 65.6759 6.43329C67.2834 6.43329 68.4932 6.9086 69.3056 7.85922C70.1352 8.80983 70.55 10.1061 70.55 11.7481V19.6296H67.3871V12.5C67.3871 11.4284 67.1451 10.6333 66.6611 10.1148C66.1772 9.57897 65.5204 9.31107 64.6908 9.31107C63.7056 9.31107 62.9364 9.62218 62.3834 10.2444C61.8303 10.8666 61.5537 11.6963 61.5537 12.7333V19.6296Z" fill="#111111" />
        <path d="M9.51521 19.6921C9.43164 19.6922 9.34812 19.6882 9.26496 19.68C9.18178 19.6717 9.09905 19.6594 9.01708 19.643C8.93512 19.6266 8.85402 19.6062 8.77408 19.5818C8.69419 19.5573 8.61555 19.5289 8.53844 19.4968C8.46131 19.4645 8.38583 19.4285 8.31228 19.3888C8.16513 19.3093 8.02624 19.2155 7.89765 19.1086C7.83338 19.0551 7.77178 18.9986 7.71306 18.9391L0.771657 12.0018C0.742199 11.9723 0.713404 11.9421 0.685291 11.9112C0.573185 11.7873 0.473398 11.6529 0.387341 11.5097C0.365864 11.4739 0.345302 11.4376 0.325674 11.4007C0.305929 11.3639 0.287125 11.3266 0.269279 11.2889C0.251468 11.2512 0.234572 11.2131 0.218603 11.1746C0.202597 11.136 0.187575 11.0971 0.173551 11.0577C0.159456 11.0184 0.146352 10.9788 0.13425 10.9388C0.122164 10.8989 0.11101 10.8587 0.100797 10.8182C0.0907098 10.7777 0.0815479 10.737 0.0733182 10.696C0.0489547 10.5732 0.0336088 10.4487 0.0274035 10.3236C0.0234176 10.2402 0.0234176 10.1567 0.0274035 10.0733C0.0295123 10.0316 0.0325158 9.98995 0.0366376 9.94854C0.0448631 9.86546 0.0571043 9.78282 0.0733182 9.70092C0.0815405 9.66 0.0907 9.61927 0.100797 9.57873C0.111021 9.53828 0.122162 9.49809 0.134218 9.45815C0.14636 9.41819 0.15946 9.37853 0.173519 9.33919C0.187581 9.29993 0.202613 9.26102 0.218603 9.2225C0.234546 9.18394 0.251443 9.14578 0.269279 9.10805C0.28716 9.07031 0.305974 9.03302 0.325706 8.99622C0.345334 8.95938 0.365896 8.92305 0.387373 8.88726C0.408851 8.85149 0.431192 8.81623 0.454376 8.78154C0.50074 8.71213 0.550518 8.64506 0.603526 8.58059C0.629983 8.54829 0.657333 8.51669 0.685291 8.48585C0.71337 8.45494 0.742166 8.42468 0.771657 8.39511L7.71143 1.4555C7.77269 1.40053 7.83645 1.34842 7.9025 1.29932C7.96853 1.25023 8.03675 1.20417 8.10696 1.16128C8.24756 1.0756 8.39566 1.00287 8.54943 0.944012C8.62623 0.914557 8.70437 0.88869 8.78357 0.866497C8.86281 0.844131 8.94294 0.825535 9.02395 0.810709C9.10485 0.795732 9.18641 0.784484 9.26835 0.777C9.35024 0.76939 9.43245 0.765595 9.5147 0.765625C9.59707 0.765625 9.67924 0.769417 9.7612 0.777C9.84319 0.784477 9.92466 0.795702 10.0056 0.810677C10.0865 0.825547 10.1667 0.844174 10.2459 0.866497C10.3251 0.888677 10.4033 0.914533 10.4801 0.94398C10.6338 1.00286 10.7819 1.07559 10.9225 1.16128C10.9927 1.20417 11.061 1.25023 11.127 1.29932C11.193 1.34844 11.2568 1.40055 11.3181 1.45546L18.2578 8.39517C18.2873 8.4247 18.3162 8.45492 18.3443 8.48579C18.3723 8.51672 18.3996 8.54829 18.4262 8.58049C18.5057 8.67728 18.578 8.77978 18.6425 8.88717C18.6641 8.92293 18.6847 8.95926 18.7043 8.99612C18.7437 9.06973 18.7795 9.14525 18.8115 9.22241C18.8275 9.26098 18.8425 9.29989 18.8566 9.33913C18.8706 9.37845 18.8837 9.41809 18.8959 9.45805C18.9081 9.49797 18.9192 9.53821 18.9293 9.57876C18.9395 9.61922 18.9487 9.65992 18.9569 9.70082C18.9893 9.86474 19.0057 10.0314 19.0059 10.1985C19.0059 10.2402 19.0049 10.2819 19.0028 10.3236C19.0008 10.3653 18.9977 10.407 18.9935 10.4485C18.9853 10.5316 18.9731 10.6142 18.9568 10.6962C18.9486 10.7371 18.9394 10.7778 18.9294 10.8183C18.9192 10.8588 18.908 10.899 18.8959 10.9389C18.8837 10.9789 18.8706 11.0185 18.8566 11.0579C18.8144 11.1758 18.7635 11.2905 18.7042 11.4008C18.6846 11.4377 18.664 11.474 18.6424 11.5098C18.621 11.5456 18.5986 11.5808 18.5754 11.6155C18.5522 11.6502 18.5281 11.6843 18.5033 11.7179C18.4783 11.7513 18.4526 11.7842 18.4262 11.8165C18.3996 11.8487 18.3723 11.8803 18.3443 11.9112C18.3162 11.9421 18.2874 11.9724 18.2578 12.0018L11.3181 18.9391C11.2594 18.9985 11.1977 19.0551 11.1334 19.1085C11.069 19.1618 11.0021 19.212 10.9328 19.2588C10.6548 19.4465 10.3423 19.577 10.0133 19.6428C9.84934 19.6758 9.68248 19.6923 9.51521 19.6921Z" fill="#2A9C5E" />
      </svg>
    );
  }

  // Stacked Microsoft + Gmail icon, mirroring the Figma 1:6549 wrapper.
  function MailboxStackIcon() {
    return (
      <span style={{ position: "relative", display: "inline-block", width: 22, height: 22 }}>
        <img
          src="vendor/logos/microsoft.svg"
          alt=""
          style={{ position: "absolute", left: 1, top: 3, width: 11, height: 11 }}
        />
        <img
          src="vendor/logos/gmail.svg"
          alt=""
          style={{ position: "absolute", left: 8, top: 10, width: 12, height: 9 }}
        />
      </span>
    );
  }

  // ── Sub-components ─────────────────────────────────────────────────────
  // Renders as <a> when href is provided (cross-example navigation), else
  // as a plain <div> (decorative — Inbox/Settings have no example pages).
  function SideItem({ icon: IconComp, label, active, href }) {
    const className = `ex-side-item ${active ? "ex-side-item--active" : ""}`;
    const sharedProps = {
      className,
      "data-label": label,
      "data-tk-fg": active ? "fg" : "fg.muted",
      ...(active ? { "data-tk-bg": "alpha.muted" } : {}),
      "data-tk-bg-hover": active ? "alpha.muted" : "alpha.subtle",
      style: { color: active ? "var(--fg)" : "var(--fg-muted)" },
    };
    const inner = (
      <>
        <span
          data-tk-fg="fg.muted"
          style={{ display: "inline-flex", color: "var(--fg-muted)" }}>
          <IconComp size={20} />
        </span>
        <span>{label}</span>
      </>
    );
    if (href) {
      return (
        <a {...sharedProps} href={href} style={{ ...sharedProps.style, textDecoration: "none" }}>
          {inner}
        </a>
      );
    }
    return <div {...sharedProps}>{inner}</div>;
  }

  // 20×20 ring with arc drawn for `value` (0..1).
  function ProgressArc({ value }) {
    const r = 8;
    const c = 2 * Math.PI * r;
    const dash = c * value;
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r={r} stroke="var(--border-emphasized)" strokeWidth="2.4" fill="none" />
        <circle
          cx="10"
          cy="10"
          r={r}
          stroke="var(--talin-accent)"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 10 10)"
        />
      </svg>
    );
  }

  function SetupRow({ icon, alt, title, sub, done }) {
    return (
      <div
        className="ex-setup-row"
        data-tk-border="border"
        style={{ borderColor: "var(--border)" }}>
        <span
          className="ex-setup-icon"
          style={{ background: "transparent", color: "var(--fg-muted)" }}>
          <img src={icon} alt={alt} width="20" height="20" />
        </span>
        <div>
          <div
            className="ex-setup-title"
            data-tk-fg="fg"
            style={{ color: "var(--fg)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>{title}</span>
            {done ? <BrandedCheckIcon /> : null}
          </div>
          <div
            className="ex-setup-sub"
            data-tk-fg="fg.muted"
            style={{ color: "var(--fg-muted)" }}>
            {sub}
          </div>
        </div>
        <span style={{ color: "var(--fg-muted)" }}>
          <CaretDownIcon size={16} />
        </span>
      </div>
    );
  }

  function MailboxRow() {
    return (
      <div
        className="ex-setup-row"
        data-tk-border="border"
        style={{ borderColor: "var(--border)", borderBottom: "0" }}>
        <span className="ex-setup-icon" style={{ background: "transparent", color: "var(--fg-muted)" }}>
          <MailboxStackIcon />
        </span>
        <div>
          <div className="ex-setup-title" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            Connect a mailbox
          </div>
          <div
            className="ex-setup-sub"
            data-tk-fg="fg.muted"
            style={{ color: "var(--fg-muted)" }}>
            Connect your email to send personalized outreach and track replies
          </div>
        </div>
        <span style={{ color: "var(--fg-muted)" }}>
          <CaretDownIcon size={16} />
        </span>
      </div>
    );
  }

  function CampaignOption({ icon: IconComp, title, rows, foot, footPrefix }) {
    return (
      <div
        className="ex-card ex-card--option"
        data-tk-bg="bg.muted"
        data-tk-border="border"
        style={{ background: "var(--bg-muted)", borderColor: "var(--border)" }}>
        <div
          className="ex-opt-head"
          data-tk-bg="bg.panel"
          data-tk-border="border"
          data-tk-fg="fg"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            color: "var(--fg)",
            padding: "12px",
            gap: 8,
          }}>
          <span style={{ display: "inline-flex", flexShrink: 0, transform: "translateY(2px)" }}>
            <IconComp size={32} />
          </span>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          <span
            className="ex-opt-arrow"
            data-tk-fg="fg.muted"
            style={{ color: "var(--fg-muted)" }}>
            <ArrowRightIcon size={16} />
          </span>
        </div>
        <div className="ex-opt-list">
          {rows.map((r, i) => (
            <div
              key={i}
              className="ex-opt-item"
              data-tk-bg="bg.panel"
              data-tk-border="border"
              style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}>
              <div
                className="ex-opt-item-title"
                data-tk-fg="fg"
                style={{ color: "var(--fg)" }}>
                {r.title}
              </div>
              <div
                className="ex-opt-item-sub"
                data-tk-fg="fg.muted"
                style={{ color: "var(--fg-muted)" }}>
                {r.sub}
              </div>
            </div>
          ))}
        </div>
        <div
          className="ex-opt-foot"
          data-tk-fg="fg.subtle"
          style={{ color: "var(--fg-subtle)" }}>
          {footPrefix}{" "}
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>{foot}</span>
        </div>
      </div>
    );
  }

  function LinkRow({ icon: IconComp, label }) {
    return (
      <a
        className="ex-link-row"
        href="#"
        data-tk-fg="fg"
        style={{ color: "var(--fg)", textDecoration: "none", gap: 8 }}
        onClick={(e) => e.preventDefault()}>
        <span
          data-tk-fg="fg.muted"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            flexShrink: 0,
            color: "var(--fg-muted)",
          }}>
          <IconComp size={20} />
        </span>
        <span>{label}</span>
      </a>
    );
  }

  // ── Sidebar shell (shared by ExampleHome and ExampleCampaigns) ─────────
  const SIDEBAR_STORAGE_KEY = "talin.exHome.sidebar";
  const NARROW_QUERY = "(max-width: 1100px)";

  function readSidebarPref() {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed";
    } catch (_) {
      return false;
    }
  }
  function writeSidebarPref(collapsed) {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    } catch (_) {}
  }

  // The sidebar markup itself. `active` selects which nav item highlights:
  //   "home" | "campaigns" | "inbox" | "settings"
  // Home and Campaigns are clickable links to their respective example
  // pages, preserving the current light/dark mode via the URL.
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

  function TalinSidebar({ active, sidebarCollapsed, onToggleSidebar }) {
    const mode = (typeof document !== "undefined" && document.documentElement.dataset.mode) || "light";
    const navHref = (id) => examplePageHref(id, mode);
    return (
      <aside
        className="ex-sidebar"
        data-tk-bg="bg.muted"
        data-tk-border="border"
        style={{ background: "var(--bg-muted)", borderRightColor: "var(--border)" }}>
        <div className="ex-brand-row">
          {!sidebarCollapsed && <TalinLogo />}
          <button
            type="button"
            className="ex-sidebar-toggle"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!sidebarCollapsed}
            data-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleSidebar}>
            <SidebarSimpleIcon size={20} />
          </button>
        </div>

        <div
          className="ex-side-search"
          data-label="Search"
          data-tk-bg="bg.panel"
          data-tk-border="border"
          data-tk-fg="fg.subtle"
          style={{
            background: "var(--bg-panel)",
            borderColor: "var(--border)",
            color: "var(--fg-subtle)",
          }}>
          <span
            data-tk-fg="fg.muted"
            style={{ display: "inline-flex", color: "var(--fg-muted)" }}>
            <MagnifyingGlassIcon size={16} />
          </span>
          <span>Search</span>
        </div>

        <nav className="ex-side-nav">
          <SideItem icon={HouseLineIcon} label="Home" active={active === "home"} href={navHref("home")} />
          <SideItem icon={PaperPlaneTiltIcon} label="Campaigns" active={active === "campaigns"} href={navHref("campaigns")} />
          <SideItem icon={EnvelopeIcon} label="Inbox" active={active === "inbox"} />
          <SideItem icon={GearIcon} label="Settings" active={active === "settings"} />
        </nav>

        <div className="ex-side-foot">
          <SideItem icon={BookOpenIcon} label="Knowledge Hub" />
          <SideItem icon={QuestionIcon} label="Ask a question" />
          <div
            className="ex-side-user"
            data-tk-border="border"
            style={{ borderTopColor: "var(--border)" }}>
            <div
              className="ex-side-avatar"
              data-tk-bg="fg"
              data-tk-fg="bg"
              style={{ background: "var(--fg)", color: "var(--bg)" }}>
              JS
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="ex-side-user-name"
                data-tk-fg="fg"
                style={{ color: "var(--fg)" }}>
                John Smith
              </div>
              <div
                className="ex-side-user-mail"
                data-tk-fg="fg.subtle"
                style={{
                  color: "var(--fg-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                m@example.com
              </div>
            </div>
            {!sidebarCollapsed && (
              <span data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)", display: "inline-flex" }}>
                <CaretRightIcon size={16} />
              </span>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // The frame wrapper that owns the collapse state + listens to viewport
  // changes. Renders <TalinSidebar> + the page's main content as children.
  function ShellWithSidebar({ active, children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      if (typeof window !== "undefined" && window.matchMedia &&
          window.matchMedia(NARROW_QUERY).matches) {
        return true;
      }
      return readSidebarPref();
    });

    // Auto-collapse on viewport narrowing; restore user pref on widening.
    // System-driven changes do NOT persist — only explicit clicks do.
    useEffect(() => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const mql = window.matchMedia(NARROW_QUERY);
      const handler = (e) => {
        if (e.matches) setSidebarCollapsed(true);
        else setSidebarCollapsed(readSidebarPref());
      };
      if (mql.addEventListener) mql.addEventListener("change", handler);
      else if (mql.addListener) mql.addListener(handler);
      return () => {
        if (mql.removeEventListener) mql.removeEventListener("change", handler);
        else if (mql.removeListener) mql.removeListener(handler);
      };
    }, []);

    const onToggleSidebar = () => {
      setSidebarCollapsed((c) => {
        const next = !c;
        writeSidebarPref(next);
        return next;
      });
    };

    return (
      <div
        className="ex-frame"
        data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
        style={{ "--sidebar-w": sidebarCollapsed ? "64px" : "255px" }}>
        <TalinSidebar
          active={active}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
        />
        {children}
      </div>
    );
  }

  // ── ExampleHome ────────────────────────────────────────────────────────
  function ExampleHome() {
    const [, forceIconUpdate] = useState(0);
    return (
      <ShellWithSidebar active="home">
        <main className="ex-main" data-tk-bg="bg.subtle">
          <h1
            className="ex-h1 ex-h1--inline"
            data-tk-fg="fg"
            style={{ color: "var(--fg)" }}>
            Good afternoon, Ivan
          </h1>

          <div className="ex-home-grid" style={{ gap: 32 }}>
            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Setup guide */}
              <section>
                <div className="ex-section-row ex-home-heading-row">
                  <h2
                    className="ex-h2"
                    data-tk-fg="fg"
                    style={{ color: "var(--fg)", fontSize: 20, fontWeight: 600 }}>
                    Setup guide
                  </h2>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--fg-muted)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                    <ProgressArc value={1 / 3} />
                    <span>1/3</span>
                  </span>
                </div>
                <div
                  className="ex-card"
                  data-tk-bg="bg.panel"
                  data-tk-border="border"
                  style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}>
                  <SetupRow
                    icon="vendor/logos/chrome.svg"
                    alt="Chrome"
                    title="Install Chrome Extensiton"
                    done
                    sub="Install Chrome extension to power your LinkedIn searches and import contacts into talin."
                  />
                  <SetupRow
                    icon="vendor/logos/linkedin.svg"
                    alt="LinkedIn"
                    title="Connect LinkedIn Account"
                    sub="Connect your LinkedIn account to import contacts into Talin and send outreach with LinkedIn connections and messages"
                  />
                  <MailboxRow />
                </div>
              </section>

              {/* Create your first campaign */}
              <section>
                <h2
                  className="ex-h2"
                  data-tk-fg="fg"
                  style={{ color: "var(--fg)", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                  Create your first campaign
                </h2>
                <div className="ex-pair">
                  <CampaignOption
                    icon={RecruitCandidatesIcon}
                    title="Recruit candidates"
                    footPrefix="Found on"
                    foot="peakdemandinc.com"
                    rows={[
                      { title: "Solar Project Managers", sub: "5+ yrs · Utility scale projects · Oakland, CA" },
                      { title: "Sales Engineers", sub: "3+ yrs · EPC companies · Santa Cruz, CA" },
                      { title: "Construction Managers", sub: "7+ yrs · Utility scale solar projects · Phoenix, AZ" },
                    ]}
                  />
                  <CampaignOption
                    icon={FindProspectsIcon}
                    title="Find prospects"
                    footPrefix="Suggested for"
                    foot="peakdemandinc.com"
                    rows={[
                      { title: "VPs of Construction", sub: "Utility-scale solar developers · Oakland, CA" },
                      { title: "Heads of Sales", sub: "Solar module & inverter manufacturers · Santa Cruz, CA" },
                      { title: "COOs / VPs of Field Operations", sub: "Renewable IPPs" },
                    ]}
                  />
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="ex-home-aside">
              <div className="ex-home-heading-row">
                <h2
                  className="ex-h2"
                  data-tk-fg="fg"
                  style={{ color: "var(--fg)", fontSize: 20, fontWeight: 600 }}>
                  Learn how Talin works
                </h2>
              </div>
              <div
                className="ex-card ex-card--video"
                data-tk-bg="bg.panel"
                data-tk-border="border"
                style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}>
                <div
                  className="ex-video-thumb"
                  data-tk-bg="bg.subtle"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--fg-muted)",
                  }}>
                  <span
                    className="ex-video-play"
                    data-tk-bg="bg.panel"
                    data-tk-fg="fg"
                    style={{
                      background: "var(--bg-panel)",
                      color: "var(--fg)",
                    }}>
                    <PlayIcon size={14} />
                  </span>
                </div>
                <div
                  className="ex-video-meta"
                  data-tk-fg="fg.muted"
                  style={{ color: "var(--fg-muted)" }}>
                  <span style={{ color: "var(--fg)", fontWeight: 600 }}>End-to-end workflow setup</span>
                  <span>9 min</span>
                </div>
              </div>

              <div className="ex-link-list">
                <LinkRow icon={BookOpenIcon} label="Talin documentation" />
                <LinkRow icon={QuestionIcon} label="Ask a question" />
                <LinkRow icon={CalendarBlankIcon} label="Schedule a demo with us" />
              </div>
            </div>
          </div>
        </main>
        <HomePrototypeControls onConfigChange={() => forceIconUpdate((tick) => tick + 1)} />
      </ShellWithSidebar>
    );
  }

  // ── ExampleCampaigns ───────────────────────────────────────────────────
  // Mock data + chart components mirror talin's CampaignAnalytics +
  // CampaignsTable, but the horizontal CampaignProgressBar is replaced with
  // a small circular progress ring in the Contacts cell, and the column set
  // follows the Figma (no Type/Progress, "Replies" split into Replies +
  // Positive replies).

  // 5 mock campaigns spread across the last 6 weeks (today is 2026-05-09).
  // Mix of candidate/prospect targeting; per-row actions/contacts/replies
  // chosen to exercise all three pill tiers (<10 / 10–25 / >25).
  const MOCK_CAMPAIGNS = [
    { id: 1, name: "US Solar Project Managers",  dateCreated: "March 28, 2026", type: "candidate",
      actions: 1, contacts: 800, completed: 520, inProgress: 160, skipped: 120, total: 1000,
      replies: 135, repliesPct: 9.8,  positive: 34, positivePct: 25.2 },
    { id: 2, name: "EU Sales VPs",               dateCreated: "April 11, 2026", type: "prospect",
      actions: 3, contacts: 323, completed: 200, inProgress:  80, skipped:  43, total:  500,
      replies: 200, repliesPct: 24.7, positive: 12, positivePct:  6.8 },
    { id: 3, name: "APAC Construction Leads",    dateCreated: "April 22, 2026", type: "candidate",
      actions: 5, contacts: 543, completed: 380, inProgress:  90, skipped:  73, total:  700,
      replies: 157, repliesPct: 19.4, positive: 15, positivePct: 14.5 },
    { id: 4, name: "Renewable IPP Operators",    dateCreated: "April 30, 2026", type: "prospect",
      actions: 2, contacts: 700, completed: 480, inProgress: 120, skipped: 100, total:  900,
      replies: 135, repliesPct:  6.8, positive: 28, positivePct: 22.4 },
    { id: 5, name: "Bay Area Engineering",       dateCreated: "May 5, 2026",    type: "candidate",
      actions: 1, contacts: 913, completed: 600, inProgress: 200, skipped: 113, total: 1100,
      replies:  89, repliesPct:  8.3, positive: 29, positivePct: 21.5 },
  ];

  // Mock stats — totals + period-over-period change for the 3 KPIs.
  const MOCK_STATS = {
    messages: {
      total: 17,
      change: -23.9,
      // Single chart.primary base, opacity stepped per segment (largest
      // value = full opacity, smallest = lightest). Diverges from talin's
      // multi-color Pie palette in favour of a calmer single-hue donut.
      // Labels mirror the readable strings produced by talin's
      // useMessagesSentData hook (CONNECTION_REQUESTS → "Connection
      // requests", etc.) and surface as native browser tooltips on hover.
      segments: [
        { id: "connect", label: "Connection requests", value: 6, opacity: 1.0  },
        { id: "linmsg",  label: "LinkedIn messages",   value: 5, opacity: 0.85 },
        { id: "email",   label: "Emails",              value: 3, opacity: 0.7  },
        { id: "sms",     label: "SMS",                 value: 1, opacity: 0.55 },
        { id: "inmail",  label: "LinkedIn InMails",    value: 1, opacity: 0.4  },
        { id: "phone",   label: "Phone calls",         value: 1, opacity: 0.25 },
      ],
    },
    contacts: { value: 9, change: -12.3 },
    replies:  { value: 4, change: 25 },
    // Bar heights are scaled visual proportions (matching the Figma
    // "previous=short, current=tall" composition). The rate values
    // (22.2% / 20.0%) display as the metric label only.
    replyRate: { current: 22.2, previous: 20.0, change: 2, prevHeight: 28, currHeight: 92 },
  };

  // Helper — token-hex resolution (mode-aware via data-mode on <html>).
  function tokenHex(path) {
    if (typeof window === "undefined" || !window.resolveToken) return null;
    const mode = document.documentElement.dataset.mode === "dark" ? "dark" : "light";
    const r = window.resolveToken(path, mode);
    return r ? r.hex : null;
  }
  // Polar → cartesian. 0° = top (12 o'clock); angles grow clockwise.
  function polarToCartesian(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arcPath(cx, cy, r, startDeg, endDeg) {
    const start = polarToCartesian(cx, cy, r, endDeg);
    const end = polarToCartesian(cx, cy, r, startDeg);
    const largeArc = endDeg - startDeg <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }
  // Filled annular sector with rounded corners on all four corners
  // (outer-start, outer-end, inner-start, inner-end). Mirrors Nivo's
  // ResponsivePie cornerRadius behaviour. Used by the half-donut so each
  // segment is one fill path — no stroke + cap-overlay composition that
  // can leave anti-aliased seams at segment joints.
  function annularSectorPath(cx, cy, rOut, rIn, startDeg, endDeg, cr) {
    const dOut = (cr / rOut) * 180 / Math.PI;
    const dIn  = (cr / rIn)  * 180 / Math.PI;
    const A = polarToCartesian(cx, cy, rOut - cr, startDeg);
    const B = polarToCartesian(cx, cy, rOut,      startDeg + dOut);
    const C = polarToCartesian(cx, cy, rOut,      endDeg   - dOut);
    const D = polarToCartesian(cx, cy, rOut - cr, endDeg);
    const E = polarToCartesian(cx, cy, rIn  + cr, endDeg);
    const F = polarToCartesian(cx, cy, rIn,       endDeg   - dIn);
    const G = polarToCartesian(cx, cy, rIn,       startDeg + dIn);
    const H = polarToCartesian(cx, cy, rIn  + cr, startDeg);
    const outerLargeArc = (endDeg - dOut) - (startDeg + dOut) > 180 ? 1 : 0;
    const innerLargeArc = (endDeg - dIn)  - (startDeg + dIn)  > 180 ? 1 : 0;
    return [
      `M ${A.x} ${A.y}`,
      `A ${cr} ${cr} 0 0 1 ${B.x} ${B.y}`,                   // outer-start corner
      `A ${rOut} ${rOut} 0 ${outerLargeArc} 1 ${C.x} ${C.y}`, // outer ring (CW visually)
      `A ${cr} ${cr} 0 0 1 ${D.x} ${D.y}`,                   // outer-end corner
      `L ${E.x} ${E.y}`,                                      // radial line at endDeg
      `A ${cr} ${cr} 0 0 1 ${F.x} ${F.y}`,                   // inner-end corner
      `A ${rIn} ${rIn} 0 ${innerLargeArc} 0 ${G.x} ${G.y}`,  // inner ring (CCW back)
      `A ${cr} ${cr} 0 0 1 ${H.x} ${H.y}`,                   // inner-start corner
      "Z",
    ].join(" ");
  }

  // Trend pill — "↗ 25%" (up=green) or "↘ 23.9%" (down=orange).
  function TrendPill({ variant, value }) {
    const up = variant === "up";
    return (
      <span
        className={`ex-trend-pill ex-trend-pill--${up ? "up" : "down"}`}
        data-tk-bg={up ? "green.muted" : "orange.muted"}
        data-tk-fg={up ? "green.fg" : "orange.fg"}
        style={{
          background: up ? "var(--green-muted)" : "var(--orange-muted)",
          color: up ? "var(--green-fg)" : "var(--orange-fg)",
        }}>
        <span style={{ display: "inline-flex" }}>
          {up ? <ArrowUpRightIcon size={10} /> : <ArrowDownRightIcon size={10} />}
        </span>
        <span>{value}</span>
      </span>
    );
  }

  // Messages-sent half-donut. Mirrors talin's CampaignMessagesKPI (Nivo
  // ResponsivePie startAngle -90 / endAngle 90 / innerRadius 0.9 /
  // padAngle 1.5 / cornerRadius 3). Built as stacked <path> arcs so each
  // segment keeps its own color and rounded caps.
  function MessagesSentDonut({ segments, total, change }) {
    const sum = segments.reduce((a, s) => a + s.value, 0) || 1;
    // Each segment is one filled annular-sector path with rounded corners
    // (cornerRadius=2). rOut=83, rIn=73 → effective stroke width 10. Since
    // the segment ends exactly at its angular endpoint (no protrusion past
    // it), adjacent segments cannot overlap visually — the angular gap IS
    // the visible gap. ~4° gap at r=78 ≈ 5.4px clear separation.
    const cx = 100, cy = 95, r = 78, gap = 4;
    const rOut = r + 5, rIn = r - 5, cr = 2;
    const availableArc = 180 - gap * (segments.length - 1);
    let cursor = -90;
    return (
      <div className="ex-stat-vis ex-stat-vis--msg">
        <div className="ex-stat-vis-trend ex-stat-vis-trend--tl">
          <TrendPill variant={change < 0 ? "down" : "up"} value={`${Math.abs(change)}%`} />
        </div>
        <svg className="ex-msg-donut-svg" width="200" height="110" viewBox="0 0 200 110">
          {segments.map((seg) => {
            const sweep = (seg.value / sum) * availableArc;
            const start = cursor;
            const end = cursor + sweep;
            cursor = end + gap;
            const tooltip = `${seg.label}: ${seg.value}`;
            return (
              <path
                key={seg.id}
                d={annularSectorPath(cx, cy, rOut, rIn, start, end, cr)}
                fill="var(--chart-primary)"
                fillOpacity={seg.opacity}
                data-tk-fill="chart.primary"
                data-tk-tooltip={tooltip}>
                <title>{tooltip}</title>
              </path>
            );
          })}
        </svg>
        <div className="ex-msg-donut-meta">
          <span className="ex-msg-donut-num" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {total}
          </span>
          <span className="ex-msg-donut-label" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
            messages sent
          </span>
        </div>
      </div>
    );
  }

  // 28-bar contacts→replies funnel. Heights taper based on conversionRatio.
  // Color interpolates from chart.primary (purple, anchoring the contacts
  // stat) to blue.solid (anchoring the replies stat) using CSS color-mix in
  // OKLCH, so the hue arc is perceptually smooth — no muddy mid-tones the
  // way linear-RGB lerp produces. Both endpoint tokens are mode-stable, so
  // the gradient holds in dark mode without re-tuning.
  function ContactsRepliesFunnel({ contactsValue, repliesValue, contactsChange, repliesChange }) {
    const lineCount = 28;
    const maxHeight = 80;
    const lineWidth = 5;
    const funnelAngle = 10;
    const conversionRatio =
      contactsValue > 0 && contactsValue > repliesValue
        ? repliesValue / contactsValue
        : 0.5;
    const targetRatio = Math.max(0.45, conversionRatio);
    const startColor = tokenHex("chart.primary") || "#4D4F91";
    const endColor   = tokenHex("blue.solid")    || "#2B6CB0";

    // Materialize the OKLCH gradient to concrete hex strings via a 1x1
    // canvas — same trick as regenerateScale() in tokens.js. Letting the
    // browser resolve color-mix() and reading the pixel back as sRGB gives
    // a concrete hex per bar, which makes the token inspector's
    // getComputedStyle readback parse cleanly (normalizeColor only handles
    // rgb/hex, not color-mix() / oklch() / color() outputs). Also degrades
    // gracefully on engines without color-mix support — the prior
    // ctx.fillStyle assignment is preserved as the fallback.
    const barCanvas = document.createElement("canvas");
    barCanvas.width = 1;
    barCanvas.height = 1;
    const barCtx = barCanvas.getContext("2d");
    const barColors = Array.from({ length: lineCount }, (_, i) => {
      const progress = i / (lineCount - 1);
      barCtx.fillStyle = startColor;
      barCtx.fillStyle = `color-mix(in oklch, ${startColor}, ${endColor} ${(progress * 100).toFixed(2)}%)`;
      barCtx.fillRect(0, 0, 1, 1);
      const [r, g, b] = barCtx.getImageData(0, 0, 1, 1).data;
      return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
    });

    return (
      <div className="ex-stat-vis ex-stat-vis--funnel">
        <div className="ex-funnel-side ex-funnel-side--left">
          <div className="ex-stat-vis-trend ex-stat-vis-trend--inline">
            <TrendPill
              variant={contactsChange < 0 ? "down" : "up"}
              value={`${Math.abs(contactsChange)}%`}
            />
          </div>
          <span className="ex-stat-num" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {contactsValue}
          </span>
          <span className="ex-stat-label" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
            contacts
          </span>
        </div>
        <div className="ex-funnel">
          {Array.from({ length: lineCount }).map((_, i) => {
            const progress = i / (lineCount - 1);
            const heightRatio = 1 - progress * (1 - targetRatio);
            const isEdge = i === 0 || i === lineCount - 1;
            const heightMul = isEdge ? 1.05 : 1;
            const height = heightRatio * maxHeight * heightMul;
            const offsetY = progress * Math.tan((funnelAngle * Math.PI) / 180) * 25;
            const width = isEdge ? lineWidth + 8 : lineWidth;
            const color = barColors[i];
            const opacity = isEdge ? 0.8 : 0.5;
            return (
              <span
                key={i}
                className="ex-funnel-bar"
                data-tk-from="chart.primary"
                data-tk-to="blue.solid"
                style={{
                  height: `${height}px`,
                  width: `${width}px`,
                  background: color,
                  transform: `translateY(${offsetY}px)`,
                  opacity,
                }}
              />
            );
          })}
        </div>
        <div className="ex-funnel-side ex-funnel-side--right">
          <div className="ex-stat-vis-trend ex-stat-vis-trend--inline">
            <TrendPill
              variant={repliesChange < 0 ? "down" : "up"}
              value={`${Math.abs(repliesChange)}%`}
            />
          </div>
          <span className="ex-stat-num" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {repliesValue}
          </span>
          <span className="ex-stat-label" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
            replies
          </span>
        </div>
      </div>
    );
  }

  // Reply-rate stacked bars — mirrors talin's ReplyRateKPI. Two side-by-side
  // bars (Previous in gray.emphasized, Current in green.solid =
  // talin's green[500]). Bar containers are transparent (no bg, no border)
  // so the surrounding stat-card bg.muted shows through, matching the
  // production Nivo ResponsiveBar where 'Not Replied' is rendered white-on-
  // transparent rather than a chip with a background.
  function ReplyRateBars({ current, previous, change, prevHeight = 28, currHeight = 92 }) {
    return (
      <div className="ex-stat-vis ex-stat-vis--rate">
        <div className="ex-stat-vis-trend ex-stat-vis-trend--tl">
          <TrendPill variant={change < 0 ? "down" : "up"} value={`${Math.abs(change)}%`} />
        </div>
        <div className="ex-replyrate-bars">
          <div className="ex-replyrate-bar ex-replyrate-bar--prev">
            <span
              className="ex-replyrate-fill"
              data-tk-bg="alpha.emphasized"
              style={{ background: "var(--alpha-emphasized)", height: `${prevHeight}%` }}
            />
          </div>
          <div className="ex-replyrate-bar ex-replyrate-bar--curr">
            <span
              className="ex-replyrate-fill"
              data-tk-bg="blue.solid"
              style={{ background: "color-mix(in oklab, var(--blue-solid) 80%, transparent)", height: `${currHeight}%` }}
            />
          </div>
        </div>
        <div className="ex-stat-vis-meta">
          <span className="ex-stat-num" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {current}%
          </span>
          <span className="ex-stat-label" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
            reply rate
          </span>
        </div>
      </div>
    );
  }

  // Small circular progress ring for the table's Contacts cell.
  // Replaces talin's horizontal CampaignProgressBar — concentric arcs
  // proportional to completed / inProgress / skipped of total contacts,
  // overlaid on a border-colored "not started" track. Each arc carries an
  // SVG <title> child so the browser shows a native tooltip on hover,
  // mirroring talin's chakra Tooltip on the production progress bar.
  function ContactsProgressRing({ completed, inProgress, skipped, total, size = 32 }) {
    const stroke = 5;
    const r = size / 2 - stroke / 2;
    const c = 2 * Math.PI * r;
    const safeTotal = total || 1;
    const notStarted = Math.max(0, total - completed - inProgress - skipped);
    const noun = (n) => (n === 1 ? "contact" : "contacts");
    const segs = [
      { value: completed,  token: "chart.primary", stroke: "var(--chart-primary)", opacity: 1,   title: `Completed: ${completed} ${noun(completed)}` },
      { value: inProgress, token: "chart.primary", stroke: "var(--chart-primary)", opacity: 0.6, title: `In progress: ${inProgress} ${noun(inProgress)}` },
      { value: skipped,    token: "orange.solid",  stroke: "var(--orange-solid)",  opacity: 1,   title: `Skipped: ${skipped} ${noun(skipped)}` },
    ];
    let cursor = 0;
    return (
      <svg className="ex-progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="none"
          data-tk-stroke="border"
          data-tk-tooltip={`Not started: ${notStarted} ${noun(notStarted)}`}>
          <title>{`Not started: ${notStarted} ${noun(notStarted)}`}</title>
        </circle>
        {segs.map((seg, i) => {
          const len = (seg.value / safeTotal) * c;
          const offset = -cursor;
          cursor += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={seg.stroke}
              strokeOpacity={seg.opacity}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              data-tk-stroke={seg.token}
              data-tk-tooltip={seg.title}>
              <title>{seg.title}</title>
            </circle>
          );
        })}
      </svg>
    );
  }

  // ── Filter row sub-components ──────────────────────────────────────────
  function SearchFilter() {
    return (
      <div
        className="ex-filter-input"
        data-tk-bg="bg.panel"
        data-tk-border="border"
        data-tk-fg="fg.subtle"
        style={{
          background: "var(--bg-panel)",
          borderColor: "var(--border)",
          color: "var(--fg-subtle)",
        }}>
        <span data-tk-fg="fg.muted" style={{ display: "inline-flex", color: "var(--fg-muted)" }}>
          <MagnifyingGlassIcon size={14} />
        </span>
        <span>Filter by campaign name</span>
      </div>
    );
  }

  function FiltersDropdown() {
    return (
      <button
        type="button"
        className="ex-filter-btn"
        data-tk-bg="bg.panel"
        data-tk-border="border"
        data-tk-fg="fg"
        style={{
          background: "var(--bg-panel)",
          borderColor: "var(--border)",
          color: "var(--fg)",
        }}>
        <span>Filters</span>
        <span data-tk-fg="fg.muted" style={{ display: "inline-flex", color: "var(--fg-muted)" }}>
          <CaretDownBoldIcon size={12} />
        </span>
      </button>
    );
  }

  function FilterPill({ label, value }) {
    return (
      <button
        type="button"
        className="ex-filter-pill"
        data-tk-bg="bg.emphasized"
        data-tk-border="border"
        data-tk-fg="fg"
        style={{
          background: "var(--bg-emphasized)",
          borderColor: "var(--border)",
          color: "var(--fg)",
        }}>
        <span className="ex-filter-pill-label" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
          {label}
        </span>
        <span className="ex-filter-pill-val" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
          {value}
        </span>
        <span className="ex-filter-pill-x" data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)" }}>
          <XCircleIcon size={14} />
        </span>
      </button>
    );
  }

  function NewCampaignButton() {
    return (
      <button
        type="button"
        className="ex-btn ex-btn--green"
        data-tk-bg="talin.solid"
        data-tk-fg="talin.contrast"
        style={{
          background: "var(--talin-solid)",
          color: "var(--talin-contrast)",
        }}>
        <PlusIcon size={14} />
        <span>New Campaign</span>
      </button>
    );
  }

  // ── Campaigns table ────────────────────────────────────────────────────
  // Three-tier ramp: <10% = okay (subtle), 10–25% = good (muted),
  // >25% = great (emphasized). Replies use the blue ramp; Positive replies
  // use the green ramp. Pill is fixed-width so columns align vertically.
  const PCT_PILL_TOKENS = {
    replies: {
      okay:  { bg: "blue.subtle",     fg: "blue.fg" },
      good:  { bg: "blue.muted",      fg: "blue.fg" },
      great: { bg: "blue.emphasized", fg: "blue.fg" },
    },
    positive: {
      okay:  { bg: "green.subtle",     fg: "green.fg" },
      good:  { bg: "green.muted",      fg: "green.fg" },
      great: { bg: "green.emphasized", fg: "green.fg" },
    },
  };
  function PercentPill({ value, variant }) {
    const tier = value < 10 ? "okay" : value <= 25 ? "good" : "great";
    const { bg, fg } = PCT_PILL_TOKENS[variant][tier];
    const cssVar = (token) => `var(--${token.replace(".", "-")})`;
    return (
      <span
        className={`ex-pct-pill ex-pct-pill--${variant} ex-pct-pill--${tier}`}
        data-tk-bg={bg}
        data-tk-fg={fg}
        style={{ background: cssVar(bg), color: cssVar(fg) }}>
        <span>{value}%</span>
      </span>
    );
  }

  function CampaignRow({ row }) {
    const RowIcon = row.type === "candidate" ? UserIcon : BriefcaseIcon;
    return (
      <div
        className="ex-tr ex-tr--campaign"
        data-tk-border="border.subtle"
        style={{ borderTopColor: "var(--border-subtle)" }}>
        <div className="ex-td ex-td--name">
          <span
            className="ex-row-icon"
            data-tk-fg="fg.muted"
            style={{ color: "var(--fg-muted)" }}>
            <RowIcon size={18} />
          </span>
          <div className="ex-row-name">
            <span className="ex-row-name-title" data-tk-fg="fg" style={{ color: "var(--fg)" }}>
              {row.name}
            </span>
            <span
              className="ex-row-name-sub"
              data-tk-fg="fg.muted"
              style={{ color: "var(--fg-muted)" }}>
              <span>{row.dateCreated}</span>
            </span>
          </div>
        </div>
        <div className="ex-td ex-td--centered">
          <span
            className="ex-mini-avatar"
            data-tk-bg="fg"
            data-tk-fg="bg"
            style={{ background: "var(--fg)", color: "var(--bg)" }}>
            JS
          </span>
        </div>
        <div className="ex-td ex-td--centered">
          <span
            className="ex-td-toggle"
            data-tk-bg="talin.solid"
            style={{ background: "var(--talin-solid)" }}>
            <span
              className="ex-td-toggle-knob"
              data-tk-bg="bg.panel"
              style={{ background: "var(--bg-panel)" }}
            />
          </span>
        </div>
        <div className="ex-td ex-td--centered">
          <span
            className="ex-td-select"
            data-tk-bg="bg.emphasized"
            data-tk-border="border"
            data-tk-fg="fg"
            style={{
              background: "var(--bg-emphasized)",
              borderColor: "var(--border)",
              color: "var(--fg)",
            }}>
            <span>20</span>
            <span data-tk-fg="fg.muted" style={{ color: "var(--fg-muted)", display: "inline-flex" }}>
              <CaretDownBoldIcon size={10} />
            </span>
          </span>
        </div>
        <div className="ex-td ex-td--centered">
          <span
            className="ex-td-badge"
            data-tk-bg="gray.emphasized"
            data-tk-fg="gray.fg"
            style={{ background: "var(--gray-emphasized)", color: "var(--gray-fg)" }}>
            {row.actions}
          </span>
        </div>
        <div className="ex-td ex-td--centered ex-td--num">
          <span data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {row.contacts}
          </span>
          <ContactsProgressRing
            completed={row.completed}
            inProgress={row.inProgress}
            skipped={row.skipped}
            total={row.total}
            size={32}
          />
        </div>
        <div className="ex-td ex-td--right ex-td--num">
          <span data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {row.replies}
          </span>
          <PercentPill value={row.repliesPct} variant="replies" />
        </div>
        <div className="ex-td ex-td--right ex-td--num">
          <span data-tk-fg="fg" style={{ color: "var(--fg)" }}>
            {row.positive}
          </span>
          <PercentPill value={row.positivePct} variant="positive" />
        </div>
      </div>
    );
  }

  // Sortable column header. The label sits inline with two icon slots so
  // the header stays the same height as the non-sortable .ex-th cells:
  //   [label] [optional key-icon] [direction-icon]
  // - Inactive columns show CaretUpDownIcon (the "click to sort" hint).
  // - Active columns show CaretUp/CaretDownIcon depending on direction.
  // - Columns with two sort keys (Replies / Positive replies) also render
  //   a HashIcon (count) or PercentIcon (rate) when active.
  function SortableHeader({ label, active, dir, sortKey, alignRight, onClick }) {
    const dirIcon = !active
      ? <CaretUpDownIcon size={12} />
      : dir === "asc"
        ? <CaretUpIcon size={12} />
        : <CaretDownBoldIcon size={12} />;
    const keyIcon = active && (sortKey === "count" || sortKey === "rate")
      ? (sortKey === "count" ? <HashIcon size={11} /> : <PercentIcon size={11} />)
      : null;
    const className =
      "ex-th ex-th--sortable" +
      (alignRight ? " ex-th--right" : "") +
      (active ? " ex-th--sorted" : "");
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        data-tk-fg={active ? "fg" : "fg.muted"}
        style={{ color: active ? "var(--fg)" : "var(--fg-muted)" }}>
        <span className="ex-th-label">{label}</span>
        <span className="ex-th-sort-cluster">
          {keyIcon && (
            <span
              className="ex-th-sort-icon ex-th-sort-icon--key"
              data-tk-fg="fg.muted"
              style={{ color: "var(--fg-muted)" }}>
              {keyIcon}
            </span>
          )}
          <span
            className="ex-th-sort-icon ex-th-sort-icon--dir"
            data-tk-fg="fg.subtle"
            style={{ color: "var(--fg-subtle)" }}>
            {dirIcon}
          </span>
        </span>
      </button>
    );
  }

  function CampaignsTable({ rows }) {
    // Default: sorted by date created, newest first.
    const DEFAULT_SORT = { column: "campaign", key: "date", dir: "desc" };
    const [sort, setSort] = useState(DEFAULT_SORT);

    // Click cycle (each column ends back at DEFAULT_SORT):
    //   Campaign: desc (default) → asc → DEFAULT.
    //   Replies / Positive: count-desc → count-asc → rate-desc → rate-asc → DEFAULT.
    //   Switching column starts at that column's first state (desc).
    const cycleSort = (column) =>
      setSort((prev) => {
        if (prev.column !== column) {
          return {
            column,
            key: column === "campaign" ? "date" : "count",
            dir: "desc",
          };
        }
        if (column === "campaign") {
          return prev.dir === "desc"
            ? { column, key: "date", dir: "asc" }
            : DEFAULT_SORT;
        }
        if (prev.key === "count" && prev.dir === "desc") return { column, key: "count", dir: "asc"  };
        if (prev.key === "count" && prev.dir === "asc")  return { column, key: "rate",  dir: "desc" };
        if (prev.key === "rate"  && prev.dir === "desc") return { column, key: "rate",  dir: "asc"  };
        return DEFAULT_SORT;
      });

    const FIELDS = {
      replies:  { count: "replies",  rate: "repliesPct"  },
      positive: { count: "positive", rate: "positivePct" },
    };
    const getValue = (r) =>
      sort.column === "campaign"
        ? new Date(r.dateCreated).getTime()
        : r[FIELDS[sort.column][sort.key]];
    const mult = sort.dir === "asc" ? 1 : -1;
    const sortedRows = [...rows].sort((a, b) => mult * (getValue(a) - getValue(b)));

    return (
      <div
        className="ex-table ex-table--campaigns"
        data-tk-bg="bg.panel"
        data-tk-border="border"
        style={{ background: "var(--bg-panel)", borderColor: "var(--border)" }}>
        <div
          className="ex-thead"
          data-tk-bg="bg.muted"
          data-tk-border="border"
          data-tk-fg="fg.muted"
          style={{
            background: "var(--bg-muted)",
            borderBottomColor: "var(--border)",
            color: "var(--fg-muted)",
          }}>
          <SortableHeader
            label="Campaign"
            active={sort.column === "campaign"}
            dir={sort.dir}
            onClick={() => cycleSort("campaign")}
          />
          <div className="ex-th ex-th--centered">Owner</div>
          <div className="ex-th ex-th--centered">Status</div>
          <div className="ex-th ex-th--centered">Sending limit</div>
          <div className="ex-th ex-th--centered">Actions</div>
          <div className="ex-th ex-th--centered">Contacts</div>
          <SortableHeader
            label="Replies"
            alignRight
            active={sort.column === "replies"}
            dir={sort.dir}
            sortKey={sort.key}
            onClick={() => cycleSort("replies")}
          />
          <SortableHeader
            label="Positive replies"
            alignRight
            active={sort.column === "positive"}
            dir={sort.dir}
            sortKey={sort.key}
            onClick={() => cycleSort("positive")}
          />
        </div>
        {sortedRows.map((r) => <CampaignRow key={r.id} row={r} />)}
      </div>
    );
  }

  // ── ExampleCampaigns view ──────────────────────────────────────────────
  function ExampleCampaigns() {
    return (
      <ShellWithSidebar active="campaigns">
        <main className="ex-main ex-main--campaigns" data-tk-bg="bg.subtle">
          <h1
            className="ex-h1 ex-h1--inline"
            data-tk-fg="fg"
            style={{ color: "var(--fg)" }}>
            Campaigns
          </h1>

          <section className="ex-campaigns-section">
            <h2
              className="ex-h2--lg"
              data-tk-fg="fg"
              style={{ color: "var(--fg)" }}>
              Campaign stats
            </h2>
            <div
              className="ex-stat-card-row"
              data-tk-bg="bg.panel"
              data-tk-border="border"
              style={{
                background: "var(--bg-panel)",
                borderColor: "var(--border)",
              }}>
              <div
                className="ex-stat-kpi"
                data-tk-bg="bg.subtle"
                style={{ background: "var(--bg-subtle)" }}>
                <MessagesSentDonut
                  segments={MOCK_STATS.messages.segments}
                  total={MOCK_STATS.messages.total}
                  change={MOCK_STATS.messages.change}
                />
              </div>
              <div
                className="ex-stat-kpi"
                data-tk-bg="bg.subtle"
                style={{ background: "var(--bg-subtle)" }}>
                <ContactsRepliesFunnel
                  contactsValue={MOCK_STATS.contacts.value}
                  repliesValue={MOCK_STATS.replies.value}
                  contactsChange={MOCK_STATS.contacts.change}
                  repliesChange={MOCK_STATS.replies.change}
                />
              </div>
              <div
                className="ex-stat-kpi"
                data-tk-bg="bg.subtle"
                style={{ background: "var(--bg-subtle)" }}>
                <ReplyRateBars
                  current={MOCK_STATS.replyRate.current}
                  previous={MOCK_STATS.replyRate.previous}
                  change={MOCK_STATS.replyRate.change}
                  prevHeight={MOCK_STATS.replyRate.prevHeight}
                  currHeight={MOCK_STATS.replyRate.currHeight}
                />
              </div>
            </div>
          </section>

          <section className="ex-campaigns-section">
            <h2
              className="ex-h2--lg"
              data-tk-fg="fg"
              style={{ color: "var(--fg)" }}>
              Your Campaigns
            </h2>
            <div className="ex-filter-row">
              <SearchFilter />
              <FiltersDropdown />
              <FilterPill label="Owner" value="You" />
              <FilterPill label="Date range" value="Last 30 days" />
              <span className="ex-filter-spacer" />
              <NewCampaignButton />
            </div>
            <CampaignsTable rows={MOCK_CAMPAIGNS} />
          </section>
        </main>
      </ShellWithSidebar>
    );
  }

  // ── Stubs for the other examples (built later) ─────────────────────────
  function StubScreen({ title }) {
    return (
      <div
        className="ex-frame"
        data-tk-bg="bg.panel"
        data-tk-border="border"
        style={{
          background: "var(--bg-panel)",
          borderColor: "var(--border)",
          gridTemplateColumns: "1fr",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}>
        <div style={{ color: "var(--fg-muted)", fontSize: 14, textAlign: "center" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--fg)",
              marginBottom: 6,
            }}>
            {title} — coming soon
          </div>
          <div>This example will be built out in a follow-up session.</div>
        </div>
      </div>
    );
  }
  function ExampleCreateStub() {
    return <StubScreen title="Create campaign" />;
  }

  // ── Register globals ───────────────────────────────────────────────────
  window.ExampleHome = ExampleHome;
  window.ExampleCampaigns = ExampleCampaigns;
  window.ExampleCreate = ExampleCreateStub;
  window.TokenPill = TokenPill;
})();
