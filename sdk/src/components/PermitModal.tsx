import React, { useState } from "react";
import type { User } from "../context/PermitContext";

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

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log(`POST ${apiUrl}/auth/otp/start`, { email, projectId });
      // await fetch(...)
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          minWidth: "300px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", right: 10, top: 10 }}
        >
          X
        </button>

        <h3>Entrar com Permit</h3>

        {step === "email" ? (
          <form onSubmit={handleSendEmail}>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Receber Código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p>Enviamos um código para {email}</p>
            <input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{ display: "block", width: "100%", marginBottom: "10px" }}
            />
            <button type="submit" disabled={loading}>
              {loading ? "Validando..." : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
