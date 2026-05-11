/**
 * WebSocket Service for Real-time Updates
 * ========================================
 * 
 * Управляет WebSocket соединением для real-time обновлений:
 * - Новые записи
 * - Изменения статусов
 * - Обновления расписания
 * - Уведомления
 */

import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  user_id?: number;
  room?: string;
}

interface User {
  id: number;
  name: string;
  role: string;
  chat_id: number;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  user: User | null;
  rooms: string[];
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  
  constructor(private url: string, private user: User) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}/ws/connect/${this.user.id}`);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.stopHeartbeat();
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect().catch(reject);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.stopHeartbeat();
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000); // Ping каждые 30 секунд
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    const messageWithTimestamp: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      // Добавляем в очередь если соединение еще не установлено
      this.messageQueue.push(messageWithTimestamp);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat ответ
        break;
        
      case 'connection_established':
        console.log('WebSocket connection confirmed');
        break;
        
      case 'booking_update':
        this.emit('booking_update', message.data);
        break;
        
      case 'booking_status_change':
        this.emit('booking_status_change', message.data);
        break;
        
      case 'schedule_update':
        this.emit('schedule_update', message.data);
        break;
        
      case 'new_notification':
        this.emit('new_notification', message.data);
        break;
        
      case 'analytics_update':
        this.emit('analytics_update', message.data);
        break;
        
      case 'personal_message':
        this.emit('personal_message', message.data);
        break;
        
      case 'broadcast':
        this.emit('broadcast', message.data);
        break;
        
      case 'room_joined':
        this.emit('room_joined', message.data);
        break;
        
      case 'room_left':
        this.emit('room_left', message.data);
        break;
        
      case 'user_disconnected':
        this.emit('user_disconnected', message.data);
        break;
        
      case 'error':
        console.error('WebSocket error:', message.data);
        this.emit('error', message.data);
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  // Event emitter functionality
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Room management
  joinRoom(roomName: string): void {
    this.send({
      type: 'join_room',
      data: { room: roomName }
    });
  }

  leaveRoom(roomName: string): void {
    this.send({
      type: 'leave_room',
      data: { room: roomName }
    });
  }

  getRoomUsers(roomName: string): void {
    this.send({
      type: 'get_room_users',
      data: { room: roomName }
    });
  }

  // Status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState {
    return {
      connected: this.isConnected(),
      connecting: this.ws?.readyState === WebSocket.CONNECTING,
      error: null,
      user: this.user,
      rooms: []
    };
  }
}

// React Hook for WebSocket
export function useWebSocket(user: User | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    user: null,
    rooms: []
  });
  
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (user) {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
      wsRef.current = new WebSocketService(wsUrl, user);
      
      wsRef.current.on('connection_established', () => {
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          user,
          rooms: []
        });
      });

      wsRef.current.on('booking_update', (data) => {
        console.log('New booking update:', data);
        // Здесь можно добавить логику обновления UI
      });

      wsRef.current.on('booking_status_change', (data) => {
        console.log('Booking status changed:', data);
        // Обновляем статус записи в UI
      });

      wsRef.current.on('schedule_update', (data) => {
        console.log('Schedule updated:', data);
        // Обновляем расписание в UI
      });

      wsRef.current.on('new_notification', (data) => {
        console.log('New notification:', data);
        // Показываем уведомление
        if ('Notification' in window) {
          new Notification(data.title || 'Новое уведомление', {
            body: data.message,
            icon: '/favicon.ico'
          });
        }
      });

      wsRef.current.on('personal_message', (data) => {
        console.log('Personal message:', data);
        // Показываем личное сообщение
      });

      wsRef.current.on('broadcast', (data) => {
        console.log('Broadcast message:', data);
        // Показываем широковещательное сообщение
      });

      wsRef.current.on('user_disconnected', (data) => {
        console.log('User disconnected:', data);
        // Обновляем список активных пользователей
      });

      wsRef.current.on('error', (error) => {
        console.error('WebSocket error:', error);
        setConnectionState(prev => ({
          ...prev,
          error: error.message
        }));
      });

      wsRef.current.connect().catch((error) => {
        console.error('Failed to connect WebSocket:', error);
        setConnectionState(prev => ({
          ...prev,
          connecting: false,
          error: 'Failed to connect'
        }));
      });

      setConnectionState(prev => ({
        ...prev,
        connecting: true
      }));

      // Cleanup
      return () => {
        if (wsRef.current) {
          wsRef.current.disconnect();
          wsRef.current = null;
        }
      };
    }
  }, [user]);

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current) {
      wsRef.current.send(message);
    }
  };

  const joinRoom = (roomName: string) => {
    if (wsRef.current) {
      wsRef.current.joinRoom(roomName);
    }
  };

  const leaveRoom = (roomName: string) => {
    if (wsRef.current) {
      wsRef.current.leaveRoom(roomName);
    }
  };

  return {
    connectionState,
    sendMessage,
    joinRoom,
    leaveRoom,
    isConnected: () => wsRef.current?.isConnected() || false
  };
}
