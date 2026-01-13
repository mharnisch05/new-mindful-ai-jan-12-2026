import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { setupGlobalErrorHandler } from "./utils/errorTracking";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { initializeCacheCleanup } from "./utils/cache";

// Setup global error tracking
setupGlobalErrorHandler();

// Initialize cache cleanup on auth changes
initializeCacheCleanup();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider defaultTheme="system" storageKey="therapy-muse-theme">
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
