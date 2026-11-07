
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { SpotifyProvider } from "./context/SpotifyContext.tsx";

createRoot(document.getElementById("app")!).render(
    <SpotifyProvider>
        <App />
    </SpotifyProvider>
);
