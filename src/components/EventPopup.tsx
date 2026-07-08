import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, Tag, ArrowRight, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";

export default function EventPopup() {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [popupContent, setPopupContent] = useState<{
    title: string;
    date: string;
    venue: string;
    description: string;
    imageUrl: string;
    category: string;
    lineLink?: string;
  } | null>(null);

  const timeoutSeconds = settings.general?.eventPopupTimeout !== undefined ? Number(settings.general.eventPopupTimeout) : 10;
  const [timeLeft, setTimeLeft] = useState<number>(10);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(timeoutSeconds);
    }
  }, [isOpen, timeoutSeconds]);

  useEffect(() => {
    if (!isOpen || timeoutSeconds <= 0 || timeLeft <= 0) {
      if (isOpen && timeoutSeconds > 0 && timeLeft === 0) {
        setIsOpen(false);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeLeft, timeoutSeconds]);

  useEffect(() => {
    // 1. Check if event popup is enabled in admin settings
    const isEnabled = settings.general?.eventPopupEnabled;
    if (!isEnabled) {
      setIsOpen(false);
      return;
    }

    // 2. Resolve the content based on the selected mode
    const mode = settings.general?.eventPopupMode || "auto";
    const eventsList = settings.impactEvents || [];
    const activeEvents = eventsList.filter((e) => e.active !== false);

    let resolvedTitle = "";
    let resolvedDate = "";
    let resolvedVenue = "";
    let resolvedDesc = "";
    let resolvedImg = "";
    let resolvedCat = "กิจกรรม";

    if (mode === "text") {
      resolvedTitle = settings.general?.eventPopupCustomTitle || "ข่าวสารกิจกรรมจากทางโรงแรม";
      resolvedDesc = settings.general?.eventPopupCustomDesc || "ไม่มีรายละเอียดข่าวสารเพิ่มเติม";
      resolvedImg = settings.general?.eventPopupCustomImg || "";
      resolvedVenue = settings.general?.contactAddress || "ปากเกร็ด นนทบุรี";
      resolvedDate = "ข่าวสารล่าสุด";
    } else if (mode === "custom") {
      const selectedId = settings.general?.eventPopupSelectedId;
      const foundEvent = activeEvents.find((e) => e.id === selectedId);
      if (foundEvent) {
        resolvedTitle = foundEvent.title;
        resolvedDate = foundEvent.date;
        resolvedVenue = foundEvent.venue;
        resolvedDesc = foundEvent.description || "";
        resolvedImg = foundEvent.imageUrl || "";
        resolvedCat = foundEvent.category;
      } else if (activeEvents.length > 0) {
        // Fallback to first active if selected is not found
        const first = activeEvents[0];
        resolvedTitle = first.title;
        resolvedDate = first.date;
        resolvedVenue = first.venue;
        resolvedDesc = first.description || "";
        resolvedImg = first.imageUrl || "";
        resolvedCat = first.category;
      } else {
        // No events at all
        return;
      }
    } else {
      // mode === "auto"
      if (activeEvents.length === 0) {
        return;
      }

      // Try to prioritize events of current month (e.g. July / กรกฎาคม)
      const thaiMonths = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
      ];
      const today = new Date();
      const currentMonthThai = thaiMonths[today.getMonth()]; // e.g. "กรกฎาคม"

      const monthPrioritized = activeEvents.find((e) => e.date.includes(currentMonthThai));
      const targetEvent = monthPrioritized || activeEvents[0];

      resolvedTitle = targetEvent.title;
      resolvedDate = targetEvent.date;
      resolvedVenue = targetEvent.venue;
      resolvedDesc = targetEvent.description || "";
      resolvedImg = targetEvent.imageUrl || "";
      resolvedCat = targetEvent.category;
    }

    setPopupContent({
      title: resolvedTitle,
      date: resolvedDate,
      venue: resolvedVenue,
      description: resolvedDesc,
      imageUrl: resolvedImg,
      category: resolvedCat,
      lineLink: settings.general?.lineLink
    });

    // Short delay for better entrance transition feel
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [settings]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const isBookingEnabled = settings.general?.bookingEnabled !== false;
  const facebookUrl = settings.general?.facebookUrl || "https://www.facebook.com/them5residence";

  const handleBookNow = () => {
    setIsOpen(false);
    if (!isBookingEnabled) {
      window.open(facebookUrl, "_blank", "noopener,noreferrer");
    } else {
      // Smooth scroll to the rooms section or trigger a booking button click
      const element = document.getElementById("booking-card-anchor") || document.getElementById("rooms-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const getCategoryThai = (cat: string) => {
    if (cat === "Concert") return "คอนเสิร์ต";
    if (cat === "Exhibition") return "นิทรรศการ / เอ็กซ์โป";
    if (cat === "EVENT" || !cat) return "กิจกรรม";
    return cat;
  };

  if (!isOpen || !popupContent) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          id="event-popup-backdrop"
        />

        {/* Modal Panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-[#0c0c0c] border border-neutral-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col font-sans rivet-effect"
          id="event-popup-modal"
        >
          {/* Corner Screws / Industrial details */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5"></div>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5"></div>
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5"></div>
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5"></div>

          {/* Header Banner badge */}
          <div className="p-3 bg-neutral-950/60 border-b border-neutral-900 flex justify-between items-center px-4">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brick opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brick"></span>
              </span>
              <span className="text-[10px] font-mono text-brick font-bold tracking-widest uppercase">
                // ข่าวสารและกิจกรรมเด่นประจำสัปดาห์
              </span>
              {timeoutSeconds > 0 && (
                <span className="text-[9px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded ml-1 animate-pulse flex items-center gap-1">
                  <span>ปิดอัตโนมัติใน</span>
                  <span className="text-amber-500 font-bold">{timeLeft}s</span>
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-neutral-450 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
              id="close-event-popup-btn"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Image display (only if imageUrl is present) */}
          {popupContent.imageUrl && (
            <div className="w-full h-48 bg-neutral-950 overflow-hidden relative border-b border-neutral-900">
              <img 
                src={popupContent.imageUrl} 
                alt={popupContent.title} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-brick text-white text-[8px] font-mono font-extrabold px-2 py-0.5 rounded tracking-widest uppercase">
                {getCategoryThai(popupContent.category)}
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent"></div>
            </div>
          )}

          {/* Core Text Info Block */}
          <div className="p-6 space-y-4 text-left">
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {popupContent.title}
              </h3>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-400 pt-1 font-mono">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brick-light shrink-0" />
                  <span>{popupContent.date}</span>
                </div>
                {popupContent.venue && (
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brick-light shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{popupContent.venue}</span>
                  </div>
                )}
              </div>
            </div>

            {popupContent.description && (
              <p className="text-xs text-neutral-400 font-light leading-relaxed bg-neutral-950/40 p-3 rounded border border-neutral-900">
                {popupContent.description}
              </p>
            )}

            <p className="text-[10px] text-amber-500/90 font-mono font-medium leading-relaxed bg-amber-950/10 border border-amber-900/20 p-2.5 rounded">
              💡 แนะนำ: คอนเสิร์ต/อีเวนต์ใหญ่นี้ ส่งผลให้การจราจรหน้าอิมแพ็คติดขัด ควรรีบสำรองห้องพักสไตล์ลอฟท์ของ The M5 Residence ล่วงหน้าเพื่อความสะดวกสูงสุด!
            </p>
          </div>

          {/* Action buttons footer */}
          <div className="p-4 bg-neutral-950/50 border-t border-neutral-900 grid grid-cols-2 gap-3">
            <button
              onClick={handleClose}
              className="py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-semibold uppercase font-mono tracking-wider transition-all cursor-pointer text-center flex items-center justify-center space-x-1"
              id="event-popup-ignore-btn"
            >
              <span>ปิดหน้าต่าง [ESC]</span>
              {timeoutSeconds > 0 && (
                <span className="text-[10px] text-amber-500 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30 font-bold ml-1 shrink-0">
                  {timeLeft}s
                </span>
              )}
            </button>
            <button
              onClick={handleBookNow}
              className="py-2.5 bg-brick hover:bg-brick-dark text-white rounded text-xs font-bold uppercase font-mono tracking-widest transition-all cursor-pointer shadow-lg shadow-brick/25 flex items-center justify-center space-x-1.5"
              id="event-popup-book-btn"
            >
              <span>{isBookingEnabled ? "จองห้องพักตอนนี้" : "ติดต่อจองผ่าน Facebook"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Line reservation link for quick support */}
          {popupContent.lineLink && (
            <div className="p-2.5 bg-[#06C755]/5 border-t border-[#06C755]/10 text-center flex items-center justify-center space-x-2">
              <span className="text-[10px] text-[#06C755] font-semibold flex items-center gap-1">
                <MessageCircle className="h-3 w-3 fill-current" />
                สอบถามโปรโมชั่นพิเศษทาง Line:
              </span>
              <a 
                href={popupContent.lineLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-white hover:text-[#06C755] font-bold underline transition-colors"
              >
                คลิกเพิ่มเพื่อน LINE
              </a>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
