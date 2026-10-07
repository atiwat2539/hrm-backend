import { Router } from 'express';
import { getAllProjects, createProject, updateProject, deleteProject } from '../controllers/project.controller';

const router = Router();

router.get('/', getAllProjects);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
