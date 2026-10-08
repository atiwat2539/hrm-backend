const fs = require('fs');
let code = fs.readFileSync('src/routes/kpi.routes.ts', 'utf8');

if (!code.includes('reorderKpis')) {
  code = code.replace(
    /import \{[\s\S]*?\} from '\.\.\/controllers\/kpi\.controller';/,
    "import { getKpis, createKpi, evaluateKpi, updateKpi, deleteKpi, deleteKpiResults, reorderKpis } from '../controllers/kpi.controller';"
  );
  code = code.replace(
    "router.post('/', createKpi);",
    "router.post('/', createKpi);\nrouter.put('/reorder', reorderKpis);"
  );
  fs.writeFileSync('src/routes/kpi.routes.ts', code, 'utf8');
  console.log('Routes updated');
}
