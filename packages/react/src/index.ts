// CSS as inline string for Shadow DOM injection
import permitStyles from "./global.css?inline";

// Export styles for Shadow DOM
export { permitStyles };

// Context and Types
export { PermitContext, type User } from "./context/PermitContext";

// Hooks
export { usePermit } from "./hooks/usePermit";

// Provider
export { PermitProvider } from "./PermitProvider";

// Components
export { PermitButton } from "./components/PermitButton";
export { PermitModal } from "./components/PermitModal";

// Shadow DOM utilities
export { ShadowRootProvider, useShadowContainer } from "./components/ShadowRoot";

