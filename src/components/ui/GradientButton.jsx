import React from "react";

export default function GradientButton({
  children,
  onClick,
  variant = "primary",
  size = "default",
  disabled = false,
  className = "",
  type = "button",
}) {
  const variants = {
    primary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700",
    secondary: "bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700",
  };

  const sizes = {
    sm: "py-1.5 px-3 text-sm rounded-md",
    default: "py-2.5 px-5 text-sm rounded-lg",
    lg: "py-3 px-6 text-base rounded-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}