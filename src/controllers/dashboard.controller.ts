import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalEmployees = await prisma.employee.count();
    
    const d = new Date();
    // Current Fiscal Year calculation: if month >= 6 (June), it's next year, else current year
    const currentFy = d.getMonth() + 1 >= 6 ? d.getFullYear() + 1 : d.getFullYear();

    // Fetch all KPIs with their results
    const allKpis = await prisma.kpi.findMany({
      include: { results: true }
    });

    let kpiCompletedStr = '0%';
    let averageKpiScoreStr = '0%';
    let kpiData = [
      { name: 'Achieved', value: 0 },
      { name: 'In Progress', value: 0 },
      { name: 'Below Target', value: 0 },
    ];

    // Array to store dynamically calculated scores for employees
    const empKpiScores: Record<number, { totalWeight: number; totalScore: number }> = {};

    let achieved = 0;
    let inProgress = 0;
    let below = 0;

    let overallScoreSum = 0;
    let overallWeightSum = 0;

    if (allKpis.length > 0) {
      allKpis.forEach(kpi => {
        let fyTotal = 0;
        kpi.results.forEach(r => {
          const m = parseInt(r.month);
          if (m >= 6 && m <= 12 && r.year === currentFy - 1) fyTotal += r.actual;
          if (m >= 1 && m <= 5 && r.year === currentFy) fyTotal += r.actual;
        });

        // Determine status dynamically
        if (fyTotal >= kpi.target) {
          achieved++;
        } else if (fyTotal > 0) {
          inProgress++;
        } else {
          below++;
        }

        // Calculate score for this KPI (capped at 100%)
        let scorePercent = kpi.target > 0 ? (fyTotal / kpi.target) * 100 : 0;
        if (scorePercent > 100) scorePercent = 100;

        const weight = kpi.weight || 100;
        const weightedScore = (scorePercent * weight) / 100;

        overallScoreSum += weightedScore;
        overallWeightSum += weight;

        // Aggregate per employee
        if (!empKpiScores[kpi.employee_id]) {
          empKpiScores[kpi.employee_id] = { totalWeight: 0, totalScore: 0 };
        }
        empKpiScores[kpi.employee_id].totalWeight += weight;
        empKpiScores[kpi.employee_id].totalScore += weightedScore;
      });

      kpiData = [
        { name: 'Achieved', value: achieved },
        { name: 'In Progress', value: inProgress },
        { name: 'Below Target', value: below }, // Below target or Not Started
      ];
      kpiCompletedStr = `${Math.round((achieved / allKpis.length) * 100)}%`;
      
      const overallScore = overallWeightSum > 0 ? (overallScoreSum / overallWeightSum) * 100 : 0;
      averageKpiScoreStr = `${Math.round(overallScore)}%`;
    }

    // Individual KPI Achievement (Top 10) & Department KPI aggregation
    const employees = await prisma.employee.findMany();
    const individualKpiData: any[] = [];

    employees.forEach(emp => {
      const stats = empKpiScores[emp.id];
      if (stats && stats.totalWeight > 0) {
        let achievement = (stats.totalScore / stats.totalWeight) * 100;
        if (achievement > 100) achievement = 100;

        individualKpiData.push({
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          achievement: achievement
        });
      }
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

    // Fetch projects
    const projects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
      include: { owner: true, checklists: true }
    });

    res.json({
      totalEmployees,
      kpiCompleted: kpiCompletedStr,
      averageKpiScore: averageKpiScoreStr,
      totalKpis: allKpis.length,
      kpiData,
      individualKpiData: topIndividualKpiData,
      kpiDepartmentData,
      todayEvents,
      projects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
