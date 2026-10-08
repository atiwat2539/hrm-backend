import { Router } from 'express';
import { getKpis, createKpi, evaluateKpi, updateKpi, deleteKpi, deleteKpiResults } from '../controllers/kpi.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', getKpis);
router.post('/', createKpi);
router.put('/:id', updateKpi);
router.delete('/:id', deleteKpi);
router.put('/:id/evaluate', evaluateKpi);
router.delete('/:id/results', deleteKpiResults);

export default router;
