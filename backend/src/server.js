import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.js';
import testsRouter from './routes/tests.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/tests', testsRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
