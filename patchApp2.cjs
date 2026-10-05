const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
            {/* Event List Rendering */}
            {(() => {
              if (isImpactLoading && liveImpactEvents.length === 0) {
                return (
                  <div className="p-8 text-center bg-neutral-950 border border-neutral-900 rounded-lg space-y-2">
                    <div className="h-8 w-8 mx-auto border-2 border-brick border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-neutral-450 font-medium">กำลังโหลดตารางกิจกรรมล่าสุด...</p>
                  </div>
                );
              }

              const rawEvents = liveImpactEvents.length > 0 ? liveImpactEvents : (settings.impactEvents || []);
              const activeEvents = rawEvents.filter((e: any) => e.active !== false);
              
              const filtered = activeEvents.filter((e: any) => {
                const matchesSearch = String(e.title).toLowerCase().includes(impactSearchQuery.toLowerCase()) || 
                                      String(e.description || "").toLowerCase().includes(impactSearchQuery.toLowerCase()) ||
                                      String(e.venue || "").toLowerCase().includes(impactSearchQuery.toLowerCase());
                const matchesCat = impactFilterCategory === "ทั้งหมด" || e.category === impactFilterCategory;
                return matchesSearch && matchesCat;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center bg-neutral-950 border border-neutral-900 rounded-lg space-y-2">
                    <CalendarDays className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-neutral-450 font-medium">ไม่พบรายการกิจกรรมตามตัวกรองในขณะนี้</p>
                    <p className="text-[10px] text-neutral-600 font-sans">คุณสามารถเพิ่มกิจกรรมที่สนใจหรือซิงค์ผ่านระบบหลังบ้านได้ตลอดเวลา</p>
                  </div>
                );
              }

              // Group by month
              const grouped: Record<string, any[]> = {};
              filtered.forEach((evt: any) => {
                let monthStr = "กิจกรรมอื่นๆ";
                if (evt.date) {
                  const match = evt.date.match(/([ก-๙]+)\\s+(\\d{4})/);
                  if (match) {
                    monthStr = \`\${match[1]} \${match[2]}\`;
                  }
                }
                if (!grouped[monthStr]) {
                  grouped[monthStr] = [];
                }
                grouped[monthStr].push(evt);
              });

              return (
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-800 pb-10">
                  {Object.keys(grouped).map(month => (
                    <div key={month} className="space-y-4">
                      <div className="flex items-center space-x-3 mb-2 sticky top-0 bg-neutral-900/90 backdrop-blur-sm z-20 py-2 rounded-lg px-3 border-l-4 border-brick shadow-sm">
                        <CalendarDays className="h-4 w-4 text-brick" />
                        <h3 className="text-sm font-bold text-white tracking-wide">{month}</h3>
                      </div>
                      <div className="space-y-4">
                        {grouped[month].map((evt: any) => (
                          <div key={evt.id} className="p-4 bg-[#111111] border border-neutral-900 rounded-lg hover:border-brick/30 duration-300 flex flex-col sm:flex-row gap-4 relative overflow-hidden group">
`;

code = code.replace(`
            {/* Event List Rendering */}
            {(() => {
              const rawEvents = settings.impactEvents && settings.impactEvents.length > 0 ? settings.impactEvents : [];
              const activeEvents = rawEvents.filter((e: any) => e.active !== false);
              
              const filtered = activeEvents.filter((e: any) => {
                const matchesSearch = String(e.title).toLowerCase().includes(impactSearchQuery.toLowerCase()) || 
                                      String(e.description || "").toLowerCase().includes(impactSearchQuery.toLowerCase()) ||
                                      String(e.venue || "").toLowerCase().includes(impactSearchQuery.toLowerCase());
                const matchesCat = impactFilterCategory === "ทั้งหมด" || e.category === impactFilterCategory;
                return matchesSearch && matchesCat;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center bg-neutral-950 border border-neutral-900 rounded-lg space-y-2">
                    <CalendarDays className="h-8 w-8 text-neutral-600 mx-auto" />
                    <p className="text-xs text-neutral-450 font-medium">ไม่พบรายการกิจกรรมตามตัวกรองในขณะนี้</p>
                    <p className="text-[10px] text-neutral-600 font-sans">คุณสามารถเพิ่มกิจกรรมที่สนใจหรือซิงค์ผ่านระบบหลังบ้านได้ตลอดเวลา</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                  {filtered.map((evt: any) => (
                    <div key={evt.id} className="p-4 bg-[#111111] border border-neutral-900 rounded-lg hover:border-brick/30 duration-300 flex flex-col sm:flex-row gap-4 relative overflow-hidden group">
`.trim(), replacement.trim());

fs.writeFileSync('src/App.tsx', code);
