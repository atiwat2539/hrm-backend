const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!code.includes('display_order Int')) {
  code = code.replace(
    'status      String   @default("pending") // pending, approved, rejected',
    'status      String   @default("pending") // pending, approved, rejected\n  display_order Int      @default(0)'
  );
  fs.writeFileSync('prisma/schema.prisma', code, 'utf8');
  console.log('Added display_order to schema');
} else {
  console.log('display_order already exists');
}
