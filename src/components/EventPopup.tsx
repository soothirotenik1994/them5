import React, { useState, useEffect } from "react";
import { 
  X, Calendar, MapPin, Tag, ArrowRight, MessageCircle, 
  ChevronLeft, ChevronRight, CalendarDays, Table, Sparkles, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";
import { 
  getUpcomingEvents, 
  isEventInCurrentWeek, 
  isEventInNextWeek,
  getEventTimingBadge, 
  groupUpcomingEventsByWeek,
  getWeekBounds,
  formatWeekRangeThai
} from "../utils/eventDateUtils";

export default function EventPopup() {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  
  // Tab view inside popup: "featured" (ไฮไลท์) or "schedule" (ตารางสัปดาห์)
  const [viewMode, setViewMode] = useState<"featured" | "schedule">("featured");
  
  // Selected week filter in schedule view: "current" | "next" | "all"
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<"current" | "next" | "all">("current");

  // Carousel index for upcoming events
  const [currentIndex, setCurrentIndex] = useState(0);

  const timeoutSeconds = settings.general?.eventPopupTimeout !== undefined ? Number(settings.general.eventPopupTimeout) : 10;
  const [timeLeft, setTimeLeft] = useState<number>(10);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Countdown timer for auto-close
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

  // Compute upcoming events and weekly groupings
  const now = new Date();
  const rawEvents = settings.impactEvents || [];
  const activeEvents = rawEvents.filter((e) => e.active !== false);
  
  // Filter out ANY past event! Only show upcoming events
  const upcomingEvents = getUpcomingEvents(activeEvents, now);
  const currentWeekEvents = upcomingEvents.filter((e) => isEventInCurrentWeek(e.date, now));
  const nextWeekEvents = upcomingEvents.filter((e) => isEventInNextWeek(e.date, now));
  const weekGroups = groupUpcomingEventsByWeek(activeEvents, now);

  // Target events for the featured view (prefer current week, fallback to upcoming)
  const targetWeekEvents = currentWeekEvents.length > 0 ? currentWeekEvents : (upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5) : []);

  useEffect(() => {
    // 1. Check if event popup is enabled in admin settings
    const isEnabled = settings.general?.eventPopupEnabled;
    if (!isEnabled) {
      setIsOpen(false);
      return;
    }

    // If no upcoming events at all, don't show popup
    if (upcomingEvents.length === 0 && settings.general?.eventPopupMode !== "text") {
      return;
    }

    // Default to first item
    setCurrentIndex(0);

    // Short delay for better entrance transition feel
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [settings.general?.eventPopupEnabled, upcomingEvents.length]);

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
      const element = document.getElementById("booking-card-anchor") || document.getElementById("rooms-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const scrollToCalendar = () => {
    setIsOpen(false);
    const element = document.getElementById("impact-calendar-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getCategoryThai = (cat: string) => {
    if (cat === "Concert") return "คอนเสิร์ต";
    if (cat === "Exhibition") return "นิทรรศการ / เอ็กซ์โป";
    if (cat === "EVENT" || !cat) return "กิจกรรม";
    return cat;
  };

  // Currently displayed event in featured card
  const currentEvent = targetWeekEvents[currentIndex] || upcomingEvents[0] || null;

  // Selected events to show in schedule table view
  const scheduleEvents = selectedWeekFilter === "current" 
    ? (currentWeekEvents.length > 0 ? currentWeekEvents : upcomingEvents.slice(0, 4))
    : selectedWeekFilter === "next" 
    ? (nextWeekEvents.length > 0 ? nextWeekEvents : upcomingEvents.slice(0, 5))
    : upcomingEvents;

  // Current week bounds text
  const currentWeekBounds = getWeekBounds(now);
  const currentWeekRangeText = formatWeekRangeThai(currentWeekBounds.weekStart, currentWeekBounds.weekEnd);

  if (!isOpen || (!currentEvent && settings.general?.eventPopupMode !== "text")) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          id="event-popup-backdrop"
        />

        {/* Modal Panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          className="bg-[#0c0c0c] border border-neutral-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl relative flex flex-col font-sans max-h-[92vh]"
          id="event-popup-modal"
        >
          {/* Top Industrial Accent Rivets */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5 pointer-events-none"></div>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5 pointer-events-none"></div>
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5 pointer-events-none"></div>
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-900 border border-white/5 pointer-events-none"></div>

          {/* Header Banner badge */}
          <div className="p-3 bg-neutral-950/80 border-b border-neutral-900 flex justify-between items-center px-4">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brick opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brick"></span>
              </span>
              <span className="text-[10.5px] font-mono text-brick font-bold tracking-wider uppercase">
                // ข่าวสารและตารางกิจกรรมประจำสัปดาห์
              </span>
              {timeoutSeconds > 0 && (
                <span className="text-[9px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded ml-1 animate-pulse flex items-center gap-1">
                  <span>ปิดใน</span>
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

          {/* Week Announcement Strip & View Mode Switcher */}
          <div className="bg-neutral-900/60 border-b border-neutral-850 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1.5 text-neutral-350 font-mono text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-brick shrink-0" />
              <span>สัปดาห์ปัจจุบัน: <strong className="text-white">{currentWeekRangeText}</strong></span>
              {currentWeekEvents.length > 0 && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] px-1.5 py-0.2 rounded font-bold ml-1">
                  มี {currentWeekEvents.length} กิจกรรม
                </span>
              )}
            </div>

            {/* Toggle View: Featured Card vs Weekly Table */}
            <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("featured")}
                className={`px-2.5 py-1 rounded text-[10px] font-medium font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "featured" 
                    ? "bg-brick text-white shadow-sm" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>ไฮไลท์กิจกรรม</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("schedule")}
                className={`px-2.5 py-1 rounded text-[10px] font-medium font-mono transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "schedule" 
                    ? "bg-brick text-white shadow-sm" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Table className="h-3 w-3" />
                <span>ตารางงานสัปดาห์นี้ ({targetWeekEvents.length})</span>
              </button>
            </div>
          </div>

          {/* Modal Body Content (Scrollable if needed) */}
          <div className="overflow-y-auto max-h-[62vh] scrollbar-thin scrollbar-thumb-neutral-800">
            {viewMode === "featured" && currentEvent ? (
              <div>
                {/* Image display */}
                {currentEvent.imageUrl && (
                  <div className="w-full h-44 sm:h-48 bg-neutral-950 overflow-hidden relative border-b border-neutral-900">
                    <img 
                      src={currentEvent.imageUrl} 
                      alt={currentEvent.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                      <span className="bg-brick text-white text-[8.5px] font-mono font-extrabold px-2 py-0.5 rounded tracking-wider uppercase shadow-md">
                        {getCategoryThai(currentEvent.category)}
                      </span>
                      {(() => {
                        const timing = getEventTimingBadge(currentEvent.date, now);
                        return (
                          <span className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded shadow-md ${timing.color}`}>
                            {timing.text}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Prev/Next arrows if multiple events in this week */}
                    {targetWeekEvents.length > 1 && (
                      <div className="absolute bottom-3 right-3 flex items-center space-x-1.5 bg-black/70 backdrop-blur-sm p-1 rounded-md border border-white/10 z-10">
                        <button
                          type="button"
                          onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : targetWeekEvents.length - 1))}
                          className="p-1 text-white hover:text-brick rounded hover:bg-white/10 transition-colors"
                          title="กิจกรรมก่อนหน้า"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-neutral-300 px-1">
                          {currentIndex + 1} / {targetWeekEvents.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentIndex((prev) => (prev < targetWeekEvents.length - 1 ? prev + 1 : 0))}
                          className="p-1 text-white hover:text-brick rounded hover:bg-white/10 transition-colors"
                          title="กิจกรรมถัดไป"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-transparent pointer-events-none"></div>
                  </div>
                )}

                {/* Core Text Info Block */}
                <div className="p-5 sm:p-6 space-y-3.5 text-left">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                        {currentEvent.title}
                      </h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-300 pt-1 font-mono">
                      <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-brick-light shrink-0" />
                        <span>{currentEvent.date}</span>
                      </div>
                      {currentEvent.venue && (
                        <div className="flex items-center space-x-1.5 text-neutral-400">
                          <MapPin className="h-3.5 w-3.5 text-brick-light shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">{currentEvent.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {currentEvent.description && (
                    <p className="text-xs text-neutral-400 font-light leading-relaxed bg-neutral-950/60 p-3 rounded border border-neutral-900">
                      {currentEvent.description}
                    </p>
                  )}

                  {/* Recommendation notice */}
                  <div className="text-[10.5px] text-amber-400/95 font-mono font-medium leading-relaxed bg-amber-950/20 border border-amber-900/30 p-2.5 rounded flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">💡</span>
                    <span>
                      <strong>แนะนำ:</strong> กิจกรรมและคอนเสิร์ตใหญ่นี้ ส่งผลให้การจราจรหน้าอิมแพ็คติดขัด ควรรีบสำรองห้องพักสไตล์ลอฟท์ของ <strong>The M5 Residence</strong> (ใกล้เพียง 5-10 นาที) ล่วงหน้าเพื่อความสะดวกสูงสุด!
                    </span>
                  </div>

                  {/* Quick switcher tabs if multiple events */}
                  {targetWeekEvents.length > 1 && (
                    <div className="pt-1">
                      <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                        งานอื่นๆ ในสัปดาห์นี้:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {targetWeekEvents.map((evt, idx) => (
                          <button
                            key={evt.id || idx}
                            type="button"
                            onClick={() => setCurrentIndex(idx)}
                            className={`px-2 py-1 rounded text-[10px] font-mono text-left truncate max-w-[180px] transition-all cursor-pointer ${
                              idx === currentIndex 
                                ? "bg-brick text-white font-bold border border-brick-light" 
                                : "bg-neutral-900 hover:bg-neutral-850 text-neutral-400 border border-neutral-800"
                            }`}
                          >
                            {idx + 1}. {evt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Weekly Schedule Table View */
              <div className="p-4 sm:p-5 space-y-4">
                {/* Week filter pills */}
                <div className="flex flex-wrap gap-1.5 pb-1 border-b border-neutral-900">
                  <button
                    type="button"
                    onClick={() => setSelectedWeekFilter("current")}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedWeekFilter === "current"
                        ? "bg-brick text-white"
                        : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                    }`}
                  >
                    ⚡ สัปดาห์นี้ ({currentWeekEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekFilter("next")}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedWeekFilter === "next"
                        ? "bg-brick text-white"
                        : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                    }`}
                  >
                    📅 สัปดาห์หน้า ({nextWeekEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeekFilter("all")}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                      selectedWeekFilter === "all"
                        ? "bg-brick text-white"
                        : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                    }`}
                  >
                    🗓️ งานที่กำลังจะมาถึงทั้งหมด ({upcomingEvents.length})
                  </button>
                </div>

                {/* Table of Events */}
                <div className="space-y-2.5">
                  {scheduleEvents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-400 bg-neutral-950 rounded border border-neutral-900">
                      ไม่มีกิจกรรมในช่วงเวลาที่เลือก
                    </div>
                  ) : (
                    scheduleEvents.map((evt: any, idx: number) => {
                      const timing = getEventTimingBadge(evt.date, now);
                      return (
                        <div 
                          key={evt.id || idx}
                          className="p-3 bg-neutral-950/70 border border-neutral-900 hover:border-brick/40 rounded-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-amber-400 font-mono font-semibold text-xs flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-brick" />
                                {evt.date}
                              </span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${timing.color}`}>
                                {timing.text}
                              </span>
                              <span className="text-[9px] font-mono text-neutral-500 uppercase bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                                {getCategoryThai(evt.category)}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-brick-light transition-colors leading-snug">
                              {evt.title}
                            </h4>
                            <div className="text-[10px] text-neutral-450 flex items-center gap-1 font-mono">
                              <MapPin className="h-2.5 w-2.5 text-brick/70 shrink-0" />
                              <span className="truncate max-w-xs">{evt.venue || "IMPACT เมืองทองธานี"}</span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={handleBookNow}
                              className="px-3 py-1.5 bg-brick hover:bg-brick-dark text-white rounded text-[10.5px] font-mono font-bold tracking-wider uppercase transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <span>จองห้อง</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={scrollToCalendar}
                    className="text-[11px] text-brick-light hover:text-white underline font-mono cursor-pointer transition-colors"
                  >
                    ดูปฏิทินและรายละเอียดกิจกรรมทั้งหมดในหน้าหลัก →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons footer */}
          <div className="p-3.5 bg-neutral-950/70 border-t border-neutral-900 grid grid-cols-2 gap-2.5">
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
          {settings.general?.lineLink && (
            <div className="p-2.5 bg-[#06C755]/5 border-t border-[#06C755]/10 text-center flex items-center justify-center space-x-2">
              <span className="text-[10px] text-[#06C755] font-semibold flex items-center gap-1">
                <MessageCircle className="h-3 w-3 fill-current" />
                สอบถามโปรโมชั่นพิเศษทาง Line:
              </span>
              <a 
                href={settings.general.lineLink} 
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
