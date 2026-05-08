// Single-example page — renders one ExampleHome/Campaigns/Create fullscreen
// with a floating return-to-tokens FAB and mode toggle. Reads ?ex= and ?mode=
// from the URL.

const { useState: useExState, useEffect: useExEffect } = React;

function readExampleParams() {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("ex") || searchParams.has("mode")) return searchParams;

  const hash = window.location.hash.replace(/^#\/?/, "");
  return new URLSearchParams(hash);
}

const exParams = readExampleParams();
const exId = exParams.get("ex") || "home";
const initialExMode = exParams.get("mode") === "dark" ? "dark" : "light";
const exTitles = {
  home: "Example 1 — Home",
  campaigns: "Example 2 — Campaigns",
  create: "Example 3 — Create campaign",
};

function ExamplePage() {
  const [mode, setMode] = useExState(initialExMode);
  useExEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.title = `Talin · ${exTitles[exId] || "Example"}`;
  }, [mode]);

  const Comp = exId === "campaigns" ? window.ExampleCampaigns
             : exId === "create"     ? window.ExampleCreate
             :                         window.ExampleHome;

  return (
    <div className="example-page">
      <div className="example-stage">
        {Comp ? <Comp mode={mode} /> : <div className="example-missing">Loading example…</div>}
      </div>
      {window.TokenPill ? <window.TokenPill /> : null}

      <div className="example-fab">
        <div className="example-fab-mode" role="tablist" aria-label="Color mode">
          <button
            role="tab"
            aria-selected={mode === "light"}
            className={mode === "light" ? "active" : ""}
            onClick={() => setMode("light")}>Light</button>
          <button
            role="tab"
            aria-selected={mode === "dark"}
            className={mode === "dark" ? "active" : ""}
            onClick={() => setMode("dark")}>Dark</button>
        </div>
        <a className="example-fab-btn" href="Theme Tokens.html">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M8.5 3L4.5 7L8.5 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Return to tokens</span>
        </a>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ExamplePage />);
