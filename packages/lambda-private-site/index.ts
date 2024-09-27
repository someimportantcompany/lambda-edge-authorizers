import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import serverless from 'serverless-http';

import { renderHomepage } from './page';

export const app = express();

app.use(morgan('tiny'));

app.get('/', (_req, res) => res.status(200).set('Content-Type', 'text/html').send(renderHomepage()));

app.all(
  ['/debug', '/debug/entry/:entryId', '/debug/entry/:entryId/relationships/:name', '/debug/*'],
  [
    bodyParser.json({ limit: '2mb' }),
    bodyParser.urlencoded({ limit: '2mb', extended: true }),
    (req: Request, res: Response) =>
      res.status(200).json({
        req: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          cookies: req.cookies,
          params: req.params,
          query: req.query,
          body: req.body,
        },
        res: {
          status: res.statusCode,
          headers: res.getHeaders(),
        },
      }),
  ],
);

export const handler = serverless(app);
