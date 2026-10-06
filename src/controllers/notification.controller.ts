import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id; // from verifyToken middleware

    // Auto-generate notifications for today's events
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (user?.employee_id) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysEvents = await prisma.calendarEvent.findMany({
        where: {
          start_datetime: {
            gte: today,
            lt: tomorrow
          },
          participants: {
            some: {
              employee_id: user.employee_id
            }
          }
        }
      });

      for (const event of todaysEvents) {
        const notifTitle = `วันนี้มีกิจกรรม: ${event.title}`;
        const existing = await prisma.notification.findFirst({
          where: {
            user_id,
            title: notifTitle,
            created_at: {
              gte: today
            }
          }
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              user_id,
              title: notifTitle,
              message: `เวลา ${event.start_datetime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ${event.location ? 'สถานที่: ' + event.location : 'ตรวจสอบรายละเอียดในปฏิทิน'}`,
              type: 'warning' // Highlight as important
            }
          });
        }
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { user_id },
      orderBy: { created_at: 'desc' },
      take: 20 // limit to last 20
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = (req as any).user.id;

    await prisma.notification.updateMany({
      where: { 
        id: Number(id),
        user_id // Ensure they only mark their own
      },
      data: { is_read: true }
    });

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user_id = (req as any).user.id;

    await prisma.notification.updateMany({
      where: { user_id, is_read: false },
      data: { is_read: true }
    });

    res.json({ message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user_id = (req as any).user.id;

    await prisma.notification.deleteMany({
      where: { 
        id: Number(id),
        user_id // Ensure they only delete their own
      }
    });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
