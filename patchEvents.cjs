const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `
                        {grouped[month].map((evt: any) => (
                          <div key={evt.id} className="p-4 bg-[#111111] border border-neutral-900 rounded-lg hover:border-brick/30 duration-300 flex flex-col sm:flex-row gap-4 relative overflow-hidden group">
`;

const replacement1 = `
                        {grouped[month].map((evt: any, eIdx: number) => (
                          <motion.div 
                            key={evt.id} 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: eIdx * 0.05 }}
                            className="p-4 bg-[#111111] border border-neutral-900 rounded-lg hover:border-brick/40 hover:shadow-[0_4px_15px_rgba(217,90,6,0.1)] hover:-translate-y-0.5 duration-300 flex flex-col sm:flex-row gap-4 relative overflow-hidden group"
                          >
`;

const target2 = `
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
`;

const replacement2 = `
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
`;

code = code.replace(target1.trim(), replacement1.trim());
code = code.replace(target2.trim(), replacement2.trim());
fs.writeFileSync('src/App.tsx', code);
