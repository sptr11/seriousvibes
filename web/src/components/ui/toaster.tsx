'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-2 border border-fg bg-popover text-fg shadow-stamp font-sans',
          title: 't-body',
          description: 't-small text-muted',
          actionButton:
            'rounded-1 bg-fg text-bg px-2 py-1 text-xs',
          cancelButton:
            'rounded-1 bg-transparent text-muted px-2 py-1 text-xs',
          success: 'border-pos',
          error: 'border-neg',
        },
      }}
    />
  )
}
