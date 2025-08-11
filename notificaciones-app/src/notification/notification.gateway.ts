import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RegisterUserDto } from './dto/register-user.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationService } from './notification.service';
import { MarkAsReadDto } from './dto/mark-as-read.dto';

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173' },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationService: NotificationService) {}

  // Conexión básica
  handleConnection(client: Socket) {
    console.log(`🔌Cliente conectado: ${client.id}`);
  }

  // Desconexión
  handleDisconnect(client: Socket) {
    const notificationUser = this.notificationService.getUser(client.id);

    if (notificationUser) {
      client.broadcast.emit('userDisconnected', notificationUser.userId);
      this.notificationService.removeUser(client.id);
    }
    console.log(`🚀Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('registerUser')
  handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() registerUserDto: RegisterUserDto,
  ) {
    const notificationUser = this.notificationService.registerUser(
      client.id,
      registerUserDto,
    );

    void client.join(registerUserDto.userId);
    console.log(`New user in the service: ${registerUserDto.userId}`);

    client.to(registerUserDto.userId).emit('userRegistered', {
      id: notificationUser.id,
      message: `the user ${client.id} joined the notification service`,
    }); //envia a todos los usuarios menos al que se registró

    client.emit('the user was registered', {
      id: notificationUser.id,
      message: `You are now connected to the notification service as ${registerUserDto.userId}`,
    }); //envia al usuario que se registró
  }

  @SubscribeMessage('sendNotification')
  handleSendNotification(
    @MessageBody() sendNotificationDto: SendNotificationDto,
    @ConnectedSocket() client: Socket,
  ) {
    const notificationUser = this.notificationService.getUser(client.id);
    if (!notificationUser) {
      console.log(`User not registered: ${client.id}`);
      client.emit('notificationNoRegistered', 'User not registered');
      return;
    }
    const room = sendNotificationDto.userId;
    const roomSockets = this.server.sockets.adapter.rooms.has(room);

    if (!roomSockets) {
      client.emit('notificationError', {
        message: `Room '${room}' does not exist or has no users connected.`,
      });
      return;
    }
    const notification =
      this.notificationService.createNotification(sendNotificationDto);

    this.server
      .to(sendNotificationDto.userId)
      .emit('new notification', notification);
    console.log(
      `Notification sent to ${sendNotificationDto.userId}:`,
      notification,
    );
  }

  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @MessageBody() markAsReadDto: MarkAsReadDto,
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.notificationService.getUser(client.id);
    if (!user) {
      return client.emit('markAsReadError', { message: 'User not registered' });
    }

    console.log(`Marking as read:`, {
      notificationId: markAsReadDto.notificationId,
      userId: user.userId,
    });

    const notification = this.notificationService.markNotificationAsRead(
      markAsReadDto.notificationId,
      user.userId,
    );

    if (!notification) {
      console.error(
        'Notification not found with ID:',
        markAsReadDto.notificationId,
      );
      return client.emit('markAsReadError', {
        message: 'Notification not found',
      });
    }

    this.server.to(user.userId).emit('notificationMarkedAsRead', notification);
    console.log(`✅ Notification marked as read:`, notification);
  }
}
