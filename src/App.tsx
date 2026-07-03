import { useState, useEffect, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { 
  Landmark, CalendarDays, Menu, X, ShieldAlert, Phone, Mail, MapPin, 
  Facebook, Instagram, ChevronDown, ChevronUp, Zap, Sparkles, Wifi, 
  Tv, Check, Coffee, Car, Shield, Compass, BookOpen, Star, Images, ArrowRight,
  CloudSun, CloudRain, Cloud, Wind, Droplets, RefreshCw, UserPlus, UserCheck,
  User, LogOut, Clock
} from "lucide-react";
import { useSettings, defaultFaqs, defaultReviews, defaultGallery } from "./context/SettingsContext";
import BookingModal from "./components/BookingModal";
import AIChatbot from "./components/AIChatbot";
import AdminDashboard from "./components/AdminDashboard";
import { CheckAvailabilityRequest } from "./types";

// @ts-ignore
import lobbyImg from "./assets/images/lobby_loft_m5_1782203250164.jpg";
// @ts-ignore
import superiorImg from "./assets/images/bedroom_superior_m5_1782203272229.jpg";
// @ts-ignore
import studioImg from "./assets/images/bedroom_studio_m5_1782203293730.jpg";
// @ts-ignore
import deluxeImg from "./assets/images/bedroom_deluxe_m5_1782203318372.jpg";

export default function App() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("deluxe");
  const [path, setPath] = useState(window.location.pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedRoomIdx, setExpandedRoomIdx] = useState<number | null>(null);

  // States for new interactive modules
  const [selected360Room, setSelected360Room] = useState<any | null>(null);
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null);
  const [selectedGalleryImg, setSelectedGalleryImg] = useState<{ url: string; title: string; category: string } | null>(null);
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState("ทั้งหมด");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxItems, setLightboxItems] = useState<any[]>([]);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [quickIn, setQuickIn] = useState("");
  const [quickOut, setQuickOut] = useState("");
  const [quickRoom, setQuickRoom] = useState("deluxe");
  const [quickGuests, setQuickGuests] = useState(2);
  const [impactFilterCategory, setImpactFilterCategory] = useState("ทั้งหมด");
  const [impactSearchQuery, setImpactSearchQuery] = useState("");

  // Initialize dates for Quick-Check Bar on load
  useEffect(() => {
    const today = new Date();
    const tom = new Date(today);
    tom.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    setQuickIn(tom.toISOString().split("T")[0]);
    setQuickOut(dayAfter.toISOString().split("T")[0]);
  }, []);

  // Weather state and fetcher utilizing Gemini with Google Search grounding
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const fetchWeather = async () => {
    setIsWeatherLoading(true);
    try {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (data.success) {
        setWeatherData(data);
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  // Keyboard Navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        if (lightboxIndex < lightboxItems.length - 1) {
          setLightboxIndex((prev) => (prev !== null ? prev + 1 : null));
        }
      } else if (e.key === "ArrowLeft") {
        if (lightboxIndex > 0) {
          setLightboxIndex((prev) => (prev !== null ? prev - 1 : null));
        }
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, lightboxItems]);

  const { settings, bookings, currentMember, logoutMember, registerMember, loginMember, updateMemberOnServer } = useSettings();
  const gen = settings.general;
  const rooms = settings.rooms;

  // Dynamic SEO Setup to get indexed on Google Search / Google SEO ranking!
  useEffect(() => {
    if (gen) {
      // 1. Update document Title
      document.title = gen.seoTitle || `${gen.hotelName} | ${gen.thaiName || "ที่พักสไตล์ลอฟท์"}`;

      // 2. Update/Create Meta Description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', gen.seoDescription || gen.heroSubtitle);

      // 3. Update/Create Meta Keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', gen.seoKeywords || "The M5 Residence, โรงแรมลอฟท์, ปากเกร็ด, นนทบุรี");
    }
  }, [gen]);

  // Background slider of the Lobby Cover side
  const [activeCoverImgIdx, setActiveCoverImgIdx] = useState(0);
  
  const coverImages = (settings.slides && settings.slides.length > 0)
    ? settings.slides.map((slide, idx) => {
        let finalUrl = slide.url;
        if (!finalUrl) {
          if (idx === 0) finalUrl = gen.coverImg1 || lobbyImg;
          else if (idx === 1) finalUrl = gen.coverImg2 || superiorImg;
          else if (idx === 2) finalUrl = gen.coverImg3 || deluxeImg;
          else finalUrl = lobbyImg;
        }
        return {
          url: finalUrl,
          label: slide.label || `SLIDE ${idx + 1}`,
          desc: slide.desc || ""
        };
      })
    : [
        { url: gen.coverImg1 || lobbyImg, label: "LOBBY RECEPTION", desc: "โชว์เนื้อไม้สักป่าประกอบโครงเหล็กท่อดำสไตล์อินดัสเทรียลลอฟท์" },
        { url: gen.coverImg2 || superiorImg, label: "SUPERIOR ROOM", desc: "ห้องนอนแต่งขอบปูนเปลือยขัดมันพร้อมเฟอร์นิเจอร์สั่งตัดพิเศษ" },
        { url: gen.coverImg3 || deluxeImg, label: "DELUXE ROOM", desc: "สเปซส่วนตัวกว้างขวางโอบรับแสงแดดยามเช้าผ่านกระจกบานใหญ่" }
      ];

  // Auto-play interval for cinematic cover images
  useEffect(() => {
    if (coverImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCoverImgIdx((prev) => (prev + 1) % coverImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [coverImages.length]);

  // Prevent index out of bounds if slides are modified
  useEffect(() => {
    if (activeCoverImgIdx >= coverImages.length) {
      setActiveCoverImgIdx(0);
    }
  }, [coverImages.length, activeCoverImgIdx]);

  const [isMemberPortalOpen, setIsMemberPortalOpen] = useState(false);
  const [memberPortalMode, setMemberPortalMode] = useState<"login" | "register">("login");
  const [pEmail, setPEmail] = useState("");
  const [pPassword, setPPassword] = useState("");
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");

  const [memberPortalTab, setMemberPortalTab] = useState<"card" | "profile">("card");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editStatusMsg, setEditStatusMsg] = useState("");

  useEffect(() => {
    if (currentMember) {
      setEditName(currentMember.name || "");
      setEditPhone(currentMember.phone || "");
      setEditEmail(currentMember.email || "");
      setEditPassword(currentMember.password || "");
      setEditStatusMsg("");
    }
  }, [currentMember, isMemberPortalOpen]);

  // Refs for smooth scrolling sections inside scrollable content pane
  const roomsRef = useRef<HTMLDivElement>(null);
  const gallerySectionRef = useRef<HTMLDivElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, "", newPath);
    setPath(newPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Safe navigation handler
  const handleSectionScroll = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    
    // Check if we are on wide screens or mobile
    const isWide = window.innerWidth >= 1024;

    if (sectionId === "hero" || sectionId === "top") {
      if (isWide) {
        // Return active cover index to lobby reception
        setActiveCoverImgIdx(0);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (isWide) {
      // Scroll inside the right-hand panel
      let targetRef;
      if (sectionId === "rooms") targetRef = roomsRef;
      else if (sectionId === "gallery") targetRef = gallerySectionRef;
      else if (sectionId === "amenities" || sectionId === "promotions") targetRef = amenitiesRef;
      else if (sectionId === "location") targetRef = locationRef;
      else if (sectionId === "footer") targetRef = contactRef;

      if (targetRef && targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Scroll the main document
      const element = document.getElementById(sectionId);
      if (element) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }
  };

  const handleBookClick = () => {
    setSelectedRoomId("deluxe");
    setIsBookingOpen(true);
  };

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsBookingOpen(true);
  };

  // If visiting /admin, render the admin dashboard as a full page
  if (path === "/admin") {
    return (
      <AdminDashboard 
        isOpen={true}
        onClose={() => navigateTo("/")}
        isFullPage={true}
      />
    );
  }

  // Fallback map for static assets in case of non-mapped paths
  const resolvedImages: Record<string, string> = {
    superior: superiorImg,
    deluxe: deluxeImg,
    studio: studioImg
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 selection:bg-brick selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* HEADER: Deep Charcoal/Dark Metal Panel exactly like the mockup */}
      <nav className="sticky top-0 z-40 bg-[#0d0d0d] border-b border-neutral-900/80 backdrop-blur-md relative">
        {/* Decorative metal rivets line */}
        <div className="absolute top-1 left-3 w-1 h-1 rounded-full bg-neutral-800 shadow-[0_1px_0_rgba(255,255,255,0.06)]"></div>
        <div className="absolute top-1 right-3 w-1 h-1 rounded-full bg-neutral-800 shadow-[0_1px_0_rgba(255,255,255,0.06)]"></div>
        
        <div className="max-w-[1700px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo Brand structure like reference mock */}
            <div 
              onClick={() => handleSectionScroll("hero")} 
              className="flex items-center space-x-3 cursor-pointer group"
            >
              {gen.logoUrl ? (
                <div className="h-12 flex items-center justify-center p-1 bg-neutral-950 border border-neutral-800 rounded-md shadow-md overflow-hidden min-w-[48px]">
                  <img 
                    src={gen.logoUrl} 
                    alt={gen.hotelName} 
                    className="h-full object-contain max-h-10 max-w-[140px]" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-neutral-950 border border-neutral-850 rounded relative flex items-center justify-center shadow">
                  <div className="absolute inset-0 bg-gradient-to-tr from-brick/20 to-transparent rounded"></div>
                  <Landmark className="h-5 w-5 text-brick relative z-10" />
                </div>
              )}
              
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-brick tracking-[0.3em] font-bold">THE</span>
                <div className="flex items-baseline -mt-1.5">
                  <span className="text-xl lg:text-2xl font-bold tracking-tight text-white group-hover:text-brick transition-colors font-mono">
                    {gen.hotelName.split(" ").slice(-1)[0] || "M5"}
                  </span>
                  <span className="ml-1 text-[10px] text-neutral-450 font-medium tracking-[0.15em] font-sans">RESIDENCE</span>
                </div>
              </div>
            </div>

            {/* Middle Nav Links: Separated with pipes | exact mockup style */}
            <div className="hidden xl:flex items-center space-x-0">
              <button onClick={() => handleSectionScroll("hero")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">หน้าแรก</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("rooms")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">ห้องพัก</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("gallery")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">แกลเลอรีภาพ</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("amenities")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">โปรโมชั่น</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("amenities")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">สิ่งอำนวยความสะดวก</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("location")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans">ที่ตั้งและการเดินทาง</button>
              <span className="text-neutral-800 text-[10px] select-none">|</span>
              <button onClick={() => handleSectionScroll("footer")} className="px-3.5 py-1.5 text-xs text-neutral-350 hover:text-brick font-medium transition-colors font-sans font-semibold text-brick-light">ติดต่อเรา</button>
            </div>

            {/* Right Side Container */}
            <div className="flex items-center space-x-4 shrink-0">
              {/* Booking Action Button & Member Pill */}
              <div className="hidden lg:flex items-center space-x-3 shrink-0">
                {currentMember ? (
                  <div className="flex items-center space-x-2 shrink-0 bg-neutral-950/60 p-1 rounded-lg border border-neutral-850">
                    <button
                      onClick={() => {
                        setMemberPortalTab("card");
                        setIsMemberPortalOpen(true);
                      }}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-850 text-white transition-all duration-200 cursor-pointer font-sans whitespace-nowrap shrink-0"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        currentMember.tier === "Elite" ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" :
                        currentMember.tier === "Gold" ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" :
                        "bg-slate-300 shadow-[0_0_8px_#cbd5e1]"
                      }`} />
                      <span className="text-xs font-bold font-sans">
                        คุณ {currentMember.name.split(" ")[0]}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-450 font-bold border border-neutral-850">
                        {currentMember.tier}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setMemberPortalTab("profile");
                        setIsMemberPortalOpen(true);
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-neutral-850 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer font-sans whitespace-nowrap shrink-0"
                      title="ข้อมูลส่วนตัว (Edit Profile)"
                    >
                      <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>โปรไฟล์</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("คุณต้องการออกจากระบบสมาชิกใช่หรือไม่?")) {
                          logoutMember();
                          setIsMemberPortalOpen(false);
                        }
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-red-950/30 text-neutral-400 hover:text-red-400 text-xs font-medium transition-all cursor-pointer font-sans whitespace-nowrap shrink-0 border-l border-neutral-800"
                      title="ออกจากระบบสมาชิก (Log Out)"
                    >
                      <LogOut className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      <span>ออก</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setMemberPortalMode("login");
                        setIsMemberPortalOpen(true);
                      }}
                      className="flex items-center space-x-1 px-3 py-2.5 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-850 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer font-sans whitespace-nowrap shrink-0"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-brick shrink-0" />
                      <span>เข้าสู่ระบบ</span>
                    </button>
                    <button
                      onClick={() => {
                        setMemberPortalMode("register");
                        setIsMemberPortalOpen(true);
                      }}
                      className="flex items-center space-x-1 px-3.5 py-2.5 rounded bg-brick hover:bg-brick-dark text-white border border-brick-light/10 text-xs font-bold transition-all cursor-pointer font-sans whitespace-nowrap shrink-0 shadow shadow-brick/15"
                    >
                      <UserPlus className="h-3.5 w-3.5 shrink-0" />
                      <span>สมัครสมาชิก</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handleBookClick}
                  className="flex items-center space-x-2 px-6 py-3 rounded bg-brick hover:bg-brick-dark text-white font-semibold text-xs tracking-wider border border-brick-light/10 shadow-lg shadow-brick/20 hover:scale-[1.03] transition-all hover:brightness-110 relative overflow-hidden font-sans cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 15px rgba(217,90,6,0.3)"
                  }}
                >
                  <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-white/20 animate-pulse"></div>
                  <CalendarDays className="h-4 w-4" />
                  <span>จองห้องพัก</span>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="xl:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2.5 rounded bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

         {/* Mobile Sliding Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-[#0a0a0a] border-b border-neutral-900 absolute top-20 left-0 w-full z-50 p-5 space-y-3 animate-fadeIn">
            {currentMember ? (
              <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded flex flex-col space-y-2.5 mb-2 text-left">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] text-brick font-mono tracking-widest block">CLUB M5 MEMBER</span>
                    <span className="text-xs font-bold text-white">คุณ {currentMember.name}</span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">คลาสสมาชิก: {currentMember.tier} ({currentMember.points} pts)</span>
                  </div>
                  <button
                    onClick={() => {
                      setMemberPortalTab("card");
                      setIsMobileMenuOpen(false);
                      setIsMemberPortalOpen(true);
                    }}
                    className="px-2 py-1 bg-brick/10 border border-brick/30 text-brick rounded text-[10px] font-bold cursor-pointer"
                  >
                    บัตรสมาชิก
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      setMemberPortalTab("profile");
                      setIsMobileMenuOpen(false);
                      setIsMemberPortalOpen(true);
                    }}
                    className="py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 rounded text-[10px] font-semibold text-center cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <User className="h-3 w-3 text-emerald-400" />
                    <span>ข้อมูลส่วนตัว</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("คุณต้องการออกจากระบบสมาชิกใช่หรือไม่?")) {
                        logoutMember();
                        setIsMobileMenuOpen(false);
                        setIsMemberPortalOpen(false);
                      }
                    }}
                    className="py-1.5 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 rounded text-[10px] font-semibold text-center cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <LogOut className="h-3 w-3 text-red-500" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-950 border border-neutral-850 rounded flex flex-col space-y-2.5 mb-2 text-left">
                <div>
                  <span className="text-xs font-bold text-white block">สิทธิประโยชน์สมาชิก CLUB M5</span>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">รับคะแนนสะสม พรีเมียมมินิบาร์ และส่วนลดสูงสุด 15%</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMemberPortalMode("login");
                      setIsMemberPortalOpen(true);
                    }}
                    className="py-2 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded text-[11px] font-bold text-center cursor-pointer"
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setMemberPortalMode("register");
                      setIsMemberPortalOpen(true);
                    }}
                    className="py-2 bg-brick text-white rounded text-[11px] font-bold text-center cursor-pointer"
                  >
                    สมัครสมาชิกฟรี
                  </button>
                </div>
              </div>
            )}
            
            <button onClick={() => handleSectionScroll("hero")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">หน้าแรก</button>
            <button onClick={() => handleSectionScroll("rooms")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">ห้องพักสไตล์ลอฟท์</button>
            <button onClick={() => handleSectionScroll("gallery")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">แกลเลอรีภาพถ่าย</button>
            <button onClick={() => handleSectionScroll("amenities")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">สิ่งอำนวยความสะดวก</button>
            <button onClick={() => handleSectionScroll("location")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">ที่ตั้งและการเดินทาง</button>
            <button onClick={() => handleSectionScroll("footer")} className="block w-full text-left py-2.5 px-4 text-sm text-neutral-300 hover:text-brick hover:bg-neutral-900/50 rounded transition-all">ติดต่อเรา</button>
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleBookClick();
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-brick hover:bg-brick-dark text-white rounded font-bold text-center shadow-lg shadow-brick/20"
            >
              <CalendarDays className="h-4 w-4" />
              <span>จองห้องพักด่วน</span>
            </button>
          </div>
        )}
      </nav>

      {/* CORE CONTENT LAYOUT */}
      {/* DESKTOP:magazine spread 2-cols split layout | MOBILE: stacked sequential layout */}
      <div className="relative max-w-[1700px] mx-auto w-full flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN: Cinematic Showcase Cover */}
        {/* Sticks on desktop, scrolls like a wrapper on mobile */}
        <div className="w-full lg:w-[62%] xl:w-[65%] lg:h-[calc(100vh-80px)] lg:fixed lg:top-20 lg:left-0 z-10 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-neutral-900">
          
          {/* Active Background Fade-in effect */}
          <div className="absolute inset-0 z-0 bg-[#070707] transition-all duration-700">
            <img 
              src={coverImages[activeCoverImgIdx].url} 
              alt={coverImages[activeCoverImgIdx].label}
              className="w-full h-full object-cover opacity-60 scale-100 hover:scale-105 transition-all duration-[8000ms] ease-out brightness-90"
            />
            {/* Cinematic Overlay: matching vignette depth of mockup */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/30 to-black/60"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/10"></div>
          </div>

          {/* Top category label */}
          <div className="relative z-10 self-start">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brick/10 border border-brick/40 rounded-full text-[10px] font-mono tracking-widest text-brick uppercase shadow-[0_4px_12px_rgba(255,106,0,0.15)] backdrop-blur-sm animate-pulse">
              <Sparkles className="h-3 w-3 text-brick-light shrink-0" />
              <span>THE M5 RESIDENCE</span>
            </div>
          </div>

          {/* Middle: Majestic Brand Title exactly conforming to mockup reference */}
          <div className="relative z-10 max-w-2xl my-24 lg:my-auto space-y-6">
            <span className="font-mono text-xs sm:text-sm tracking-[0.45em] text-brick-light block uppercase font-semibold">
              THE M5 RESIDENCE:
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.12]">
              {gen.heroTitle || "นิยามใหม่ของการพักผ่อนสไตล์ลอฟท์"}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-neutral-300 font-light leading-relaxed max-w-xl">
              {gen.heroSubtitle || "ดีไซน์เท่ ทันสมัย ใกล้ทุกการเดินทางในปากเกร็ด นนทบุรี ใกล้อิมแพ็คเพียง 5-10 นาที"}
            </p>

            {/* Custom CTAs matching layout buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button 
                onClick={() => handleSectionScroll("rooms")}
                className="px-6 py-3.5 border border-neutral-700 hover:border-brick-light bg-black/40 hover:bg-black/60 rounded text-neutral-250 hover:text-white text-xs sm:text-sm tracking-wider uppercase font-sans font-semibold transition-all duration-300 backdrop-blur-sm hover:scale-105"
              >
                ดูห้องพักทั้งหมด
              </button>
              <button 
                onClick={handleBookClick}
                className="px-6 py-3.5 bg-brick hover:bg-brick-dark border border-brick-light/10 hover:border-brick text-white rounded text-xs sm:text-sm tracking-wider uppercase font-sans font-bold transition-all duration-300 shadow-xl shadow-brick/25 hover:scale-105 cursor-pointer"
                style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
              >
                จองห้องพัก
              </button>
            </div>
          </div>

          {/* Bottom Left: Interactive Thumbnail Carousel swapper */}
          {/* Exactly mimics the room previews on the mockup slider footer */}
          <div className="relative z-10 w-full pt-4 border-t border-neutral-900/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-mono text-brick uppercase tracking-widest block font-bold">
                {coverImages[activeCoverImgIdx].label}
              </span>
              <p className="text-xs text-neutral-400 font-light truncate max-w-md">
                {coverImages[activeCoverImgIdx].desc}
              </p>
            </div>

            {/* Thumbnail clickable capsules row */}
            <div className="flex items-center space-x-2 shrink-0 select-none">
              {coverImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCoverImgIdx(idx)}
                  className={`relative group shrink-0 outline-none transition-all duration-300 rounded ${
                    activeCoverImgIdx === idx 
                      ? "ring-2 ring-brick border-transparent scale-105" 
                      : "opacity-60 hover:opacity-100 border border-neutral-800"
                  }`}
                >
                  <div className="h-10 w-16 overflow-hidden rounded relative">
                    <img src={img.url} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent duration-200"></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Curated Content Stream Dashboard */}
        {/* On desktop, scrolls independently as right-hand paper ledger */}
        <div className="w-full lg:w-[38%] xl:w-[35%] lg:ml-[62%] xl:ml-[65%] min-h-[calc(100vh-80px)] bg-[#0c0c0c] flex flex-col relative z-25 select-none">
          
          {/* LIVE BOOKING PRE-CHECK BAR (ระบบคำนวณและจองห้องว่างด่วน) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 bg-neutral-950/60 space-y-4 relative">
            <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-neutral-800"></div>
            <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-neutral-800"></div>
            
            <div className="border-l-2 border-brick pl-3">
              <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono flex items-center space-x-2">
                <Zap className="h-4 w-4 text-brick animate-pulse shrink-0" />
                <span>ตรวจสอบเข้าพัก & จองด่วน</span>
              </h2>
              <span className="font-mono text-[9px] text-neutral-500 block tracking-[0.15em] uppercase">
                LIVE AVAILABILITY PRE-CHECK
              </span>
            </div>

            {settings.general?.bookingEnabled === false ? (
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-3 text-center animate-fade-in">
                <ShieldAlert className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-500 block font-sans">ระบบจองออนไลน์ปิดทำการชั่วคราว</span>
                  <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
                    {settings.general?.bookingDisabledMessage || "ขออภัย ระบบจองห้องพักออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากมีข้อสงสัยหรือต้องการจองด่วน สามารถติดต่อผ่าน Line ID หรือเบอร์โทรศัพท์ได้โดยตรง"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-900 text-[10px] text-neutral-400 font-mono">
                  {settings.general?.contactPhone && (
                    <div className="text-left">
                      <span>📞 โทร: {settings.general.contactPhone}</span>
                    </div>
                  )}
                  {settings.general?.lineId && (
                    <div className="text-right">
                      <span>💬 Line: {settings.general.lineId}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Date selection row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 font-bold mb-1">วันเช็คอิน</label>
                    <input
                      type="date"
                      value={quickIn}
                      onChange={(e) => setQuickIn(e.target.value)}
                      className="w-full px-2.5 py-2 bg-neutral-900/90 border border-neutral-800 text-white text-[11px] rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 font-bold mb-1">วันเช็คเอาท์</label>
                    <input
                      type="date"
                      value={quickOut}
                      onChange={(e) => setQuickOut(e.target.value)}
                      className="w-full px-2.5 py-2 bg-neutral-900/90 border border-neutral-800 text-white text-[11px] rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                    />
                  </div>
                </div>

                {/* Room and Guests selection row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 font-bold mb-1">เลือกสไตล์ห้อง</label>
                    <select
                      value={quickRoom}
                      onChange={(e) => setQuickRoom(e.target.value)}
                      className="w-full px-2 py-2 bg-neutral-900 border border-neutral-800 text-white text-[11px] rounded focus:outline-none focus:border-brick text-left cursor-pointer font-sans"
                    >
                      {rooms.filter((r: any) => r.active !== false).map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.thaiName || r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-neutral-400 font-bold mb-1">ผู้เข้าพัก</label>
                    <select
                      value={quickGuests}
                      onChange={(e) => setQuickGuests(parseInt(e.target.value))}
                      className="w-full px-2 py-2 bg-neutral-900 border border-neutral-800 text-white text-[11px] rounded focus:outline-none focus:border-brick cursor-pointer"
                    >
                      <option value="1">1 ท่าน</option>
                      <option value="2">2 ท่าน</option>
                      <option value="3">3 ท่าน (เฉพาะ Superior)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedRoomId(quickRoom);
                    setIsBookingOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-brick hover:bg-brick-dark text-white rounded text-center font-mono font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-brick/15 flex items-center justify-center space-x-2"
                  style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
                >
                  <span>จองและตรวจสอบห้องว่างด่วน</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* WEATHER WIDGET (รายงานสภาพอากาศปากเกร็ด) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 bg-neutral-950/20 space-y-4 relative">
            <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-neutral-800"></div>
            <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-neutral-800"></div>
            
            <div className="flex justify-between items-start">
              <div className="border-l-2 border-brick pl-3">
                <h2 className="text-sm font-bold tracking-tight text-white uppercase font-mono flex items-center space-x-2">
                  <CloudSun className="h-4 w-4 text-amber-500" />
                  <span>พยากรณ์อากาศปากเกร็ด</span>
                </h2>
                <span className="font-mono text-[9px] text-neutral-500 block tracking-[0.15em] uppercase">
                  PAK KRET WEATHER GROUNDING
                </span>
              </div>
              
              <button
                onClick={fetchWeather}
                disabled={isWeatherLoading}
                className={`p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer ${
                  isWeatherLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title="อัปเดตข้อมูลสภาพอากาศสด"
              >
                <RefreshCw className={`h-3 w-3 ${isWeatherLoading ? "animate-spin text-brick" : ""}`} />
              </button>
            </div>

            {weatherData ? (
              <div className="space-y-4 pt-1 animate-fade-in">
                {/* Weather card display */}
                <div className="grid grid-cols-12 gap-4 p-4 bg-neutral-900/50 border border-neutral-850/80 rounded-xl relative overflow-hidden">
                  {/* Subtle layout lines */}
                  <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-5">
                    <CloudSun className="w-full h-full text-white" />
                  </div>

                  <div className="col-span-5 flex flex-col justify-center border-r border-neutral-800/60 pr-3">
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-bold font-mono text-white tracking-tighter">
                        {weatherData.temp || 32}
                      </span>
                      <span className="text-sm font-medium text-amber-500">°C</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-1 block">
                      {weatherData.condition || "Cloudy"}
                    </span>
                  </div>

                  <div className="col-span-7 flex flex-col justify-between pl-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-200">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <span>{weatherData.conditionTh || "มีเมฆมาก"}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <Droplets className="h-3 w-3 text-sky-400 shrink-0" />
                          <span>{weatherData.humidity || "70%"}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Wind className="h-3 w-3 text-teal-400 shrink-0" />
                          <span className="truncate">{weatherData.wind || "12 km/h"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-neutral-500 font-mono mt-2 flex items-center justify-between">
                      <span>อัปเดต: {weatherData.lastUpdated || "เพิ่งอัปเดต"}</span>
                    </div>
                  </div>
                </div>

                {/* Advice bubble */}
                <div className="p-3 bg-neutral-950/40 border border-neutral-850/60 rounded-xl relative pl-9 leading-relaxed text-xs">
                  <div className="absolute left-3 top-3.5 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-brick animate-pulse" />
                  </div>
                  <div className="font-sans text-neutral-300">
                    <span className="font-bold text-brick text-[10px] font-mono block uppercase mb-1 tracking-wider">
                      เอ็มมี่ (M-My) Concierge Advice
                    </span>
                    {weatherData.advice || "พกร่มติดตัวไปด้วยสำหรับการเดินทาง และขอให้เพลิดเพลินกับการเข้าพักนะครับ!"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-neutral-900/20 border border-neutral-850 rounded-xl space-y-2">
                <RefreshCw className="h-5 w-5 mx-auto text-neutral-600 animate-spin" />
                <p className="text-[11px] text-neutral-500 font-mono uppercase tracking-wider">
                  กำลังพยากรณ์สภาพอากาศด้วย Gemini...
                </p>
              </div>
            )}
          </div>

          {/* SECTION 1: EXCLUSIVE LOFT ROOMS */}
          <div id="rooms" ref={roomsRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-6">
            <div className="border-l-2 border-brick pl-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                ห้องพักสไตล์ลอฟท์สุดพิเศษ
              </h2>
              <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                EXCLUSIVE LOFT ROOMS
              </span>
            </div>

            {/* Renders dynamic catalog directly from database */}
            <div className="space-y-5">
              {(() => {
                const activeRooms = rooms.filter((r: any) => r.active !== false);
                if (activeRooms.length === 0) {
                  return (
                    <div className="p-8 text-center bg-[#111111] border border-neutral-900 rounded-lg">
                      <p className="text-xs text-neutral-500 font-sans">ขออภัย ขณะนี้ยังไม่มีข้อมูลห้องพักที่เปิดให้บริการ</p>
                    </div>
                  );
                }
                return activeRooms.map((room, idx) => {
                  const roomImg = room.imageUrl || resolvedImages[room.id] || deluxeImg;
                  const isExpanded = expandedRoomIdx === idx;

                  return (
                    <div 
                      key={room.id}
                      className="p-4 bg-[#111111] border border-neutral-900 rounded-lg shadow-md group hover:border-neutral-800 transition-all duration-300"
                    >
                      {/* Thumbnail representation */}
                      <div className="relative h-44 sm:h-48 w-full overflow-hidden rounded mb-3 bg-neutral-950">
                        <img 
                          src={roomImg} 
                          alt={room.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-all duration-500 brightness-95" 
                          referrerPolicy="no-referrer"
                        />
                        {/* Price Tag badge */}
                        <div className="absolute bottom-3 right-3 bg-neutral-950/90 border border-neutral-850 px-3 py-1 rounded text-right backdrop-blur-sm">
                          <span className="block text-[8px] font-mono text-brick uppercase leading-tight">STARTING_RATE</span>
                          <span className="text-amber-500 font-mono font-bold text-sm leading-tight">
                            ฿{room.price.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-neutral-400 font-light block -mt-1">/ คืน (night)</span>
                        </div>
                        
                        {/* 360 Virtual Tour badge */}
                        {room.matterportUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected360Room(room);
                            }}
                            className="absolute top-3 right-3 bg-brick hover:bg-brick-dark px-2.5 py-1 rounded text-[9px] font-mono text-white border border-brick-light/35 flex items-center space-x-1 shadow-lg backdrop-blur-xs transition-all duration-205 hover:scale-105"
                            style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
                          >
                            <Compass className="h-3 w-3 animate-spin-slow" />
                            <span className="font-sans font-bold">ชมห้องเสมือนจริง 360°</span>
                          </button>
                        )}
                        
                        {/* Corner specification details */}
                        <div className="absolute top-3 left-3 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-neutral-300 border border-neutral-800/80">
                          {room.id.toUpperCase()}
                        </div>
                      </div>

                      {/* Room content */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-mono text-xs text-neutral-300 font-bold uppercase tracking-wider">
                            {room.name}
                          </h3>
                          <span className="text-[10px] text-neutral-500 font-light shrink-0 font-sans">
                            {room.size} ตร.ม. / {room.capacity} ท่าน
                          </span>
                        </div>
                        <h4 className="text-sm font-sans font-bold text-white leading-snug">
                          {room.thaiName}
                        </h4>
                        <p className="text-xs text-neutral-400 font-light leading-relaxed">
                          {room.description}
                        </p>

                        {/* Matterport Inline CTA */}
                        {room.matterportUrl && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setSelected360Room(room)}
                              className="w-full py-2 bg-neutral-950 hover:bg-[#151515] border border-neutral-850 hover:border-brick/50 text-neutral-300 hover:text-white rounded transition-all text-xs flex items-center justify-center space-x-2 font-sans font-semibold"
                            >
                              <Compass className="h-4 w-4 text-brick animate-pulse" />
                              <span>ทัวร์ห้องเสมือนจริง 360° (Matterport 3D Tour)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Additional collapsible specifications list */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-neutral-900/80 text-xs font-light text-neutral-450 space-y-2 animate-fadeIn">
                          <p className="text-neutral-350 leading-relaxed font-sans">{room.longDescription || room.description}</p>
                          <div className="bg-neutral-950 p-2 border border-neutral-900 rounded space-y-1">
                            <span className="text-[9px] font-mono text-brick uppercase font-semibold">// AMENITIES FOR THIS LOFT:</span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {room.amenities.map((item, id) => (
                                <span key={id} className="text-[10px] px-2 py-0.5 bg-[#141414] border border-neutral-900 text-neutral-300 rounded font-sans">
                                  ✓ {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Button Controls exact layout copy */}
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-1 border-t border-neutral-900/60 font-sans font-medium text-xs">
                        <button 
                          onClick={() => handleSelectRoom(room.id)}
                          className="py-2.5 px-3 bg-brick hover:bg-brick-dark text-white rounded text-center transition-colors shadow font-semibold"
                          style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
                        >
                          จองห้อง
                        </button>
                        <button 
                          type="button"
                          onClick={() => setExpandedRoomIdx(isExpanded ? null : idx)}
                          className="py-2.5 px-3 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 hover:text-white rounded text-center transition-all flex items-center justify-center space-x-1"
                        >
                          <span>{isExpanded ? "ย่นข้อมูล" : "รายละเอียด"}</span>
                          <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>

                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* INTERACTIVE LIFESTYLE GALLERY (คลังภาพความสวยเด่นสไตล์ลอฟท์) */}
          {(() => {
            const rawGalleryItems = (settings.gallery !== undefined && settings.gallery !== null) ? settings.gallery : defaultGallery;
            const fallbackGalleryImages = [lobbyImg, superiorImg, deluxeImg, studioImg];
            const galleryItems = rawGalleryItems.map((item, idx) => ({
              ...item,
              resolvedUrl: item.url || fallbackGalleryImages[idx % fallbackGalleryImages.length]
            }));

            const galleryCategories = ["ทั้งหมด", ...Array.from(new Set(galleryItems.map(item => item.cat || "ทั่วไป")))];

            const filteredGalleryItems = galleryItems.filter(item => {
              if (selectedGalleryCategory === "ทั้งหมด") return true;
              return (item.cat || "ทั่วไป") === selectedGalleryCategory;
            });

            const initialLimit = 6;
            const displayedGalleryItems = showAllGallery ? filteredGalleryItems : filteredGalleryItems.slice(0, initialLimit);
            const hasMoreGallery = filteredGalleryItems.length > initialLimit;

            return (
              <div id="gallery" ref={gallerySectionRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-2 border-brick pl-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                      แกลเลอรีอัลบั้มภาพ
                    </h2>
                    <span className="font-mono text-[10px] text-neutral-450 block tracking-[0.2em] uppercase">
                      HOTEL PHOTO GALLERY & ALBUM
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-2 py-0.5 border border-neutral-900 rounded self-start sm:self-center">
                    รวม {galleryItems.length} ภาพถ่าย
                  </div>
                </div>

                <p className="text-xs text-neutral-450 font-sans font-light leading-relaxed">
                  สัมผัสความสวยงามและไลฟ์สไตล์ดิบเท่ในทุกซอกมุมของเดอะ เอ็มไฟว์ เรสซิเดนซ์ เลือกหมวดหมู่ด้านล่างเพื่อคัดกรองรูปภาพ
                </p>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1.5 pb-2 overflow-x-auto scrollbar-none">
                  {galleryCategories.map((cat) => {
                    const isActive = selectedGalleryCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedGalleryCategory(cat);
                          setShowAllGallery(false);
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap cursor-pointer ${
                          isActive 
                            ? "bg-brick text-white border-transparent font-semibold shadow-md shadow-brick/20" 
                            : "bg-neutral-950 hover:bg-neutral-900 text-neutral-450 hover:text-neutral-200 border border-neutral-850"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Gallery Grid */}
                {displayedGalleryItems.length === 0 ? (
                  <div className="p-8 text-center bg-[#111111] border border-neutral-900 rounded-lg">
                    <p className="text-xs text-neutral-500 font-sans">ยังไม่มีรูปภาพในอัลบั้มแกลเลอรี</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5 transition-all duration-500">
                    {displayedGalleryItems.map((item, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setLightboxItems(filteredGalleryItems);
                          setLightboxIndex(idx);
                        }}
                        className="relative group h-28 sm:h-32 rounded overflow-hidden border border-neutral-900 cursor-pointer bg-neutral-950 hover:border-brick/50 transition-all duration-350 shadow-md hover:shadow-lg"
                      >
                        <img src={item.resolvedUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover brightness-90 group-hover:scale-105 duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent flex flex-col justify-end p-2.5">
                          <span className="text-[7.5px] font-mono text-brick font-bold tracking-wider">{item.cat?.toUpperCase() || "ทั่วไป"}</span>
                          <span className="text-[10px] text-white font-medium font-sans leading-tight block truncate mt-0.5 group-hover:text-brick-light duration-200">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Load More Button */}
                {hasMoreGallery && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAllGallery(!showAllGallery)}
                      className="px-4 py-2 border border-neutral-850 hover:border-brick-light/40 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white rounded text-xs font-mono tracking-wider transition-all duration-300 flex items-center space-x-1.5 shadow"
                    >
                      <span>{showAllGallery ? "แสดงย่อลง" : `ดูทั้งหมดอีก (+${filteredGalleryItems.length - initialLimit} รูป)`}</span>
                      <ChevronDown className={`h-3 w-3 text-neutral-500 transition-transform duration-300 ${showAllGallery ? "rotate-180 text-brick" : ""}`} />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION 2: AMENITIES THAT FIT */}
          <div id="amenities" ref={amenitiesRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-6">
            <div className="border-l-2 border-brick pl-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                สิ่งอำนวยความสะดวกที่ลงตัว
              </h2>
              <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                AMENITIES THAT FIT
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-light text-neutral-300">
              {settings.amenities.map((amenity, idx) => {
                const IconComponent = (LucideIcons as any)[amenity.iconName] || LucideIcons.Coffee;
                return (
                  <div key={idx} className="p-3 bg-[#111111] border border-neutral-900 rounded space-y-1.5 flex flex-col justify-between">
                    <IconComponent className="h-5 w-5 text-brick shrink-0" />
                    <div>
                      <h4 className="font-bold text-white">{amenity.title}</h4>
                      <p className="text-[10px] text-neutral-500 leading-tight">{amenity.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic promotions list */}
            {settings.promotions && settings.promotions.filter((p: any) => p.active !== false).length > 0 ? (
              <div className="space-y-3.5">
                <div className="flex items-center space-x-2 pb-1 border-b border-neutral-900">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">// แคมเปญโปรโมชั่นและข้อเสนอพิเศษล่าสุด</span>
                </div>
                {settings.promotions.filter((p: any) => p.active !== false).map((p: any, pIdx: number) => (
                  <div key={p.id || pIdx} className="p-4 bg-gradient-to-r from-brick/15 to-transparent border border-brick/20 rounded-lg flex items-start justify-between relative overflow-hidden group hover:border-brick/40 duration-300">
                    <div className="space-y-1.5 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-mono bg-brick/10 border border-brick/40 text-brick-light px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                          {p.badge || "โปรโมชั่น"}
                        </span>
                        {p.highlight && (
                          <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wide">
                            ✨ {p.highlight}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-brick-light duration-300">{p.title}</h4>
                      <p className="text-[11px] text-neutral-400 font-light leading-relaxed whitespace-pre-line">{p.desc}</p>
                    </div>
                    <Compass className="h-6 w-6 text-brick/40 shrink-0 group-hover:text-brick duration-300 self-center" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-brick/10 to-transparent border border-brick/20 rounded-lg flex items-center justify-between">
                <div className="space-y-1 pr-1.5">
                  <span className="text-[9px] font-mono text-brick uppercase tracking-wider block font-bold">// PROMOTION_FLASH</span>
                  <h4 className="text-xs font-bold text-white">พักผ่อนคุ้มสุด จองตรงวันนี้!</h4>
                  <p className="text-[10px] text-neutral-450 font-light">กรอกใบจองพร้อมบริการคีย์การ์ดและการช่วยเหลือทันใจ</p>
                </div>
                <Compass className="h-8 w-8 text-brick-light shrink-0 opacity-70" />
              </div>
            )}
          </div>

          {/* IMPACT MUANG THONG THANI EVENT CALENDAR (ปฏิทินตารางงาน อิมแพ็ค เมืองทองธานี) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-6 bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-2 border-brick pl-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-brick animate-pulse" />
                  ตารางกิจกรรม IMPACT เมืองทองธานี
                </h2>
                <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                  IMPACT EVENT CALENDAR & CONCERTS
                </span>
              </div>
              <span className="text-[10px] font-mono bg-neutral-950 border border-neutral-850 px-2.5 py-1 text-neutral-450 rounded shrink-0 self-start sm:self-center">
                ห่างจากโรงแรมเพียง 5-10 นาที 🚗
              </span>
            </div>

            <p className="text-xs text-neutral-400 font-sans font-light leading-relaxed">
              เดอะ เอ็มไฟว์ เรสซิเดนซ์ ตั้งอยู่ใกล้ศูนย์แสดงสินค้าและการประชุม **IMPACT เมืองทองธานี** พักที่นี่เดินทางสะดวก รวดเร็ว เลี่ยงปัญหารถติดในเมืองได้ยอดเยี่ยม เช็คกิจกรรมและคอนเสิร์ตล่าสุดด้านล่างเพื่อวางแผนจองห้องพักล่วงหน้า:
            </p>

            {/* Filter and Search Bar */}
            <div className="space-y-3">
              <div className="relative">
                <LucideIcons.Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่องานคอนเสิร์ต หรือนิทรรศการ..."
                  value={impactSearchQuery}
                  onChange={(e) => setImpactSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-900 focus:border-brick/50 rounded px-9 py-2 text-xs text-white placeholder-neutral-500 font-sans focus:outline-none transition-all duration-200"
                />
                {impactSearchQuery && (
                  <button 
                    onClick={() => setImpactSearchQuery("")}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {["ทั้งหมด", "Concert", "Exhibition", "Other"].map((cat) => {
                  const label = cat === "ทั้งหมด" ? "ทั้งหมด" : cat === "Concert" ? "🎵 คอนเสิร์ต" : cat === "Exhibition" ? "🏢 นิทรรศการ/เอ็กซ์โป" : "✨ กิจกรรมอื่นๆ";
                  const isActive = impactFilterCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setImpactFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded text-[10px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-brick text-white font-semibold"
                          : "bg-neutral-950 hover:bg-neutral-900 text-neutral-400 border border-neutral-900"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                      {/* Left thumbnail image */}
                      <div className="w-full sm:w-28 h-24 rounded overflow-hidden shrink-0 bg-neutral-950 border border-neutral-900 relative">
                        <img 
                          src={evt.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"} 
                          alt={evt.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 duration-500"
                        />
                        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase text-white ${
                          evt.category === "Concert" ? "bg-purple-600" : evt.category === "Exhibition" ? "bg-blue-600" : "bg-neutral-600"
                        }`}>
                          {evt.category}
                        </span>
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 space-y-2 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-brick-light duration-300 leading-tight">
                            {evt.title}
                          </h4>
                          
                          {/* Date and Venue tags */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-neutral-400 font-mono">
                            <span className="flex items-center gap-1 text-amber-400 font-medium">
                              <CalendarDays className="h-3 w-3 shrink-0" />
                              {evt.date}
                            </span>
                            {evt.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {evt.time}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-neutral-450 truncate max-w-xs">
                              <MapPin className="h-3 w-3 shrink-0 text-brick/70" />
                              {evt.venue}
                            </span>
                          </div>

                          <p className="text-[11px] text-neutral-450 leading-relaxed line-clamp-2 pt-0.5 font-light">
                            {evt.description || "กิจกรรมจัดขึ้นที่อิมแพ็ค เมืองทองธานี แนะนำจองห้องพักเพื่ออำนวยความสะดวกในการเดินทาง"}
                          </p>
                        </div>

                        {/* Booking Prompt */}
                        <div className="pt-2 flex items-center justify-between border-t border-neutral-900/40">
                          <span className="text-[10px] text-neutral-500 font-mono">
                            #พักใกล้บิดรถติดเลี่ยงปัญหารถติด
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoomId("deluxe");
                              setIsBookingOpen(true);
                              // Smooth notice via temporary alert/toast helper or autofill requests if desired
                            }}
                            className="px-3 py-1 bg-brick/10 hover:bg-brick border border-brick/30 hover:border-transparent text-brick-light hover:text-white rounded text-[10.5px] font-medium transition-all duration-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>จองเข้าพักช่วงนี้</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* GUEST REVIEWS & TESTIMONIALS (ความประทับใจและความคิดเห็นรับรองจริง) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
            <div className="flex justify-between items-end border-l-2 border-brick pl-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                  เสียงจริงรับรองจากผู้เข้าพัก
                </h2>
                <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                  GUEST REVIEWS & STORIES
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {(() => {
                const reviewsList = (settings.reviews !== undefined && settings.reviews !== null) ? settings.reviews : defaultReviews;
                if (reviewsList.length === 0) {
                  return (
                    <div className="p-8 text-center bg-[#111111] border border-neutral-900 rounded-lg">
                      <p className="text-xs text-neutral-500 font-sans">ยังไม่มีรีวิวจากผู้เข้าพักในขณะนี้</p>
                    </div>
                  );
                }
                return reviewsList.map((rev, idx) => (
                  <div key={idx} className="p-3.5 bg-[#111111] border border-neutral-900 rounded-lg space-y-3.5 text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        {rev.avatarUrl ? (
                          <img 
                            src={rev.avatarUrl} 
                            alt={rev.name} 
                            className="h-8 w-8 rounded-full object-cover border border-neutral-850 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-neutral-850 text-neutral-350 border border-neutral-800 flex items-center justify-center font-bold text-[10px] uppercase font-mono shrink-0">
                            {rev.name ? rev.name.charAt(0) : "G"}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white font-sans text-xs">{rev.name}</h4>
                          <span className="text-[9px] text-brick font-mono uppercase bg-brick/5 border border-brick/15 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {rev.role}
                          </span>
                        </div>
                      </div>
                      {/* Golden Stars Rating Row */}
                      <div className="flex items-center space-x-0.5 mt-1">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                        ))}
                      </div>
                    </div>
                    <p className="text-neutral-350 leading-relaxed font-sans font-light">
                      "{rev.review}"
                    </p>
                    <div className="text-[9px] text-neutral-500 font-mono flex justify-end pt-0.5 border-t border-neutral-900/40">
                      <span>รีวิวเมื่อ: {rev.date}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* INTERACTIVE FAQs SECURED ACCORDION (คำถามที่พบบ่อย) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
            <div className="border-l-2 border-brick pl-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                คำถามที่พบบ่อย (FAQs)
              </h2>
              <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                LOCATION & BOOKING ACCORDION
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {((settings.faqs && settings.faqs.length > 0) ? settings.faqs : defaultFaqs).map((faq, idx) => {
                const isFaqExpanded = expandedFaqIdx === idx;
                return (
                  <div 
                    key={idx}
                    className="border border-[#1a1a1a] bg-[#111111]/80 rounded overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIdx(isFaqExpanded ? null : idx)}
                      className="w-full p-3.5 text-left flex justify-between items-center bg-[#111111] hover:bg-neutral-900 transition-colors duration-200"
                    >
                      <span className="text-xs font-bold text-neutral-200 font-sans tracking-wide">
                        {faq.q}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-brick shrink-0 transition-transform duration-300 ${isFaqExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {isFaqExpanded && (
                      <div className="p-3.5 bg-neutral-950 border-t border-neutral-900 text-[11px] text-neutral-400 font-light leading-relaxed font-sans animate-fadeIn">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: LOCATION & TRAVEL */}
          <div id="location" ref={locationRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
            <div className="border-l-2 border-brick pl-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-sans">
                ที่ตั้งและการเดินทาง
              </h2>
              <span className="font-mono text-[10px] text-neutral-400 block tracking-[0.2em] uppercase">
                LOCATION & TRAVEL
              </span>
            </div>

            {/* Pristine Minimalist Golden Coordinates Line Directions Map */}
            {/* Hand-drawn vector geometry perfectly mimics high-end travel map from mockup */}
            <div className="w-full h-56 bg-[#111111] border border-neutral-900 rounded overflow-hidden relative shadow-lg">
              
              {/* Golden vector coordinate lines representation */}
              <svg 
                viewBox="0 0 500 300" 
                className="w-full h-full text-neutral-600 bg-[#0d0d0d] font-sans antialiased select-none"
              >
                {/* Grid Grid network accent background */}
                <defs>
                  <pattern id="lightGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#lightGrid)" />

                {/* Major Roads in Golden/Silver accent */}
                {/* Chaeng Wattana Road */}
                <line x1="20" y1="90" x2="480" y2="90" stroke="#1f1f1f" strokeWidth="12" strokeLinecap="round" />
                <line x1="20" y1="90" x2="480" y2="90" stroke="#c25324" strokeWidth="1.5" strokeDasharray="6 3" />
                <text x="380" y="72" fill="#8f8f8f" className="text-[10px] font-mono tracking-wider">Chaeng Wattana Road</text>

                {/* Klong Prapa Road */}
                <line x1="320" y1="20" x2="320" y2="280" stroke="#1f1f1f" strokeWidth="10" strokeLinecap="round" />
                <line x1="320" y1="20" x2="320" y2="280" stroke="#ab773c" strokeWidth="1" />
                <text x="210" y="270" fill="#8f8f8f" className="text-[10px] font-mono tracking-wider rotate-90 origin-bottom">Klong Prapa Road</text>

                {/* Expressway Route */}
                <path d="M 430,280 L 430,20" fill="none" stroke="#2a2a2a" strokeWidth="8" strokeLinecap="round" />
                <path d="M 430,280 L 430,20" fill="none" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="5" />
                <text x="445" y="150" fill="#6f6f6f" className="text-[9px] font-mono rotate-90 tracking-wide">EXPRESSWAY</text>

                {/* Local roads & connecting nodes */}
                <path d="M 20,200 L 320,200 L 430,170" fill="none" stroke="#222" strokeWidth="6" strokeLinecap="round" />
                <path d="M 320,130 L 480,130" fill="none" stroke="#222" strokeWidth="5" strokeLinecap="round" />

                {/* Landmark pins and flags */}
                {/* Impact Arena */}
                <circle cx="430" cy="80" r="5" fill="#f59e0b" />
                <text x="350" y="105" fill="#f5e0b0" className="text-[9px] font-bold">● Impact Arena Arena</text>
                
                {/* Klong Prapa Bridge */}
                <circle cx="320" cy="90" r="4" fill="#3b82f6" />

                {/* THE M5 RESIDENCE Target Marker precisely positioned */}
                <g className="cursor-pointer">
                  <circle cx="320" cy="170" r="14" fill="#ff6a00" className="opacity-20 animate-ping" />
                  <circle cx="320" cy="170" r="7" fill="#ff6a00" stroke="#fff" strokeWidth="1.5" />
                  {/* Glowing background block pointing label tag */}
                  <rect x="235" y="138" width="80" height="18" rx="3" fill="#c25324" stroke="#ff8f3d" strokeWidth="1" />
                  <text x="240" y="151" fill="#fff" className="text-[9px] font-sans font-bold">M5 RESIDENCE</text>
                </g>
                
                {/* Local sub-junctions labels */}
                <text x="50" y="225" fill="#666" className="text-[9px]">ปากเกร็ด / แจ้งวัฒนะ</text>
              </svg>

              {/* Bottom directions helper button */}
              <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/90 border border-neutral-850 px-3 py-2 rounded flex items-center justify-between text-xs backdrop-blur-sm shadow">
                <span className="text-neutral-450 text-[10px] font-sans font-light">เลียบคลองประปา นนทบุรี ปากเกร็ด</span>
                <a 
                  href="https://maps.google.com/?q=The+M5+Residence+Loft+ปากเกร็ด" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-brick hover:text-white border border-neutral-800 rounded font-sans font-bold text-[10px] tracking-wider uppercase transition-all shrink-0 text-brick-light"
                >
                  เปิด Google Maps ↗
                </a>
              </div>
            </div>

            <div className="text-xs text-neutral-450 leading-relaxed font-sans font-light">
              <span className="font-bold text-neutral-300 block mb-0.5">พิกัดสถานที่อ้างอิง:</span>
              <span>ปากเกร็ด จ.นนทบุรี สะดวกต่อการเดินทาง เชื่อมต่อไปเลียบคลองประปา แจ้งวัฒนะ สรงประภา และไม่ไกลจากสถาบันการจัดการปัญญาภิวัฒน์ ทางด่วน และศูนย์จัดแสดงสินค้านานาชาติ เมืองทองธานี (Impact Arena)</span>
            </div>
          </div>

          {/* SECTION 4: CONTACT INFO FOOTER */}
          <div id="footer" ref={contactRef} className="p-6 sm:p-8 lg:p-6 xl:p-8 bg-[#090909] text-xs font-light text-neutral-400 space-y-6 mt-auto">
            
            {/* Visual styling matches mockup brand layout */}
            <div className="space-y-4">
              <div className="flex flex-col text-left">
                <span className="font-mono text-[11px] text-brick tracking-[0.3em] font-bold leading-none">THE</span>
                <span className="text-3xl font-extrabold tracking-tighter text-white font-mono leading-none mt-1">
                  {gen.hotelName.split(" ").slice(-1)[0] || "M5"}
                </span>
                <span className="text-[10px] text-neutral-500 font-medium tracking-[0.25em] font-sans mt-1">RESIDENCE LOFT</span>
              </div>

              <div className="space-y-2.5 pt-2 text-[#b0b0b0] font-sans leading-relaxed">
                <div className="flex items-start space-x-2.5">
                  <MapPin className="h-4 w-4 text-brick shrink-0 mt-0.5" />
                  <span>{gen.contactAddress}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Phone className="h-4 w-4 text-brick shrink-0" />
                  <span>เบอร์โทรศัพท์: {gen.contactPhone}</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <Mail className="h-4 w-4 text-brick shrink-0" />
                  <span>Line ID สำหรับติดต่อ: {gen.lineId}</span>
                </div>
              </div>
            </div>

            {/* Social channels row exactly corresponding with reference icons */}
            <div className="pt-3 border-t border-neutral-900/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1 px-2.5 border border-neutral-850 rounded bg-[#101010] text-[#b0b0b0] hover:text-white hover:border-neutral-700 duration-200 text-[10px] flex items-center space-x-1 font-mono">
                  <Facebook className="h-3 w-3 text-brick-light" />
                  <span>Facebook</span>
                </a>
                <a href="https://line.me" target="_blank" rel="noopener noreferrer" className="p-1 px-2.5 border border-neutral-850 rounded bg-[#101010] text-[#b0b0b0] hover:text-white hover:border-neutral-700 duration-200 text-[10px] flex items-center space-x-1 font-mono">
                  <span className="text-[9px] font-bold text-brick-light">LINE</span>
                  <span>{gen.lineId}</span>
                </a>
              </div>

              {/* Admin Dashboard Entry button */}
              <button 
                onClick={() => navigateTo("/admin")}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#131313] hover:bg-neutral-900 border border-neutral-850 hover:border-brick/40 hover:text-white text-[11px] font-medium rounded transition-all text-neutral-400 hover:scale-[1.02] cursor-pointer"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-brick-light shrink-0" />
                <span>เข้าสู่ระบบผู้ดูแลระบบ (Admin)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-neutral-950/80 text-[10px] text-neutral-600 font-mono text-center flex justify-between items-center">
              <span>© {new Date().getFullYear()} THE {gen.hotelName.split(" ").slice(-1)[0] || "M5"}.</span>
              <span>All rights reserved.</span>
            </div>

          </div>

        </div>

      </div>

      {/* Floating Concierge AI Support Chatbot */}
      <AIChatbot />

      {/* Booking Checkout Modal */}
      <BookingModal 
        initialRoomId={selectedRoomId} 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
      />

      {/* Gallery Lightbox Overlay */}
      {lightboxIndex !== null && lightboxItems[lightboxIndex] && (() => {
        const currentItem = lightboxItems[lightboxIndex];
        const hasPrev = lightboxIndex > 0;
        const hasNext = lightboxIndex < lightboxItems.length - 1;

        const handlePrev = (e: any) => {
          e.stopPropagation();
          if (hasPrev) setLightboxIndex(lightboxIndex - 1);
        };

        const handleNext = (e: any) => {
          e.stopPropagation();
          if (hasNext) setLightboxIndex(lightboxIndex + 1);
        };

        return (
          <div 
            className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/98 p-4 sm:p-6 backdrop-blur-lg select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Bar: Close Button, Counter and Brand */}
            <div className="w-full max-w-5xl flex items-center justify-between border-b border-neutral-900 pb-3 z-50">
              <div className="flex items-center space-x-2.5">
                <span className="font-mono text-xs text-brick uppercase tracking-wider font-bold">THE M5 GALLERY</span>
                <span className="text-neutral-700 text-xs">|</span>
                <span className="font-mono text-xs text-neutral-400">
                  รูปที่ {lightboxIndex + 1} จาก {lightboxItems.length}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-900 transition-all duration-200 cursor-pointer shadow-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Middle Workspace: Prev Image Next */}
            <div className="flex-1 w-full max-w-5xl flex items-center justify-between relative py-4">
              {/* Prev Button */}
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`p-3 rounded-full bg-neutral-950/70 border border-neutral-850 text-white transition-all duration-200 z-50 shadow-lg ${
                  hasPrev ? "hover:bg-brick hover:border-brick cursor-pointer hover:scale-105" : "opacity-20 cursor-not-allowed"
                }`}
              >
                <ChevronUp className="h-5 w-5 -rotate-90" />
              </button>

              {/* Main Photo Card */}
              <div 
                className="flex-1 max-h-[60vh] sm:max-h-[65vh] mx-4 flex items-center justify-center relative overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950 p-2 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={currentItem.resolvedUrl || currentItem.url} 
                  alt={currentItem.title} 
                  className="max-h-[58vh] sm:max-h-[63vh] w-auto max-w-full object-contain rounded transition-all duration-500 transform hover:scale-[1.02]"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-3 rounded-full bg-neutral-950/70 border border-neutral-850 text-white transition-all duration-200 z-50 shadow-lg ${
                  hasNext ? "hover:bg-brick hover:border-brick cursor-pointer hover:scale-105" : "opacity-20 cursor-not-allowed"
                }`}
              >
                <ChevronUp className="h-5 w-5 rotate-90" />
              </button>
            </div>

            {/* Bottom Section: Caption & Thumbnails Strip */}
            <div className="w-full max-w-5xl flex flex-col items-center space-y-4 pt-3 border-t border-neutral-900 z-50" onClick={(e) => e.stopPropagation()}>
              {/* Title & Category Info */}
              <div className="text-center space-y-1 max-w-xl">
                <span className="text-[10px] font-mono text-brick uppercase tracking-widest block font-bold">
                  {currentItem.cat?.toUpperCase() || "ทั่วไป"}
                </span>
                <h3 className="text-sm sm:text-base font-sans font-bold text-white">
                  {currentItem.title}
                </h3>
              </div>

              {/* Miniature Thumbnail Strips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
                {lightboxItems.map((thumb, tIdx) => {
                  const isActive = tIdx === lightboxIndex;
                  return (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => setLightboxIndex(tIdx)}
                      className={`relative shrink-0 rounded overflow-hidden h-10 w-16 border transition-all duration-200 cursor-pointer ${
                        isActive 
                          ? "border-brick ring-2 ring-brick scale-105" 
                          : "border-neutral-800 opacity-55 hover:opacity-100"
                      }`}
                    >
                      <img src={thumb.resolvedUrl || thumb.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Matterport 360 Virtual Tour Overlay */}
      {selected360Room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 p-3 sm:p-5 backdrop-blur-lg transition-all duration-300">
          {/* Close button */}
          <button 
            type="button"
            onClick={() => setSelected360Room(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-850 cursor-pointer duration-200 z-55 shadow-md hover:border-brick/50"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="max-w-6xl w-full flex flex-col h-[90vh] sm:h-[85vh] relative bg-[#121212] border border-neutral-850 rounded-xl overflow-hidden shadow-2xl">
            
            {/* Header section with room selection toggles */}
            <div className="p-3 sm:p-4 bg-neutral-950 border-b border-neutral-850 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-brick animate-ping" />
                  <span className="text-[9px] font-mono font-bold text-brick tracking-widest uppercase">
                    LIVE 360° VIRTUAL TOUR BY MATTERPORT
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-sans font-bold text-white flex items-center gap-1.5 leading-tight">
                  {selected360Room.name}
                  <span className="text-xs text-neutral-400 font-light font-sans block">
                    ({selected360Room.thaiName})
                  </span>
                </h3>
              </div>

              {/* Quick Room Switches directly inside modal */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 font-mono hidden lg:inline-block">SWITCH_ROOM:</span>
                {rooms.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected360Room(r)}
                    className={`px-2.5 py-1 rounded text-[10px] font-sans font-semibold transition-all border duration-200 ${
                      selected360Room.id === r.id
                        ? "bg-brick text-white border-brick"
                        : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                    }`}
                  >
                    {r.name.split(" ")[0]} 360°
                  </button>
                ))}
              </div>
            </div>

            {/* Matterport Iframe Container */}
            <div className="flex-1 bg-black relative flex items-center justify-center">
              {(() => {
                const embedUrl = getMatterportEmbedUrl(selected360Room.matterportUrl);
                if (!embedUrl) {
                  return (
                    <div className="p-8 text-center space-y-2">
                      <Compass className="h-10 w-10 text-neutral-600 mx-auto animate-spin" />
                      <p className="text-xs text-neutral-400 font-mono">กำลังอัปโหลดข้อมูลทัวร์ 360...</p>
                    </div>
                  );
                }
                return (
                  <iframe 
                    src={embedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="xr-spatial-tracking; gyroscope; accelerometer; clipboard-write;"
                    referrerPolicy="no-referrer"
                    title={`Matterport 3D Tour - ${selected360Room.name}`}
                  />
                );
              })()}
            </div>

            {/* Bottom bar inside modal containing help tips & instant booking CTA */}
            <div className="p-3 sm:p-4 bg-neutral-950 border-t border-neutral-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-[10px] text-neutral-500 font-light flex items-center space-x-2">
                <Compass className="h-4 w-4 text-brick shrink-0" />
                <span className="leading-snug">
                  🤖 <b>วิธีควบคุม</b>: เลื่อนเมาส์หรือใช้นิ้วลากเพื่อหมุนมุมมองรอบห้อง 360 องศา, คลิกที่สัญลักษณ์วงกลมบนพื้นเพื่อเคลื่อนตัวไปรอบๆ ห้อง, หรือยืดขยายภาพตามสะดวกใจ
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedRoomId(selected360Room.id);
                  setSelected360Room(null);
                  setIsBookingOpen(true);
                }}
                className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-bold transition-all shrink-0 hover:scale-[1.02] flex items-center justify-center space-x-1.5"
                style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
              >
                <span>จองห้อง {selected360Room.name} ทันที</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MEMBER PORTAL MODAL */}
      {isMemberPortalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-sans">
          <div className="bg-charcoal-medium border border-neutral-850 rounded-xl max-w-xl w-full relative max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-neutral-850 flex items-center justify-between bg-[#0e0e0e] shrink-0">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="h-5 w-5 text-brick animate-pulse" />
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white font-mono tracking-wider uppercase">CLUB M5 MEMBER PORTAL</h3>
                  <span className="text-[10px] text-neutral-400 font-light block mt-0.5">พอร์ทัลดูแลสิทธิประโยชน์และตรวจสอบข้อมูลเข้าพักของคุณ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberPortalOpen(false)}
                className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded text-xs border border-neutral-800 transition-colors font-semibold cursor-pointer"
              >
                ปิด
              </button>
            </div>

            {currentMember ? (
              <>
                {/* Sub-navigation Tab Bar */}
                <div className="flex border-b border-neutral-850 bg-[#0a0a0a] px-6 shrink-0 justify-start space-x-6">
                  <button
                    type="button"
                    onClick={() => setMemberPortalTab("card")}
                    className={`text-xs font-bold pb-3 pt-3 transition-all cursor-pointer flex items-center space-x-1.5 focus:outline-none relative ${
                      memberPortalTab === "card" ? "text-brick" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>บัตรสมาชิกและคะแนน</span>
                    {memberPortalTab === "card" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brick"></div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberPortalTab("profile")}
                    className={`text-xs font-bold pb-3 pt-3 transition-all cursor-pointer flex items-center space-x-1.5 focus:outline-none relative ${
                      memberPortalTab === "profile" ? "text-brick" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>ข้อมูลส่วนตัว (Profile)</span>
                    {memberPortalTab === "profile" && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brick"></div>
                    )}
                  </button>
                </div>

                {memberPortalTab === "card" ? (
                  /* Portal Content: Card & Perks */
                  <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Premium Metallic Membership Card */}
                    <div className={`p-5 rounded-xl border relative overflow-hidden shadow-xl text-left ${
                      currentMember.tier === "Elite" 
                        ? "bg-gradient-to-br from-amber-600 via-amber-800 to-neutral-900 border-amber-500/40" 
                        : currentMember.tier === "Gold" 
                          ? "bg-gradient-to-br from-yellow-600 via-yellow-700 to-neutral-850 border-yellow-500/30" 
                          : "bg-gradient-to-br from-zinc-700 via-zinc-800 to-neutral-900 border-zinc-500/30"
                    }`}>
                      {/* Embedded details */}
                      <div className="absolute top-4 right-4 text-white opacity-20">
                        <Landmark className="h-12 w-12" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-white/70 uppercase tracking-widest font-mono">MEMBERSHIP CARD</span>
                          <h4 className="text-xl font-black text-white mt-1 font-mono tracking-tight">{currentMember.name}</h4>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-black/40 text-white font-bold rounded-md uppercase border border-white/10 tracking-widest font-mono">
                          {currentMember.tier} CLASS
                        </span>
                      </div>

                      <div className="mt-8 flex justify-between items-end">
                        <div>
                          <span className="text-[9px] text-white/60 block font-mono">MEMBER NUMBER</span>
                          <span className="text-xs font-mono font-bold text-white tracking-widest">M5-MEM-{currentMember.id.substring(0,6).toUpperCase()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-white/60 block font-mono">TOTAL BALANCE</span>
                          <span className="text-base font-bold text-white font-mono">{currentMember.points} PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress to next tier */}
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg text-left space-y-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400 font-medium">ระดับปัจจุบัน: <strong className="text-white font-bold">{currentMember.tier}</strong></span>
                        <span className="text-neutral-450 text-[10px]">เป้าหมายระดับถัดไป</span>
                      </div>

                      {/* Progress bar logic */}
                      {(() => {
                        let limit = 250;
                        let nextTier = "Gold";
                        if (currentMember.tier === "Gold") {
                          limit = 1000;
                          nextTier = "Elite";
                        } else if (currentMember.tier === "Elite") {
                          return (
                            <p className="text-[11px] text-amber-400 block font-bold font-mono">👑 ยินดีด้วยครับ! คุณสะสมสิทธิประโยชน์สูงสุดอยู่ในระดับ Elite Class เรียบร้อยแล้ว!</p>
                          );
                        }
                        
                        const percent = Math.min(100, (currentMember.points / limit) * 100);
                        return (
                          <div className="space-y-1.5">
                            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-850">
                              <div className="h-full bg-brick rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                              <span>{currentMember.points} pts / {limit} pts</span>
                              <span>ต้องการอีก {limit - currentMember.points} pts เพื่อเป็น {nextTier} Class</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Personal Active & Past Bookings List */}
                    <div className="space-y-3 text-left">
                      <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                        <span className="text-xs font-bold font-mono text-brick tracking-wider">YOUR RESERVATION HISTORY ({bookings.filter(b => b.guestEmail.toLowerCase() === currentMember.email.toLowerCase()).length})</span>
                        <span className="text-[10px] text-neutral-400 font-light">ข้อมูลเชื่อมตามอีเมล: {currentMember.email}</span>
                      </div>

                      {(() => {
                        const myBookings = bookings.filter(b => b.guestEmail.toLowerCase() === currentMember.email.toLowerCase());
                        if (myBookings.length === 0) {
                          return (
                            <div className="py-6 text-center text-neutral-500 text-xs">
                              <CalendarDays className="h-8 w-8 mx-auto text-neutral-700 mb-2" />
                              <span>ไม่พบประวัติการเข้าพักในระบบ สามารถเริ่มจองคืนนี้เพื่อสะสมพ้อยท์ได้ครับ!</span>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                            {myBookings.map((b) => (
                              <div key={b.id} className="p-3 bg-neutral-950 hover:bg-neutral-900/80 border border-neutral-850 rounded-lg flex justify-between items-center transition-colors">
                                <div className="space-y-1 text-left">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-white">ห้อง {b.roomType === "superior" ? "Superior Loft" : b.roomType === "studio" ? "Studio Loft" : "Deluxe Loft"}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                                      b.status === "Pending" ? "bg-yellow-600/20 text-yellow-500 border border-yellow-600/30" :
                                      b.status === "Paid" || b.status === "Confirmed" ? "bg-emerald-600/20 text-emerald-500 border border-emerald-600/30" :
                                      b.status === "Cancelled" ? "bg-red-900/20 text-red-500 border border-red-900/30" :
                                      "bg-neutral-800 text-neutral-400 border border-neutral-700"
                                    }`}>
                                      {b.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-400 font-mono">
                                    {b.checkIn} ถึง {b.checkOut}
                                  </p>
                                  {b.specialRequest && (
                                    <p className="text-[10px] text-neutral-450 italic mt-0.5">💡 คำขอพิเศษ: "{b.specialRequest}"</p>
                                  )}
                                </div>
                                <div className="text-right font-mono shrink-0">
                                  <span className="text-[10px] text-neutral-450 block">ยอดจ่ายสุทธิ</span>
                                  <span className="text-xs font-bold text-white">{(b.totalPrice || 0).toLocaleString()} THB</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Active Tier Perks Card */}
                    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-left space-y-2">
                      <span className="text-[11px] font-bold text-white block">สิทธิประโยชน์พิเศษประจำคลาสของคุณ:</span>
                      <ul className="text-xs text-neutral-300 space-y-1.5 pl-4 list-disc font-light leading-relaxed">
                        {currentMember.tier === "Elite" && (
                          <>
                            <li>รับส่วนลดจองพัก 15% ทุกๆ การเข้าพัก</li>
                            <li>ฟรีบริการ Minibar ขนมและเครื่องดื่มต้อนรับภายในห้องพัก</li>
                            <li>สิทธิ์ Late Check-out ขยายเวลาเช็คเอาท์ออกสูงสุดได้ถึง 15:00 น.</li>
                            <li>ฟรีรถตู้รับ-ส่งเข้า IMPACT Arena เมืองทองธานี สบายใจไม่ต้องหารถ</li>
                          </>
                        )}
                        {currentMember.tier === "Gold" && (
                          <>
                            <li>รับส่วนลดจองพัก 10% ทุกๆ การเข้าพัก</li>
                            <li>รับฟรี Welcome Drink ที่คราฟต์บาร์ชั้นล่าง</li>
                            <li>สิทธิ์ Late Check-out ขยายเวลาเช็คเอาท์ออกสูงสุดได้ถึง 14:00 น.</li>
                            <li>จองสิทธิ์ที่จอดรถส่วนตัวด้านหน้าโรงแรม</li>
                          </>
                        )}
                        {currentMember.tier === "Silver" && (
                          <>
                            <li>รับส่วนลดจองพัก 5% ทุกๆ การเข้าพัก</li>
                            <li>รับฟรี Welcome Drink ที่คราฟต์บาร์ชั้นล่าง</li>
                            <li>ฟรีสปีด Wi-Fi ยกระดับความเร็วสูงสุดในโครงการ</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  /* Portal Content: Profile & Security Details */
                  <div className="p-6 space-y-6 overflow-y-auto text-left">
                    <div className="flex items-center space-x-3 pb-3 border-b border-neutral-850">
                      <div className="w-10 h-10 bg-brick/10 border border-brick/40 rounded-full flex items-center justify-center text-brick font-bold text-sm shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">แก้ไขข้อมูลส่วนตัวของคุณ (Profile Details)</h4>
                        <p className="text-[10px] text-neutral-400">แก้ไขเพื่อการประสานงานและรับบริการเข้าพักที่สะดวกราบรื่นยิ่งขึ้น</p>
                      </div>
                    </div>

                    {editStatusMsg && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded text-xs font-medium flex items-center space-x-2">
                        <span className="text-sm">✔</span>
                        <span>{editStatusMsg}</span>
                      </div>
                    )}

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editName || !editPhone || !editEmail) {
                          alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");
                          return;
                        }
                        const success = await updateMemberOnServer(currentMember.id, {
                          name: editName,
                          phone: editPhone,
                          email: editEmail,
                          password: editPassword
                        });
                        if (success) {
                          setEditStatusMsg("บันทึกการเปลี่ยนแปลงบัญชีของคุณสำเร็จแล้ว!");
                          setTimeout(() => setEditStatusMsg(""), 4000);
                        } else {
                          alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลส่วนตัว");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">ชื่อ-นามสกุล (Full Name)</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none focus:border-brick/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">เบอร์โทรศัพท์ (Phone Number)</label>
                          <input
                            type="tel"
                            required
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none focus:border-brick/50"
                          />
                        </div>

                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">อีเมลผู้ใช้งาน (Email Address)</label>
                          <input
                            type="email"
                            required
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none focus:border-brick/50"
                          />
                        </div>

                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block">รหัสผ่านบัญชี (Password)</label>
                          <input
                            type="password"
                            required
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="ตั้งรหัสผ่านใหม่"
                            className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-xs text-white focus:outline-none focus:border-brick/50"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-brick hover:bg-brick-dark text-white text-xs font-bold uppercase tracking-widest rounded transition-colors cursor-pointer"
                        >
                          บันทึกการเปลี่ยนแปลง (Save Profile)
                        </button>
                      </div>
                    </form>

                    {/* Detailed Metadata Section */}
                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg space-y-3">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">// ข้อมูลสถิติของสมาชิก (MEMBERSHIP DATA LOGS)</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono font-light text-neutral-400">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">ระดับคลาส</span>
                          <span className="font-bold text-white">{currentMember.tier} Class</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">คะแนนสะสม</span>
                          <span className="font-bold text-emerald-400">{currentMember.points} PTS</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">จำนวนครั้งที่เข้าพัก</span>
                          <span className="font-bold text-white">{currentMember.joinedBookingsCount || 0} ครั้ง</span>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">หมายเลขสมาชิก ID</span>
                          <span className="text-[10px] text-neutral-300 select-all">{currentMember.id}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 uppercase tracking-wider block">วันที่เปิดใช้งาน</span>
                          <span className="text-[10px] text-neutral-300">
                            {currentMember.createdAt ? new Date(currentMember.createdAt).toLocaleDateString("th-TH") : "พรีเมียมระบบหลัก"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Access Account Settings */}
                    <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-red-400 block font-sans">ลงชื่อออกจากระบบทันที?</span>
                        <p className="text-[10px] text-neutral-450 leading-relaxed font-sans">หากไม่ใช่คอมพิวเตอร์ส่วนตัว กรุณาออกจากระบบเพื่อรักษาสิทธิ์พ้อยท์และรักษาความลับของประวัติการเข้าพัก</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          logoutMember();
                          setIsMemberPortalOpen(false);
                        }}
                        className="px-4 py-2 bg-red-950/40 hover:bg-red-900/30 border border-red-900/40 text-red-400 rounded text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>ออกจากระบบบัญชี</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
          /* Portal Content for Guest (Login / Register Form) */
          <div className="p-6 space-y-5 overflow-y-auto text-left">
            <div className="flex border-b border-neutral-850 pb-3 justify-center space-x-6">
              <button
                type="button"
                onClick={() => setMemberPortalMode("login")}
                className={`text-sm font-bold pb-2 transition-all cursor-pointer ${
                  (memberPortalMode === "login" || settings.general?.allowRegistration === false) ? "text-brick border-b-2 border-brick" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                ลงชื่อเข้าใช้งาน
              </button>
              {settings.general?.allowRegistration !== false && (
                <button
                  type="button"
                  onClick={() => setMemberPortalMode("register")}
                  className={`text-sm font-bold pb-2 transition-all cursor-pointer ${
                    memberPortalMode === "register" ? "text-brick border-b-2 border-brick" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  สมัครสมาชิกใหม่ (ฟรี)
                </button>
              )}
            </div>

            {(memberPortalMode === "login" || settings.general?.allowRegistration === false) ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!pEmail || !pPassword) {
                    alert("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
                    return;
                  }
                  const success = await loginMember(pEmail, pPassword);
                  if (success) {
                    setPEmail("");
                    setPPassword("");
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">อีเมลผู้ใช้งาน (EMAIL ADDRESS)</label>
                  <input
                    type="email"
                    required
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">รหัสผ่านสมาชิก (PASSWORD)</label>
                  <input
                    type="password"
                    required
                    value={pPassword}
                    onChange={(e) => setPPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brick hover:bg-brick-dark text-white font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer mt-2"
                >
                  ลงชื่อเข้าใช้ทันที
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!pName || !pEmail || !pPassword || !pPhone) {
                    alert("กรุณากรอกข้อมูลส่วนตัวให้ครบทุกช่อง");
                    return;
                  }
                  const success = await registerMember({
                    name: pName,
                    email: pEmail,
                    phone: pPhone,
                    password: pPassword
                  });
                  if (success) {
                    setPName("");
                    setPEmail("");
                    setPPhone("");
                    setPPassword("");
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">ชื่อ-นามสกุล (FULL NAME)</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="คุณ สมชาย มุ่งมั่น"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">อีเมลแอดเดรส (EMAIL ADDRESS)</label>
                  <input
                    type="email"
                    required
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="somchai@example.com"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">เบอร์โทรศัพท์ (PHONE NUMBER)</label>
                  <input
                    type="tel"
                    required
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">รหัสผ่านเข้าใช้งาน (PASSWORD)</label>
                  <input
                    type="password"
                    required
                    value={pPassword}
                    onChange={(e) => setPPassword(e.target.value)}
                    placeholder="ตั้งรหัสผ่านสำหรับเข้าสู่ระบบ"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-850 rounded text-sm text-white focus:outline-none focus:border-brick/50"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded transition-colors cursor-pointer mt-2"
                >
                  ยืนยันสมัครสมาชิก (รับส่วนลดคืนนี้)
                </button>
              </form>
            )}

            <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg space-y-2 mt-4 text-xs font-light text-neutral-400 leading-relaxed">
              <span className="font-bold text-white block">✨ สิทธิพิเศษพรีเมียมเฉพาะ CLUB M5:</span>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Silver Class:</strong> สะสมพ้อยท์แลกของรางวัล + ลดเพิ่ม 5% ทุกจองพัก</li>
                <li><strong>Gold Class (จองครบ 3 ครั้ง):</strong> ฟรี Welcome Drink + เลทเช็คเอาท์ + ลดเพิ่ม 10%</li>
                <li><strong>Elite Class (จองครบ 8 ครั้ง):</strong> มินิบาร์ฟรี + บริการรถรับส่ง อิมแพ็ค อารีน่า + ลดเพิ่ม 15%</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer containing logout */}
        {currentMember && (
          <div className="p-4 bg-[#0e0e0e] border-t border-neutral-850 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-neutral-500 font-mono">CLUB M5 REWARDS ENGINE // EXCLUSIVE COMFORT</span>
            <button
              type="button"
              onClick={() => {
                logoutMember();
                setIsMemberPortalOpen(false);
              }}
              className="px-3.5 py-1.5 bg-red-950/40 hover:bg-red-900/30 border border-red-900/40 text-red-400 rounded text-xs font-bold transition-all cursor-pointer"
            >
              ออกจากระบบสมาชิก
            </button>
          </div>
        )}

      </div>
    </div>
  )}

    </div>
  );
}

// Helper to convert Matterport URLs to embed urls
function getMatterportEmbedUrl(urlOrId: string | undefined): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  
  // If simple 11-char ID
  if (/^[a-zA-Z0-9]{11}$/.test(trimmed)) {
    return `https://my.matterport.com/show/?m=${trimmed}&play=1&qs=1&brand=0&dh=1&hr=0&title=0&intro=0`;
  }
  
  // Match space ID from URL
  const idMatch = trimmed.match(/(?:space\/|m=)([a-zA-Z0-9]{11})/i);
  if (idMatch && idMatch[1]) {
    return `https://my.matterport.com/show/?m=${idMatch[1]}&play=1&qs=1&brand=0&dh=1&hr=0&title=0&intro=0`;
  }
  
  // Already embed url
  if (trimmed.includes("matterport.com/show")) {
    if (!trimmed.includes("play=")) {
      return trimmed + (trimmed.includes("?") ? "&" : "?") + "play=1&qs=1";
    }
    return trimmed;
  }
  
  return trimmed;
}
