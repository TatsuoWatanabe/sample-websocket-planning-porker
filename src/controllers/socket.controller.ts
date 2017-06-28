import * as mongoose from 'mongoose';

export class SocketController {

  /**
   * connect
   */
  public static onConnection(socket: SocketIO.Socket) {
    socket.on('join'            , (obj)    => SocketController.onJoin(socket, obj));
    socket.on('data'            , (obj)    => SocketController.onData(socket, obj));
    socket.on('requestAggregate', (obj)    => SocketController.onRequestAggregate(socket, obj));
    socket.on('disconnecting'   , (reason) => SocketController.onDisconnection(socket, reason));
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
      socket.leave(roomName);
    });
  }

  public static onData(socket: SocketIO.Socket, obj: any) {
    SocketController.log(socket, obj);
    socket.to(obj.roomName).emit('data', obj);
  }

  public static onRequestAggregate(socket: SocketIO.Socket, obj: any) {
    const cursor = SocketController.aggregate();
    cursor.toArray().then((result) => {
      socket.emit('aggregate', result);
    });
  }

  public static log(socket: SocketIO.Socket, obj: any) {
    const colName = 'logs';
    const logs = mongoose.connection.db.collection(colName);
    // convert to capped collection.
    logs.isCapped().then((capped) => {
      if (!capped) {
        mongoose.connection.db.command({'convertToCapped': logs.collectionName, size: 100000});
      }
    });
    // insert log.
    logs.insert(obj).then(() => {
      // aggregate
      SocketController.aggregate().toArray().then((result) => {
        socket.to('websocket-aggregate').emit('aggregate', result);
      });
    });
  }

  public static aggregate() {
    const logs = mongoose.connection.db.collection('logs');
    const cursor = logs.aggregate([
      // Filter to the data that has the message.
      { $match: {
        'data.message': { $exists: true }
      }},
      // Group by dispName.
      { $group : {
        _id: '$data.dispName',
        count: { $sum: 1 }
      }},
      // Sort results.
      { $sort: {
        count: -1
      }},
      // Limit results.
      { $limit: 10 }
    ]);
    return cursor;
  }

}
