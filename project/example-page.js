// Single-example page — renders one ExampleHome/Campaigns/Create fullscreen
// with a floating return-to-tokens FAB and mode toggle. Reads ?ex= and ?mode=
// from the URL.

const {
  useState: useExState,
  useEffect: useExEffect
} = React;
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
  create: "Example 3 — Create campaign"
};
function ExamplePage() {
  const [mode, setMode] = useExState(initialExMode);
  useExEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.title = `Talin · ${exTitles[exId] || "Example"}`;
  }, [mode]);
  const Comp = exId === "campaigns" ? window.ExampleCampaigns : exId === "create" ? window.ExampleCreate : window.ExampleHome;
  return /*#__PURE__*/React.createElement("div", {
    className: "example-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "example-stage"
  }, Comp ? /*#__PURE__*/React.createElement(Comp, {
    mode: mode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "example-missing"
  }, "Loading example\u2026")), window.TokenPill ? /*#__PURE__*/React.createElement(window.TokenPill, null) : null, /*#__PURE__*/React.createElement("div", {
    className: "example-fab"
  }, /*#__PURE__*/React.createElement("div", {
    className: "example-fab-mode",
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
  }, "Dark")), /*#__PURE__*/React.createElement("a", {
    className: "example-fab-btn",
    href: "Theme Tokens.html"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 14 14",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3L4.5 7L8.5 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), /*#__PURE__*/React.createElement("span", null, "Return to tokens"))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(ExamplePage, null));
