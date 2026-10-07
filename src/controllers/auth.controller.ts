import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, role } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        role: role || 'employee',
      },
    });

    res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, employeeId: user.employee_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;
    const { username, email, password } = req.body;

    const dataToUpdate: any = { username, email };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: dataToUpdate
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        employee_id: updatedUser.employee_id
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ message: 'Email or Username already taken.' });
      return;
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ message: '?????????????' }); return; }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(404).json({ message: '?????????????????????????' }); return; }
    
    const defaultPassword = 'password1234';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);
    await prisma.user.update({ where: { email }, data: { password_hash } });
    
    res.json({ message: '????????????????????! ?????????????????????????: password1234' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
