import { Router } from 'express';
import { getAllProjectTypes, createProjectType, updateProjectType, deleteProjectType } from '../controllers/projectType.controller';

const router = Router();

router.get('/', getAllProjectTypes);
router.post('/', createProjectType);
router.put('/:id', updateProjectType);
router.delete('/:id', deleteProjectType);

export default router;
