import { ReactNode, useEffect } from "react";
import { install, tw } from "@twind/core";
import config from "../twind.config";

// Instala twind globalmente (apenas uma vez)
let isInstalled = false;

export function TwindWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isInstalled) {
      install(config);
      isInstalled = true;
    }
  }, []);

  return <>{children}</>;
}

// Exporta tw para uso nos componentes
export { tw };
