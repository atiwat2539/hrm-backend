import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export const notifyDailyEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check if token exists
    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!LINE_TOKEN) {
      res.status(400).json({ message: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' });
      return;
    }

    // 2. Get today's date in Thailand timezone
    const todayStr = new Date().toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });

    // 3. Fetch all events (optimizable by querying range, but this is safer for exact timezone matching)
    const allEvents = await prisma.calendarEvent.findMany({
      orderBy: { start_datetime: 'asc' }
    });

    // 4. Filter events happening today
    const todaysEvents = allEvents.filter(event => {
      const eventDateStr = new Date(event.start_datetime).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
      return eventDateStr === todayStr;
    });

    if (todaysEvents.length === 0) {
      res.json({ message: 'No events today, no notification sent.' });
      return;
    }

    // 5. Construct the message
    let messageText = `📢 แจ้งเตือนกิจกรรมประจำวันนี้ (${todayStr})\n\n`;
    
    todaysEvents.forEach((event, index) => {
      const startTime = new Date(event.start_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(event.end_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
      
      messageText += `${index + 1}. ${event.title}\n`;
      messageText += `   🕒 ${startTime} - ${endTime}\n`;
      if (event.location) messageText += `   📍 ${event.location}\n`;
      messageText += `\n`;
    });

    messageText += `ขอให้เป็นวันที่ดีสำหรับการทำงานครับ! ✨`;

    // 6. Send via LINE Broadcast
    await axios.post('https://api.line.me/v2/bot/message/broadcast', {
      messages: [
        {
          type: 'text',
          text: messageText
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      }
    });

    console.log('✅ Sent daily calendar summary to LINE');
    res.json({ message: 'Daily notification sent successfully', eventsCount: todaysEvents.length });

  } catch (error: any) {
    console.error('Error sending daily events:', error?.response?.data || error);
    res.status(500).json({ message: 'Server Error', error: error?.message });
  }
};
