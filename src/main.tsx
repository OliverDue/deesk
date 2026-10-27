import React from "react";
import ReactDOM from "react-dom/client";
import { Desk } from "./Desk";
import { applyTheme } from "./theme";
import "./index.css";

applyTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Desk />
  </React.StrictMode>,
);
