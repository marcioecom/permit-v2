import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface ShadowContextValue {
  container: HTMLDivElement | null;
}

const ShadowContext = createContext<ShadowContextValue>({ container: null });

export const useShadowContainer = () => {
  const context = useContext(ShadowContext);
  return context.container;
};

interface ShadowRootProviderProps {
  children: ReactNode;
  styles: string;
  disabled?: boolean;
}

export const ShadowRootProvider = ({
  children,
  styles,
  disabled = false,
}: ShadowRootProviderProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled || !hostRef.current) return;

    // Avoid re-attaching if already done
    if (hostRef.current.shadowRoot) {
      const existing = hostRef.current.shadowRoot.querySelector(
        "#permit-shadow-container"
      ) as HTMLDivElement;
      if (existing) {
        setContainer(existing);
        return;
      }
    }

    const shadow = hostRef.current.attachShadow({ mode: "open" });

    // Inject styles
    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    shadow.appendChild(styleElement);

    // Create container for React content
    const contentContainer = document.createElement("div");
    contentContainer.id = "permit-shadow-container";
    contentContainer.style.cssText = "position: relative;";
    shadow.appendChild(contentContainer);

    setContainer(contentContainer);
  }, [styles, disabled]);

  // When disabled, render children directly with styles injected to document head
  if (disabled) {
    return (
      <>
        <style>{styles}</style>
        {children}
      </>
    );
  }

  return (
    <div ref={hostRef} style={{ display: "contents" }}>
      {container && (
        <ShadowContext.Provider value={{ container }}>
          {createPortal(children, container)}
        </ShadowContext.Provider>
      )}
    </div>
  );
};
