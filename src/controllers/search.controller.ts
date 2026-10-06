import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.json({ employees: [], kpis: [], trainings: [] });
      return;
    }

    const searchStr = q.toLowerCase();

    // Search Employees
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { first_name: { contains: searchStr } },
          { last_name: { contains: searchStr } },
          { position: { contains: searchStr } },
          { department: { contains: searchStr } },
        ]
      },
      take: 5
    });

    // Search KPIs
    const kpis = await prisma.kpi.findMany({
      where: {
        OR: [
          { title: { contains: searchStr } },
          { description: { contains: searchStr } }
        ]
      },
      include: {
        employee: true
      },
      take: 5
    });

    // Search Trainings
    const trainings = await prisma.training.findMany({
      where: {
        OR: [
          { title: { contains: searchStr } },
          { category: { contains: searchStr } }
        ]
      },
      take: 5
    });

    res.json({
      employees,
      kpis,
      trainings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
