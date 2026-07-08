import React, { useState } from "react";
import { Search, Users, Calendar, Zap } from "lucide-react";
import { motion } from "motion/react";
import { CheckAvailabilityRequest } from "../types";
import { useSettings } from "../context/SettingsContext";

const defaultLobbyImg = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80";

interface HeroProps {
  onCheckAvailability: (form: CheckAvailabilityRequest) => void;
  onExploreRooms: () => void;
}

export default function Hero({ onCheckAvailability, onExploreRooms }: HeroProps) {
  const { settings } = useSettings();
  const gen = settings.general;

  // Setup default dates as tomorrow and day after tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkInDefault = tomorrow.toISOString().split("T")[0];

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const checkOutDefault = dayAfter.toISOString().split("T")[0];

  const [form, setForm] = useState<CheckAvailabilityRequest>({
    checkIn: checkInDefault,
    checkOut: checkOutDefault,
    guests: 2,
    roomType: "all",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCheckAvailability(form);
  };

  return (
    <section id="hero" className="relative min-h-[90vh] bg-charcoal-deep overflow-hidden flex items-center pt-8 pb-16">
      {/* Background custom image if configured */}
      {gen.heroBgImg && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img 
            src={gen.heroBgImg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-25 brightness-[0.35]" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-charcoal-deep/80 to-charcoal-deep"></div>
        </div>
      )}

      {/* Background industrial Grid network */}
      <div className="absolute inset-0 industrial-grid opacity-30 z-0"></div>
      
      {/* Radial soft orange glowing background spotlights */}
      <div className="absolute top-[20%] right-[-10%] w-[350px] h-[350px] rounded-full bg-brick/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-15%] w-[400px] h-[400px] rounded-full bg-brick-dark/15 blur-[150px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* LEFT: Copywriting details */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-8">
            
            {/* Promotional pill */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex self-start items-center space-x-2 px-3 py-1 bg-brick/10 border border-brick/20 rounded-full text-xs font-semibold text-brick tracking-wide uppercase"
            >
              <Zap className="h-3 w-3 animate-pulse" />
              <span>คุ้มที่สุด: จองเข้าพักใกล้อิมแพ็ค อารีน่า เมืองทองธานี 5-10 นาที</span>
            </motion.div>

            {/* Main Headline exact look-and-feel */}
            <div className="space-y-4">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="font-mono text-sm tracking-[0.4em] uppercase text-brick"
              >
                THE M5 RESIDENCE
              </motion.span>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight"
              >
                นิยามใหม่ของการพักผ่อน<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brick-light via-brick to-brick">
                  สไตล์อินดัสเทรียลลอฟท์
                </span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-base sm:text-lg text-neutral-350 font-light max-w-xl"
              >
                ดื่มด่ำกับดีไซน์ปูนเปลือยขัดมัน อิฐมอญธรรมชาติ และงานไม้โครงเหล็กดำสุดเท่ 
                ยกระดับสุนทรียภาพแห่งชีวิตสมัยใหม่ย่านปากเกร็ด นนทบุรี ใกล้ชิดทุกคอนเสิร์ตและอีเว้นท์ดัง
              </motion.p>
            </div>

            {/* Quick Actions buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap gap-4 items-center"
            >
              <button
                onClick={onExploreRooms}
                className="px-6 py-3.5 border border-neutral-850 hover:border-brick rounded text-neutral-300 hover:text-brick hover:bg-neutral-900/40 text-sm font-semibold tracking-wider transition-all duration-300 cursor-pointer"
              >
                ดูห้องพักทั้งหมด
              </button>
              <a
                href="#location"
                className="px-6 py-3.5 hover:bg-neutral-900 rounded text-neutral-450 hover:text-brick text-sm font-semibold transition-all duration-300"
              >
                ดูแผนที่ที่ตั้ง
              </a>
            </motion.div>

            {/* Interactive Availability form layout with concrete dark panel */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="bg-charcoal-medium/95 border border-charcoal-light/90 p-5 rounded-lg shadow-2xl relative rivet-effect"
            >
              {/* Corner mini screws */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-800"></div>

              <span className="font-mono text-xs text-neutral-500 block mb-3 uppercase tracking-wider">
                // ตรวจสอบเช็คห้องว่าง & อัตราค่าบริการแบบเรียลไทม์
              </span>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Check In Date */}
                <div className="relative">
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">วันเช็คอิน</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brick" />
                    <input
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full pl-9 pr-2 py-2 bg-neutral-900 border border-neutral-800 text-white text-sm rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                    />
                  </div>
                </div>

                {/* Check Out Date */}
                <div className="relative">
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">วันเช็คเอาท์</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brick" />
                    <input
                      type="date"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                      min={form.checkIn || new Date().toISOString().split("T")[0]}
                      className="w-full pl-9 pr-2 py-2 bg-neutral-900 border border-neutral-800 text-white text-sm rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="relative">
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">ผู้เข้าพัก</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brick" />
                    <select
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) })}
                      className="w-full pl-9 pr-2 py-2 bg-neutral-900 border border-neutral-800 text-white text-sm rounded focus:outline-none focus:border-brick cursor-pointer select-arrow"
                    >
                      <option value="1">1 ท่าน</option>
                      <option value="2">2 ท่าน</option>
                      <option value="3">3 ท่าน</option>
                    </select>
                  </div>
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-brick hover:bg-brick-dark text-white rounded font-semibold text-sm tracking-wide transition-all uppercase duration-250 flex items-center justify-center space-x-2 border border-brick-light/10 shadow-lg shadow-brick/20 hover:scale-[1.02]"
                  >
                    <Search className="h-4 w-4" />
                    <span>เช็คห้องว่าง</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* RIGHT: High quality image display framing mimicking the attached blueprint */}
          <div className="lg:col-span-5 relative w-full h-[320px] md:h-[480px]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 p-3 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative flex flex-col justify-end"
            >
              {/* Real images generated and imported */}
              <img
                src={gen.heroCardImg || defaultLobbyImg}
                alt="The M5 Residence Lobby"
                className="absolute inset-0 w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              {/* Overlay shading */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30"></div>
              
              {/* Bottom tag details */}
              <div className="relative z-10 p-4 space-y-1">
                <span className="font-mono text-xs text-brick uppercase tracking-widest font-bold">LOBBY DESK</span>
                <h3 className="text-lg font-bold text-white font-sans">มุมต้อนรับอันอบอุ่นและดิบเท่</h3>
                <p className="text-xs text-neutral-300 font-light">
                  โชว์เนื้อไม้สักป่าประกอบโครงเหล็กท่อพ่นสีพาวเดอร์โค้ทพร้อมผนังอิฐมอญสีแดงแบบลอนโค้ง
                </p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
