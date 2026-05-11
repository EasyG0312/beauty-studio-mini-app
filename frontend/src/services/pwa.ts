/**
 * PWA Service for Offline Support
 * =================================
 * 
 * Управляет Progressive Web App функциями:
 * - Service Worker регистрация
 * - Offline хранилище
 * - Background sync
 * - Push уведомления
 */

interface OfflineBooking {
  id: string;
  client_name: string;
  service: string;
  date: string;
  time: string;
  price: number;
  master_id: number;
  created_at: string;
  synced: boolean;
}

interface OfflineMessage {
  id: string;
  recipient_type: string;
  recipient_id: number;
  message: string;
  channel: string;
  created_at: string;
  synced: boolean;
}

interface PWAInstallPrompt {
  prompt: any;
  userChoice: Promise<any>;
}

class PWAService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = navigator.onLine;
  private installPrompt: PWAInstallPrompt | null = null;
  private db: IDBDatabase | null = null;
  
  constructor() {
    this.initDB();
    this.setupEventListeners();
  }
  
  // Инициализация IndexedDB для offline хранения
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BeautyStudioDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Создаем хранилища для offline данных
        if (!db.objectStoreNames.contains('offlineBookings')) {
          const bookingStore = db.createObjectStore('offlineBookings', { keyPath: 'id' });
          bookingStore.createIndex('created_at', 'created_at');
        }
        
        if (!db.objectStoreNames.contains('offlineMessages')) {
          const messageStore = db.createObjectStore('offlineMessages', { keyPath: 'id' });
          messageStore.createIndex('created_at', 'created_at');
        }
        
        if (!db.objectStoreNames.contains('offlineCache')) {
          const cacheStore = db.createObjectStore('offlineCache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }
  
  // Регистрация Service Worker
  async registerServiceWorker(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        
        // Ждем активации
        if (this.swRegistration.active) {
          console.log('Service Worker already active');
        } else {
          this.swRegistration.addEventListener('updatefound', () => {
            const newWorker = this.swRegistration!.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('Service Worker activated');
                  window.location.reload();
                }
              });
            }
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }
  
  // Проверка поддержки PWA
  isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }
  
  // Проверка установленного состояния
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
    );
  }
  
  // Обработка установки PWA
  async setupInstallPrompt(): Promise<void> {
    if ('BeforeInstallPromptEvent' in window) {
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        this.installPrompt = e;
      });
    }
  }
  
  // Показать промпт установки
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) {
      return false;
    }
    
    try {
      const result = await this.installPrompt.prompt();
      const { outcome } = await this.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA installation accepted');
        this.installPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  }
  
  // Подписка на push уведомления
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('Service Worker not registered');
      return null;
    }
    
    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        )
      });
      
      console.log('Push subscription successful:', subscription);
      
      // Отправляем subscription на сервер
      await this.sendPushSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }
  
  // Отправка subscription на сервер
  private async sendPushSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          platform: this.getPlatform()
        })
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }
  
  // Сохранение офлайн записи
  async saveOfflineBooking(booking: Omit<OfflineBooking, 'id' | 'created_at' | 'synced'>): Promise<string> {
    const offlineBooking: OfflineBooking = {
      ...booking,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      synced: false
    };
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineBookings'], 'readwrite');
      const store = transaction.objectStore('offlineBookings');
      const request = store.add(offlineBooking);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Offline booking saved:', offlineBooking.id);
        resolve(offlineBooking.id);
      };
    });
  }
  
  // Получение офлайн записей
  async getOfflineBookings(): Promise<OfflineBooking[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineBookings'], 'readonly');
      const store = transaction.objectStore('offlineBookings');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  // Сохранение офлайн сообщения
  async saveOfflineMessage(message: Omit<OfflineMessage, 'id' | 'created_at' | 'synced'>): Promise<string> {
    const offlineMessage: OfflineMessage = {
      ...message,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      synced: false
    };
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineMessages'], 'readwrite');
      const store = transaction.objectStore('offlineMessages');
      const request = store.add(offlineMessage);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Offline message saved:', offlineMessage.id);
        resolve(offlineMessage.id);
      };
    });
  }
  
  // Получение офлайн сообщений
  async getOfflineMessages(): Promise<OfflineMessage[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineMessages'], 'readonly');
      const store = transaction.objectStore('offlineMessages');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  // Кэширование API ответов
  async cacheApiResponse(key: string, data: any, ttl: number = 300000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const cacheItem = {
        key,
        data,
        timestamp: Date.now(),
        ttl
      };
      
      const transaction = this.db.transaction(['offlineCache'], 'readwrite');
      const store = transaction.objectStore('offlineCache');
      const request = store.put(cacheItem);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  // Получение кэшированного API ответа
  async getCachedApiResponse(key: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineCache'], 'readonly');
      const store = transaction.objectStore('offlineCache');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cached = request.result;
        if (!cached) {
          resolve(null);
          return;
        }
        
        // Проверяем TTL
        if (Date.now() - cached.timestamp > cached.ttl) {
          // Удаляем просроченный кэш
          store.delete(key);
          resolve(null);
          return;
        }
        
        resolve(cached.data);
      };
    });
  }
  
  // Синхронизация офлайн данных
  async syncOfflineData(): Promise<void> {
    if (!this.isOnline) {
      console.log('Device is offline, skipping sync');
      return;
    }
    
    try {
      // Регистрируем background sync
      if (this.swRegistration && 'sync' in this.swRegistration) {
        await this.swRegistration.sync.register('background-sync-bookings');
        await this.swRegistration.sync.register('background-sync-communications');
      }
      
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }
  
  // Получение статуса подключения
  getConnectionStatus(): boolean {
    return this.isOnline;
  }
  
  // Установка слушателей событий
  private setupEventListeners(): void {
    // Онлайн/офлайн события
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Device is online');
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Device is offline');
    });
    
    // Сообщения от Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from Service Worker:', event.data);
        
        // Обрабатываем события синхронизации
        if (event.data.type === 'BOOKING_SYNCED') {
          this.handleBookingSynced(event.data.bookingId);
        } else if (event.data.type === 'MESSAGE_SYNCED') {
          this.handleMessageSynced(event.data.messageId);
        }
      });
    }
  }
  
  // Обработка успешной синхронизации записи
  private async handleBookingSynced(bookingId: string): Promise<void> {
    try {
      await this.removeOfflineBooking(bookingId);
      console.log('Booking synced and removed from offline storage:', bookingId);
    } catch (error) {
      console.error('Failed to remove synced booking:', error);
    }
  }
  
  // Обработка успешной синхронизации сообщения
  private async handleMessageSynced(messageId: string): Promise<void> {
    try {
      await this.removeOfflineMessage(messageId);
      console.log('Message synced and removed from offline storage:', messageId);
    } catch (error) {
      console.error('Failed to remove synced message:', error);
    }
  }
  
  // Удаление офлайн записи
  private async removeOfflineBooking(bookingId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineBookings'], 'readwrite');
      const store = transaction.objectStore('offlineBookings');
      const request = store.delete(bookingId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  // Удаление офлайн сообщения
  private async removeOfflineMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = this.db.transaction(['offlineMessages'], 'readwrite');
      const store = transaction.objectStore('offlineMessages');
      const request = store.delete(messageId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  // Вспомогательные функции
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) {
      return 'android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else if (userAgent.includes('windows')) {
      return 'windows';
    } else if (userAgent.includes('mac')) {
      return 'macos';
    } else {
      return 'web';
    }
  }
  
  // Проверка поддержки уведомлений
  async checkNotificationSupport(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }
  
  // Показать локальное уведомление
  showLocalNotification(title: string, options: NotificationOptions = {}): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options
      });
    }
  }
}

// Экспорт singleton экземпляра
export const pwaService = new PWAService();

// React hook для использования PWA
export function usePWA() {
  const [isSupported, setIsSupported] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  
  useEffect(() => {
    // Проверяем поддержку PWA
    const supported = pwaService.isPWASupported();
    setIsSupported(supported);
    
    // Проверяем установлено ли приложение
    setIsInstalled(pwaService.isStandalone());
    
    // Проверяем доступность промпта установки
    pwaService.setupInstallPrompt();
    
    // Устанавливаем слушатели онлайн/офлайн
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const installApp = async () => {
    const success = await pwaService.showInstallPrompt();
    if (success) {
      setInstallPromptAvailable(false);
    }
    return success;
  };
  
  const subscribeToPush = async () => {
    return await pwaService.subscribeToPush();
  };
  
  const checkNotifications = async () => {
    return await pwaService.checkNotificationSupport();
  };
  
  const saveOfflineBooking = async (booking: any) => {
    return await pwaService.saveOfflineBooking(booking);
  };
  
  const getOfflineBookings = async () => {
    return await pwaService.getOfflineBookings();
  };
  
  const syncOfflineData = async () => {
    return await pwaService.syncOfflineData();
  };
  
  return {
    isSupported,
    isInstalled,
    isOnline,
    installPromptAvailable,
    installApp,
    subscribeToPush,
    checkNotifications,
    saveOfflineBooking,
    getOfflineBookings,
    syncOfflineData,
    getConnectionStatus: () => pwaService.getConnectionStatus()
  };
}
