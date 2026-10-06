import { Router } from 'express';
import { getUsers, updateUserRole, deleteUser } from '../controllers/user.controller';
import { verifyToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only admin can access these routes
router.use(verifyToken);
router.use(requireRole(['admin']));

router.get('/', getUsers);
router.put('/:id', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
