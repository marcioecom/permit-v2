"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  icon?: ReactNode;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onCancel();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/40 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 w-[400px] max-w-[90vw]">
        {icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
            variant === "danger" ? "bg-red-50" : "bg-slate-100"
          }`}>
            {icon}
          </div>
        )}

        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>

        {description && (
          <p className="text-sm text-slate-500 mb-6">{description}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={variant === "danger" ? "bg-red-500 hover:bg-red-600 text-white rounded-xl" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
