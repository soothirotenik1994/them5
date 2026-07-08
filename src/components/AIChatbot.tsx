import React, { useState } from "react";
import { MessageCircle, Facebook, Phone, X, ExternalLink, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSettings();

  // Contact details from general settings (with fallback values)
  const lineId = settings.general?.lineId || "@m5residence";
  const lineLink = settings.general?.lineLink || `https://line.me/R/ti/p/%40${lineId.replace("@", "")}`;
  const facebookName = settings.general?.facebook || "The M5 Residence Loft";
  const facebookUrl = settings.general?.facebookUrl || "https://www.facebook.com/them5residence";
  const contactPhone = settings.general?.contactPhone || "02-M5-LOFT";
  const hotelNameTH = settings.general?.thaiName || "เดอะ เอ็มไฟว์ เรสซิเดนซ์";

  return (
    <div className="fixed bottom-6 right-6 z-45 font-sans">
      
      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-14 w-14 rounded-full bg-brick hover:bg-brick-dark text-white shadow-2xl shadow-brick/40 flex items-center justify-center border border-brick-light/30 relative cursor-pointer"
        id="floating-contact-btn"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <X key="close" className="h-6 w-6" />
          ) : (
            <div key="open" className="relative flex items-center justify-center">
              <MessageSquare className="h-6 w-6" />
              {/* Pulsing signal notification badge */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Floating Label (Shows only when closed) */}
      {!isOpen && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-neutral-950/90 border border-neutral-850 px-3 py-1 rounded text-[10px] font-mono text-brick uppercase tracking-widest whitespace-nowrap shadow-lg select-none hidden sm:block pointer-events-none">
          LINE & FACEBOOK CONTACT
        </div>
      )}

      {/* Contact Panel Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="absolute bottom-18 right-0 w-[90vw] sm:w-[360px] bg-charcoal-deep border border-neutral-800 rounded-xl shadow-2xl flex flex-col overflow-hidden relative rivet-effect"
            id="contact-panel-card"
          >
            {/* Corner Industrial Screw Accents */}
            <div className="absolute top-1.5 left-2 w-1 h-1 rounded-full bg-neutral-900 border-t border-l border-white/5"></div>
            <div className="absolute top-1.5 right-2 w-1 h-1 rounded-full bg-neutral-900 border-t border-r border-white/5"></div>

            {/* Header Banner */}
            <div className="p-4 bg-charcoal-medium border-b border-charcoal-light flex items-center justify-between">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] font-mono text-brick font-bold tracking-widest block uppercase">// QUICK CONNECT</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {hotelNameTH}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                id="close-contact-panel-btn"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Content Body: LINE & FB Contact Options */}
            <div className="p-5 space-y-4">
              
              {/* LINE Card */}
              <a 
                href={lineLink}
                target="_blank"
                rel="noreferrer"
                className="block p-4 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 hover:border-emerald-500/50 rounded-lg group transition-all duration-300 text-left"
                id="line-contact-link"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded bg-[#06C755] flex items-center justify-center text-white shrink-0 shadow-md">
                      <MessageCircle className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest uppercase">LINE OFFICIAL</span>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors mt-0.5 leading-tight">
                        เพิ่มไลน์แอด {lineId}
                      </h4>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-neutral-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-emerald-900/20 text-[11px] text-neutral-400 leading-relaxed font-light">
                  สอบถามข้อมูลห้องพัก, ขอเอกสารใบเสร็จ, หรือส่งหลักฐานแจ้งชำระเงินทางไลน์ได้ตลอด 24 ชั่วโมง
                </div>
              </a>

              {/* Facebook Card */}
              <a 
                href={facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="block p-4 bg-blue-950/10 hover:bg-blue-950/30 border border-blue-900/20 hover:border-blue-500/50 rounded-lg group transition-all duration-300 text-left"
                id="facebook-contact-link"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded bg-[#1877F2] flex items-center justify-center text-white shrink-0 shadow-md">
                      <Facebook className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 font-bold tracking-widest uppercase">FACEBOOK PAGE</span>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5 leading-tight">
                        {facebookName}
                      </h4>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-neutral-500 group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-blue-900/10 text-[11px] text-neutral-400 leading-relaxed font-light">
                  กดถูกใจแฟนเพจเพื่อรับข่าวสารโปรโมชั่น ส่วนลดห้องพักสุดพิเศษ ย่านปากเกร็ด-อิมแพ็ค เมืองทองธานี
                </div>
              </a>

              {/* Direct Call Phone Option */}
              <a 
                href={`tel:${contactPhone}`}
                className="block p-3 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-brick/50 rounded-lg group transition-all duration-300 text-left"
                id="phone-contact-link"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded bg-brick/10 border border-brick/20 flex items-center justify-center text-brick-light shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-500 tracking-wider block uppercase">CALL RESERVATION</span>
                      <span className="text-xs font-bold text-white group-hover:text-brick-light transition-colors font-mono">
                        {contactPhone}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono group-hover:text-brick-light transition-colors">CALL 📞</span>
                </div>
              </a>

            </div>

            {/* Industrial Bottom Badge Footer */}
            <div className="p-3 bg-neutral-950/60 border-t border-neutral-900 text-center">
              <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                THE M5 RESIDENCE // PREMIUM URBAN COMFORT
              </span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
