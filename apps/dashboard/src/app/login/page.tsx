"use client";

import { PermitButton, usePermit } from "@permitdev/react";
import { IconBolt, IconLock, IconMail, IconShieldCheck, IconSparkles } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function FloatingIcon({
  children,
  delay,
  x,
  y,
}: {
  children: React.ReactNode;
  delay: number;
  x: number;
  y: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.6, scale: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { delay, duration: 0.5 },
        scale: { delay, duration: 0.5 },
        y: {
          delay: delay + 0.5,
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      className="absolute text-blue-300"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] rounded-full border-t-transparent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = usePermit();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
    }
  }, [isAuthenticated, isLoading, router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Floating decorative icons */}
        <FloatingIcon delay={0.2} x={10} y={20}>
          <IconSparkles className="w-8 h-8" />
        </FloatingIcon>
        <FloatingIcon delay={0.4} x={80} y={15}>
          <IconShieldCheck className="w-10 h-10" />
        </FloatingIcon>
        <FloatingIcon delay={0.6} x={20} y={70}>
          <IconBolt className="w-6 h-6" />
        </FloatingIcon>
        <FloatingIcon delay={0.8} x={75} y={75}>
          <IconMail className="w-8 h-8" />
        </FloatingIcon>

        {/* Background dot pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10"
        >
          <h1 className="text-3xl font-display font-bold">Permit</h1>
          <p className="text-blue-200 mt-1">Auth as a Service</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-8 relative z-10"
        >
          <blockquote className="text-xl font-medium leading-relaxed">
            &ldquo;The easiest way to add authentication to your app. Magic links, social login, and more.&rdquo;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {["#3b82f6", "#10b981", "#f59e0b"].map((color, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div>
              <p className="font-semibold">Trusted by developers</p>
              <p className="text-blue-200 text-sm">Join thousands of happy users</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-blue-200 text-sm relative z-10"
        >
          &copy; {new Date().getFullYear()} Permit. All rights reserved.
        </motion.div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-8 w-full max-w-md text-center"
        >
          <div className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200">
            <IconShieldCheck className="w-6 h-6" />
          </div>

          <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Sign in to access your developer dashboard
          </p>

          <PermitButton className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl shadow-slate-200">
            Sign In
          </PermitButton>

          <p className="text-xs text-slate-400 mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
            <IconLock className="w-4 h-4" />
            <span className="text-xs">Secured by Permit</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
