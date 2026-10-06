import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all events
export const getEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string;
    
    let whereClause = {};
    if (category && category !== 'all') {
      whereClause = { category };
    }

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            employee: true
          }
        }
      },
      orderBy: {
        start_datetime: 'asc'
      }
    });

    // Format events for FullCalendar
    const formattedEvents = events.map(event => ({
      id: event.id.toString(),
      title: event.title,
      start: event.start_datetime.toISOString(),
      end: event.end_datetime.toISOString(),
      backgroundColor: event.color || '#4f46e5',
      borderColor: event.color || '#4f46e5',
      extendedProps: {
        description: event.description,
        category: event.category,
        location: event.location,
        participants: event.participants.map(p => ({
          id: p.employee.id,
          name: `${p.employee.first_name} ${p.employee.last_name}`,
          employee_code: p.employee.employee_code
        }))
      }
    }));

    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Create an event
export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, start_datetime, end_datetime, location, category, color, employee_ids } = req.body;

    const newEvent = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        start_datetime: new Date(start_datetime),
        end_datetime: new Date(end_datetime),
        location,
        category,
        color,
        participants: {
          create: employee_ids ? employee_ids.map((emp_id: number) => ({
            employee_id: emp_id
          })) : []
        }
      },
      include: {
        participants: true
      }
    });

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update an event
export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, start_datetime, end_datetime, location, category, color, employee_ids } = req.body;

    // Delete existing participants first to replace them
    await prisma.calendarEventParticipant.deleteMany({
      where: { event_id: Number(id) }
    });

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        start_datetime: new Date(start_datetime),
        end_datetime: new Date(end_datetime),
        location,
        category,
        color,
        participants: {
          create: employee_ids ? employee_ids.map((emp_id: number) => ({
            employee_id: emp_id
          })) : []
        }
      },
      include: {
        participants: true
      }
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Delete an event
export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.calendarEvent.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- CATEGORY MANAGEMENT ---

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.eventCategory.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { label, color } = req.body;
    const cat = await prisma.eventCategory.create({
      data: { label, color: color || '#4f46e5' }
    });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { label, color } = req.body;
    const cat = await prisma.eventCategory.update({
      where: { id: Number(id) },
      data: { label, color }
    });
    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.eventCategory.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
