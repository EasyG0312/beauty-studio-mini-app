/**
 * Haptic Feedback — Telegram WebApp API
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred: (type: string) => void;
          notificationOccurred: (type: string) => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

export type HapticType = 'impact' | 'notification' | 'selection';

export const haptic = {
  impact(type: 'light' | 'medium' | 'heavy' = 'light') {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
    } catch {}
  },
  notification(type: 'error' | 'success' | 'warning' = 'success') {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    } catch {}
  },
  selection() {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    } catch {}
  },
};
