import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogsProvider } from "@/hooks/useDialogs";
import { AppProvider } from "@/context/AppContext";
import { PrefsProvider } from "@/context/PrefsContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Prefs is outermost: ToastProvider reads the notification position from it. */}
      <PrefsProvider>
        <ToastProvider>
          <TooltipProvider delayDuration={300}>
            <DialogsProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </DialogsProvider>
          </TooltipProvider>
        </ToastProvider>
      </PrefsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
