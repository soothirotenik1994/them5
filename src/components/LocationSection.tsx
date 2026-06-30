import { MapPin, Compass, Car, Train, Music4, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

export default function LocationSection() {
  const travelTips = [
    {
      icon: Music4,
      title: "ใกล้อิมแพ็ค อารีน่า เมืองทองธานี (เพียง 5-10 นาที)",
      desc: "ทำเลทองของแฟนคลับคอนเสิร์ต! เพียงเรียกรถบริการหรือวินมอเตอร์ไซค์จากหน้าโรงแรมไปอิมแพ็คอารีน่า สามารถหลีกเลี่ยงเส้นทางรถติดแบบเดิมๆ ข้ามแยกเลี่ยงสะพานเข้าด้านหลังได้อย่างสะดวกรวดเร็ว",
    },
    {
      icon: Train,
      title: "รถไฟฟ้าสายสีชมพู MRT พิกัดแจ้งวัฒนะ",
      desc: "เดินทางเชื่อมต่อเข้าสู่กรุงเทพฯ ชั้นในได้อย่างง่ายดายผ่าน 'โครงการรถไฟฟ้าราษฎร์พัฒนา สายสีชมพู' ลงเดินหรือเดินทางเชื่อมต่อไป MRT เพียงไม่กี่นาที เพิ่มระดับความคล่องตัวสูงสุดในการเดินทางแบบไร้กังวล",
    },
    {
      icon: Car,
      title: "ทางด่วนขั้นที่ 2 ด่านแจ้งวัฒนะ",
      desc: "เชื่อมโยงกับทางยกระดับทางด่วนขั้นที่ 2 ศรีรัช เข้าเมืองหรืออกเมืองได้รวดเร็ว เหมาะสำหรับผู้เข้าพักที่มีรถส่วนตัวจอดในพื้นที่จอดร่มกว้างขวาง ปลอดภัยของทางโรงแรม",
    },
  ];

  return (
    <section id="location" className="py-24 bg-charcoal-medium relative overflow-hidden border-b border-charcoal-light">
      <div className="absolute top-1/2 -left-16 w-80 h-80 rounded-full bg-brick/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-brick font-semibold">
            // LOCALITY & TRAVEL
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            ที่ตั้งและการเดินทางใกล้คอนเสิร์ต
          </h2>
          <div className="w-16 h-1 bg-brick mx-auto my-3 rounded-full"></div>
          <p className="text-sm text-neutral-300 font-light">
            ตั้งอยู่ในจุดยุทธศาสตร์สำคัญย่านปากเกร็ด-แจ้งวัฒนะ นนทบุรี 
            เดินทางไปยังศูนย์ประชุมและสถานที่จัดงานแสดงคอนเสิร์ตระดับโลกของไทยหลักอย่าง อิมแพ็ค บรรเลงความสะดวกได้อย่างไร้จุดติดขัด
          </p>
        </div>

        {/* Content Split: Left Info, Right Stylized Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT COLUMN: Info & Tips */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-brick font-semibold text-lg">
                <Compass className="h-5 w-5" />
                <span>เดินทางไป อิมแพ็ค อารีน่า เมืองทองธานี แสนสะดวก</span>
              </div>
              <h3 className="text-2xl font-bold text-white">ปากเกร็ด นนทบุรี — ทำเลสำหรับคอเพลงและนิทรรศการ</h3>
              <p className="text-sm text-neutral-300 font-light leading-relaxed">
                เดอะ เอ็มไฟว์ เรสซิเดนซ์ ยินดีต้อนรับผู้มาเยือนย่านปากเกร็ด นนทบุรี ทุกท่าน 
                สำหรับผู้ที่มองหาโรงแรมหรือที่พักที่ตอบโจทย์ช่วงเทศกาลคอนเสิร์ต เทศกาลดนตรี 
                หรือทริปจัดนิทรรศการ โรงแรมของเรามีพิกัดเส้นทางการลัดตัดเชื่อมสู่ อิมแพ็ค ทั้ง อารีน่า นิทรรศการ และธันเดอร์ดม ได้รวดเร็ว สะดวกกว่าเขตเมืองใหญ่ชั้นใน
              </p>
            </div>

             {/* Travel list */}
            <div className="space-y-6">
              {travelTips.map((tip, idx) => (
                <div key={idx} className="flex space-x-4 items-start p-4 rounded bg-charcoal-medium border border-neutral-850 shadow-xs">
                  <div className="p-2 sm:p-2.5 rounded bg-neutral-900 border border-neutral-800 text-brick self-start">
                    <tip.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                    <p className="text-xs text-neutral-300 font-light leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Google maps link wrapper */}
            <div className="pt-2">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-mono font-bold text-brick hover:text-brick-dark uppercase transition-colors"
                referrerPolicy="no-referrer"
              >
                <span>กดเพื่อนำทางใน Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: Stylized Map Component modeled exactly after the Right illustration */}
          <div className="lg:col-span-6">
            <div className="p-5 bg-charcoal-deep border border-neutral-850 rounded-xl shadow-2xl relative rivet-effect flex flex-col items-center">
              {/* Corner screws */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>

              {/* Header inside map */}
              <div className="w-full flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">// NAV_MAP_VECTOR</span>
                <div className="flex items-center space-x-1.5 text-xs text-brick font-semibold">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>ปากเกร็ด, นนทบุรี</span>
                </div>
              </div>

              {/* Graphic Stylized Map using Beautiful SVG to match the right image */}
              <div className="w-full aspect-[4/3] bg-neutral-950 rounded border border-neutral-900/60 p-4 relative overflow-hidden flex flex-col justify-between">
                
                {/* SVG Drawing of the roads */}
                <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full text-neutral-800" fill="none">
                  {/* Grid background lines */}
                  <defs>
                    <pattern id="mapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#mapGrid)" />

                  {/* Main Roads - grey tracks */}
                  {/* Road 1: Chaeng Wattana Rd */}
                  <path d="M 10 230 L 390 190" stroke="#333333" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 230 L 390 190" stroke="#1f1f1f" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* Road 2: Expressway Express / Tollway */}
                  <path d="M 120 10 L 150 290" stroke="#374151" strokeWidth="10" strokeDasharray="6 4" strokeLinecap="round" />
                  
                  {/* Road 3: Muang Thong Thani local Rd */}
                  <path d="M 135 150 L 320 80" stroke="#333333" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 320 80 L 350 250" stroke="#333333" strokeWidth="8" strokeLinecap="round" />
                  
                  {/* MRT Pink monorail Track (Bright pink line above Chaeng Wattana) */}
                  <path d="M 10 215 L 390 175" stroke="#ec4899" strokeWidth="2" strokeDasharray="3 3; 4 2" opacity="0.8" />

                  {/* Text label roads */}
                  <text x="35" y="248" fill="#555" fontSize="8" fontFamily="monospace" transform="rotate(-6, 35, 248)">Chaeng Wattana Road</text>
                  <text x="170" y="95" fill="#555" fontSize="8" fontFamily="monospace" transform="rotate(-20, 170, 95)">Local access road</text>
                  <text x="156" y="220" fill="#ec4899" fontSize="8" opacity="0.8" fontFamily="monospace" transform="rotate(-6, 156, 220)">MRT Pink Line</text>
                </svg>

                {/* Markers overlays */}
                {/* 1. Impact Arena */}
                <div className="absolute top-[22%] right-[22%] flex flex-col items-center">
                  <div className="p-1 px-2 border border-brick/40 bg-brick text-[10px] text-white font-bold rounded animate-bounce shadow-lg">
                    🏟️ IMPACT ARENA
                  </div>
                  <div className="w-1.5 h-1.5 bg-brick rounded-full mt-1 ring-4 ring-brick/20"></div>
                </div>

                {/* 2. The M5 Residence (Main Attraction) */}
                <div className="absolute top-[55%] left-[45%] flex flex-col items-center">
                  <div className="p-1.5 px-2 bg-neutral-900 border border-brick text-[11px] text-white font-mono font-bold rounded shadow-lg flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                    <span className="text-brick-light">THE M5</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-brick rounded-full mt-0.5 ring-4 ring-brick/40"></div>
                </div>

                {/* 3. Expressway Tollway badge */}
                <div className="absolute top-[8%] left-[24%] bg-neutral-900/90 border border-neutral-800 text-[8px] text-neutral-400 font-mono px-2 py-0.5 rounded">
                  ▲ ทางด่วนขั้นที่ 2
                </div>

                {/* 4. MRT Pink line Station */}
                <div className="absolute bottom-[22%] right-[35%] flex items-center space-x-1">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="font-mono text-[8px] text-pink-400">สถานีแจ้งวัฒนะ-ปากเกร็ด</span>
                </div>

                {/* Map legend bottom left overlays */}
                <div className="w-full mt-auto relative z-10 flex justify-between items-end">
                  <div className="p-2.5 bg-neutral-900/95 border border-neutral-800/80 rounded food-tip text-[10px] text-neutral-450 max-w-[210px] shadow-lg">
                    <span className="font-mono font-bold text-brick block uppercase mb-1">// SYSTEM_NAV</span>
                    <span>เดินทางในซอยลัดทะลุออกแจ้งวัฒนะ 24/39 เลี่ยงรถติดเส้นนิทรรศการคอนเสิร์ตได้อย่างมีประสิทธิภาพ</span>
                  </div>
                  
                  {/* Distance meter */}
                  <div className="p-2 bg-neutral-900/95 border border-neutral-800 text-[10px] text-neutral-400 font-mono rounded">
                    <span>M5 → IMPACT // 2.1 KM</span>
                  </div>
                </div>

              </div>

              {/* Bottom detail in the card */}
              <div className="w-full mt-4 text-center">
                <span className="text-xs text-neutral-400 font-light block">
                  พิกัด: ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอร์ 
                </span>
                <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
                  // GPS: 13.91230, 100.54321
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
