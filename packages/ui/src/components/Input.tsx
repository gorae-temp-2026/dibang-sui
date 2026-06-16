import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const baseClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-300';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return <input className={`${baseClass} ${className}`} {...props} />;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className = '', ...props }: TextareaProps) {
  return <textarea className={`${baseClass} resize-none ${className}`} {...props} />;
}
