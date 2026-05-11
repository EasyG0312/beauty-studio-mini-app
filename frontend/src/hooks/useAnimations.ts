/**
 * Animation Hooks for Micro-interactions
 * =====================================
 * 
 * React hooks для управления анимациями:
 * - Page transitions
 * - Component animations
 * - Gesture animations
 * - Performance optimization
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  fill?: 'forwards' | 'backwards' | 'both' | 'none';
}

interface AnimationState {
  isAnimating: boolean;
  hasAnimated: boolean;
  currentAnimation: string | null;
}

export function useAnimation(
  elementRef: React.RefObject<HTMLElement>,
  animations: Record<string, Keyframe[]>,
  config: AnimationConfig = {}
) {
  const [state, setState] = useState<AnimationState>({
    isAnimating: false,
    hasAnimated: false,
    currentAnimation: null
  });
  
  const animationRef = useRef<Animation | null>(null);
  
  const animate = useCallback((animationName: string, customConfig?: AnimationConfig) => {
    const element = elementRef.current;
    if (!element || !animations[animationName]) return;
    
    // Отменяем предыдущую анимацию
    if (animationRef.current) {
      animationRef.current.cancel();
    }
    
    const finalConfig = { ...config, ...customConfig };
    
    setState(prev => ({
      ...prev,
      isAnimating: true,
      currentAnimation: animationName
    }));
    
    animationRef.current = element.animate(
      animations[animationName],
      {
        duration: finalConfig.duration || 300,
        easing: finalConfig.easing || 'ease-out',
        delay: finalConfig.delay || 0,
        fill: finalConfig.fill || 'forwards'
      }
    );
    
    animationRef.current.onfinish = () => {
      setState(prev => ({
        ...prev,
        isAnimating: false,
        hasAnimated: true,
        currentAnimation: null
      }));
    };
    
    animationRef.current.oncancel = () => {
      setState(prev => ({
        ...prev,
        isAnimating: false,
        currentAnimation: null
      }));
    };
  }, [elementRef, animations, config]);
  
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
    }
  }, []);
  
  const resetAnimation = useCallback(() => {
    stopAnimation();
    setState({
      isAnimating: false,
      hasAnimated: false,
      currentAnimation: null
    });
  }, [stopAnimation]);
  
  return {
    ...state,
    animate,
    stopAnimation,
    resetAnimation
  };
}

export function usePageTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  
  const startTransition = useCallback((direction: 'forward' | 'backward' = 'forward') => {
    setIsTransitioning(true);
    setTransitionDirection(direction);
  }, []);
  
  const endTransition = useCallback(() => {
    setIsTransitioning(false);
  }, []);
  
  return {
    isTransitioning,
    transitionDirection,
    startTransition,
    endTransition
  };
}

export function useIntersectionAnimation(
  elementRef: React.RefObject<HTMLElement>,
  animationName: string,
  threshold: number = 0.1
) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsVisible(true);
            setHasAnimated(true);
            
            // Добавляем класс для анимации
            element.classList.add(animationName);
            
            // Удаляем класс после окончания анимации
            const handleAnimationEnd = () => {
              element.classList.remove(animationName);
              element.removeEventListener('animationend', handleAnimationEnd);
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
          }
        });
      },
      { threshold }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [elementRef, animationName, hasAnimated]);
  
  return { isVisible, hasAnimated };
}

export function useStaggeredAnimation(
  itemRefs: React.RefObject<HTMLElement>[],
  animationClass: string,
  staggerDelay: number = 100
) {
  const [animatedItems, setAnimatedItems] = useState<Set<number>>(new Set());
  
  const startStaggeredAnimation = useCallback(() => {
    itemRefs.forEach((ref, index) => {
      if (ref.current && !animatedItems.has(index)) {
        setTimeout(() => {
          ref.current?.classList.add(animationClass);
          setAnimatedItems(prev => new Set(prev).add(index));
        }, index * staggerDelay);
      }
    });
  }, [itemRefs, animationClass, staggerDelay, animatedItems]);
  
  const resetAnimation = useCallback(() => {
    itemRefs.forEach((ref) => {
      ref.current?.classList.remove(animationClass);
    });
    setAnimatedItems(new Set());
  }, [itemRefs]);
  
  return {
    animatedItems,
    startStaggeredAnimation,
    resetAnimation
  };
}

export function useGestureAnimation(
  elementRef: React.RefObject<HTMLElement>
) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [gesture, setGesture] = useState<string | null>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const handleMouseDown = () => {
      setIsPressed(true);
      setGesture('press');
      element.style.transform = 'scale(0.98)';
    };
    
    const handleMouseUp = () => {
      setIsPressed(false);
      setGesture(null);
      element.style.transform = 'scale(1)';
    };
    
    const handleMouseEnter = () => {
      setIsHovered(true);
      element.style.transform = 'scale(1.02)';
    };
    
    const handleMouseLeave = () => {
      setIsHovered(false);
      if (!isPressed) {
        element.style.transform = 'scale(1)';
      }
    };
    
    const handleTouchStart = () => {
      setIsPressed(true);
      setGesture('touch');
      element.style.transform = 'scale(0.98)';
    };
    
    const handleTouchEnd = () => {
      setIsPressed(false);
      setGesture(null);
      element.style.transform = 'scale(1)';
    };
    
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, isPressed]);
  
  return {
    isPressed,
    isHovered,
    gesture
  };
}

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return prefersReducedMotion;
}

export function useSpringAnimation(
  elementRef: React.RefObject<HTMLElement>,
  targetValue: number,
  property: string = 'transform'
) {
  const [currentValue, setCurrentValue] = useState(0);
  const animationRef = useRef<number>();
  
  const animate = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const startValue = currentValue;
    const startTime = performance.now();
    const duration = 300;
    
    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Spring easing
      const spring = 1 - Math.cos(progress * Math.PI / 2);
      const easeOut = 1 - Math.pow(1 - spring, 3);
      
      const value = startValue + (targetValue - startValue) * easeOut;
      setCurrentValue(value);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateFrame);
      }
    };
    
    animationRef.current = requestAnimationFrame(animateFrame);
  }, [elementRef, currentValue, targetValue]);
  
  useEffect(() => {
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  return currentValue;
}

// Предопределенные анимации
export const ANIMATIONS = {
  fadeIn: [
    { opacity: 0, transform: 'translateY(20px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ],
  
  fadeOut: [
    { opacity: 1, transform: 'translateY(0)' },
    { opacity: 0, transform: 'translateY(-20px)' }
  ],
  
  slideInLeft: [
    { opacity: 0, transform: 'translateX(-100%)' },
    { opacity: 1, transform: 'translateX(0)' }
  ],
  
  slideInRight: [
    { opacity: 0, transform: 'translateX(100%)' },
    { opacity: 1, transform: 'translateX(0)' }
  ],
  
  scaleIn: [
    { opacity: 0, transform: 'scale(0.8)' },
    { opacity: 1, transform: 'scale(1)' }
  ],
  
  bounceIn: [
    { opacity: 0, transform: 'scale(0.3)' },
    { opacity: 1, transform: 'scale(1.05)' },
    { opacity: 1, transform: 'scale(1)' }
  ],
  
  shake: [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' }
  ],
  
  pulse: [
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(1.05)', opacity: 0.8 },
    { transform: 'scale(1)', opacity: 1 }
  ]
};

// Утилиты для работы с анимациями
export const animationUtils = {
  // Создает CSS transition строку
  createTransition: (properties: string[], duration: number = 300, easing: string = 'ease-out') => {
    return properties.map(prop => `${prop} ${duration}ms ${easing}`).join(', ');
  },
  
  // Получает computed style
  getComputedStyles: (element: HTMLElement) => {
    return window.getComputedStyle(element);
  },
  
  // Проверяет поддержку анимаций
  supportsAnimation: (property: string) => {
    return property in document.documentElement.style;
  },
  
  // Оптимизированный requestAnimationFrame
  raf: (callback: FrameRequestCallback) => {
    return requestAnimationFrame(callback);
  },
  
  // Отмена requestAnimationFrame
  caf: (id: number) => {
    return cancelAnimationFrame(id);
  },
  
  // Плавная прокрутка
  smoothScroll: (element: HTMLElement, target: number, duration: number = 300) => {
    const start = element.scrollTop;
    const change = target - start;
    const startTime = performance.now();
    
    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeInOut = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      element.scrollTop = start + change * easeInOut;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  }
};
