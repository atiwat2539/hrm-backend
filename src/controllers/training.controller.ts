import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTrainings = async (req: Request, res: Response): Promise<void> => {
  try {
    const trainings = await prisma.training.findMany({
      include: {
        employee_trainings: true
      }
    });
    res.json(trainings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const training = await prisma.training.create({
      data: {
        training_code: data.training_code,
        title: data.title,
        category: data.category,
        trainer: data.trainer,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        location: data.location,
        hours: Number(data.hours),
        budget: data.budget ? Number(data.budget) : undefined
      }
    });
    res.status(201).json(training);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteTraining = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.employeeTraining.deleteMany({
      where: { training_id: Number(id) }
    });
    await prisma.training.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
