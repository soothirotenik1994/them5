import { useState } from "react";
import { Menu, X, Landmark, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSettings } from "../context/SettingsContext";

interface NavbarProps {
  onBookClick: () => void;
  onSectionScroll: (sectionId: string) => void;
}

export default function Navbar({ onBookClick, onSectionScroll }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSettings();
  const gen = settings.general;

  const menuItems = [
    { label: "หน้าแรก", id: "hero" },
    { label: "ห้องพัก", id: "rooms" },
    { label: "โปรโมชั่น", id: "promotions" },
    { label: "สิ่งอำนวยความสะดวก", id: "amenities" },
    { label: "ที่ตั้งและการเดินทาง", id: "location" },
    { label: "ติดต่อเรา", id: "footer" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-charcoal-deep/90 border-b border-charcoal-light backdrop-blur-md rivet-effect">
      {/* Decorative metal rivet pins */}
      <div className="absolute top-1 left-2 w-1 h-1 rounded-full bg-neutral-800/80 shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
      <div className="absolute top-1 right-2 w-1 h-1 rounded-full bg-neutral-800/80 shadow-[0_1px_1px_rgba(255,255,255,0.1)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Brand exactly like mock */}
          <div 
            onClick={() => onSectionScroll("hero")} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            {gen.logoUrl ? (
              <div className="h-12 flex items-center justify-center p-1 bg-neutral-900 border border-neutral-800 rounded-md shadow-md overflow-hidden min-w-[48px]">
                <img 
                  src={gen.logoUrl} 
                  alt={gen.hotelName} 
                  className="h-full object-contain max-h-10 max-w-[140px]" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-md relative flex items-center justify-center shadow-md">
                <div className="absolute inset-0 bg-gradient-to-tr from-brick/20 to-transparent rounded-md"></div>
                {/* Custom Industrial Logo Icon */}
                <Landmark className="h-6 w-6 text-brick relative z-10" />
              </div>
            )}
            <div>
              <div className="flex items-center">
                <span className="font-mono text-xs text-brick tracking-[0.25em]">THE</span>
              </div>
              <div className="flex items-baseline -mt-1">
                <span className="text-2xl font-bold tracking-tight text-white group-hover:text-brick transition-colors">
                  {gen.hotelName.split(" ").slice(-1)[0] || "M5"}
                </span>
                <span className="ml-1 text-xs text-neutral-400 font-medium tracking-[0.15em] hidden sm:inline">RESIDENCE</span>
              </div>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionScroll(item.id)}
                className="px-4 py-2 text-[14px] text-neutral-300 hover:text-brick font-medium hover:bg-neutral-900/50 rounded-md transition-all duration-200"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Call to Action Button */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={onBookClick}
              className="flex items-center space-x-2 px-6 py-2.5 rounded bg-linear-to-r from-brick to-brick-dark text-white font-semibold text-sm tracking-wider uppercase border border-brick-light/20 shadow-lg shadow-brick/20 hover:scale-105 transition-all duration-200 relative group overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-white/20"></div>
              <CalendarDays className="h-4 w-4" />
              <span>จองห้องพัก</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-neutral-400 hover:text-brick hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brick"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sliding Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden bg-charcoal-medium border-t border-charcoal-light relative"
          >
            <div className="px-4 pt-3 pb-6 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionScroll(item.id);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 rounded-md text-base font-medium text-neutral-300 hover:text-brick hover:bg-neutral-900 transition-all font-sans"
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 px-2">
                <button
                  onClick={() => {
                    onBookClick();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded bg-brick hover:bg-brick-dark text-white font-bold tracking-wider text-center shadow-md transition-all"
                >
                  <CalendarDays className="h-5 w-5" />
                  <span>จองห้องพัก</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
