import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const calculateProgress = (checklists: any[], manualProgress: number) => {
  if (!checklists || checklists.length === 0) return manualProgress || 0;
  const completed = checklists.filter(c => c.is_completed).length;
  return Math.round((completed / checklists.length) * 100);
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        owner: true,
        checklists: { orderBy: { id: 'asc' } }
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, type, year, owner_id, start_date, end_date, status, progress, checklists } = req.body;
    
    let finalProgress = progress ? parseInt(progress, 10) : 0;
    if (checklists && checklists.length > 0) {
      finalProgress = calculateProgress(checklists, finalProgress);
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        type,
        year: year ? parseInt(year, 10) : null,
        owner_id: owner_id ? parseInt(owner_id, 10) : null,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        status: status || 'not_started',
        progress: finalProgress,
        checklists: checklists && checklists.length > 0 ? {
          create: checklists.map((c: any) => ({
            task_name: c.task_name,
            is_completed: c.is_completed || false
          }))
        } : undefined
      },
      include: { owner: true, checklists: true }
    });
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, type, year, owner_id, start_date, end_date, status, progress, checklists } = req.body;
    
    let finalProgress = progress ? parseInt(progress, 10) : 0;
    if (checklists && checklists.length > 0) {
      finalProgress = calculateProgress(checklists, finalProgress);
    }

    // Since checklists are dynamic, we delete old ones and insert new ones
    if (checklists) {
      await prisma.projectChecklist.deleteMany({
        where: { project_id: Number(id) }
      });
    }

    const updated = await prisma.project.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        type,
        year: year ? parseInt(year, 10) : null,
        owner_id: owner_id ? parseInt(owner_id, 10) : null,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        status,
        progress: finalProgress,
        checklists: checklists ? {
          create: checklists.map((c: any) => ({
            task_name: c.task_name,
            is_completed: c.is_completed || false
          }))
        } : undefined
      },
      include: { owner: true, checklists: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project' });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id: Number(id) } });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project' });
  }
};
