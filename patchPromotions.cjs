const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = `
                {settings.promotions.filter((p: any) => p.active !== false).map((p: any, pIdx: number) => (
                  <div key={p.id || pIdx} className="p-4 bg-gradient-to-r from-brick/15 to-transparent border border-brick/20 rounded-lg flex items-start justify-between relative overflow-hidden group hover:border-brick/40 duration-300">
`;

const r1 = `
                {settings.promotions.filter((p: any) => p.active !== false).map((p: any, pIdx: number) => (
                  <motion.div 
                    key={p.id || pIdx} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: pIdx * 0.1 }}
                    className="p-4 bg-gradient-to-r from-brick/15 to-transparent border border-brick/20 rounded-lg flex items-start justify-between relative overflow-hidden group hover:border-brick/40 duration-300"
                  >
`;

const t2 = `
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
`;

const r2 = `
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : null}
          </motion.div>
`;

code = code.replace(t1.trim(), r1.trim());
code = code.replace(t2.trim(), r2.trim());
fs.writeFileSync('src/App.tsx', code);
