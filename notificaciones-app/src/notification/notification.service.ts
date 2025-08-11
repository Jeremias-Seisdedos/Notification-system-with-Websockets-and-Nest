import { Injectable } from '@nestjs/common';
import {
  Notification,
  NotificationUser,
} from './interfaces/notification.interface';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationService {
  private notifications: Notification[] = [];
  private connectedUsers: Map<string, NotificationUser> = new Map();

  // Métodos para usuarios conectados
  registerUser(
    clientId: string,
    registerUserDto: { userId: string },
  ): NotificationUser {
    const notificationUser: NotificationUser = {
      id: clientId,
      socketId: clientId,
      userId: registerUserDto.userId,
    };
    this.connectedUsers.set(clientId, notificationUser);
    return notificationUser;
  }

  removeUser(clientId: string): void {
    this.connectedUsers.delete(clientId);
  }

  getUser(clientId: string): NotificationUser | undefined {
    return this.connectedUsers.get(clientId);
  }

  // Métodos para notificaciones
  createNotification(sendNotificationDto: SendNotificationDto): Notification {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      userId: sendNotificationDto.userId,
      message: sendNotificationDto.message,
      type: sendNotificationDto.type || 'info',
      read: false,
      timestamp: new Date(),
    };
    this.notifications.push(notification);
    return notification;
  }

  markNotificationAsRead(
    notificationId: string,
    userId: string,
  ): Notification | null {
    // Buscar EXCLUSIVAMENTE por ID primero
    const notification = this.notifications.find(
      (noti) => noti.id === notificationId,
    );

    // Validar existencia y pertenencia
    if (!notification) {
      console.error(`Notification ${notificationId} does not exist`);
      return null;
    }

    if (notification.userId !== userId) {
      console.error(
        `User ${userId} is not owner of notification ${notificationId}`,
      );
      return null;
    }

    // Marcar como leída
    notification.read = true;
    return notification;
  }
}
