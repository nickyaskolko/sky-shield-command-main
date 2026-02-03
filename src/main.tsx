import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<p dir='rtl'>שגיאה: אלמנט root לא נמצא.</p>";
} else {
  createRoot(rootEl).render(<App />);
}
