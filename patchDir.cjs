const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'console.warn("m5_partners collection not found or failed in Directus:", err.message);',
  '// Suppress forbidden warning for m5_partners on boot to avoid confusing users'
);

fs.writeFileSync('server.ts', code);
