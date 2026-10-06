import { Router } from 'express';
import { getReports } from '../controllers/reports.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);
router.get('/', getReports);

export default router;
