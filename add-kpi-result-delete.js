const fs = require('fs');

// Update Routes
let routesCode = fs.readFileSync('src/routes/kpi.routes.ts', 'utf8');
if (!routesCode.includes('deleteKpiResults')) {
  routesCode = routesCode.replace(
    "router.put('/:id/evaluate', evaluateKpi);",
    "router.put('/:id/evaluate', evaluateKpi);\nrouter.delete('/:id/results', deleteKpiResults);"
  );
  routesCode = routesCode.replace(
    "import { getKpis, createKpi, evaluateKpi, updateKpi, deleteKpi }",
    "import { getKpis, createKpi, evaluateKpi, updateKpi, deleteKpi, deleteKpiResults }"
  );
  fs.writeFileSync('src/routes/kpi.routes.ts', routesCode, 'utf8');
}

// Update Controller
let controllerCode = fs.readFileSync('src/controllers/kpi.controller.ts', 'utf8');
if (!controllerCode.includes('deleteKpiResults')) {
  const newFunc = `
export const deleteKpiResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.kpiResult.deleteMany({
      where: { kpi_id: Number(id) }
    });
    // Also reset actual to 0 on the KPI itself just in case
    await prisma.kpi.update({
      where: { id: Number(id) },
      data: { actual: 0, status: 'Not Started' }
    });
    res.json({ message: 'All recorded results deleted successfully' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
`;
  controllerCode += newFunc;
  fs.writeFileSync('src/controllers/kpi.controller.ts', controllerCode, 'utf8');
}

console.log('Backend routes and controller updated');
