import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: false },
  namespace: '/bookings',
  transports: ['websocket', 'polling'],
})
export class BookingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(BookingsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_owner_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() ownerId: string,
  ) {
    if (!ownerId) return;
    client.join(`owner:${ownerId}`);
    this.logger.log(`Owner ${ownerId} joined room`);
  }

  @SubscribeMessage('leave_owner_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() ownerId: string,
  ) {
    client.leave(`owner:${ownerId}`);
  }

  notifyNewBooking(ownerId: string, payload: {
    bookingId: string;
    facilityName: string;
    date: string;
    startTime: string;
    userName: string;
    sport: string;
  }) {
    this.server.to(`owner:${ownerId}`).emit('new_booking', payload);
  }
}
