const fs = require('fs');

let code = fs.readFileSync('src/controllers/kpi.controller.ts', 'utf8');

// 1. Update getKpis to order by display_order
code = code.replace(
  `include: {
        employee: true,
        results: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      }`,
  `include: {
        employee: true,
        results: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      },
      orderBy: [
        { display_order: 'asc' },
        { id: 'asc' }
      ]`
);

// 2. Add reorderKpis function
if (!code.includes('reorderKpis')) {
  const newFunc = `
// Reorder KPIs
export const reorderKpis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kpis } = req.body; // array of { id, display_order }
    
    // Update all in a transaction
    await prisma.$transaction(
      kpis.map((kpi: any) => 
        prisma.kpi.update({
          where: { id: kpi.id },
          data: { display_order: kpi.display_order }
        })
      )
    );
    
    res.json({ message: 'KPIs reordered successfully' });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
`;
  code += newFunc;
}

fs.writeFileSync('src/controllers/kpi.controller.ts', code, 'utf8');
console.log('Controller updated');
