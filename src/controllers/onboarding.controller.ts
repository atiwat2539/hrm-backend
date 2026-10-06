import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get onboarding processes
export const getOnboardingProcesses = async (req: Request, res: Response): Promise<void> => {
  try {
    const processes = await prisma.onboarding.findMany({
      include: {
        employee: true,
        tasks: true
      }
    });
    res.json(processes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create onboarding process
export const createOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employee_id, start_date, expected_completion_date, tasks } = req.body;
    
    const onboarding = await prisma.onboarding.create({
      data: {
        employee_id: Number(employee_id),
        start_date: new Date(start_date),
        expected_completion_date: expected_completion_date ? new Date(expected_completion_date) : undefined,
        tasks: {
          create: tasks.map((t: any) => ({
            task_name: t.task_name,
            responsible_person: t.responsible_person,
            due_date: t.due_date ? new Date(t.due_date) : undefined,
          }))
        }
      },
      include: {
        tasks: true
      }
    });
    
    res.status(201).json(onboarding);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update task status
export const updateOnboardingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { status, note, task_name, due_date, responsible_person } = req.body;
    
    const task = await prisma.onboardingTask.update({
      where: { id: Number(taskId) },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
        ...(task_name && { task_name }),
        ...(due_date && { due_date: new Date(due_date) }),
        ...(responsible_person !== undefined && { responsible_person }),
        ...(status === 'completed' ? { completed_at: new Date() } : status === 'not_started' || status === 'in_progress' ? { completed_at: null } : {})
      }
    });
    
    // Recalculate progress
    const allTasks = await prisma.onboardingTask.findMany({
      where: { onboarding_id: task.onboarding_id }
    });
    
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    
    await prisma.onboarding.update({
      where: { id: task.onboarding_id },
      data: {
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
      }
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createOnboardingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // onboarding_id
    const { task_name, due_date, responsible_person } = req.body;

    const task = await prisma.onboardingTask.create({
      data: {
        onboarding_id: Number(id),
        task_name,
        due_date: due_date ? new Date(due_date) : undefined,
        responsible_person
      }
    });

    // Recalculate progress
    const allTasks = await prisma.onboardingTask.findMany({
      where: { onboarding_id: Number(id) }
    });
    
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    
    await prisma.onboarding.update({
      where: { id: Number(id) },
      data: {
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteOnboardingTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    
    const taskToDelete = await prisma.onboardingTask.findUnique({ where: { id: Number(taskId) } });
    if (!taskToDelete) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    await prisma.onboardingTask.delete({
      where: { id: Number(taskId) }
    });

    // Recalculate progress
    const allTasks = await prisma.onboardingTask.findMany({
      where: { onboarding_id: taskToDelete.onboarding_id }
    });
    
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const progress = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    
    await prisma.onboarding.update({
      where: { id: taskToDelete.onboarding_id },
      data: {
        progress,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started'
      }
    });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
