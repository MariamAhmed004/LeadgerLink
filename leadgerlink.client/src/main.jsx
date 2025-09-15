import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import 'bootswatch/dist/sandstone/bootstrap.min.css'; // Bootswatch theme

// Diagnostic check for duplicate React
if (window.React1 && window.React1 !== React) {
  console.error("Multiple React instances detected!");
  console.log("React instance in main.jsx:", React.version);
  console.log("Other React instance:", window.React1.version);
} else {
  console.log("No duplicate React instances detected in main.jsx.");
}
window.React1 = React;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </React.StrictMode>
);
