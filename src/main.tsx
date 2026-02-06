import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p dir='rtl'>שגיאה: אלמנט root לא נמצא.</p>";
} else {
  try {
    createRoot(rootEl).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    if (typeof console !== "undefined" && console.error) console.error("[Bootstrap]", err);
    rootEl.innerHTML = "<p dir='rtl' style='padding:1rem;text-align:center'>שגיאה בטעינת האפליקציה. נסה לרענן את הדף.</p>";
  }
}
