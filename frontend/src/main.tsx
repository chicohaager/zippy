import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PointOverlay } from "./PointOverlay";
import "./i18n";
import "./styles/globals.css";

// Route fork: the point-overlay window loads the same url with
// ?overlay=point, so we short-circuit the main chat UI and render only the
// transparent pointing layer. Keeps the bundle single-entry while letting
// the two tauri windows use completely different react trees.
const overlay = new URLSearchParams(window.location.search).get("overlay");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {overlay === "point" ? <PointOverlay /> : <App />}
  </React.StrictMode>
);
