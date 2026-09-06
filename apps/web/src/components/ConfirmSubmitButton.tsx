"use client";

export function ConfirmSubmitButton({
  confirmMessage,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
