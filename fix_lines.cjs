const fs = require('fs');
const file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const fixLine = (num) => {
    let idx = num - 1;
    if (lines[idx].includes('</div>')) {
        lines[idx] = lines[idx].replace('</div>', '</motion.div>');
    }
};

[1113, 1118, 1316, 1329, 1533, 1615, 1619].forEach(fixLine);

fs.writeFileSync(file, lines.join('\n'));
