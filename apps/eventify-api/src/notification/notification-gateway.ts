import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private connectedUsers = 0;

	@WebSocketServer() server: Server<any, any>;

	handleConnection(client: Socket) {
		this.connectedUsers++;
		console.log('Client connected', client.id);

		// Broadcast to all clients including the new one
		this.server.emit('user-joined', {
			clientId: client.id,
			message: `User joined the chat: ${client.id}`,
			totalUsers: this.connectedUsers,
		});

		// Example of handling default connect event
		client.emit('welcome', {
			message: 'Welcome to the chat!',
			clientId: client.id,
		});
	}

	handleDisconnect(@ConnectedSocket() client: Socket) {
		this.connectedUsers--;
		console.log('Client disconnected', client.id);

		// Broadcast to all remaining clients
		this.server.emit('user-left', {
			clientId: client.id,
			message: `User left the chat: ${client.id}`,
			totalUsers: this.connectedUsers,
		});
	}

	@SubscribeMessage('newMessage')
	handleNewMessage(@MessageBody() message: any): void {
		console.log('New message:', message);
		this.server.emit('message', message);
	}

	// Example of handling default join event
	@SubscribeMessage('join')
	handleJoin(@ConnectedSocket() client: Socket, @MessageBody() room: string): void {
		client.join(room);
		client.emit('joined-room', { room });
	}

	// Example of handling default leave event
	@SubscribeMessage('leave')
	handleLeave(@ConnectedSocket() client: Socket, @MessageBody() room: string): void {
		client.leave(room);
		client.emit('left-room', { room });
	}
}
