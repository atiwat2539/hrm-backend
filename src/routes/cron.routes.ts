import { Router } from 'express';
import { notifyDailyEvents, handleLineWebhook } from '../controllers/cron.controller';

const router = Router();

router.get('/daily-calendar', notifyDailyEvents);
router.post('/webhook', handleLineWebhook);

export default router;
