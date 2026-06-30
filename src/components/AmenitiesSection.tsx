import { Coffee, Wifi, ShieldCheck, Dumbbell, Sparkles, MapPin, Ticket, Award } from "lucide-react";
import { motion } from "motion/react";

export default function AmenitiesAndPromos() {
  const amenities = [
    {
      icon: Wifi,
      title: "ความเร็วสูงพิเศษ Free Wi-Fi",
      desc: "ความเร็วระดับกิกะบิต (1000 Mbps) ครอบคลุมทั่วอาคาร ทำงานสปอร์ตไฟล์ไร้รอยต่อ เช็คตารางคอนเสิร์ตสะดวกทันใจ",
    },
    {
      icon: Coffee,
      title: "Copper & Steam Cafe / Bar",
      desc: "คาเฟ่บรรยากาศดิบพรีเมียมที่จัดเสิร์ฟกาแฟจากเมล็ดพันธุ์ออร์แกนิคชั้นดี และคราฟต์เบียร์แบรนด์ไทย-เทศยามดีกรีช่วงเย็น",
    },
    {
      icon: Dumbbell,
      title: "Loft Fitness & Gym Hub",
      desc: "ยิมออกกำลังกายสไตล์แวร์เฮ้าส์ ดิบเท่สปอร์ต ผนังคอนกรีตฉลุลาย พร้อมอุปกรณ์ออกกำลังและฟรีเวทครบครันครบถ้วน",
    },
    {
      icon: ShieldCheck,
      title: "ความปลอดภัยระดับ 24 ชั่วโมง",
      desc: "ที่จอดรถในร่มกว้างขวาง ดูแลความปลอดภัยด้วยกล้องโทรทัศน์วงจรปิด CCTV ทุกจุดร่วมกับเจ้าหน้าที่รปภ. มืออาชีพตลอดวัน",
    },
  ];

  const promotions = [
    {
      id: "promo-concert",
      badge: "CONCERT SPECIAL",
      title: "Concert Goer Package 🎸",
      desc: "สำหรับสายรักเสียงดนตรี! เข้าพักห้อง Deluxe Balcony เพียงคุณแสดงบัตรคอนเสิร์ตที่จะแสดง ณ อิมแพ็ค อารีน่า ในรอบสัปดาห์นั้น รับฟรีทันที คูปองเครื่องดื่ม Signature 2 แก้ว เลือกลองได้ที่คราฟต์คาเฟ่ Copper & Steam ของโรงแรม",
      highlight: "ฟรีคูปองเครื่องดื่มคราฟต์ 2 แก้ว",
    },
    {
      id: "promo-stay",
      badge: "STAY & SAVE",
      title: "พักยาว ประหยัดกว่า (Stay & Save) 📅",
      desc: "จองห้องพักทุกสไตล์ตั้งแต่ 2 คืนขึ้นไปผ่านหน้าเว็บไซต์หลัก รับส่วนลดค่าห้องทันที 10% พร้อมสิทธิ์เลทเช็คเอาท์ (Late Check-out) ได้ถึงเวลา 14:00 น. เพื่อให้คุณได้พักผ่อนหลังจบคอนเสิร์ตยามดึกอย่างผ่อนคลายเต็มอิ่ม",
      highlight: "ส่วนลด 10% + เลทเช็คเอาท์ 14.00 น.",
    },
  ];

  return (
    <div className="bg-charcoal-deep py-24 border-b border-charcoal-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section 1: Promotions */}
        <section id="promotions" className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-brick font-semibold">
              // HOT PROMOTIONS
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">โปรโมชั่นและแพ็คเกจยอดนิยม</h2>
            <div className="w-12 h-1 bg-brick mx-auto my-2 rounded-full"></div>
            <p className="text-xs text-neutral-300 font-light text-center">
              ตอบโจทย์ไลฟ์สไตล์ของทั้งกลุ่มแฟนคลับคอนเสิร์ต และการพักผ่อนเพื่อการท่องเที่ยวที่คุ้มราคายิ่งขึ้น
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {promotions.map((promo, idx) => (
              <motion.div
                key={promo.id}
                whileHover={{ scale: 1.01 }}
                className="bg-charcoal-medium border border-neutral-850 p-6 rounded-lg relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-brick/30"
              >
                {/* Decorative border pin or rust tint */}
                <div className="absolute top-0 left-0 w-2 h-full bg-brick"></div>
                
                <div className="space-y-4 pl-4">
                  <span className="font-mono text-[10px] text-brick font-bold bg-brick/10 border border-brick/20 px-2 py-0.5 rounded tracking-widest uppercase">
                    {promo.badge}
                  </span>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    {idx === 0 ? <Ticket className="h-5 w-5 text-brick" /> : <Award className="h-5 w-5 text-brick" />}
                    <span>{promo.title}</span>
                  </h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-light">
                    {promo.desc}
                  </p>
                </div>

                <div className="mt-6 pl-4 border-t border-neutral-800 pt-4 flex flex-wrap justify-between items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-300">
                    จุดเด่นแพ็คเกจ: <span className="text-brick font-bold">{promo.highlight}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-450 uppercase">
                    *เงื่อนไขเป็นไปตามที่กำหนด
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 2: Amenities */}
        <section id="amenities">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-brick font-semibold">
              // AMENITIES THAT FIT
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight">สิ่งอำนวยความสะดวกที่ลงตัว</h2>
            <div className="w-12 h-1 bg-brick mx-auto my-2 rounded-full"></div>
            <p className="text-xs text-neutral-300 font-light text-center">
              ยกระดับประสบการณ์การเข้าพักผ่อนของคุณด้วยฟังก์ชันสิ่งอำนวยความสะดวกที่ครบวงจร ทันสมัย และตอบโจทย์อย่างมีระดับ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {amenities.map((amenity, idx) => (
              <div
                key={idx}
                className="bg-charcoal-medium border border-neutral-850 p-6 rounded-lg text-center space-y-4 hover:border-brick/40 duration-300 relative rivet-effect group shadow-xs"
              >
                {/* Rivets */}
                <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-800 border-t border-l border-neutral-700"></div>
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-800 border-t border-r border-neutral-700"></div>

                <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center group-hover:border-brick duration-300 shadow-sm animate-none">
                  <amenity.icon className="h-5 w-5 text-brick group-hover:scale-110 duration-250 transition-transform" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white">{amenity.title}</h3>
                  <p className="text-xs text-neutral-350 font-light leading-relaxed">
                    {amenity.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
