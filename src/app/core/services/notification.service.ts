import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  public readonly notifications = signal<NotificationItem[]>([]);

  public show(notification: Omit<NotificationItem, 'id'>): string {
    const id = crypto.randomUUID();
    const item: NotificationItem = {
      ...notification,
      id,
      duration: notification.duration ?? 4500,
    };

    this.notifications.update((current) => [...current, item]);

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, item.duration);
    }

    return id;
  }

  public success(message: string, title?: string, duration = 4000): string {
    return this.show({ type: 'success', message, title, duration });
  }

  public error(message: string, title?: string, duration = 5000): string {
    return this.show({ type: 'error', message, title, duration });
  }

  public warning(message: string, title?: string, duration = 4500): string {
    return this.show({ type: 'warning', message, title, duration });
  }

  public info(message: string, title?: string, duration = 4000): string {
    return this.show({ type: 'info', message, title, duration });
  }

  public dismiss(id: string): void {
    this.notifications.update((current) => current.filter((item) => item.id !== id));
  }
}
