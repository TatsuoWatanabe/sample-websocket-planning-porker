export class SocketController {

  /**
   * connect
   */
  public static onConnection(socket: SocketIO.Socket) {
    socket.on('join' , (obj) => SocketController.onJoin(socket, obj));
    socket.on('data' , (obj) => SocketController.onData(socket, obj));
    socket.on('disconnecting', (reason) => SocketController.onDisconnection(socket, reason));
  }

  public static onJoin(socket: SocketIO.Socket, obj: any) {
    const data = obj.data || {};
    console.log(`${data.dispName} joined.`);
    socket.join(obj.roomName).emit('roomOpen', obj);
    socket.to(obj.roomName).emit('memberJoin', obj);
  }

  public static onDisconnection(socket: SocketIO.Socket, reason: string) {
    Object.keys(socket.rooms).forEach((roomName) => {
      if (socket.id === roomName) { return; }
      const socketId = socket.id.replace(/^\/\w+?#/, '');
      socket.to(roomName).emit('memberLeave', socketId);
    });
  }

  public static onData(socket: SocketIO.Socket, obj: any) {
    socket.to(obj.roomName).emit('data', obj);
  }

}
