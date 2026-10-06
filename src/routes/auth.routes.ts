import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', verifyToken, updateProfile);

export default router;
