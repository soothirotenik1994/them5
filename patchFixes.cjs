const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = `
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* INTERACTIVE LIFESTYLE GALLERY (คลังภาพความสวยเด่นสไตล์ลอฟท์) */}
`;
const r1 = `
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </motion.div>

          {/* INTERACTIVE LIFESTYLE GALLERY (คลังภาพความสวยเด่นสไตล์ลอฟท์) */}
`;
code = code.replace(t1.trim(), r1.trim());

const t2 = `
                      <Compass className="h-6 w-6 text-brick/40 shrink-0 group-hover:text-brick duration-300 self-center" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* IMPACT MUANG THONG THANI EVENT CALENDAR (ปฏิทินตารางงาน อิมแพ็ค เมืองทองธานี) */}
`;
const r2 = `
                      <Compass className="h-6 w-6 text-brick/40 shrink-0 group-hover:text-brick duration-300 self-center" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* IMPACT MUANG THONG THANI EVENT CALENDAR (ปฏิทินตารางงาน อิมแพ็ค เมืองทองธานี) */}
`;
code = code.replace(t2.trim(), r2.trim());

const t3 = `
                          </div>
                        </div>
                      </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* GUEST REVIEWS & TESTIMONIALS (ความประทับใจและความคิดเห็นรับรองจริง) */}
`;
const r3 = `
                          </div>
                        </div>
                      </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </motion.div>

          {/* GUEST REVIEWS & TESTIMONIALS (ความประทับใจและความคิดเห็นรับรองจริง) */}
`;
code = code.replace(t3.trim(), r3.trim());

const t4 = `
                return reviewsList.map((rev, idx) => (
                  <div key={idx} className="p-3.5 bg-[#111111] border border-neutral-900 rounded-lg space-y-3.5 text-xs">
`;
const r4 = `
                return reviewsList.map((rev, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="p-4 bg-[#111111] border border-neutral-900 rounded-xl space-y-3.5 text-xs hover:border-brick/40 hover:-translate-y-0.5 duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.2)]"
                  >
`;
code = code.replace(t4.trim(), r4.trim());

const t5 = `
                    <div className="flex items-center space-x-2 pt-2 border-t border-neutral-900/60 font-mono">
                      <span className="text-[9px] text-neutral-500 uppercase">Room:</span>
                      <span className="text-[10px] text-brick-light uppercase font-bold tracking-wider">{rev.roomType}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* FAQ & LOCATION AREA */}
`;
const r5 = `
                    <div className="flex items-center space-x-2 pt-2 border-t border-neutral-900/60 font-mono">
                      <span className="text-[9px] text-neutral-500 uppercase">Room:</span>
                      <span className="text-[10px] text-brick-light uppercase font-bold tracking-wider">{rev.roomType}</span>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </motion.div>

          {/* FAQ & LOCATION AREA */}
`;
code = code.replace(t5.trim(), r5.trim());


fs.writeFileSync('src/App.tsx', code);
