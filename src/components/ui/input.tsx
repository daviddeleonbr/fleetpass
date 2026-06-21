import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-colors placeholder:text-gray-400',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50',
            props.disabled && 'bg-gray-50 text-gray-400 cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
