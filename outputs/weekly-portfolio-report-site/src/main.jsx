import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

const root = document.getElementById("root");

console.info("[weekly-report] boot", {
  href: window.location.href,
  baseUrl: import.meta.env.BASE_URL,
  hasRoot: Boolean(root),
});

if (!root) {
  throw new Error("[weekly-report] root element not found");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
