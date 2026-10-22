import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
