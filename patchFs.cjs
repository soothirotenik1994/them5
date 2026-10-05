const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/getFirestore\(firebaseConfig\.firestoreDatabaseId\)\.collection/g, 'getFirestore(firebaseConfig?.firestoreDatabaseId).collection');

fs.writeFileSync('server.ts', code);
