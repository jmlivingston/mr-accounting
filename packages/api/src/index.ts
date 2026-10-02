import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';

const app = createApp();

const onListening = () => {
  logger.info(`API listening on port ${config.port}`);
};

if (config.tlsKeyPath && config.tlsCertPath) {
  createServer(
    {
      key: readFileSync(config.tlsKeyPath),
      cert: readFileSync(config.tlsCertPath),
    },
    app,
  ).listen(config.port, onListening);
} else {
  app.listen(config.port, onListening);
}
