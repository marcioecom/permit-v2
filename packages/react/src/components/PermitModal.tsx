import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/context/PermitContext";
import { usePermit } from "@/hooks/usePermit";
import { oauthAuthorize, startOtp, verifyOtp } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Lock } from "lucide-react";
import { useState } from "react";
import { useTheme } from "./theme-provider";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { GithubDark } from "./ui/svgs/githubDark";
import { GithubLight } from "./ui/svgs/githubLight";
import { Google } from "./ui/svgs/google";

interface PermitModalProps {
  projectId?: string;
  apiUrl?: string;
  onClose?: () => void;
  onSuccess?: (accessToken: string, refreshToken: string, user: User) => void;
  widgetConfig?: {
    title?: string;
    subtitle?: string;
    enabledProviders?: string[];
    primaryColor?: string;
    logoUrl?: string;
    showSecuredBadge?: boolean;
    termsUrl?: string;
    privacyUrl?: string;
  } | null;
}

export const PermitModal = ({
  projectId: propProjectId,
  apiUrl: propApiUrl,
  onClose,
  onSuccess,
  widgetConfig: propWidgetConfig,
}: PermitModalProps) => {
  const context = usePermit();
  const projectId = propProjectId ?? context.projectId;
  const apiUrl = propApiUrl ?? context.apiUrl;
  const widgetConfig = propWidgetConfig ?? context.widgetConfig;
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();
  const { ssoCallbackUrl } = context;

  const handleOAuthSignIn = async (provider: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await oauthAuthorize(apiUrl, {
        provider,
        // TODO: get environmentId from context
        environmentId: `env_${projectId}`,
        redirectUrl: ssoCallbackUrl || "/sso-callback",
      });
      window.location.href = response.authorizationUrl;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to start OAuth flow");
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await startOtp(apiUrl, { email }, projectId);
      setStep("otp");
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await verifyOtp(apiUrl, { email, code: otp }, projectId);

      const user = {
        id: response.user.id,
        email: response.user.email,
      };

      onSuccess?.(response.accessToken, response.refreshToken, user);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  function showCurrentStep() {
    if (step === "email") {
      return (
        <EmailFormStep
          email={email}
          setEmail={setEmail}
          loading={loading}
          error={error}
          handleSendEmail={handleSendEmail}
          primaryColor={widgetConfig?.primaryColor}
        />
      );
    }

    return (
      <OTPFormStep
        email={email}
        otp={otp}
        setOtp={setOtp}
        setStep={setStep}
        loading={loading}
        error={error}
        handleVerifyOtp={handleVerifyOtp}
        primaryColor={widgetConfig?.primaryColor}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center">
            {widgetConfig?.logoUrl ? (
              <img src={widgetConfig.logoUrl} alt="Logo" className="h-10 w-auto" />
            ) : (
              <Lock />
            )}
          </div>
          <DialogTitle className="text-center text-2xl mt-4">
            {widgetConfig?.title || "Sign in to Permit"}
          </DialogTitle>
          {step === "email" && (
            <p className="text-center text-sm text-muted-foreground">
              {widgetConfig?.subtitle || "Welcome to Permit! Please sign in to continue."}
            </p>
          )}
        </DialogHeader>

        {/* Socials Login - only show if social providers are enabled */}
        {step === "email" && (() => {
          const providers = widgetConfig?.enabledProviders ?? [];
          const hasGoogle = providers.includes("google");
          const hasGithub = providers.includes("github");
          const hasSocial = hasGoogle || hasGithub;

          if (!hasSocial) return null;

          return (
            <>
              <div className="flex justify-center gap-4 mt-4">
                {hasGoogle && (
                  <Button variant="outline" disabled={loading} onClick={() => handleOAuthSignIn("google")}>
                    <Google /> Google
                  </Button>
                )}
                {hasGithub && (
                  <Button variant="outline" disabled={loading} onClick={() => handleOAuthSignIn("github")}>
                    {theme === "dark" ? <GithubDark /> : <GithubLight />}
                    GitHub
                  </Button>
                )}
              </div>

              {/* Separator */}
              <div className="flex justify-center items-center mt-2 gap-4">
                <hr className="w-2/5 border-t border-gray-200 dark:border-neutral-700" />
                <p className="text-sm text-muted-foreground">or</p>
                <hr className="w-2/5 border-t border-gray-200 dark:border-neutral-700" />
              </div>
            </>
          );
        })()}

        <AnimatePresence mode="wait">{showCurrentStep()}</AnimatePresence>

        {/* Footer */}
        {/* Terms and Privacy links */}
        {(widgetConfig?.termsUrl || widgetConfig?.privacyUrl) && (
          <div className="flex justify-center gap-2 mt-4 text-xs text-muted-foreground">
            {widgetConfig.termsUrl && (
              <a href={widgetConfig.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Terms</a>
            )}
            {widgetConfig.termsUrl && widgetConfig.privacyUrl && <span>-</span>}
            {widgetConfig.privacyUrl && (
              <a href={widgetConfig.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy</a>
            )}
          </div>
        )}

        {(widgetConfig?.showSecuredBadge !== false) && (
          <div className="flex justify-center mt-2">
            <p className="text-sm text-muted-foreground">
              Secured by{" "}
              <a
                href="https://permit.marcio.run"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Permit
              </a>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function EmailFormStep({
  email,
  setEmail,
  loading,
  error,
  handleSendEmail,
  primaryColor,
}: {
  email: string;
  setEmail: (email: string) => void;
  loading: boolean;
  error: string | null;
  handleSendEmail: (e: React.FormEvent) => void;
  primaryColor?: string;
}) {
  return (
    <motion.form
      key="email"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSendEmail}
      className="space-y-4"
    >
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full mt-1" style={primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}>
        {loading ? "Sending..." : "Continue"}
      </Button>
    </motion.form>
  );
}

function OTPFormStep({
  email,
  otp,
  setOtp,
  setStep,
  loading,
  error,
  handleVerifyOtp,
  primaryColor,
}: {
  email: string;
  otp: string;
  setOtp: (otp: string) => void;
  setStep: (step: "email" | "otp") => void;
  loading: boolean;
  error: string | null;
  handleVerifyOtp: (e: React.FormEvent) => void;
  primaryColor?: string;
}) {
  return (
    <motion.form
      key="otp"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleVerifyOtp}
      className="space-y-4"
    >
      <p className="text-sm text-center text-muted-foreground">
        We sent a code to <strong>{email}</strong>
      </p>
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="space-y-2 flex flex-col items-center">
        <Label htmlFor="otp">Verification Code</Label>
        <InputOTP
          maxLength={6}
          id="otp"
          value={otp}
          onChange={setOtp}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full"
        style={primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
      >
        {loading ? "Verifying..." : "Sign in"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setStep("email")}
        className="w-full"
      >
        ← Back
      </Button>
    </motion.form>
  );
}
