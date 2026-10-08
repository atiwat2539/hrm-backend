import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get KPIs
export const getKpis = async (req: Request, res: Response): Promise<void> => {
  try {
    const kpis = await prisma.kpi.findMany({
      include: {
        employee: true,
        results: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      }
    });
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create KPI
export const createKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const kpi = await prisma.kpi.create({
      data: {
        employee_id: Number(data.employee_id),
        period: data.period,
        title: data.title,
        sub_title: data.sub_title || null,
        description: data.description,
        target: Number(data.target),
        unit: data.unit,
        weight: Number(data.weight),
        actual: 0 // Initialize to 0
      } as any
    });
    res.status(201).json(kpi);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update KPI (evaluate / add monthly result)
export const evaluateKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { actual, month, year, note } = req.body;
    
    const kpi = await prisma.kpi.findUnique({ where: { id: Number(id) } });
    if (!kpi) {
      res.status(404).json({ message: 'KPI not found' });
      return;
    }

    if (month && year !== undefined && actual !== undefined) {
      // Add a monthly result
      await prisma.kpiResult.create({
        data: {
          kpi_id: kpi.id,
          month: String(month).padStart(2, '0'),
          year: Number(year),
          actual: Number(actual),
          note: note || null
        }
      });
    } else if (actual !== undefined) {
      // Legacy simple inline update (if still used)
      const currentActual = kpi.actual || 0;
      // In old logic, actual was replaced, but since we are doing incremental, wait, legacy inline passed new actual.
    }

    // Recalculate total actual from all results (if there are any)
    const allResults = await prisma.kpiResult.findMany({
      where: { kpi_id: kpi.id }
    });

    let newActual = 0;
    if (allResults.length > 0) {
      newActual = allResults.reduce((sum, r) => sum + r.actual, 0);
    } else if (actual !== undefined && (!month || year === undefined)) {
      // If no results and legacy update
      newActual = Number(actual);
    } else {
      newActual = kpi.actual || 0;
    }

    const score = (newActual / kpi.target) * kpi.weight;

    let newStatus = kpi.status;
    if (newActual >= kpi.target) {
      newStatus = 'approved';
    } else if (newActual > 0) {
      newStatus = 'pending'; // in progress
    }

    const updatedKpi = await prisma.kpi.update({
      where: { id: Number(id) },
      data: {
        actual: newActual,
        status: newStatus,
        score
      },
      include: {
        results: true
      }
    });
    
    res.json(updatedKpi);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update KPI (Full edit)
export const updateKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Fetch old KPI to calculate new score if target changes
    const oldKpi = await prisma.kpi.findUnique({ where: { id: Number(id) } });
    if (!oldKpi) {
      res.status(404).json({ message: 'KPI not found' });
      return;
    }

    const newTarget = Number(data.target);
    const newWeight = Number(data.weight) || oldKpi.weight;
    const actual = oldKpi.actual || 0;
    const newScore = (actual / newTarget) * newWeight;
    
    let newStatus = oldKpi.status;
    if (actual >= newTarget) {
      newStatus = 'approved';
    } else if (actual > 0) {
      newStatus = 'pending';
    }

    const kpi = await prisma.kpi.update({
      where: { id: Number(id) },
      data: {
        title: data.title,
        sub_title: data.sub_title || null,
        description: data.description,
        target: newTarget,
        unit: data.unit,
        employee_id: Number(data.employee_id),
        period: data.period,
        weight: newWeight,
        score: newScore,
        status: newStatus
      } as any
    });
    res.json(kpi);
  } catch (error: any) {
    console.error('Update KPI Error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Delete KPI
export const deleteKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.kpi.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

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
