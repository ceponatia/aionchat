"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");

    const update = (): void => {
      setIsMobile(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return (
    <Toaster
      theme="dark"
      position={isMobile ? "bottom-center" : "bottom-right"}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border border-border bg-panel text-foreground",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
