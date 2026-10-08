const fs = require('fs');
let code = fs.readFileSync('src/routes/kpi.routes.ts', 'utf8');
if (!code.includes("import { Router }")) {
  code = "import { Router } from 'express';\n" + code;
  fs.writeFileSync('src/routes/kpi.routes.ts', code, 'utf8');
}
