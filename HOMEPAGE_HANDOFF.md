# Talin Homepage — Recreation Handoff

You are recreating a single product homepage as plain static HTML + CSS in a fresh project. The original lives in another codebase and uses a semantic token system (`--bg-panel`, `--fg-muted`, etc.). For this rebuild we deliberately strip the semantic layer — every color is a literal hex pulled directly from the base palette.

## Goal

Build **one self-contained file**, `home.html`, with all CSS inline in a `<style>` block. No React, no build step, no token resolver. Light mode is the only required target (dark mode swap-table is in Appendix B if you want it).

## What it looks like

```
┌───────────┬────────────────────────────────────────────────────┐
│           │  Good afternoon, Ivan                              │
│ [logo]  ⇤ │                                                    │
│           │  Setup guide        1/3◷       Learn how Talin…   │
│ 🔎 Search │  ┌────────────────────────┐    ┌──────────────────┐│
│           │  │ ▢ Install Chrome…   ✓ ⌄│    │   ▶   (16:10)    ││
│ ⌂ Home    │  │ ▢ Connect LinkedIn   ⌄│    │  End-to-end…  9m ││
│ ✈ Campaign│  │ ▢ Connect mailbox    ⌄│    └──────────────────┘│
│ ✉ Inbox   │  └────────────────────────┘    📄 Talin docs       │
│ ⚙ Settings│                                ❓ Ask a question    │
│           │  Create your first campaign    📅 Schedule a demo   │
│ 📖 Knowl…│  ┌──────────┐  ┌──────────┐                        │
│ 💬 Ask…   │  │ 👥 Recru.│  │ 🔎 Find…│                        │
│           │  │ • SPM    │  │ • VPC   │                        │
│ 👤 John   │  │ • SE     │  │ • HOS   │                        │
│  m@x.com >│  │ • CM     │  │ • COO   │                        │
│           │  │ on peak…│  │ for pe…│                         │
│           │  └──────────┘  └──────────┘                        │
└───────────┴────────────────────────────────────────────────────┘
```

Two-column shell: 255px sidebar on the left, flexible main on the right. The main area uses a `minmax(0, 1fr) / 320px` grid with a left column (flex, two stacked sections) and a right "aside" column (video card + link list).

## Base palette (only the steps the home page touches)

Use these as literal hex values. If you want them as CSS vars, name them after the palette path — never give them semantic names like `--fg`.

| Var name              | Hex                     | Used for                                                |
|-----------------------|-------------------------|---------------------------------------------------------|
| `--white`             | `#FFFFFF`               | card / panel / search box backgrounds                   |
| `--gray-50`           | `#FDFDFC`               | main content background                                 |
| `--gray-100`          | `#F8F7F4`               | sidebar background, campaign option outer card          |
| `--gray-300`          | `#D6D3D1`               | progress arc track                                      |
| `--gray-400`          | `#ACA8A4`               | tertiary text (footer caption)                          |
| `--gray-600`          | `#65625C`               | secondary text (subs, captions, muted icons)            |
| `--gray-950`          | `#131210`               | primary text, avatar background                         |
| `--black-alpha-50`    | `rgba(0, 0, 0, 0.04)`   | sidebar item hover                                      |
| `--black-alpha-100`   | `rgba(0, 0, 0, 0.06)`   | sidebar item active background                          |
| `--black-alpha-200`   | `rgba(0, 0, 0, 0.08)`   | borders (all 1px hairlines)                             |
| `--talin-accent`      | `#2A9C5E`               | progress arc fill, "done" check badge background        |

Fixed shadow (used by campaign option head + items):

```css
box-shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);
```

Video play button:

```css
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
```

## Typography

```css
font-family: Inter, ui-sans-serif, system-ui, sans-serif;
```

| Element                              | Size  | Weight | Notes                          |
|--------------------------------------|-------|--------|--------------------------------|
| Greeting H1 ("Good afternoon, Ivan") | 24px  | 700    | letter-spacing: -0.01em        |
| Section H2 ("Setup guide", etc.)     | 20px  | 600    | line-height: 28px in heading row |
| Setup row title                      | 13px  | 600    |                                |
| Setup row sub                        | 12px  | 400    | line-height: 1.45              |
| Campaign option title                | 16px  | 600    |                                |
| Campaign option item title           | 12px  | 600    |                                |
| Campaign option item sub             | 11px  | 400    |                                |
| Campaign option footer               | 11px  | 400    | brand name inside footer is 600|
| Video meta title                     | 12px  | 600    |                                |
| Video meta duration                  | 12px  | 400    |                                |
| Link list row                        | 14px  | 500    |                                |
| Sidebar nav item                     | 13px  | 500    |                                |
| Sidebar search                       | 12px  | 500    |                                |
| Sidebar user name                    | 12px  | 500    |                                |
| Sidebar user email                   | 11px  | 400    |                                |
| Progress "1/3" label                 | 12px  | 600    |                                |

Page base font-size: 13px on `.frame`, all the above are explicit overrides.

## CSS — root + reset

```css
:root {
  --white:             #FFFFFF;
  --gray-50:           #FDFDFC;
  --gray-100:          #F8F7F4;
  --gray-300:          #D6D3D1;
  --gray-400:          #ACA8A4;
  --gray-600:          #65625C;
  --gray-950:          #131210;
  --black-alpha-50:    rgba(0, 0, 0, 0.04);
  --black-alpha-100:   rgba(0, 0, 0, 0.06);
  --black-alpha-200:   rgba(0, 0, 0, 0.08);
  --talin-accent:      #2A9C5E;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--gray-50); color: var(--gray-950); }
body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 13px; }
```

## Frame + sidebar

```html
<div class="frame">
  <aside class="sidebar">
    <div class="brand-row">
      <!-- Talin wordmark SVG (Appendix A.1) -->
      <button class="sidebar-toggle" aria-label="Collapse sidebar">
        <!-- SidebarSimpleIcon (A.10) -->
      </button>
    </div>

    <div class="side-search">
      <span class="side-search-icon"><!-- MagnifyingGlassIcon (A.9) --></span>
      <span>Search</span>
    </div>

    <nav class="side-nav">
      <a class="side-item side-item--active" href="#">
        <span class="side-item-icon"><!-- HouseLineIcon (A.2) --></span>
        <span>Home</span>
      </a>
      <a class="side-item" href="#">
        <span class="side-item-icon"><!-- PaperPlaneTiltIcon (A.3) --></span>
        <span>Campaigns</span>
      </a>
      <div class="side-item">
        <span class="side-item-icon"><!-- EnvelopeIcon (A.4) --></span>
        <span>Inbox</span>
      </div>
      <div class="side-item">
        <span class="side-item-icon"><!-- GearIcon (A.5) --></span>
        <span>Settings</span>
      </div>
    </nav>

    <div class="side-foot">
      <div class="side-item">
        <span class="side-item-icon"><!-- BookIcon (A.6) --></span>
        <span>Knowledge Hub</span>
      </div>
      <div class="side-item">
        <span class="side-item-icon"><!-- ChatCircleTextIcon (A.7) --></span>
        <span>Ask a question</span>
      </div>
      <div class="side-user">
        <div class="side-avatar">JS</div>
        <div class="side-user-text">
          <div class="side-user-name">John Smith</div>
          <div class="side-user-mail">m@example.com</div>
        </div>
        <span class="side-user-caret"><!-- CaretRightIcon (A.8) --></span>
      </div>
    </div>
  </aside>

  <main class="main">
    <!-- ... main content ... -->
  </main>
</div>
```

```css
.frame {
  display: grid;
  grid-template-columns: 255px 1fr;
  min-height: 100vh;
}
.sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px 12px;
  gap: 14px;
  background: var(--gray-100);
  border-right: 1px solid var(--black-alpha-200);
  font-weight: 500;
}
.brand-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 4px 6px;
}
.sidebar-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: 0; background: transparent; color: var(--gray-600);
  border-radius: 6px; cursor: pointer; padding: 0;
}
.sidebar-toggle:hover { background: rgba(0, 0, 0, 0.04); }

.side-search {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; border-radius: 8px;
  background: var(--white);
  border: 1px solid var(--black-alpha-200);
  color: var(--gray-400);
  font-size: 12px;
}
.side-search-icon { display: inline-flex; color: var(--gray-600); }

.side-nav { display: flex; flex-direction: column; gap: 2px; }
.side-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px; border-radius: 8px; font-size: 13px;
  color: var(--gray-600);
  cursor: pointer; text-decoration: none;
}
.side-item:hover { background: var(--black-alpha-50); }
.side-item--active,
.side-item--active:hover {
  background: var(--black-alpha-100);
  color: var(--gray-950);
}
.side-item-icon { display: inline-flex; color: var(--gray-600); }

.side-foot {
  margin-top: auto;
  display: flex; flex-direction: column; gap: 2px;
}
.side-user {
  display: flex; align-items: center; gap: 10px;
  margin-top: 8px; padding-top: 12px;
  border-top: 1px solid var(--black-alpha-200);
}
.side-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700;
  flex-shrink: 0;
  background: var(--gray-950);
  color: var(--white);
}
.side-user-text { flex: 1; min-width: 0; }
.side-user-name { font-size: 12px; color: var(--gray-950); }
.side-user-mail {
  font-size: 11px; color: var(--gray-400);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.side-user-caret { color: var(--gray-600); display: inline-flex; }
```

The sidebar nav icons (House, PaperPlane, Envelope, Gear, Book, ChatCircleText, MagnifyingGlass) are all rendered at 20px. The CaretRightIcon in `.side-user` is 16px. All use `currentColor`, so they pick up the parent text color.

## Main column shell

```html
<main class="main">
  <h1 class="h1">Good afternoon, Ivan</h1>

  <div class="home-grid">
    <div class="home-col-left">
      <!-- Setup guide section -->
      <!-- Create your first campaign section -->
    </div>
    <aside class="home-aside">
      <!-- Learn how Talin works video card -->
      <!-- Link list -->
    </aside>
  </div>
</main>
```

```css
.main {
  padding: 24px 28px 32px;
  display: flex; flex-direction: column;
  gap: 16px;
  background: var(--gray-50);
  min-width: 0;
}
.h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; color: var(--gray-950); }

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
}
.home-col-left {
  display: flex; flex-direction: column;
  gap: 28px;
}
.home-aside {
  display: flex; flex-direction: column;
  gap: 0;
}

.section-heading-row {
  display: flex; align-items: center; gap: 10px;
  min-height: 28px; margin-bottom: 12px;
}
.h2 {
  margin: 0; font-size: 20px; font-weight: 600;
  color: var(--gray-950); line-height: 28px;
}
```

## Section 1 — Setup guide

```html
<section>
  <div class="section-heading-row" style="justify-content: space-between;">
    <h2 class="h2">Setup guide</h2>
    <span class="progress-pill">
      <!-- ProgressArc 1/3 (A.12) -->
      <span>1/3</span>
    </span>
  </div>

  <div class="card">
    <div class="setup-row">
      <span class="setup-icon"><!-- chrome.svg (A.16) inline at 20×20 --></span>
      <div class="setup-text">
        <div class="setup-title">
          <span>Install Chrome Extensiton</span>
          <span class="setup-check"><!-- CheckIcon (A.14) at 10px stroke 2.5 --></span>
        </div>
        <div class="setup-sub">Install Chrome extension to power your LinkedIn searches and import contacts into talin.</div>
      </div>
      <span class="setup-caret"><!-- CaretDownIcon (A.15) at 16px --></span>
    </div>

    <div class="setup-row">
      <span class="setup-icon"><!-- linkedin.svg (A.17) at 20×20 --></span>
      <div class="setup-text">
        <div class="setup-title"><span>Connect LinkedIn Account</span></div>
        <div class="setup-sub">Connect your LinkedIn account to import contacts into Talin and send outreach with LinkedIn connections and messages</div>
      </div>
      <span class="setup-caret"><!-- CaretDownIcon (A.15) --></span>
    </div>

    <div class="setup-row" style="border-bottom: 0;">
      <span class="setup-icon">
        <!-- Stacked microsoft+gmail icon (see A.18 + A.19; absolute positioned inside a 22×22 span) -->
        <span class="mailbox-stack">
          <img src="microsoft.svg" style="position:absolute; left:1px; top:3px; width:11px; height:11px;">
          <img src="gmail.svg"     style="position:absolute; left:8px; top:10px; width:12px; height:9px;">
        </span>
      </span>
      <div class="setup-text">
        <div class="setup-title"><span>Connect a mailbox</span></div>
        <div class="setup-sub">Connect your email to send personalized outreach and track replies</div>
      </div>
      <span class="setup-caret"><!-- CaretDownIcon (A.15) --></span>
    </div>
  </div>
</section>
```

```css
.progress-pill {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--gray-600); font-size: 12px; font-weight: 600;
}

.card {
  background: var(--white);
  border: 1px solid var(--black-alpha-200);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.setup-row {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center; gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--black-alpha-200);
  cursor: pointer;
}
.setup-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.mailbox-stack {
  position: relative; display: inline-block; width: 22px; height: 22px;
}
.setup-title {
  font-weight: 600; font-size: 13px; color: var(--gray-950);
  display: inline-flex; align-items: center; gap: 8px;
}
.setup-sub {
  font-size: 12px; line-height: 1.45;
  color: var(--gray-600); margin-top: 2px;
}
.setup-check {
  display: inline-flex; align-items: center; justify-content: center;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--talin-accent); color: var(--white);
}
.setup-caret { color: var(--gray-600); display: inline-flex; }
```

## Section 2 — Create your first campaign

```html
<section>
  <h2 class="h2" style="margin-bottom: 12px;">Create your first campaign</h2>
  <div class="pair">
    <!-- Recruit candidates option -->
    <div class="opt-card">
      <div class="opt-head">
        <span class="opt-head-icon"><!-- RecruitCandidatesIcon (A.20) at 32px --></span>
        <span class="opt-head-title">Recruit candidates</span>
        <span class="opt-head-arrow"><!-- ArrowRightIcon (A.13) at 16px --></span>
      </div>
      <div class="opt-list">
        <div class="opt-item">
          <div class="opt-item-title">Solar Project Managers</div>
          <div class="opt-item-sub">5+ yrs · Utility scale projects · Oakland, CA</div>
        </div>
        <div class="opt-item">
          <div class="opt-item-title">Sales Engineers</div>
          <div class="opt-item-sub">3+ yrs · EPC companies · Santa Cruz, CA</div>
        </div>
        <div class="opt-item">
          <div class="opt-item-title">Construction Managers</div>
          <div class="opt-item-sub">7+ yrs · Utility scale solar projects · Phoenix, AZ</div>
        </div>
      </div>
      <div class="opt-foot">Found on <span class="opt-foot-strong">peakdemandinc.com</span></div>
    </div>

    <!-- Find prospects option -->
    <div class="opt-card">
      <div class="opt-head">
        <span class="opt-head-icon"><!-- FindProspectsIcon (A.21) at 32px --></span>
        <span class="opt-head-title">Find prospects</span>
        <span class="opt-head-arrow"><!-- ArrowRightIcon (A.13) at 16px --></span>
      </div>
      <div class="opt-list">
        <div class="opt-item">
          <div class="opt-item-title">VPs of Construction</div>
          <div class="opt-item-sub">Utility-scale solar developers · Oakland, CA</div>
        </div>
        <div class="opt-item">
          <div class="opt-item-title">Heads of Sales</div>
          <div class="opt-item-sub">Solar module &amp; inverter manufacturers · Santa Cruz, CA</div>
        </div>
        <div class="opt-item">
          <div class="opt-item-title">COOs / VPs of Field Operations</div>
          <div class="opt-item-sub">Renewable IPPs</div>
        </div>
      </div>
      <div class="opt-foot">Suggested for <span class="opt-foot-strong">peakdemandinc.com</span></div>
    </div>
  </div>
</section>
```

```css
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.opt-card {
  background: var(--gray-100);
  border: 1px solid var(--black-alpha-200);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
  cursor: pointer;
}
.opt-head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px;
  background: var(--white);
  color: var(--gray-950);
  border: 1px solid var(--black-alpha-200);
  border-radius: 12px;
  font-size: 16px; font-weight: 600;
  box-shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);
}
.opt-head-icon { display: inline-flex; flex-shrink: 0; transform: translateY(2px); }
.opt-head-title { flex: 1; }
.opt-head-arrow { margin-left: auto; display: inline-flex; color: var(--gray-600); }

.opt-list {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px;
}
.opt-item {
  padding: 10px;
  background: var(--white);
  border: 1px solid var(--black-alpha-200);
  border-radius: 8px;
  box-shadow: 0 1px 0 rgba(20, 22, 26, 0.04), 0 1px 2px rgba(20, 22, 26, 0.04);
}
.opt-item-title { font-weight: 600; font-size: 12px; color: var(--gray-950); }
.opt-item-sub { font-size: 11px; color: var(--gray-600); margin-top: 2px; }

.opt-foot {
  font-size: 11px; padding: 4px 12px 12px;
  color: var(--gray-400);
}
.opt-foot-strong { color: var(--gray-950); font-weight: 600; }
```

## Section 3 — Right aside (video + links)

```html
<aside class="home-aside">
  <div class="section-heading-row">
    <h2 class="h2">Learn how Talin works</h2>
  </div>

  <div class="card video-card">
    <div class="video-thumb">
      <span class="video-play"><!-- PlayIcon (A.11) at 14px --></span>
    </div>
    <div class="video-meta">
      <span class="video-meta-title">End-to-end workflow setup</span>
      <span class="video-meta-time">9 min</span>
    </div>
  </div>

  <div class="link-list">
    <a class="link-row" href="#">
      <span class="link-row-icon"><!-- TalinDocumentationIcon (A.22) at 32px --></span>
      <span>Talin documentation</span>
    </a>
    <a class="link-row" href="#">
      <span class="link-row-icon"><!-- AskAQuestionIcon (A.23) at 32px --></span>
      <span>Ask a question</span>
    </a>
    <a class="link-row" href="#">
      <span class="link-row-icon"><!-- ScheduleADemoIcon (A.24) at 32px --></span>
      <span>Schedule a demo with us</span>
    </a>
  </div>
</aside>
```

```css
.video-card {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.video-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  background: var(--gray-50);
  color: var(--gray-600);
  display: flex; align-items: center; justify-content: center;
}
.video-play {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--white); color: var(--gray-950);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}
.video-meta {
  display: flex; justify-content: space-between;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--gray-600);
}
.video-meta-title { color: var(--gray-950); font-weight: 600; }

.link-list {
  display: flex; flex-direction: column;
}
.link-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 0;
  font-size: 14px; font-weight: 500;
  color: var(--gray-950);
  text-decoration: none;
  cursor: pointer;
}
.link-row + .link-row { border-top: 1px solid var(--black-alpha-200); }
.link-row-icon { display: inline-flex; flex-shrink: 0; transform: translateY(2px); }
```

## Responsive

```css
@media (max-width: 1100px) {
  .home-grid { grid-template-columns: 1fr; }
  .home-aside {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      "title title"
      "links video";
    align-items: start;
  }
  .home-aside > .section-heading-row { grid-area: title; }
  .home-aside > .video-card { grid-area: video; margin-bottom: 0; }
  .home-aside > .link-list { grid-area: links; }
}

@media (max-width: 700px) {
  .home-aside { display: flex; flex-direction: column; }
}
```

---

# Appendix A — Icon SVGs

All icons are inline SVG. Default size noted in parentheses. Phosphor duotone icons (A.2–A.10) use `currentColor` and a low-opacity duotone layer — they theme automatically via the parent's `color`. Custom branded icons (A.20–A.24) carry their own fixed brand colors.

## A.1 — Talin wordmark (used in `.brand-row`)

```html
<svg width="73" height="20" viewBox="0 0 73 20" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Talin">
  <path d="M31.1606 2.25922V19.6296H27.8421V2.25922H31.1606ZM22.2939 3.73699V0.677736H36.7088V3.73699H22.2939Z" fill="#111111"/>
  <path d="M38.5236 19.9666C37.1755 19.9666 36.1039 19.6037 35.3088 18.8777C34.531 18.1345 34.1422 17.1666 34.1422 15.974C34.1422 14.7987 34.5483 13.8654 35.3607 13.174C36.1903 12.4654 37.3656 12.0506 38.8866 11.9296L42.7236 11.6185V11.3333C42.7236 10.7456 42.6113 10.279 42.3866 9.93329C42.1792 9.57033 41.8767 9.31107 41.4792 9.15551C41.0817 8.98267 40.615 8.89625 40.0792 8.89625C39.1459 8.89625 38.4286 9.08638 37.9273 9.46662C37.4261 9.82959 37.1755 10.3481 37.1755 11.0222H34.4792C34.4792 10.0888 34.7125 9.28514 35.1792 8.61107C35.6631 7.91971 36.3372 7.38391 37.2014 7.00366C38.0829 6.62341 39.094 6.43329 40.2347 6.43329C41.3928 6.43329 42.3866 6.6407 43.2162 7.05551C44.0459 7.45304 44.6854 8.05798 45.1347 8.87033C45.5841 9.66539 45.8088 10.6592 45.8088 11.8518V19.6296H43.0347L42.8014 17.737C42.5249 18.3938 41.9891 18.9296 41.194 19.3444C40.4162 19.7592 39.5261 19.9666 38.5236 19.9666ZM39.5347 17.5814C40.5199 17.5814 41.2977 17.3049 41.8681 16.7518C42.4557 16.1987 42.7496 15.4296 42.7496 14.4444V13.7703L40.0792 13.9777C39.094 14.0642 38.394 14.2716 37.9792 14.6C37.5644 14.9111 37.357 15.3259 37.357 15.8444C37.357 16.4148 37.5471 16.8469 37.9273 17.1407C38.3076 17.4345 38.8434 17.5814 39.5347 17.5814Z" fill="#111111"/>
  <path d="M50.8272 19.6296H47.6902V0.340698H50.8272V19.6296Z" fill="#111111"/>
  <path d="M53.0525 19.6296V6.82218H56.2155V19.6296H53.0525ZM54.6081 4.25551C54.0723 4.25551 53.6142 4.07403 53.234 3.71107C52.871 3.33082 52.6895 2.8728 52.6895 2.33699C52.6895 1.80119 52.871 1.35181 53.234 0.988846C53.6142 0.625883 54.0723 0.444402 54.6081 0.444402C55.1439 0.444402 55.5933 0.625883 55.9562 0.988846C56.3365 1.35181 56.5266 1.80119 56.5266 2.33699C56.5266 2.8728 56.3365 3.33082 55.9562 3.71107C55.5933 4.07403 55.1439 4.25551 54.6081 4.25551Z" fill="#111111"/>
  <path d="M61.5537 19.6296H58.3908V6.82218H61.3204L61.5797 8.48144C61.9772 7.84193 62.5389 7.3407 63.2648 6.97774C64.008 6.61477 64.8117 6.43329 65.6759 6.43329C67.2834 6.43329 68.4932 6.9086 69.3056 7.85922C70.1352 8.80983 70.55 10.1061 70.55 11.7481V19.6296H67.3871V12.5C67.3871 11.4284 67.1451 10.6333 66.6611 10.1148C66.1772 9.57897 65.5204 9.31107 64.6908 9.31107C63.7056 9.31107 62.9364 9.62218 62.3834 10.2444C61.8303 10.8666 61.5537 11.6963 61.5537 12.7333V19.6296Z" fill="#111111"/>
  <path d="M9.51521 19.6921C9.43164 19.6922 9.34812 19.6882 9.26496 19.68C9.18178 19.6717 9.09905 19.6594 9.01708 19.643C8.93512 19.6266 8.85402 19.6062 8.77408 19.5818C8.69419 19.5573 8.61555 19.5289 8.53844 19.4968C8.46131 19.4645 8.38583 19.4285 8.31228 19.3888C8.16513 19.3093 8.02624 19.2155 7.89765 19.1086C7.83338 19.0551 7.77178 18.9986 7.71306 18.9391L0.771657 12.0018C0.742199 11.9723 0.713404 11.9421 0.685291 11.9112C0.573185 11.7873 0.473398 11.6529 0.387341 11.5097C0.365864 11.4739 0.345302 11.4376 0.325674 11.4007C0.305929 11.3639 0.287125 11.3266 0.269279 11.2889C0.251468 11.2512 0.234572 11.2131 0.218603 11.1746C0.202597 11.136 0.187575 11.0971 0.173551 11.0577C0.159456 11.0184 0.146352 10.9788 0.13425 10.9388C0.122164 10.8989 0.11101 10.8587 0.100797 10.8182C0.0907098 10.7777 0.0815479 10.737 0.0733182 10.696C0.0489547 10.5732 0.0336088 10.4487 0.0274035 10.3236C0.0234176 10.2402 0.0234176 10.1567 0.0274035 10.0733C0.0295123 10.0316 0.0325158 9.98995 0.0366376 9.94854C0.0448631 9.86546 0.0571043 9.78282 0.0733182 9.70092C0.0815405 9.66 0.0907 9.61927 0.100797 9.57873C0.111021 9.53828 0.122162 9.49809 0.134218 9.45815C0.14636 9.41819 0.15946 9.37853 0.173519 9.33919C0.187581 9.29993 0.202613 9.26102 0.218603 9.2225C0.234546 9.18394 0.251443 9.14578 0.269279 9.10805C0.28716 9.07031 0.305974 9.03302 0.325706 8.99622C0.345334 8.95938 0.365896 8.92305 0.387373 8.88726C0.408851 8.85149 0.431192 8.81623 0.454376 8.78154C0.50074 8.71213 0.550518 8.64506 0.603526 8.58059C0.629983 8.54829 0.657333 8.51669 0.685291 8.48585C0.71337 8.45494 0.742166 8.42468 0.771657 8.39511L7.71143 1.4555C7.77269 1.40053 7.83645 1.34842 7.9025 1.29932C7.96853 1.25023 8.03675 1.20417 8.10696 1.16128C8.24756 1.0756 8.39566 1.00287 8.54943 0.944012C8.62623 0.914557 8.70437 0.88869 8.78357 0.866497C8.86281 0.844131 8.94294 0.825535 9.02395 0.810709C9.10485 0.795732 9.18641 0.784484 9.26835 0.777C9.35024 0.76939 9.43245 0.765595 9.5147 0.765625C9.59707 0.765625 9.67924 0.769417 9.7612 0.777C9.84319 0.784477 9.92466 0.795702 10.0056 0.810677C10.0865 0.825547 10.1667 0.844174 10.2459 0.866497C10.3251 0.888677 10.4033 0.914533 10.4801 0.94398C10.6338 1.00286 10.7819 1.07559 10.9225 1.16128C10.9927 1.20417 11.061 1.25023 11.127 1.29932C11.193 1.34844 11.2568 1.40055 11.3181 1.45546L18.2578 8.39517C18.2873 8.4247 18.3162 8.45492 18.3443 8.48579C18.3723 8.51672 18.3996 8.54829 18.4262 8.58049C18.5057 8.67728 18.578 8.77978 18.6425 8.88717C18.6641 8.92293 18.6847 8.95926 18.7043 8.99612C18.7437 9.06973 18.7795 9.14525 18.8115 9.22241C18.8275 9.26098 18.8425 9.29989 18.8566 9.33913C18.8706 9.37845 18.8837 9.41809 18.8959 9.45805C18.9081 9.49797 18.9192 9.53821 18.9293 9.57876C18.9395 9.61922 18.9487 9.65992 18.9569 9.70082C18.9893 9.86474 19.0057 10.0314 19.0059 10.1985C19.0059 10.2402 19.0049 10.2819 19.0028 10.3236C19.0008 10.3653 18.9977 10.407 18.9935 10.4485C18.9853 10.5316 18.9731 10.6142 18.9568 10.6962C18.9486 10.7371 18.9394 10.7778 18.9294 10.8183C18.9192 10.8588 18.908 10.899 18.8959 10.9389C18.8837 10.9789 18.8706 11.0185 18.8566 11.0579C18.8144 11.1758 18.7635 11.2905 18.7042 11.4008C18.6846 11.4377 18.664 11.474 18.6424 11.5098C18.621 11.5456 18.5986 11.5808 18.5754 11.6155C18.5522 11.6502 18.5281 11.6843 18.5033 11.7179C18.4783 11.7513 18.4526 11.7842 18.4262 11.8165C18.3996 11.8487 18.3723 11.8803 18.3443 11.9112C18.3162 11.9421 18.2874 11.9724 18.2578 12.0018L11.3181 18.9391C11.2594 18.9985 11.1977 19.0551 11.1334 19.1085C11.069 19.1618 11.0021 19.212 10.9328 19.2588C10.6548 19.4465 10.3423 19.577 10.0133 19.6428C9.84934 19.6758 9.68248 19.6923 9.51521 19.6921Z" fill="#2A9C5E"/>
</svg>
```

## A.2–A.10 — Phosphor duotone sidebar icons (20×20)

All wrapped in this shell — replace `{PATHS}` with the per-icon paths below. The two paths render in `currentColor`; the first has `opacity=".2"` to create the duotone effect.

```html
<svg width="20" height="20" viewBox="0 0 256 256" aria-hidden="true">
  <g fill="currentColor">{PATHS}</g>
</svg>
```

**A.2 — HouseLineIcon (Home)**

```html
<path d="M216 116.69V216h-64v-64h-48v64H40v-99.31l82.34-82.35a8 8 0 0 1 11.32 0Z" opacity=".2"/>
<path d="M240 208h-16v-72l2.34 2.34A8 8 0 0 0 237.66 127l-98.35-98.32a16 16 0 0 0-22.62 0L18.34 127a8 8 0 0 0 11.32 11.31L32 136v72H16a8 8 0 0 0 0 16h224a8 8 0 0 0 0-16M48 120l80-80l80 80v88h-48v-56a8 8 0 0 0-8-8h-48a8 8 0 0 0-8 8v56H48Zm96 88h-32v-48h32Z"/>
```

**A.3 — PaperPlaneTiltIcon (Campaigns)**

```html
<path d="m223.69 42.18l-58.22 192a8 8 0 0 1-14.92 1.25L108 148l-87.42-42.55a8 8 0 0 1 1.25-14.92l192-58.22a8 8 0 0 1 9.86 9.87" opacity=".2"/>
<path d="M227.32 28.68a16 16 0 0 0-15.66-4.08h-.15L19.57 82.84a16 16 0 0 0-2.49 29.8L102 154l41.3 84.87a15.86 15.86 0 0 0 14.44 9.13q.69 0 1.38-.06a15.88 15.88 0 0 0 14-11.51l58.2-191.94v-.15a16 16 0 0 0-4-15.66m-69.49 203.17l-.05.14v-.07l-40.06-82.3l48-48a8 8 0 0 0-11.31-11.31l-48 48l-82.33-40.06h-.07h.14L216 40Z"/>
```

**A.4 — EnvelopeIcon (Inbox)**

```html
<path d="m224 56l-96 88l-96-88Z" opacity=".2"/>
<path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8m-96 85.15L52.57 64h150.86ZM98.71 128L40 181.81V74.19Zm11.84 10.85l12 11.05a8 8 0 0 0 10.82 0l12-11.05l58 53.15H52.57ZM157.29 128L216 74.18v107.64Z"/>
```

**A.5 — GearIcon (Settings)**

```html
<path d="m207.86 123.18l16.78-21a99 99 0 0 0-10.07-24.29l-26.7-3a81 81 0 0 0-6.81-6.81l-3-26.71a99.4 99.4 0 0 0-24.3-10l-21 16.77a82 82 0 0 0-9.64 0l-21-16.78a99 99 0 0 0-24.21 10.07l-3 26.7a81 81 0 0 0-6.81 6.81l-26.71 3a99.4 99.4 0 0 0-10 24.3l16.77 21a82 82 0 0 0 0 9.64l-16.78 21a99 99 0 0 0 10.07 24.29l26.7 3a81 81 0 0 0 6.81 6.81l3 26.71a99.4 99.4 0 0 0 24.3 10l21-16.77a82 82 0 0 0 9.64 0l21 16.78a99 99 0 0 0 24.29-10.07l3-26.7a81 81 0 0 0 6.81-6.81l26.71-3a99.4 99.4 0 0 0 10-24.3l-16.77-21a82 82 0 0 0-.08-9.64M128 168a40 40 0 1 1 40-40a40 40 0 0 1-40 40" opacity=".2"/>
<path d="M128 80a48 48 0 1 0 48 48a48.05 48.05 0 0 0-48-48m0 80a32 32 0 1 1 32-32a32 32 0 0 1-32 32m88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06a107.6 107.6 0 0 0-10.88-26.25a8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6a107.3 107.3 0 0 0-26.25-10.86a8 8 0 0 0-7.06 1.48L130.16 40h-4.32L107.2 25.11a8 8 0 0 0-7.06-1.48a107.6 107.6 0 0 0-26.25 10.88a8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94a107.7 107.7 0 0 0-10.87 26.25a8 8 0 0 0 1.49 7.06L40 125.84v4.32L25.11 148.8a8 8 0 0 0-1.48 7.06a107.6 107.6 0 0 0 10.88 26.25a8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6a107.7 107.7 0 0 0 26.25 10.87a8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48a107.2 107.2 0 0 0 26.25-10.88a8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3l23.78-2.8a8 8 0 0 0 6-3.94a107.7 107.7 0 0 0 10.87-26.25a8 8 0 0 0-1.49-7.06Zm-16.1-6.5a74 74 0 0 1 0 8.68a8 8 0 0 0 1.74 5.48l14.19 17.73a91.6 91.6 0 0 1-6.23 15l-22.6 2.56a8 8 0 0 0-5.1 2.64a74 74 0 0 1-6.14 6.14a8 8 0 0 0-2.64 5.1l-2.51 22.58a91.3 91.3 0 0 1-15 6.23l-17.74-14.19a8 8 0 0 0-5-1.75h-.48a74 74 0 0 1-8.68 0a8.06 8.06 0 0 0-5.48 1.74l-17.78 14.2a91.6 91.6 0 0 1-15-6.23L82.89 187a8 8 0 0 0-2.64-5.1a74 74 0 0 1-6.14-6.14a8 8 0 0 0-5.1-2.64l-22.58-2.52a91.3 91.3 0 0 1-6.23-15l14.19-17.74a8 8 0 0 0 1.74-5.48a74 74 0 0 1 0-8.68a8 8 0 0 0-1.74-5.48L40.2 100.45a91.6 91.6 0 0 1 6.23-15L69 82.89a8 8 0 0 0 5.1-2.64a74 74 0 0 1 6.14-6.14A8 8 0 0 0 82.89 69l2.51-22.57a91.3 91.3 0 0 1 15-6.23l17.74 14.19a8 8 0 0 0 5.48 1.74a74 74 0 0 1 8.68 0a8.06 8.06 0 0 0 5.48-1.74l17.77-14.19a91.6 91.6 0 0 1 15 6.23L173.11 69a8 8 0 0 0 2.64 5.1a74 74 0 0 1 6.14 6.14a8 8 0 0 0 5.1 2.64l22.58 2.51a91.3 91.3 0 0 1 6.23 15l-14.19 17.74a8 8 0 0 0-1.74 5.53Z"/>
```

**A.6 — BookIcon (Knowledge Hub)**

```html
<path d="M208 32v160H72a24 24 0 0 0-24 24V56a24 24 0 0 1 24-24Z" opacity=".2"/>
<path d="M208 24H72a32 32 0 0 0-32 32v168a8 8 0 0 0 8 8h144a8 8 0 0 0 0-16H56a16 16 0 0 1 16-16h136a8 8 0 0 0 8-8V32a8 8 0 0 0-8-8m-8 160H72a31.8 31.8 0 0 0-16 4.29V56a16 16 0 0 1 16-16h128Z"/>
```

**A.7 — ChatCircleTextIcon (Ask a question)**

```html
<path d="M224 128a96 96 0 0 1-144.07 83.11l-37.39 12.47a8 8 0 0 1-10.12-10.12l12.47-37.39A96 96 0 1 1 224 128" opacity=".2"/>
<path d="M128 24a104 104 0 0 0-91.82 152.88l-11.35 34.05a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24m0 192a87.87 87.87 0 0 1-44.06-11.81a8 8 0 0 0-4-1.08a7.9 7.9 0 0 0-2.53.42L40 216l12.47-37.4a8 8 0 0 0-.66-6.54A88 88 0 1 1 128 216m40-104a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8m0 32a8 8 0 0 1-8 8H96a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8"/>
```

**A.8 — CaretRightIcon (sidebar user row, 16×16)**

Single solid path, no duotone layer:

```html
<svg width="16" height="16" viewBox="0 0 256 256" aria-hidden="true" fill="currentColor">
  <path d="M184.49 136.49l-80 80a12 12 0 0 1-17-17L159 128L87.51 56.49a12 12 0 0 1 17-17l80 80a12 12 0 0 1 0 17Z"/>
</svg>
```

**A.9 — MagnifyingGlassIcon (sidebar search, 16×16)**

```html
<path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2"/>
<path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72"/>
```

**A.10 — SidebarSimpleIcon (sidebar toggle, 20×20)**

```html
<path d="M88 48v160H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8Z" opacity=".2"/>
<path d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16M40 56h40v144H40Zm176 144H96V56h120z"/>
```

## A.11 — PlayIcon (video card, 14×14, filled triangle)

```html
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
  <polygon points="6 4 20 12 6 20"/>
</svg>
```

## A.12 — ProgressArc (1/3 progress, 20×20)

Two concentric circles — full ring as a "track", second circle dashed to show the filled arc. `value` here is `1/3`, the dash math gives `~16.755` filled out of `~50.265` total circumference. Rotated −90° so the arc starts at 12 o'clock.

```html
<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
  <circle cx="10" cy="10" r="8" stroke="#D6D3D1" stroke-width="2.4" fill="none"/>
  <circle cx="10" cy="10" r="8"
          stroke="#2A9C5E" stroke-width="2.4" fill="none"
          stroke-linecap="round"
          stroke-dasharray="16.755 33.51"
          transform="rotate(-90 10 10)"/>
</svg>
```

(`#D6D3D1` is the gray-300 track; `#2A9C5E` is the talin-accent fill.)

## A.13 — ArrowRightIcon (campaign option head, 16×16)

```html
<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
  <path d="M224.49,136.49l-72,72a12,12,0,0,1-17-17L191,140H40a12,12,0,0,1,0-24H191L135.51,64.49a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z"/>
</svg>
```

## A.14 — CheckIcon (setup done badge, 10×10, stroke 2.5)

```html
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="5 12 10 17 19 8"/>
</svg>
```

## A.15 — CaretDownIcon (setup row chevron, 16×16, filled triangle)

```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
  <polygon points="6 9 12 15 18 9"/>
</svg>
```

## A.16 — Chrome logo (setup row, 20×20)

```html
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#chrome_clip)">
    <path d="M9.99984 15.5641C13.0729 15.5641 15.564 13.0729 15.564 9.99984C15.564 6.9268 13.0729 4.43555 9.99984 4.43555C6.9268 4.43555 4.43555 6.9268 4.43555 9.99984C4.43555 13.0729 6.92672 15.5641 9.99977 15.5641" fill="#FFFFFF"/>
    <path d="M2.80378 7.26578C2.38868 6.54677 1.90076 5.79216 1.34003 5.00195C0.462196 6.52206 2.98185e-05 8.24649 1.44285e-09 10.0019C-2.98156e-05 11.7572 0.462078 13.4817 1.33986 15.0018C2.21765 16.522 3.48017 17.7842 5.0005 18.6617C6.52082 19.5391 8.24537 20.0009 10.0007 20.0005C10.9211 18.7096 11.546 17.7789 11.8754 17.2083C12.5081 16.1123 13.3264 14.5433 14.3303 12.5012V12.5C13.8918 13.2604 13.2607 13.8919 12.5006 14.3311C11.7405 14.7702 10.8782 15.0015 10.0004 15.0016C9.12255 15.0017 8.26017 14.7707 7.49994 14.3318C6.73972 13.8929 6.10846 13.2616 5.66964 12.5013C4.30621 9.95851 3.35092 8.21328 2.80378 7.26578Z" fill="#2A9C5E"/>
    <path d="M9.99963 19.9995C11.3129 19.9997 12.6133 19.7412 13.8266 19.2387C15.0399 18.7363 16.1424 17.9997 17.0709 17.071C17.9995 16.1424 18.7361 15.0399 19.2385 13.8266C19.7409 12.6132 19.9993 11.3128 19.999 9.99956C19.9986 8.24417 19.5362 6.51981 18.6581 4.99979C16.7638 4.81307 15.3657 4.71971 14.4639 4.71971C13.4414 4.71971 11.9531 4.81307 9.99892 4.99979L9.99783 5.00057C10.8757 5.00014 11.7382 5.23086 12.4985 5.66954C13.2589 6.10822 13.8904 6.73939 14.3294 7.49956C14.7684 8.25973 14.9996 9.12211 14.9996 9.99996C14.9996 10.8778 14.7684 11.7402 14.3293 12.5003L9.99963 19.9995Z" fill="#FBC116"/>
    <path d="M10.0003 13.9592C12.1865 13.9592 13.9588 12.1869 13.9588 10.0006C13.9588 7.81427 12.1865 6.04201 10.0002 6.04201C7.81401 6.04201 6.04167 7.81435 6.04167 10.0006C6.04167 12.1868 7.81401 13.9592 10.0003 13.9592Z" fill="#1A73E8"/>
    <path d="M10.0011 5.00034H18.6603C17.7828 3.47999 16.5206 2.21746 15.0004 1.3397C13.4802 0.461934 11.7558 -0.000118753 10.0004 2.28936e-08C8.24499 0.000118798 6.52058 0.462405 5.00053 1.34037C3.48049 2.21834 2.21839 3.48104 1.34115 5.00151L5.67076 12.5007L5.67193 12.5014C5.23267 11.7413 5.00128 10.879 5.00102 10.0012C5.00076 9.12335 5.23165 8.26092 5.67046 7.50062C6.10926 6.74033 6.74053 6.10898 7.50076 5.67006C8.26099 5.23114 9.12339 5.00013 10.0012 5.00026L10.0011 5.00034Z" fill="#E33B2E"/>
  </g>
  <defs><clipPath id="chrome_clip"><rect width="20" height="20" fill="#FFFFFF"/></clipPath></defs>
</svg>
```

## A.17 — LinkedIn logo (setup row, 20×20)

```html
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#li_clip)">
    <path d="M17.0409 17.0412H14.0775V12.4003C14.0775 11.2937 14.0577 9.86905 12.5363 9.86905C10.9928 9.86905 10.7566 11.0748 10.7566 12.3198V17.0409H7.79336V7.49741H10.6381V8.80163H10.678C10.9627 8.31486 11.3741 7.91441 11.8684 7.64293C12.3626 7.37145 12.9213 7.23911 13.4848 7.25999C16.4884 7.25999 17.0421 9.23562 17.0421 11.8058L17.0409 17.0412ZM4.44961 6.19296C3.49984 6.19312 2.72976 5.42327 2.72961 4.47351C2.72945 3.52374 3.49922 2.75366 4.44898 2.75351C5.39875 2.75327 6.16883 3.52312 6.16898 4.47288C6.16907 4.92898 5.98797 5.36643 5.66552 5.689C5.34308 6.01158 4.90571 6.19286 4.44961 6.19296ZM5.93133 17.0412H2.96484V7.49741H5.93125L5.93133 17.0412ZM18.5182 0.0013984H1.47578C0.670312 -0.0076641 0.00976507 0.63757 -7.86781e-05 1.44304V18.5566C0.00945257 19.3624 0.669921 20.0083 1.4757 19.9998H18.5182C19.3257 20.0098 19.9887 19.364 19.9999 18.5566V1.44171C19.9884 0.63468 19.3253 -0.0104766 18.5182 7.02711e-05" fill="#0A66C2"/>
  </g>
  <defs><clipPath id="li_clip"><rect width="20" height="20" fill="#FFFFFF"/></clipPath></defs>
</svg>
```

## A.18 — Microsoft logo (mailbox stack overlay, 11×11)

```html
<svg width="11" height="11" viewBox="0 0 11.002 11.002" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#ms_clip)">
    <path d="M5.22917 5.22879H0.000390625V1.2207e-05H5.22917V5.22879Z" fill="#F1511B"/>
    <path d="M11.002 5.22866H5.77324V-0.00012207H11.002V5.22866Z" fill="#2A9C5E"/>
    <path d="M5.22914 11.0012H0.000488281V5.77246H5.22914V11.0012Z" fill="#00ADEF"/>
    <path d="M11.0022 11.0012H5.77344V5.77246H11.0022V11.0012Z" fill="#FBBC09"/>
  </g>
  <defs><clipPath id="ms_clip"><rect width="11.002" height="11.002" fill="#FFFFFF"/></clipPath></defs>
</svg>
```

## A.19 — Gmail logo (mailbox stack overlay, 12×9 visible area, native viewBox 13.87×10.96)

```html
<svg width="12" height="9" viewBox="0 0 13.8725 10.9587" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g>
    <path d="M3.75286 9.85865V5.34877L2.35421 4.06921L1.1 3.35915V9.06278C1.1 9.50314 1.45679 9.85865 1.89588 9.85865H3.75286Z" fill="#4285F4"/>
    <path d="M10.1197 9.85865H11.9767C12.4171 9.85865 12.7725 9.50182 12.7725 9.06278V3.35919L11.352 4.17248L10.1197 5.34877V9.85865Z" fill="#2A9C5E"/>
    <path d="M3.75286 5.34877L3.56254 3.58662L3.75286 1.90008L6.93627 4.28766L10.1197 1.90008L10.3326 3.49557L10.1197 5.34877L6.93627 7.73635L3.75286 5.34877Z" fill="#EA4335"/>
    <path d="M10.1197 1.90008L10.1197 5.34877L12.7725 3.35919V2.298C12.7725 1.31381 11.6491 0.752753 10.8625 1.34299L10.1197 1.90008Z" fill="#FBBC04"/>
    <path d="M1.1 3.35915L3.75286 5.34877L3.75286 1.90008L3.01001 1.343C2.22211 0.752717 1.1 1.31382 1.1 2.29796V3.35915Z" fill="#C5221F"/>
    <path d="M10.5326 0.902756C11.6816 0.0408376 13.3227 0.860835 13.3227 2.29826V9.06291C13.3226 9.80494 12.7216 10.4085 11.977 10.4086H9.56973V6.44768L7.26602 8.17619L6.93594 8.42424L6.60586 8.17619L4.30313 6.44768V10.4086H1.8959C1.15367 10.4086 0.550268 9.80755 0.550195 9.06291V2.29826C0.550195 0.905517 2.08901 0.0925436 3.23086 0.826584L3.34023 0.902756L4.08242 1.46037L6.93594 3.60002L9.78945 1.46037L10.5326 0.902756Z" stroke="#FFFFFF" stroke-width="1.1"/>
  </g>
</svg>
```

## A.20 — RecruitCandidatesIcon (campaign option head, 32×32)

```html
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g filter="url(#rc_ddii)">
    <rect x="4.8126" y="2.61252" width="22" height="22" rx="5.5" fill="url(#rc_grad)" shape-rendering="crispEdges"/>
    <rect x="4.8126" y="2.61252" width="22" height="22" rx="5.5" stroke="#4E9153" stroke-opacity="0.4" stroke-width="0.825" shape-rendering="crispEdges"/>
    <path d="M17.738 10.3321C17.738 8.56017 16.3016 7.12375 14.5297 7.12375C12.7577 7.12375 11.3213 8.56017 11.3213 10.3321C11.3213 12.104 12.7577 13.5404 14.5297 13.5404C16.3016 13.5404 17.738 12.104 17.738 10.3321Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.588 19.3157L20.6255 18.3532M20.9463 16.749C20.9463 15.6858 20.0845 14.824 19.0213 14.824C17.9581 14.824 17.0963 15.6858 17.0963 16.749C17.0963 17.8122 17.9581 18.674 19.0213 18.674C20.0845 18.674 20.9463 17.8122 20.9463 16.749Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10.0376 18.0323C10.0376 15.5517 12.0486 13.5407 14.5293 13.5407C15.2182 13.5407 15.8708 13.6958 16.4543 13.9729" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <filter id="rc_ddii" x="0" y="0" width="31.6252" height="31.625" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2.2"/>
      <feGaussianBlur stdDeviation="2.2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.1"/>
      <feGaussianBlur stdDeviation="1.1"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feMorphology radius="1.1" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="0.55"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.1"/>
      <feGaussianBlur stdDeviation="0.55"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow"/>
    </filter>
    <radialGradient id="rc_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(15.8126 0.962517) rotate(90) scale(18.7 30.3124)">
      <stop stop-color="#E9FAEB"/>
      <stop offset="1" stop-color="#97D898"/>
    </radialGradient>
  </defs>
</svg>
```

## A.21 — FindProspectsIcon (campaign option head, 32×32)

Same drop-shadow filter and gradient shape as A.20 — only the inner paths and the filter id (`fp_ddii` / `fp_grad`) change.

```html
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g filter="url(#fp_ddii)">
    <rect x="4.8126" y="2.61252" width="22" height="22" rx="5.5" fill="url(#fp_grad)" shape-rendering="crispEdges"/>
    <rect x="4.8126" y="2.61252" width="22" height="22" rx="5.5" stroke="#4E9153" stroke-opacity="0.4" stroke-width="0.825" shape-rendering="crispEdges"/>
    <path d="M13.5665 9.6906C13.5665 8.7894 13.5665 8.3387 13.7828 8.015C13.8764 7.8749 13.9967 7.7546 14.1368 7.661C14.4605 7.4447 14.9111 7.4447 15.8124 7.4447C16.7136 7.4447 17.1641 7.4447 17.4878 7.661C17.6279 7.7546 17.7482 7.8749 17.8419 8.015C18.0582 8.3387 18.0582 8.7894 18.0582 9.6906" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22.2297 14.5031V14.1823C22.2297 12.065 22.2297 11.0063 21.5719 10.3485C20.914 9.6907 19.8553 9.6907 17.7381 9.6907H13.888C11.7706 9.6907 10.7119 9.6907 10.0541 10.3485C9.3963 11.0063 9.3963 12.065 9.3963 14.1823V14.5031C9.3963 16.6205 9.3963 17.6793 10.0541 18.337C10.7119 18.9949 11.7706 18.9949 13.888 18.9949H17.7381C19.8553 18.9949 20.914 18.9949 21.5719 18.337C22.2297 17.6793 22.2297 16.6205 22.2297 14.5031Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16.7752 14.503C20.6723 14.1882 22.0689 11.9363 22.0689 11.9363M9.5564 11.9363C9.5564 11.9363 10.953 14.1882 14.8502 14.503" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14.8502 14.5031V13.8614C14.8502 13.6842 14.9938 13.5406 15.1709 13.5406H16.4543C16.6314 13.5406 16.7752 13.6842 16.7752 13.8614V14.5031C16.7752 15.0347 16.3442 15.4657 15.8126 15.4657C15.281 15.4657 14.8502 15.0347 14.8502 14.5031Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <filter id="fp_ddii" x="0" y="0" width="31.6252" height="31.625" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2.2"/>
      <feGaussianBlur stdDeviation="2.2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.1"/>
      <feGaussianBlur stdDeviation="1.1"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feMorphology radius="1.1" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="0.55"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.1"/>
      <feGaussianBlur stdDeviation="0.55"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow"/>
    </filter>
    <radialGradient id="fp_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(15.8126 0.962517) rotate(90) scale(18.7 30.3124)">
      <stop stop-color="#E9FAEB"/>
      <stop offset="1" stop-color="#97D898"/>
    </radialGradient>
  </defs>
</svg>
```

## A.22 — TalinDocumentationIcon (link row, 32×32, native viewBox 35×35)

```html
<svg width="32" height="32" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g filter="url(#td_ddii)">
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#td_grad)" shape-rendering="crispEdges"/>
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" stroke-opacity="0.4" stroke-width="0.9" shape-rendering="crispEdges"/>
    <path d="M12.8055 8.35001C14.4458 8.34772 16.029 8.9414 17.25 10.0167V20.35C16.029 19.2747 14.4458 18.6811 12.8055 18.6833C11.7642 18.6833 11.2435 18.6833 11.0135 18.5361C10.8754 18.4477 10.819 18.3913 10.7306 18.2531C10.5833 18.0231 10.5833 17.6127 10.5833 16.7919V10.6188C10.5833 9.66696 10.5833 9.19103 10.9491 8.80525C11.315 8.41946 11.6895 8.39955 12.4385 8.35974C12.56 8.35328 12.6824 8.35001 12.8055 8.35001Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.6945 8.35001C20.0541 8.34772 18.471 8.9414 17.25 10.0167V20.35C18.471 19.2747 20.0541 18.6811 21.6945 18.6833C22.7358 18.6833 23.2565 18.6833 23.4865 18.5361C23.6246 18.4477 23.681 18.3913 23.7694 18.2531C23.9167 18.0231 23.9167 17.6127 23.9167 16.7919V10.6188C23.9167 9.66696 23.9167 9.19103 23.5509 8.80525C23.185 8.41946 22.8105 8.39955 22.0615 8.35974C21.94 8.35328 21.8176 8.35001 21.6945 8.35001Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M21.9167 11.2338C21.8429 11.2314 21.7688 11.2302 21.6945 11.2302C21.3199 11.2297 20.9483 11.2603 20.5833 11.3205M21.9167 13.6878C21.8429 13.6855 21.7688 13.6843 21.6945 13.6843C20.8507 13.6831 20.022 13.8396 19.25 14.1383M21.9167 16.0174C21.8429 16.015 21.7688 16.0138 21.6945 16.0138C20.8507 16.0126 20.022 16.1692 19.25 16.4678" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12.5833 11.2338C12.6571 11.2314 12.7312 11.2302 12.8055 11.2302C13.1801 11.2297 13.5517 11.2603 13.9166 11.3205M12.5833 13.6878C12.6571 13.6855 12.7312 13.6843 12.8055 13.6843C13.6493 13.6831 14.478 13.8396 15.25 14.1383M12.5833 16.0174C12.6571 16.015 12.7312 16.0138 12.8055 16.0138C13.6493 16.0126 14.478 16.1692 15.25 16.4678" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <filter id="td_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2.4"/>
      <feGaussianBlur stdDeviation="2.4"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="1.2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow"/>
    </filter>
    <radialGradient id="td_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
      <stop stop-color="#E9FAEB"/>
      <stop offset="1" stop-color="#97D898"/>
    </radialGradient>
  </defs>
</svg>
```

## A.23 — AskAQuestionIcon (link row, 32×32, native viewBox 35×35)

```html
<svg width="32" height="32" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g filter="url(#aq_ddii)">
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#aq_grad)" shape-rendering="crispEdges"/>
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" stroke-opacity="0.4" stroke-width="0.9" shape-rendering="crispEdges"/>
    <path d="M17.25 20.0167C22.0052 20.0167 23.9166 17.3304 23.9166 14.0167C23.9166 10.703 22.6718 8.01666 17.25 8.01666C12.0052 8.01666 10.5833 10.703 10.5833 14.0167C10.5833 15.3975 10.8302 16.6694 11.4977 17.6833C12.3385 19.0167 11.9117 20.2389 11.25 20.6833C12.327 20.6833 13.0514 20.3405 13.5116 20.0011C13.8383 19.76 14.2546 19.6409 14.6489 19.7377C15.3879 19.9189 16.2494 20.0167 17.25 20.0167Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17.3332 14.0167H17.2499M20 14.0167H19.9167M14.6667 14.0167H14.5834M17.4166 14.0167C17.4166 14.1087 17.342 14.1833 17.2499 14.1833C17.1579 14.1833 17.0832 14.1087 17.0832 14.0167C17.0832 13.9246 17.1579 13.85 17.2499 13.85C17.342 13.85 17.4166 13.9246 17.4166 14.0167ZM20.0834 14.0167C20.0834 14.1087 20.0088 14.1833 19.9167 14.1833C19.8246 14.1833 19.75 14.1087 19.75 14.0167C19.75 13.9246 19.8246 13.85 19.9167 13.85C20.0088 13.85 20.0834 13.9246 20.0834 14.0167ZM14.75 14.0167C14.75 14.1087 14.6754 14.1833 14.5834 14.1833C14.4913 14.1833 14.4167 14.1087 14.4167 14.0167C14.4167 13.9246 14.4913 13.85 14.5834 13.85C14.6754 13.85 14.75 13.9246 14.75 14.0167Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <filter id="aq_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2.4"/>
      <feGaussianBlur stdDeviation="2.4"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="1.2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow"/>
    </filter>
    <radialGradient id="aq_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
      <stop stop-color="#E9FAEB"/>
      <stop offset="1" stop-color="#97D898"/>
    </radialGradient>
  </defs>
</svg>
```

## A.24 — ScheduleADemoIcon (link row, 32×32, native viewBox 35×35)

```html
<svg width="32" height="32" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g filter="url(#sd_ddii)">
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" fill="url(#sd_grad)" shape-rendering="crispEdges"/>
    <rect x="5.25" y="2.85001" width="24" height="24" rx="6" stroke="#4E9153" stroke-opacity="0.4" stroke-width="0.9" shape-rendering="crispEdges"/>
    <path d="M19.9166 7.68335V10.35M14.5833 7.68335V10.35" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17.9167 9.01666H16.5833C14.0692 9.01666 12.8121 9.01666 12.031 9.79771C11.25 10.5788 11.25 11.8358 11.25 14.35V15.6833C11.25 18.1975 11.25 19.4546 12.031 20.2356C12.8121 21.0167 14.0692 21.0167 16.5833 21.0167H17.9167C20.4308 21.0167 21.6879 21.0167 22.4689 20.2356C23.25 19.4546 23.25 18.1975 23.25 15.6833V14.35C23.25 11.8358 23.25 10.5788 22.4689 9.79771C21.6879 9.01666 20.4308 9.01666 17.9167 9.01666Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M11.25 13.0167H23.25" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19.5833 16.6833V18.0167M20.5833 17.35C20.5833 17.9023 20.1356 18.35 19.5833 18.35C19.031 18.35 18.5833 17.9023 18.5833 17.35C18.5833 16.7977 19.031 16.35 19.5833 16.35C20.1356 16.35 20.5833 16.7977 20.5833 17.35Z" stroke="#022B07" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <filter id="sd_ddii" x="0" y="0" width="34.5" height="34.5" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="2.4"/>
      <feGaussianBlur stdDeviation="2.4"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141176 0 0 0 0 0.498039 0 0 0 0 0.152941 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="1.2"/>
      <feComposite in2="hardAlpha" operator="out"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.141528 0 0 0 0 0.496807 0 0 0 0 0.15337 0 0 0 0.12 0"/>
      <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow"/>
      <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feMorphology radius="1.2" operator="erode" in="SourceAlpha" result="effect3_innerShadow"/>
      <feOffset/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
      <feBlend mode="normal" in2="shape" result="effect3_innerShadow"/>
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
      <feOffset dy="1.2"/>
      <feGaussianBlur stdDeviation="0.6"/>
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.2 0"/>
      <feBlend mode="normal" in2="effect3_innerShadow" result="effect4_innerShadow"/>
    </filter>
    <radialGradient id="sd_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17.25 1.05) rotate(90) scale(20.4 33.0681)">
      <stop stop-color="#E9FAEB"/>
      <stop offset="1" stop-color="#97D898"/>
    </radialGradient>
  </defs>
</svg>
```

---

# Appendix B — Optional dark mode

If you want a dark variant, scope it under a `data-theme="dark"` attribute on `<html>`. Use the same base palette but swap which step goes where — no semantic indirection, just different palette picks per surface.

```css
[data-theme="dark"] {
  /* Add the darker steps you need */
  --gray-900: #1A1915;
  --gray-700: #4D4A45;
  --gray-500: #84807A;
  --black:    #000000;
}
[data-theme="dark"] html,
[data-theme="dark"] body { background: #000000; color: #FDFDFC; }
[data-theme="dark"] .sidebar    { background: #131210; border-right-color: rgba(255,255,255,0.08); }
[data-theme="dark"] .side-search{ background: #1A1915; border-color: rgba(255,255,255,0.08); }
[data-theme="dark"] .main       { background: #131210; }
[data-theme="dark"] .card,
[data-theme="dark"] .opt-head,
[data-theme="dark"] .opt-item   { background: #1A1915; border-color: rgba(255,255,255,0.08); }
[data-theme="dark"] .opt-card   { background: #131210; }
[data-theme="dark"] .video-thumb{ background: #131210; }
[data-theme="dark"] .video-play { background: #1A1915; color: #FDFDFC; }
[data-theme="dark"] .h1, .h2,
[data-theme="dark"] .setup-title,
[data-theme="dark"] .opt-item-title,
[data-theme="dark"] .video-meta-title,
[data-theme="dark"] .opt-foot-strong,
[data-theme="dark"] .side-item--active,
[data-theme="dark"] .side-user-name,
[data-theme="dark"] .link-row   { color: #FDFDFC; }
[data-theme="dark"] .setup-sub,
[data-theme="dark"] .video-meta,
[data-theme="dark"] .side-item,
[data-theme="dark"] .side-item-icon,
[data-theme="dark"] .side-user-caret,
[data-theme="dark"] .opt-head-arrow,
[data-theme="dark"] .setup-caret,
[data-theme="dark"] .progress-pill { color: #ACA8A4; }
[data-theme="dark"] .opt-foot,
[data-theme="dark"] .side-user-mail { color: #84807A; }
[data-theme="dark"] .side-item:hover      { background: rgba(255,255,255,0.04); }
[data-theme="dark"] .side-item--active    { background: rgba(255,255,255,0.06); }
[data-theme="dark"] .link-row + .link-row { border-top-color: rgba(255,255,255,0.08); }
[data-theme="dark"] .side-avatar { background: #FDFDFC; color: #000000; }
/* Progress arc track in dark: swap stroke="#D6D3D1" → "#4D4A45". */
```

---

# Verification checklist

- [ ] Sidebar is 255px, fixed left, gray-100 background, hairline right border
- [ ] Main background is gray-50; cards inside are white with 1px black-alpha-200 borders
- [ ] "Good afternoon, Ivan" reads at 24px / 700 / gray-950
- [ ] Setup card has 3 rows; first row has a green ✓ next to the title; only the third row has no bottom border
- [ ] Progress arc top-right of "Setup guide" shows a 1/3 green fill on a gray-300 track, starting at 12 o'clock
- [ ] Campaign options are a 2-column grid; each has a white "head" card with shadow above a gray-100 outer card; the 3 inner items also have shadows
- [ ] Right aside is 320px wide; video thumb is 16:10 with a white play button (40px circle, 14px filled triangle)
- [ ] Link list is 3 rows separated by 1px hairlines, each row 14px / 500
- [ ] Below 1100px the right aside reflows under the left column with the video on the right and links on the left
