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
    lines.light.push(
      `  --shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);`,
      `  --swatch-ring: rgba(0, 0, 0, 0.08);`
    );
    lines.dark.push(
      `  --shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);`,
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
  // Maps a normalized color key → { token, base }. First-set wins, so
  // iteration order encodes priority: non-DEFAULT semantic roles before
  // DEFAULT (so #FFFFFF prefers `bg.panel` over plain `bg`), then
  // scale-semantic, then palette steps, then alpha tokens. Cheap to
  // rebuild — the whole token tree is ~150 entries — but we cache by
  // (mode, talin.500) so repeated lookups during a hover are free.
  let tokenIndexCache = null;
  function buildTokenIndex(mode) {
    const talinKey = window.PALETTE && window.PALETTE.talin ? window.PALETTE.talin[500] : null;
    if (tokenIndexCache && tokenIndexCache.mode === mode && tokenIndexCache.talin === talinKey) {
      return tokenIndexCache.map;
    }
    const map = new Map();
    const set = (key, value) => {
      if (key && !map.has(key)) map.set(key, value);
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
          set(normalizeColor(window.resolveRef(ref)), {
            token: `${group}.${role}`,
            base: baseFromRef(ref),
          });
        }
      }
      for (const [group, roles] of Object.entries(window.SEMANTIC)) {
        const refs = roles.DEFAULT;
        if (!refs) continue;
        const ref = refs[mode];
        set(normalizeColor(window.resolveRef(ref)), {
          token: group,
          base: baseFromRef(ref),
        });
      }
    }
    if (window.SCALE_SEMANTIC) {
      for (const [hue, roles] of Object.entries(window.SCALE_SEMANTIC)) {
        for (const [role, refs] of Object.entries(roles)) {
          const ref = refs[mode];
          set(normalizeColor(window.resolveRef(ref)), {
            token: `${hue}.${role}`,
            base: baseFromRef(ref),
          });
        }
      }
    }
    if (window.PALETTE) {
      for (const [hue, node] of Object.entries(window.PALETTE)) {
        if (typeof node === "string") {
          set(normalizeColor(node), { token: hue, base: hue });
          continue;
        }
        if (hue === "blackAlpha" || hue === "whiteAlpha" || hue === "chart") continue;
        for (const [step, hex] of Object.entries(node)) {
          set(normalizeColor(hex), { token: `${hue}.${step}`, base: `${hue}.${step}` });
        }
      }
      for (const hue of ["blackAlpha", "whiteAlpha"]) {
        const node = window.PALETTE[hue];
        if (!node) continue;
        for (const [step, rgba] of Object.entries(node)) {
          set(normalizeColor(rgba), { token: `${hue}.${step}`, base: `${hue}.${step}` });
        }
      }
    }

    tokenIndexCache = { mode, talin: talinKey, map };
    return map;
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
          declaredToken: cur.getAttribute("data-tk-bg"),
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
    const attrs = Array.from(el.attributes).filter((a) => a.name.indexOf("data-tk-") === 0);
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
      const matched = tokenIndex.get(effective.key);
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
    const [state, setState] = useState({ visible: false, x: 0, y: 0, label: "", rows: [] });
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
        const pillW = 320;
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

        setState({ visible: true, x, y, label, rows });
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
      <div className="tk-pill" style={{ left: state.x, top: state.y, width: 320 }}>
        <div className="tk-pill-label">{state.label}</div>
        <div className="tk-pill-rows">
          {state.rows.map((r, i) => {
            const isAlpha = r.hex && r.hex.toLowerCase().startsWith("rgba");
            return (
              <div
                className={`tk-pill-row${r.source === "ancestor" ? " tk-pill-row--inherited" : ""}`}
                key={i}
                style={{ gridTemplateColumns: "44px 1fr auto" }}>
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

  const BookIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M208 32v160H72a24 24 0 0 0-24 24V56a24 24 0 0 1 24-24Z" opacity=".2" />
      <path d="M208 24H72a32 32 0 0 0-32 32v168a8 8 0 0 0 8 8h144a8 8 0 0 0 0-16H56a16 16 0 0 1 16-16h136a8 8 0 0 0 8-8V32a8 8 0 0 0-8-8m-8 160H72a31.8 31.8 0 0 0-16 4.29V56a16 16 0 0 1 16-16h128Z" />
    </PhosphorIcon>
  );

  const ChatCircleTextIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2" />
      <path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.9 7.9 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216m40-104a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8" />
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

  const CaretRightIcon = (p) => (
    <PhosphorIcon {...p}>
      <path d="m176 128l-80 80V48Z" opacity=".2" />
      <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
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

  // ── Custom branded illustration icons (user-provided, fixed colors) ────
  // Campaign options — Recruit Candidates / Find Prospects.
  function RecruitCandidatesIcon({ size = 40 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#rc_ddii)" transform="translate(0 3)">
          <rect x="6.125" y="3.32498" width="28" height="28" rx="7" fill="url(#rc_grad)" shapeRendering="crispEdges" />
          <rect x="6.125" y="3.32498" width="28" height="28" rx="7" stroke="#7B914E" strokeOpacity="0.8" strokeWidth="1.05" shapeRendering="crispEdges" />
          <path d="M22.5755 13.1499C22.5755 10.8948 20.7473 9.06659 18.4921 9.06659C16.237 9.06659 14.4088 10.8948 14.4088 13.1499C14.4088 15.4051 16.237 17.2333 18.4921 17.2333C20.7473 17.2333 22.5755 15.4051 22.5755 13.1499Z" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27.4755 24.5833L26.2505 23.3583M26.6588 21.3166C26.6588 19.9635 25.5619 18.8666 24.2088 18.8666C22.8557 18.8666 21.7588 19.9635 21.7588 21.3166C21.7588 22.6697 22.8557 23.7666 24.2088 23.7666C25.5619 23.7666 26.6588 22.6697 26.6588 21.3166Z" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.775 22.9502C12.775 19.7929 15.3344 17.2335 18.4917 17.2335C19.3684 17.2335 20.1991 17.4309 20.9417 17.7836" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="rc_ddii" x="0" y="0" width="40.25" height="40.25" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.8" />
            <feGaussianBlur stdDeviation="2.8" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.376471 0 0 0 0 0.498039 0 0 0 0 0.141176 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.4" />
            <feGaussianBlur stdDeviation="1.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.378381 0 0 0 0 0.496807 0 0 0 0 0.141528 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1.4" operator="erode" in="SourceAlpha" result="effect3_innerShadow" />
            <feOffset />
            <feGaussianBlur stdDeviation="0.7" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect3_innerShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.4" />
            <feGaussianBlur stdDeviation="0.7" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
          </filter>
          <radialGradient id="rc_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20.125 1.22498) rotate(90) scale(23.8 38.5795)">
            <stop stopColor="#DEF0C5" />
            <stop offset="1" stopColor="#A7CA56" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  function FindProspectsIcon({ size = 40 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#fp_ddii)" transform="translate(0 3)">
          <rect x="6.125" y="3.32498" width="28" height="28" rx="7" fill="url(#fp_grad)" shapeRendering="crispEdges" />
          <rect x="6.125" y="3.32498" width="28" height="28" rx="7" stroke="#7B914E" strokeOpacity="0.8" strokeWidth="1.05" shapeRendering="crispEdges" />
          <path d="M17.2663 12.3334C17.2663 11.1864 17.2663 10.6129 17.5416 10.2009C17.6608 10.0226 17.8139 9.86947 17.9922 9.7503C18.4042 9.47504 18.9777 9.47504 20.1247 9.47504C21.2717 9.47504 21.8451 9.47504 22.2571 9.7503C22.4354 9.86947 22.5885 10.0226 22.7077 10.2009C22.983 10.6129 22.983 11.1864 22.983 12.3334" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28.2922 18.4585V18.0502C28.2922 15.3553 28.2922 14.0079 27.4551 13.1707C26.6178 12.3335 25.2704 12.3335 22.5756 12.3335H17.6756C14.9807 12.3335 13.6333 12.3335 12.7961 13.1707C11.9589 14.0079 11.9589 15.3553 11.9589 18.0502V18.4585C11.9589 21.1533 11.9589 22.5008 12.7961 23.338C13.6333 24.1752 14.9807 24.1752 17.6756 24.1752H22.5756C25.2704 24.1752 26.6178 24.1752 27.4551 23.338C28.2922 22.5008 28.2922 21.1533 28.2922 18.4585Z" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.3501 18.4583C26.3101 18.0576 28.0876 15.1916 28.0876 15.1916M12.1626 15.1916C12.1626 15.1916 13.9401 18.0576 18.9001 18.4583" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.9001 18.4585V17.6418C18.9001 17.4163 19.083 17.2335 19.3084 17.2335H20.9418C21.1673 17.2335 21.3501 17.4163 21.3501 17.6418V18.4585C21.3501 19.135 20.8016 19.6835 20.1251 19.6835C19.4486 19.6835 18.9001 19.135 18.9001 18.4585Z" stroke="#2E4A00" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="fp_ddii" x="0" y="0" width="40.25" height="40.25" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.8" />
            <feGaussianBlur stdDeviation="2.8" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.376471 0 0 0 0 0.498039 0 0 0 0 0.141176 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.4" />
            <feGaussianBlur stdDeviation="1.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.378381 0 0 0 0 0.496807 0 0 0 0 0.141528 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1.4" operator="erode" in="SourceAlpha" result="effect3_innerShadow" />
            <feOffset />
            <feGaussianBlur stdDeviation="0.7" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0" />
            <feBlend mode="normal" in2="shape" result="effect3_innerShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.4" />
            <feGaussianBlur stdDeviation="0.7" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow" />
          </filter>
          <radialGradient id="fp_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20.125 1.22498) rotate(90) scale(23.8 38.5795)">
            <stop stopColor="#DEF0C5" />
            <stop offset="1" stopColor="#A7CA56" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  // Learn link icons (smaller — 35x35 viewBox).
  function TalinDocumentationIcon({ size = 32 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g filter="url(#td_ddii)">
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#td_grad)" shapeRendering="crispEdges" />
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#7B914E" strokeOpacity="0.8" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M12.8055 8.35001C14.4458 8.34772 16.029 8.9414 17.25 10.0167V20.35C16.029 19.2747 14.4458 18.6811 12.8055 18.6833C11.7642 18.6833 11.2435 18.6833 11.0135 18.5361C10.8754 18.4477 10.819 18.3913 10.7306 18.2531C10.5833 18.0231 10.5833 17.6127 10.5833 16.7919V10.6188C10.5833 9.66696 10.5833 9.19103 10.9491 8.80525C11.315 8.41946 11.6895 8.39955 12.4385 8.35974C12.56 8.35328 12.6824 8.35001 12.8055 8.35001Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.6945 8.35001C20.0541 8.34772 18.471 8.9414 17.25 10.0167V20.35C18.471 19.2747 20.0541 18.6811 21.6945 18.6833C22.7358 18.6833 23.2565 18.6833 23.4865 18.5361C23.6246 18.4477 23.681 18.3913 23.7694 18.2531C23.9167 18.0231 23.9167 17.6127 23.9167 16.7919V10.6188C23.9167 9.66696 23.9167 9.19103 23.5509 8.80525C23.185 8.41946 22.8105 8.39955 22.0615 8.35974C21.94 8.35328 21.8176 8.35001 21.6945 8.35001Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M21.9167 11.2338C21.8429 11.2314 21.7688 11.2302 21.6945 11.2302C21.3199 11.2297 20.9483 11.2603 20.5833 11.3205M21.9167 13.6878C21.8429 13.6855 21.7688 13.6843 21.6945 13.6843C20.8507 13.6831 20.022 13.8396 19.25 14.1383M21.9167 16.0174C21.8429 16.015 21.7688 16.0138 21.6945 16.0138C20.8507 16.0126 20.022 16.1692 19.25 16.4678" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5833 11.2338C12.6571 11.2314 12.7312 11.2302 12.8055 11.2302C13.1801 11.2297 13.5517 11.2603 13.9166 11.3205M12.5833 13.6878C12.6571 13.6855 12.7312 13.6843 12.8055 13.6843C13.6493 13.6831 14.478 13.8396 15.25 14.1383M12.5833 16.0174C12.6571 16.015 12.7312 16.0138 12.8055 16.0138C13.6493 16.0126 14.478 16.1692 15.25 16.4678" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="td_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.376471 0 0 0 0 0.498039 0 0 0 0 0.141176 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.378381 0 0 0 0 0.496807 0 0 0 0 0.141528 0 0 0 0.16 0" />
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
            <stop stopColor="#DEF0C5" />
            <stop offset="1" stopColor="#A7CA56" />
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
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#7B914E" strokeOpacity="0.8" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M17.25 20.0167C22.0052 20.0167 23.9166 17.3304 23.9166 14.0167C23.9166 10.703 22.6718 8.01666 17.25 8.01666C12.0052 8.01666 10.5833 10.703 10.5833 14.0167C10.5833 15.3975 10.8302 16.6694 11.4977 17.6833C12.3385 19.0167 11.9117 20.2389 11.25 20.6833C12.327 20.6833 13.0514 20.3405 13.5116 20.0011C13.8383 19.76 14.2546 19.6409 14.6489 19.7377C15.3879 19.9189 16.2494 20.0167 17.25 20.0167Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.3332 14.0167H17.2499M20 14.0167H19.9167M14.6667 14.0167H14.5834M17.4166 14.0167C17.4166 14.1087 17.342 14.1833 17.2499 14.1833C17.1579 14.1833 17.0832 14.1087 17.0832 14.0167C17.0832 13.9246 17.1579 13.85 17.2499 13.85C17.342 13.85 17.4166 13.9246 17.4166 14.0167ZM20.0834 14.0167C20.0834 14.1087 20.0088 14.1833 19.9167 14.1833C19.8246 14.1833 19.75 14.1087 19.75 14.0167C19.75 13.9246 19.8246 13.85 19.9167 13.85C20.0088 13.85 20.0834 13.9246 20.0834 14.0167ZM14.75 14.0167C14.75 14.1087 14.6754 14.1833 14.5834 14.1833C14.4913 14.1833 14.4167 14.1087 14.4167 14.0167C14.4167 13.9246 14.4913 13.85 14.5834 13.85C14.6754 13.85 14.75 13.9246 14.75 14.0167Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="aq_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.376471 0 0 0 0 0.498039 0 0 0 0 0.141176 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.378381 0 0 0 0 0.496807 0 0 0 0 0.141528 0 0 0 0.16 0" />
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
            <stop stopColor="#DEF0C5" />
            <stop offset="1" stopColor="#A7CA56" />
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
          <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#7B914E" strokeOpacity="0.8" strokeWidth="0.9" shapeRendering="crispEdges" />
          <path d="M19.9166 7.68335V10.35M14.5833 7.68335V10.35" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17.9167 9.01666H16.5833C14.0692 9.01666 12.8121 9.01666 12.031 9.79771C11.25 10.5788 11.25 11.8358 11.25 14.35V15.6833C11.25 18.1975 11.25 19.4546 12.031 20.2356C12.8121 21.0167 14.0692 21.0167 16.5833 21.0167H17.9167C20.4308 21.0167 21.6879 21.0167 22.4689 20.2356C23.25 19.4546 23.25 18.1975 23.25 15.6833V14.35C23.25 11.8358 23.25 10.5788 22.4689 9.79771C21.6879 9.01666 20.4308 9.01666 17.9167 9.01666Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.25 13.0167H23.25" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19.5833 16.6833V18.0167M20.5833 17.35C20.5833 17.9023 20.1356 18.35 19.5833 18.35C19.031 18.35 18.5833 17.9023 18.5833 17.35C18.5833 16.7977 19.031 16.35 19.5833 16.35C20.1356 16.35 20.5833 16.7977 20.5833 17.35Z" stroke="#2E4A00" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <filter id="sd_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="2.4" />
            <feGaussianBlur stdDeviation="2.4" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.376471 0 0 0 0 0.498039 0 0 0 0 0.141176 0 0 0 0.16 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dy="1.2" />
            <feGaussianBlur stdDeviation="1.2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.378381 0 0 0 0 0.496807 0 0 0 0 0.141528 0 0 0 0.16 0" />
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
            <stop stopColor="#DEF0C5" />
            <stop offset="1" stopColor="#A7CA56" />
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
  function SideItem({ icon: IconComp, label, active }) {
    return (
      <div
        className={`ex-side-item ${active ? "ex-side-item--active" : ""}`}
        data-label={label}
        data-tk-fg={active ? "fg" : "fg.muted"}
        {...(active ? { "data-tk-bg": "blackAlpha.100" } : {})}
        style={{ color: active ? "var(--fg)" : "var(--fg-muted)" }}>
        <span
          data-tk-fg="fg.muted"
          style={{ display: "inline-flex", color: "var(--fg-muted)" }}>
          <IconComp size={20} />
        </span>
        <span>{label}</span>
      </div>
    );
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
            {done ? (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--talin-accent)",
                  color: "white",
                }}>
                <CheckIcon size={10} strokeWidth={2.5} />
              </span>
            ) : null}
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
            gap: 12,
          }}>
          <span style={{ display: "inline-flex", flexShrink: 0 }}>
            <IconComp size={40} />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
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
        style={{ color: "var(--fg)", textDecoration: "none", gap: 12 }}
        onClick={(e) => e.preventDefault()}>
        <span style={{ display: "inline-flex", flexShrink: 0 }}>
          <IconComp size={32} />
        </span>
        <span>{label}</span>
      </a>
    );
  }

  // ── ExampleHome ────────────────────────────────────────────────────────
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

  function ExampleHome() {
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
        style={{
          "--sidebar-w": sidebarCollapsed ? "64px" : "255px",
        }}>
        {/* SIDEBAR */}
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
            <SideItem icon={HouseLineIcon} label="Home" active />
            <SideItem icon={PaperPlaneTiltIcon} label="Campaigns" />
            <SideItem icon={EnvelopeIcon} label="Inbox" />
            <SideItem icon={GearIcon} label="Settings" />
          </nav>

          <div className="ex-side-foot">
            <SideItem icon={BookIcon} label="Knowledge Hub" />
            <SideItem icon={ChatCircleTextIcon} label="Ask a question" />
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

        {/* MAIN */}
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
                <div
                  className="ex-section-row"
                  style={{ marginBottom: 12, gap: 10 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2
                className="ex-h2"
                data-tk-fg="fg"
                style={{ color: "var(--fg)", fontSize: 20, fontWeight: 600 }}>
                Learn how Talin works
              </h2>
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
                <LinkRow icon={TalinDocumentationIcon} label="Talin documentation" />
                <LinkRow icon={AskAQuestionIcon} label="Ask a question" />
                <LinkRow icon={ScheduleADemoIcon} label="Schedule a demo with us" />
              </div>
            </div>
          </div>
        </main>
      </div>
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
  function ExampleCampaignsStub() {
    return <StubScreen title="Campaigns" />;
  }
  function ExampleCreateStub() {
    return <StubScreen title="Create campaign" />;
  }

  // ── Register globals ───────────────────────────────────────────────────
  window.ExampleHome = ExampleHome;
  window.ExampleCampaigns = ExampleCampaignsStub;
  window.ExampleCreate = ExampleCreateStub;
  window.TokenPill = TokenPill;
})();
