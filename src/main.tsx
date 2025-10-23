import "@/styles/tailwind.css";
import '@rainbow-me/rainbowkit/styles.css';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const rootEle = document.getElementById("root")
if (!rootEle) throw new Error("Root element not found")
const root = createRoot(rootEle)
root.render(<App />)
