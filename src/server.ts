import { env } from './config/env';
import { createApp } from './create-app';

createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});
