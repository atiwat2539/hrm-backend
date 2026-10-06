import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Employee by Department
    const employeesByDept = await prisma.employee.groupBy({
      by: ['department'],
      _count: {
        id: true,
      },
    });

    const deptDistribution = employeesByDept.map(e => ({
      name: e.department || 'Unknown',
      value: e._count.id
    }));

    // 2. Employee by Employment Type
    const employeesByType = await prisma.employee.groupBy({
      by: ['employment_type'],
      _count: {
        id: true,
      },
    });

    const typeDistribution = employeesByType.map(e => ({
      name: e.employment_type || 'Unknown',
      value: e._count.id
    }));

    // 3. Average KPI Score by Department
    // Since KPI is related to Employee, we need to fetch KPIs with Employee data
    const kpis = await prisma.kpi.findMany({
      include: { employee: true }
    });

    const deptKpiMap: Record<string, { totalScore: number, count: number }> = {};
    kpis.forEach(kpi => {
      const dept = kpi.employee.department || 'Unknown';
      if (!deptKpiMap[dept]) deptKpiMap[dept] = { totalScore: 0, count: 0 };
      
      if (kpi.score !== null) {
        deptKpiMap[dept].totalScore += kpi.score;
        deptKpiMap[dept].count += 1;
      }
    });

    const kpiByDept = Object.keys(deptKpiMap).map(dept => ({
      name: dept,
      avgScore: deptKpiMap[dept].count > 0 ? (deptKpiMap[dept].totalScore / deptKpiMap[dept].count).toFixed(2) : 0
    }));

    res.json({
      deptDistribution,
      typeDistribution,
      kpiByDept
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
