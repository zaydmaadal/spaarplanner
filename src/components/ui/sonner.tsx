"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
      // Sonner's own CSS makes action buttons 24 px; "Ongedaan maken" needs the 44 px target.
      toastOptions={{ classNames: { actionButton: "h-11! px-4! text-sm!", cancelButton: "h-11! px-4! text-sm!" } }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-ink)",
          "--normal-border": "var(--color-hairline)",
          "--border-radius": "var(--radius-strip)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
