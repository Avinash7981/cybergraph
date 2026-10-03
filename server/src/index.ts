import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import networkRoutes from './routes/networks';
import analysisRoutes from './routes/analysis';
import monitoringRoutes from './routes/monitoring';
import simulationRoutes from './routes/simulation';
import authRoutes from './routes/auth';
import cookieParser from 'cookie-parser';
import { requireAuth } from './middleware/auth';
import { requireNetworkOwnership } from './middleware/networkOwnership';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Environment Validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error(`[server] FATAL ERROR: Missing required production environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// CORS configuration
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(helmet());
app.use(cors({ origin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/networks', requireAuth, requireNetworkOwnership, networkRoutes);
app.use('/api/analysis', requireAuth, requireNetworkOwnership, analysisRoutes);
app.use('/api/monitoring', requireAuth, requireNetworkOwnership, monitoringRoutes);
app.use('/api/simulation', requireAuth, requireNetworkOwnership, simulationRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`[server] CYBERGRAPH API running on http://localhost:${PORT}`);
});

export default app;
