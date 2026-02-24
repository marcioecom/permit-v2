"use client";

import { PermitSSOCallback } from "@permitdev/react";

export default function SSOCallbackPage() {
  return <PermitSSOCallback afterSignInUrl="/" />;
}
