"use client"

import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "destructive"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

function toast({ title, description, variant = "default", duration }: ToastOptions) {
  const message = title || description || ""
  const options = {
    description: title ? description : undefined,
    duration,
  }

  if (variant === "destructive") {
    return sonnerToast.error(message, options)
  }

  return sonnerToast(message, options)
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}

export { useToast, toast }
