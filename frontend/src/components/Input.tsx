import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="input-wrapper" style={{ marginBottom: 0 }}>
        {label && <label className="label">{label}</label>}
        
        {leftIcon && <span className="input-icon">{leftIcon}</span>}
        
        <input
          ref={ref}
          className={`input ${leftIcon ? 'input-with-icon' : ''} ${error ? 'input-error' : ''} ${className}`}
          {...props}
        />
        
        {rightIcon && (
          <span 
            className="input-icon" 
            style={{ left: 'auto', right: '16px', cursor: 'pointer' }}
          >
            {rightIcon}
          </span>
        )}
        
        {error && (
          <p style={{ 
            color: 'var(--color-danger)', 
            fontSize: '12px', 
            marginTop: '4px',
            margin: 0
          }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
