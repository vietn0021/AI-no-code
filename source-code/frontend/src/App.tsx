import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { syncGlassEffectsToDocument } from "./lib/glassEffectsPref";
import { AppRoutes } from "./routes/AppRoutes";

function App() {
  useEffect(() => {
    syncGlassEffectsToDocument();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4500,
            style: {
              background: "rgba(255,255,255,0.95)",
              color: "#1e293b",
              border: "1px solid rgba(14, 165, 233, 0.2)",
              boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
