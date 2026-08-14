import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "border border-transparent bg-primary text-white hover:opacity-90",
  secondary: "border border-neutral bg-white text-neutral hover:bg-neutral",
};

type ButtonGenericProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function ButtonGeneric({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonGenericProps) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium hover:cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
