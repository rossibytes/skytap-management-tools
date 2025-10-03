// Application entry point
// This file initializes the React application and mounts it to the DOM

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Get the root DOM element and render the App component
// The non-null assertion (!) is safe here as we know the root element exists in index.html
createRoot(document.getElementById("root")!).render(<App />);
