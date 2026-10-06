import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auditLog = (moduleName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only log write actions (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const originalSend = res.send;
      
      res.send = function (body): any {
        res.on('finish', async () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const user = (req as any).user;
              if (user) {
                await prisma.auditLog.create({
                  data: {
                    user_id: user.id,
                    action: req.method,
                    module: moduleName,
                    record_id: 0, // Placeholder, normally extracted from res body or req params
                    description: `User ${user.username} performed ${req.method} on ${moduleName}`
                  }
                });
              }
            } catch (err) {
              console.error('Audit Log Error:', err);
            }
          }
        });
        
        return originalSend.call(this, body);
      };
    }
    
    next();
  };
};
