const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }});
  
  if (adminUser) {
    await prisma.notification.createMany({
      data: [
        {
          user_id: adminUser.id,
          title: 'ระบบรายงาน (Reports) เปิดใช้งานแล้ว',
          message: 'สามารถดูกราฟสถิติของพนักงานและคะแนน KPI ได้ที่เมนู Reports',
          type: 'success',
          is_read: false
        },
        {
          user_id: adminUser.id,
          title: 'แจ้งเตือน: อัปเดตตารางเวลา',
          message: 'ระบบปฏิทินเพิ่มฟีเจอร์การแก้ไขกิจกรรมเรียบร้อยแล้ว ลองใช้งานได้เลย!',
          type: 'info',
          is_read: false
        }
      ]
    });
    console.log('Mock notifications created.');
  } else {
    console.log('No admin user found.');
  }
}

main().finally(() => prisma.$disconnect());
