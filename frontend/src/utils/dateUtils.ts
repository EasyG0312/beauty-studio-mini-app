/**
 * Utility functions for date and time formatting
 */

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      // Format: DD.MM.YYYY
      const [day, month, year] = parts;
      return `${day}.${month}.${year}`;
    }
    
    // Try to parse as date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  } catch {
    // Fall through to return original
  }
  
  return dateStr;
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  
  // Already in HH:MM format
  if (timeStr.length === 5 && timeStr.includes(':')) {
    return timeStr;
  }
  
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // Fall through to return original
  }
  
  return timeStr;
}

export function formatDateTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  
  try {
    const date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    // Fall through to return original
  }
  
  return dateTimeStr;
}

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  
  try {
    const today = new Date();
    const todayStr = today.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return dateStr === todayStr;
  } catch {
    return false;
  }
}

export function isPast(dateStr: string): boolean {
  if (!dateStr) return false;
  
  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(`${year}-${month}-${day}`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return date < today;
    }
  } catch {
    // Fall through to return false
  }
  
  return false;
}
