import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-2 border border-rule bg-bg px-3 text-sm text-fg placeholder:text-muted',
        'transition-[border-color,box-shadow] duration-fast ease-out-spring',
        'focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-fg/15',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
