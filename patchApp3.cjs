const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
                    </div>
                  ))}
                </div>
              );
            })()}
`;

const newReplacement = `
                    </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
`;

code = code.replace(replacement.trim(), newReplacement.trim());
fs.writeFileSync('src/App.tsx', code);
