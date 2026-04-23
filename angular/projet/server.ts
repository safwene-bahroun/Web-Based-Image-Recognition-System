import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import httpProxy from 'http-proxy';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import bootstrap from './src/main.server';

// Constants
const PORT = process.env['PORT'] || 4000;
const FLASK_BACKEND = 'http://127.0.0.1:5000';
const ONE_YEAR = 31536000000;

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  // Initialize engines
  const commonEngine = new CommonEngine();
  const proxy = httpProxy.createProxyServer({
    target: FLASK_BACKEND,
    changeOrigin: true,
    proxyTimeout: 30000 // 30 seconds timeout
  });

  // Middleware Stack
  server.use(helmet());
  server.use(morgan('dev'));
  server.use(compression());
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Proxy
  server.use('/api', (req, res) => {
    req.url = req.url.replace(/^\/api/, '');
    proxy.web(req, res);
  });

  // Static Assets
  server.use(express.static(browserDistFolder, {
    maxAge: ONE_YEAR,
    immutable: true
  }));

  // Angular SSR
  server.get('**', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.match(/\.[a-z0-9]+$/i)) {
      return next();
    }

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }]
      })
      .then(html => res.send(html))
      .catch(() => res.sendFile(join(browserDistFolder, 'index.html')));
  });

  return server;
}

function run(): void {
  const server = app();
  const serverInstance = server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    serverInstance.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(1);
    }, 5000);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    serverInstance.close(() => process.exit(1));
  });
}

run();