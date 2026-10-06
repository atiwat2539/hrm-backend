import { Router } from 'express';
import { notifyDailyEvents } from '../controllers/cron.controller';

const router = Router();

// Endpoint for Vercel Cron or manual trigger
router.get('/daily-calendar', notifyDailyEvents);

export default router;
