import { CSSProperties } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  interactive?: boolean;
  elevated?: boolean;
  bordered?: boolean;
}

export default function Card({ 
  children, 
  className = '', 
  onClick, 
  style,
  interactive = false,
  elevated = false,
  bordered = false,
}: CardProps) {
  const classes = [
    'card',
    className,
    interactive ? 'card-interactive' : '',
    elevated ? 'card-elevated' : '',
    bordered ? 'card-bordered' : '',
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes} 
      onClick={onClick} 
      style={style}
    >
      {children}
    </div>
  );
}
