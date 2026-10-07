import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEmployees = await prisma.employee.count();
    
    // KPI Data - Status distribution
    const allKpis = await prisma.kpi.findMany();
    let kpiCompletedStr = '0%';
    let averageKpiScoreStr = '0%';
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
      
      // Calculate overall average KPI score across all KPIs
      const totalScoreSum = allKpis.reduce((acc, k) => acc + (k.score || 0), 0);
      const totalWeightSum = allKpis.reduce((acc, k) => acc + (k.weight || 100), 0);
      const overallScore = totalWeightSum > 0 ? (totalScoreSum / totalWeightSum) * 100 : 0;
      averageKpiScoreStr = `${Math.round(overallScore)}%`;
    }

    // Individual KPI Achievement (Top 10) & Department KPI aggregation
    const employeesWithKpi = await prisma.employee.findMany({
      include: { kpis: true }
    });

    const individualKpiData = employeesWithKpi
      .filter(emp => emp.kpis.length > 0)
      .map(emp => {
        const totalWeight = emp.kpis.reduce((sum, k) => sum + (k.weight || 100), 0);
        const totalScore = emp.kpis.reduce((sum, k) => sum + (k.score || 0), 0);
        let achievement = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
        if (achievement > 100) achievement = 100; // Cap at 100%

        return {
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          achievement: achievement
        };
      });

    // Group by department
    const deptMap: Record<string, { totalScore: number; count: number }> = {};
    individualKpiData.forEach(emp => {
      if (!deptMap[emp.department]) deptMap[emp.department] = { totalScore: 0, count: 0 };
      deptMap[emp.department].totalScore += emp.achievement;
      deptMap[emp.department].count += 1;
    });

    const kpiDepartmentData = Object.keys(deptMap).map(dept => ({
      name: dept,
      average: Math.round(deptMap[dept].totalScore / deptMap[dept].count)
    }));

    const topIndividualKpiData = individualKpiData
      .map(emp => ({ name: emp.name, achievement: Math.round(emp.achievement) }))
      .sort((a, b) => b.achievement - a.achievement)
      .slice(0, 10);

    // Get today's calendar events (in Thai timezone)
    const todayStr = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
    const upcomingEvents = await prisma.calendarEvent.findMany({
      orderBy: { start_datetime: 'asc' }
    });
    
    const todayEvents = upcomingEvents.filter(event => {
      const eventDateStr = new Date(event.start_datetime).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
      return eventDateStr === todayStr;
    }).map(e => ({
      id: e.id,
      title: e.title,
      time: new Date(e.start_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
      end_time: new Date(e.end_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
      description: e.description || '',
      location: e.location || '',
      category: e.category,
      color: e.color
    }));

    res.json({
      totalEmployees,
      kpiCompleted: kpiCompletedStr,
      averageKpiScore: averageKpiScoreStr,
      totalKpis: allKpis.length,
      kpiData,
      individualKpiData: topIndividualKpiData,
      kpiDepartmentData,
      todayEvents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
