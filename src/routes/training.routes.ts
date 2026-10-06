import { Router } from 'express';
import { getTrainings, createTraining, deleteTraining } from '../controllers/training.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(verifyToken);
router.get('/', getTrainings);
router.post('/', createTraining);
router.delete('/:id', deleteTraining);

export default router;
