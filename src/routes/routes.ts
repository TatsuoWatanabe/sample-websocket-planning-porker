import * as express         from 'express';
import * as HttpStatus      from 'http-status-codes';
import { IndexController }  from '../controllers/index.controller';
import { SocketController } from '../controllers/socket.controller';
import { Consts }           from '../consts/consts';

export class Routes {

  public static init(app: express.Express) {
    app.use('/index'    , IndexController.routes);

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
      const err = new Error(Consts.Msgs.notFound);
      err['status'] = HttpStatus.NOT_FOUND;
      next(err);
    });
  }

  public static initSocket(io: SocketIO.Server) {
    io.of('/socket').on('connection'   , (s) => SocketController.onConnection(s));
  }
}
