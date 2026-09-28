import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middleware/error';
import { requireAuth } from './middleware/auth';
import { boardAdapter } from './queues/board';
import { emailsRouter } from './routes/emails';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { slackRouter } from './routes/slack';
import { config } from './config/env';

export const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use('/admin/queues', requireAuth, boardAdapter.getRouter());
app.use(authRouter);
app.use(slackRouter);
app.use(healthRouter);
app.use(emailsRouter);
app.use(errorMiddleware);
