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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-8 min-w-[400px] max-w-md w-full mx-4 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fechar modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Entrar com Permit
        </h3>

        {step === "email" ? (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Enviando..." : "Receber Código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enviamos um código para <strong>{email}</strong>
            </p>
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Código de Verificação
              </label>
              <input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center text-2xl tracking-widest transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Validando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
