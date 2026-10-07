import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProjectTypes = async (req: Request, res: Response) => {
  try {
    const types = await prisma.projectType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project types' });
  }
};

export const createProjectType = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const existing = await prisma.projectType.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Type already exists' });
    }
    const newType = await prisma.projectType.create({ data: { name } });
    res.status(201).json(newType);
  } catch (error) {
    res.status(500).json({ message: 'Error creating project type' });
  }
};

export const updateProjectType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await prisma.projectType.findUnique({ where: { name } });
    if (existing && existing.id !== Number(id)) {
      return res.status(400).json({ message: 'Type already exists' });
    }
    const updated = await prisma.projectType.update({
      where: { id: Number(id) },
      data: { name }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project type' });
  }
};

export const deleteProjectType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.projectType.delete({ where: { id: Number(id) } });
    res.json({ message: 'Project type deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project type' });
  }
};
