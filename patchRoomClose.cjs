const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
`;

const replacement = `
                        </button>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </motion.div>
`;

code = code.replace(target.trim(), replacement.trim());
fs.writeFileSync('src/App.tsx', code);
