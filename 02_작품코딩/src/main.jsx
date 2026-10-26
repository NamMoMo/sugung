import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./styles.css";
import "./experience.css";
import "./kiosk.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nProvider><App /></I18nProvider>
  </React.StrictMode>,
);

import "./royal.css";

import "./english-readability.css";

import "./story-fixes.css";

import "./immersion.css";

import "./underwater.css";

import "./exhibition-polish.css";
