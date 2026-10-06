import { Router } from 'express';
import { getOnboardingProcesses, createOnboarding, updateOnboardingTask, createOnboardingTask, deleteOnboardingTask } from '../controllers/onboarding.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', getOnboardingProcesses);
router.post('/', createOnboarding);
router.put('/tasks/:taskId', updateOnboardingTask);
router.post('/:id/tasks', createOnboardingTask);
router.delete('/tasks/:taskId', deleteOnboardingTask);

export default router;
