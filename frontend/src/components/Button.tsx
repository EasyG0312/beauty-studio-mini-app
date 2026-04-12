import { haptic } from '../services/haptic';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hapticType?: 'impact' | 'notification' | 'selection' | 'none';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  hapticType = 'none',
  className = '',
  disabled,
  onClick,
  onPointerDown,
  ...props
}: ButtonProps) {
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Haptic на pointerdown — срабатывает мгновенно при касании
    if (hapticType === 'impact') haptic.impact('light');
    else if (hapticType === 'notification') haptic.notification('success');
    else if (hapticType === 'selection') haptic.selection();
    onPointerDown?.(e);
  };

  return (
    <button
      className={`button button-${variant} button-${size} ${fullWidth ? 'button-full' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      onPointerDown={handlePointerDown}
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
