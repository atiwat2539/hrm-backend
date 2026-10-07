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

    // 5. Construct Flex Message Body
    const bodyContents: any[] = [];
    
    todaysEvents.forEach((event, index) => {
      const startTime = new Date(event.start_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(event.end_datetime).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
      
      const eventBox: any = {
        type: 'box',
        layout: 'vertical',
        margin: index === 0 ? 'none' : 'lg',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: event.title,
            weight: 'bold',
            size: 'md',
            color: '#111827',
            wrap: true
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '🕒 เวลา:', color: '#6b7280', size: 'sm', flex: 2 },
              { type: 'text', text: `${startTime} - ${endTime}`, color: '#374151', size: 'sm', flex: 6, wrap: true }
            ]
          }
        ]
      };

      if (event.location) {
        eventBox.contents.push({
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            { type: 'text', text: '📍 สถานที่:', color: '#6b7280', size: 'sm', flex: 2 },
            { type: 'text', text: event.location, color: '#374151', size: 'sm', flex: 6, wrap: true }
          ]
        });
      }

      bodyContents.push(eventBox);

      // Add separator if not last item
      if (index < todaysEvents.length - 1) {
        bodyContents.push({
          type: 'separator',
          margin: 'lg',
          color: '#e5e7eb'
        });
      }
    });

    const flexMessage = {
      type: 'flex',
      altText: `📢 แจ้งเตือนกิจกรรมประจำวันนี้ (${todayStr})`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📅 ตารางกิจกรรมประจำวัน',
              weight: 'bold',
              size: 'lg',
              color: '#ffffff'
            },
            {
              type: 'text',
              text: `ประจำวันที่ ${todayStr}`,
              color: '#ffffffcc',
              size: 'xs',
              margin: 'sm'
            }
          ],
          backgroundColor: '#4f46e5',
          paddingAll: '20px'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '20px',
          contents: bodyContents
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✨ ขอให้เป็นวันที่ดีสำหรับการทำงานครับ!',
              color: '#9ca3af',
              size: 'sm',
              align: 'center',
              wrap: true
            }
          ],
          paddingAll: '16px'
        }
      }
    };

    // 6. Send via LINE (Push to Group if configured, else Broadcast to all)
    const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
    
    if (LINE_GROUP_ID) {
      await axios.post('https://api.line.me/v2/bot/message/push', {
        to: LINE_GROUP_ID,
        messages: [flexMessage]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_TOKEN}`
        }
      });
      console.log('✅ Sent daily calendar summary to LINE Group');
    } else {
      await axios.post('https://api.line.me/v2/bot/message/broadcast', {
        messages: [flexMessage]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_TOKEN}`
        }
      });
      console.log('✅ Broadcasted daily calendar summary to all users');
    }

    res.json({ message: 'Daily notification sent successfully', eventsCount: todaysEvents.length });

  } catch (error: any) {
    console.error('Error sending daily events:', error?.response?.data || error);
    res.status(500).json({ message: 'Server Error', error: error?.message });
  }
};

export const handleLineWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      res.status(200).send('OK');
      return;
    }

    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
      if (event.source && event.source.type === 'group') {
        const groupId = event.source.groupId;
        
        if (event.type === 'join' || (event.type === 'message' && event.message.type === 'text' && event.message.text === 'ขอไอดีกลุ่ม')) {
          await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: event.replyToken,
            messages: [
              {
                type: 'text',
                text: "สวัสดีครับ! ผมคือบอทแจ้งเตือน ไอดีของกลุ่มนี้คือ:\n\n" + groupId + "\n\n(นำไอดีนี้ไปตั้งค่าในระบบ Vercel ที่ตัวแปร LINE_GROUP_ID ได้เลยครับ)"
              }
            ]
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_TOKEN}`
            }
          });
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Error');
  }
};
