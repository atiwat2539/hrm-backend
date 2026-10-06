import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEmployees = await prisma.employee.count();
    
    // New employees in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newEmployees = await prisma.employee.count({
      where: {
        start_date: {
          gte: thirtyDaysAgo
        }
      }
    });
    
    // KPI Data
    const allKpis = await prisma.kpi.findMany();
    let kpiCompletedStr = '0%';
    let kpiData = [
      { name: 'Achieved', value: 0 },
      { name: 'In Progress', value: 0 },
      { name: 'Below Target', value: 0 },
    ];

    if (allKpis.length > 0) {
      const achieved = allKpis.filter(k => k.status === 'approved').length;
      const inProgress = allKpis.filter(k => k.status === 'pending').length;
      const below = allKpis.filter(k => k.status === 'rejected').length;
      
      kpiData = [
        { name: 'Achieved', value: achieved },
        { name: 'In Progress', value: inProgress },
        { name: 'Below Target', value: below },
      ];
      kpiCompletedStr = `${Math.round((achieved / allKpis.length) * 100)}%`;
    }

    // Training Hours
    const allTrainings = await prisma.training.aggregate({
      _sum: {
        hours: true
      }
    });
    const trainingHours = allTrainings._sum.hours || 0;

    // Growth Data (Last 6 months)
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1); // Start of that month
      d.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(d);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const count = await prisma.employee.count({
        where: {
          start_date: {
            lt: nextMonth
          }
        }
      });
      
      const monthName = d.toLocaleString('default', { month: 'short' });
      growthData.push({
        name: monthName,
        employees: count
      });
    }

    // Individual KPI Achievement (Top 10)
    const employeesWithKpi = await prisma.employee.findMany({
      include: { kpis: true }
    });

    const individualKpiData = employeesWithKpi
      .filter(emp => emp.kpis.length > 0)
      .map(emp => {
        const totalWeight = emp.kpis.reduce((sum, k) => sum + (k.weight || 100), 0);
        const totalScore = emp.kpis.reduce((sum, k) => sum + (k.score || 0), 0);
        let achievement = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
        if (achievement > 100) achievement = 100; // Cap at 100% for display

        return {
          name: `${emp.first_name} ${emp.last_name}`,
          achievement: Math.round(achievement)
        };
      })
      .sort((a, b) => b.achievement - a.achievement)
      .slice(0, 10); // Top 10

    res.json({
      totalEmployees,
      newEmployees,
      kpiCompleted: kpiCompletedStr,
      trainingHours: trainingHours.toString(),
      kpiData,
      growthData,
      individualKpiData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
