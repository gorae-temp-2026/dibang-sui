import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isPending?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-navy text-white hover:bg-sky disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-white text-navy border border-line hover:bg-pale-sky disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-navy hover:bg-pale-sky disabled:opacity-50 disabled:cursor-not-allowed',
};

export function Button({
  variant = 'primary',
  isPending,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isPending}
      className={`rounded-xl px-5 py-3 text-base font-semibold transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isPending ? '처리 중...' : children}
    </button>
  );
}
