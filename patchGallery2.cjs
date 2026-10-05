const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `
                    {displayedGalleryItems.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setLightboxItems(filteredGalleryItems);
                          setLightboxIndex(idx);
                        }}
                        className="relative group h-28 sm:h-32 rounded overflow-hidden border border-neutral-900 cursor-pointer bg-neutral-950 hover:border-brick/50 transition-all duration-350 shadow-md hover:shadow-lg flex items-center justify-center"
                      >
`;

const replacement1 = `
                    {displayedGalleryItems.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-20px" }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        onClick={() => {
                          setLightboxItems(filteredGalleryItems);
                          setLightboxIndex(idx);
                        }}
                        className="relative group h-32 sm:h-40 rounded-lg overflow-hidden border border-neutral-900 cursor-pointer bg-neutral-950 hover:border-brick/50 hover:shadow-[0_4px_15px_rgba(217,90,6,0.15)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
                      >
`;

const target2 = `
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent flex flex-col justify-end p-2.5 z-10">
                          <span className="text-[7.5px] font-mono text-brick font-bold tracking-wider">{item.cat?.toUpperCase() || "ทั่วไป"}</span>
                          <span className="text-[10px] text-white font-medium font-sans leading-tight block truncate mt-0.5 group-hover:text-brick-light duration-200">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
`;

const replacement2 = `
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3 z-10 translate-y-2 group-hover:translate-y-0 opacity-80 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-[8px] font-mono text-brick font-bold tracking-wider">{item.cat?.toUpperCase() || "ทั่วไป"}</span>
                          <span className="text-[11px] text-white font-medium font-sans leading-tight block truncate mt-0.5 group-hover:text-brick-light duration-200">
                            {item.title || "บรรยากาศที่พัก"}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
`;

const target3 = `
                {/* Load More Button */}
                {hasMoreGallery && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
`;

const replacement3 = `
                {/* Load More Button */}
                {hasMoreGallery && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="flex justify-center pt-4"
                  >
                    <button
                      type="button"
`;

const target4 = `
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
`;

const replacement4 = `
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })()}
`;

code = code.replace(target1.trim(), replacement1.trim());
code = code.replace(target2.trim(), replacement2.trim());
code = code.replace(target3.trim(), replacement3.trim());
code = code.replace(target4.trim(), replacement4.trim());
fs.writeFileSync('src/App.tsx', code);
