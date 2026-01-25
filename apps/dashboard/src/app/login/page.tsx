"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  // Dashboard project ID for dogfooding
  const PROJECT_ID = process.env.NEXT_PUBLIC_PERMIT_PROJECT_ID || "";

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/projects");
    }
  }, [isAuthenticated, router]);

  const handleSendOTP = async () => {
    if (!email) return;
    setSending(true);
    setError("");
    try {
      await fetch(`${API_URL}/api/v1/auth/otp/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, projectId: PROJECT_ID }),
      });
      setStep("code");
    } catch (err) {
      setError("Failed to send code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, projectId: PROJECT_ID }),
      });
      if (!res.ok) throw new Error("Invalid code");
      const json = await res.json();
      // API returns { data: { accessToken, refreshToken, user }, error: null }
      const { accessToken, refreshToken, user } = json.data;
      login(accessToken, refreshToken, user);
      router.push("/projects");
    } catch (err) {
      setError("Invalid or expired code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <CardTitle className="!mb-0">Permit Dashboard</CardTitle>
          </div>
          <CardDescription>
            {step === "email" ? "Enter your email to sign in" : "Enter the code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === "email" ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
              />
              <button
                onClick={handleSendOTP}
                disabled={sending || !email}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Sending..." : "Continue with Email"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-zinc-400 text-sm mb-4">
                Code sent to <span className="text-zinc-200">{email}</span>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-center text-2xl tracking-[0.5em] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={6}
                onKeyDown={(e) => e.key === "Enter" && code.length === 6 && handleVerifyCode()}
              />
              <button
                onClick={handleVerifyCode}
                disabled={sending || code.length !== 6}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Verifying..." : "Verify Code"}
              </button>
              <button
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="w-full py-2 text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
              >
                ← Use a different email
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
