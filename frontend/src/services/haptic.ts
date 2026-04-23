/**
 * Haptic Feedback — Telegram WebApp API
 * Работает ТОЛЬКО внутри Telegram Mini App
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        isVersionAtLeast: (version: string) => boolean;
        showScanQrPopup?: (params: { text: string }, callback: (qrCode: string) => void) => void;
        closeScanQrPopup?: () => void;
        requestFullscreen?: () => void;
      };
    };
  }
}

const isAvailable = (): boolean => {
  try {
    return !!window.Telegram?.WebApp?.HapticFeedback && 
           window.Telegram.WebApp.isVersionAtLeast('6.1');
  } catch {
    return false;
  }
};

export type HapticType = 'impact' | 'notification' | 'selection';

export const haptic = {
  impact(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
    if (isAvailable()) {
      try {
        window.Telegram!.WebApp!.HapticFeedback!.impactOccurred(type);
      } catch {}
    }
  },
  notification(type: 'error' | 'success' | 'warning' = 'success') {
    if (isAvailable()) {
      try {
        window.Telegram!.WebApp!.HapticFeedback!.notificationOccurred(type);
      } catch {}
    }
  },
  selection() {
    if (isAvailable()) {
      try {
        window.Telegram!.WebApp!.HapticFeedback!.selectionChanged();
      } catch {}
    }
  },
};
