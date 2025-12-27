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
import { AnimatePresence, motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useTheme } from "./theme-provider";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { GithubDark } from "./ui/svgs/githubDark";
import { GithubLight } from "./ui/svgs/githubLight";
import { Google } from "./ui/svgs/google";

interface PermitModalProps {
  projectId: string;
  apiUrl: string;
  onClose: () => void;
  onSuccess: (token: string, user: User) => void;
}

export const PermitModal = ({
  projectId,
  apiUrl,
  onClose,
  onSuccess,
}: PermitModalProps) => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: fetch(apiUrl + '/auth/otp/start', ...)
      console.log(`POST ${apiUrl}/auth/otp/start`, { email, projectId });
      setStep("otp");
    } catch (err) {
      alert("Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: fetch(apiUrl + '/auth/otp/verify', ...)
      console.log(`POST ${apiUrl}/auth/otp/verify`, { email, otp, projectId });

      const mockToken = "eyJ_fake_jwt_token";
      const mockUser = { id: "ulid_123", email };

      onSuccess(mockToken, mockUser);
    } catch (err) {
      alert("Código inválido");
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
          handleSendEmail={handleSendEmail}
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
        handleVerifyOtp={handleVerifyOtp}
      />
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center">
            <Lock />
          </div>
          <DialogTitle className="text-center text-2xl mt-4">
            Sign in to Permit
          </DialogTitle>
          {step === "email" && (
            <p className="text-center text-sm text-muted-foreground">
              Welcome to Permit! Please sign in to continue.
            </p>
          )}
        </DialogHeader>

        {/* Socials Login */}
        {step === "email" && (
          <>
            <div className="flex justify-center gap-4 mt-4">
              <Button variant="outline">
                <Google /> Google
              </Button>
              <Button variant="outline">
                {theme === "dark" ? <GithubDark /> : <GithubLight />}
                GitHub
              </Button>
            </div>

            {/* Separator */}
            <div className="flex justify-center items-center mt-2 gap-4">
              <hr className="w-2/5 border-t border-gray-200 dark:border-neutral-700" />
              <p className="text-sm text-muted-foreground">or</p>
              <hr className="w-2/5 border-t border-gray-200 dark:border-neutral-700" />
            </div>
          </>
        )}

        <AnimatePresence mode="wait">{showCurrentStep()}</AnimatePresence>

        {/* Footer */}
        <div className="flex justify-center mt-4">
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
      </DialogContent>
    </Dialog>
  );
};

function EmailFormStep({
  email,
  setEmail,
  loading,
  handleSendEmail,
}: {
  email: string;
  setEmail: (email: string) => void;
  loading: boolean;
  handleSendEmail: (e: React.FormEvent) => void;
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
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full mt-1">
        {loading ? "Sending..." : "Continue"}
      </Button>
    </motion.form>
  );
}

function OTPFormStep({
  email,
  // otp,
  // setOtp,
  setStep,
  loading,
  handleVerifyOtp,
}: {
  email: string;
  otp: string;
  setOtp: (otp: string) => void;
  setStep: (step: "email" | "otp") => void;
  loading: boolean;
  handleVerifyOtp: (e: React.FormEvent) => void;
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
        Enviamos um código para <strong>{email}</strong>
      </p>
      <div className="space-y-2 flex flex-col items-center">
        <Label htmlFor="otp">Código de Verificação</Label>
        <InputOTP maxLength={6} id="otp">
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
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Validando..." : "Entrar"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setStep("email")}
        className="w-full"
      >
        ← Voltar
      </Button>
    </motion.form>
  );
}
