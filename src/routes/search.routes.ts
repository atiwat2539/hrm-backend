import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);
router.get('/', globalSearch);

export default router;
