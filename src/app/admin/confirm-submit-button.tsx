"use client";

import { useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Ação destrutiva com confirmação em diálogo (§10.2).
 * O botão real fica no formulário; o diálogo só dispara o envio.
 */
export function ConfirmSubmitButton({
  children,
  message,
  title = "Desconectar o Instagram?",
  confirmLabel = "Desconectar",
  className,
}: {
  children: ReactNode;
  message: string;
  title?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        ref={submitRef}
        type="button"
        variant="destructive"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => submitRef.current?.form?.requestSubmit()}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
