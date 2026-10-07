import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import path from 'path';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import onboardingRoutes from './routes/onboarding.routes';
import kpiRoutes from './routes/kpi.routes';
import trainingRoutes from './routes/training.routes';
import calendarRoutes from './routes/calendar.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';
import userRoutes from './routes/user.routes';
import cronRoutes from './routes/cron.routes';
import projectRoutes from './routes/project.routes';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'HRM API is running' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

export default app;
