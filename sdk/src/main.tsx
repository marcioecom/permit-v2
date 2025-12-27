import "./global.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/theme-provider";
import { PermitProvider } from "./PermitProvider";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <PermitProvider
        projectId="test-project-id"
        config={{
          apiUrl: "http://localhost:8080/api/v1",
          theme: "light",
        }}
      >
        <App />
      </PermitProvider>
    </ThemeProvider>
  </React.StrictMode>
);
