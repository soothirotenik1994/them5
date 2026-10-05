const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `
              <div id="gallery" ref={gallerySectionRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
`;

const replacement1 = `
              <motion.div 
                id="gallery" 
                ref={gallerySectionRef} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6 }}
                className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5"
              >
`;

code = code.replace(target1.trim(), replacement1.trim());
fs.writeFileSync('src/App.tsx', code);
