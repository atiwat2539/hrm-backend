import { Router } from 'express';
import { getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employee.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { uploadProfile } from '../middlewares/upload.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', uploadProfile.single('profile_image'), createEmployee);
router.put('/:id', uploadProfile.single('profile_image'), updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
