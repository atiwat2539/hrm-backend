import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { supabase } from '../utils/supabase';

const prisma = new PrismaClient();

// Get all employees
export const getEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        manager: true,
      }
    });
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get single employee
export const getEmployeeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        manager: true,
        subordinates: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!employee) {
      res.status(404).json({ message: 'Employee not found' });
      return;
    }
    res.json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create employee
export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = { ...req.body };
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    
    // Convert dates
    if (data.start_date) {
      data.start_date = new Date(data.start_date);
    }
    
    // Parse manager_id if it comes as string from FormData
    if (data.manager_id && typeof data.manager_id === 'string') {
      data.manager_id = parseInt(data.manager_id);
    }

    if (req.file) {
      const fileName = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}.${req.file.originalname.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        res.status(500).json({ message: 'Failed to upload image' });
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
      data.profile_image = publicUrlData.publicUrl;
    }

    const employee = await prisma.employee.create({
      data
    });
    res.status(201).json(employee);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Email or Employee Code already exists.' });
      return;
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update employee
export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    
    if (data.start_date) {
      data.start_date = new Date(data.start_date);
    }
    
    if (data.manager_id && typeof data.manager_id === 'string') {
      data.manager_id = parseInt(data.manager_id);
    }

    if (req.file) {
      const fileName = `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}.${req.file.originalname.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        res.status(500).json({ message: 'Failed to upload image' });
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('profiles').getPublicUrl(fileName);
      data.profile_image = publicUrlData.publicUrl;
    }

    const employee = await prisma.employee.update({
      where: { id: Number(id) },
      data
    });
    res.json(employee);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Email or Employee Code already exists.' });
      return;
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete employee
export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.employee.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
