import { useContext } from "react";
import { PermitContext } from "../context/PermitContext";

export const usePermit = () => {
  const context = useContext(PermitContext);
  if (context === undefined) {
    throw new Error("usePermit must be used within a PermitProvider");
  }
  return context;
};
