interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant} button-${size} ${fullWidth ? 'button-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
      ) : (
        <>
          {leftIcon && <span className="button-icon">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="button-icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
