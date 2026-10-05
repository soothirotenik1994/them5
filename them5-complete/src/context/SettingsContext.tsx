import React, { createContext, useContext, useState, useEffect } from "react";
import { RoomType, BookingDetails, Member } from "../types";

export interface GeneralSettings {
  hotelName: string;
  thaiName: string;
  heroTitle: string;
  heroSubtitle: string;
  gps: string;
  contactAddress: string;
  contactPhone: string;
  facebook: string;
  lineId: string;
  lineLink?: string;
  facebookUrl?: string;
  logoUrl?: string;
  coverImg1?: string;
  coverImg2?: string;
  coverImg3?: string;
  heroCardImg?: string;
  heroBgImg?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  allowRegistration?: boolean;
  bookingEnabled?: boolean;
  bookingDisabledMessage?: string;
  impactSyncInterval?: "manual" | "daily" | "weekly" | "monthly";
  lastImpactSyncTime?: string;
  googleReviewsSyncInterval?: "manual" | "daily" | "weekly" | "monthly";
  lastGoogleReviewsSyncTime?: string;
  googleReviewsApiKey?: string;
  eventPopupEnabled?: boolean;
  eventPopupMode?: "auto" | "custom" | "text";
  eventPopupSelectedId?: string;
  eventPopupCustomTitle?: string;
  eventPopupCustomDesc?: string;
  eventPopupCustomImg?: string;
  eventPopupTimeout?: number;
  adminPath?: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  adminNotifyEmail: string;
}

export interface BlockedDate {
  id: string;
  date: string; // "YYYY-MM-DD"
  roomId: string; // "all" or specific room ID like "superior", "deluxe", "studio"
  note: string; // e.g. "ปิดปรับปรุงระบบน้ำ"
}

export interface DiscountCoupon {
  code: string; // code to type (e.g. "WELCOME10")
  type: "percent" | "fixed"; // percentage or fixed amount discount
  value: number; // e.g., 10 for 10% or 200 for 200 THB
  minNights: number; // minimum stay nights
  active: boolean;
  description: string; // description shown when applied
}

export interface WebSettings {
  general: GeneralSettings;
  rooms: RoomType[];
  promotions: {
    id: string;
    badge: string;
    title: string;
    desc: string;
    highlight: string;
  }[];
  amenities: {
    iconName: string;
    title: string;
    desc: string;
  }[];
  faqs?: {
    q: string;
    a: string;
  }[];
  reviews?: {
    name: string;
    role: string;
    review: string;
    rating: number;
    date: string;
    avatarUrl?: string;
  }[];
  gallery?: {
    url: string;
    title: string;
    cat: string;
  }[];
  blockedDates?: BlockedDate[];
  coupons?: DiscountCoupon[];
  smtp?: SmtpSettings;
  slides?: {
    url: string;
    label: string;
    desc: string;
  }[];
  googlePlaceId?: string;
  googleReviewsEnabled?: boolean;
  impactEvents?: {
    id: string;
    title: string;
    date: string;
    time?: string;
    venue: string;
    description?: string;
    imageUrl?: string;
    category: string;
    active: boolean;
  }[];
}

export interface BookingRecord extends BookingDetails {
  id: string;
  status: "Pending" | "Paid" | "Confirmed" | "Checked-In" | "Completed" | "Cancelled";
  specialRequest?: string;
  createdAt: string;
}

export interface DbStatus {
  connected: boolean;
  database: string;
  url?: string;
  internalUrl?: string;
  token?: string;
  reason?: string;
}

interface SettingsContextType {
  settings: WebSettings;
  bookings: BookingRecord[];
  members: Member[];
  currentMember: Member | null;
  isLoading: boolean;
  error: string | null;
  dbStatus: DbStatus | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
  addBooking: (booking: Omit<BookingRecord, "id" | "status" | "createdAt">) => Promise<BookingRecord | null>;
  updateBookingStatus: (id: string, status: BookingRecord["status"]) => Promise<boolean>;
  updateBooking: (id: string, updatedFields: Partial<BookingRecord>) => Promise<boolean>;
  deleteBooking: (id: string) => Promise<boolean>;
  reseedDatabase: () => Promise<boolean>;
  registerMember: (member: Omit<Member, "id" | "points" | "joinedBookingsCount" | "createdAt">) => Promise<Member | null>;
  loginMember: (email: string, password?: string) => Promise<Member | null>;
  logoutMember: () => void;
  updateMemberOnServer: (id: string, updatedFields: Partial<Member>) => Promise<boolean>;
  deleteMemberOnServer: (id: string) => Promise<boolean>;
  addMemberOnServer: (member: Omit<Member, "id" | "createdAt">) => Promise<Member | null>;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function proxifyImageUrl(url: string): string {
  if (typeof url !== "string") return url;
  if (!url) return url;
  
  // 1. Full URL match (e.g. https://data.them5residence.com/assets/e67fc6de-49d5-436c-9d44-64bc64164ac7)
  const match = url.match(/https?:\/\/[^\/]+\/assets\/([a-zA-Z0-9\-]+)(.*)/);
  if (match) {
    const fileId = match[1];
    const query = match[2] || "";
    return `/api/assets/${fileId}${query}`;
  }

  // 2. Relative path match (e.g., /assets/UUID or assets/UUID)
  const relMatch = url.match(/(?:^\/)?assets\/([a-zA-Z0-9\-]+)(.*)/);
  if (relMatch) {
    const fileId = relMatch[1];
    const query = relMatch[2] || "";
    return `/api/assets/${fileId}${query}`;
  }

  // 3. Just a UUID (36 chars)
  const uuidRegex = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;
  if (uuidRegex.test(url)) {
    return `/api/assets/${url}`;
  }
  
  return url;
}

export function proxifyImagesInObject(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return proxifyImageUrl(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => proxifyImagesInObject(item));
  }
  if (typeof obj === "object") {
    const res: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = proxifyImagesInObject(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

const defaultGeneral: GeneralSettings = {
  hotelName: "The M5 Residence",
  thaiName: "เดอะ เอ็มไฟว์ เรสซิเดนซ์",
  heroTitle: "นิยามใหม่ของการพักผ่อน",
  heroSubtitle: "ดื่มด่ำกับดีไซน์ปูนเปลือยขัดมัน อิฐมอญธรรมชาติ และงานไม้โครงเหล็กดำสุดเท่ ยกระดับสุนทรียภาพแห่งชีวิตสมัยใหม่ย่านปากเกร็ด นนทบุรี ใกล้ชิดทุกคอนเสิร์ตและอีเว้นท์ดัง",
  gps: "13.91230, 100.54321",
  contactAddress: "ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอร์",
  contactPhone: "02-M5-LOFT",
  facebook: "The M5 Residence Loft",
  lineId: "@m5residence",
  logoUrl: "",
  coverImg1: "",
  coverImg2: "",
  coverImg3: "",
  heroCardImg: "",
  heroBgImg: "",
  seoTitle: "The M5 Residence | ที่พักสไตล์ลอฟท์ ปากเกร็ด นนทบุรี ใกล้อิมแพ็ค อารีน่า",
  eventPopupEnabled: false,
  eventPopupMode: "auto",
  eventPopupSelectedId: "",
  eventPopupCustomTitle: "",
  eventPopupCustomDesc: "",
  eventPopupCustomImg: "",
  eventPopupTimeout: 10,
  adminPath: "/admin"
};

const defaultRooms: RoomType[] = [];

const defaultPromotions: any[] = [];

const defaultAmenities: any[] = [];

export const defaultFaqs: any[] = [];

export const defaultReviews: any[] = [];

export const defaultGallery: any[] = [];

export const defaultSmtp = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "The M5 Residence",
  fromEmail: "",
  adminNotifyEmail: "admin@m5residence.com"
};

export const defaultSlides: any[] = [];



const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WebSettings>({
    general: defaultGeneral,
    rooms: defaultRooms,
    promotions: defaultPromotions,
    amenities: defaultAmenities,
    faqs: defaultFaqs,
    reviews: defaultReviews,
    gallery: defaultGallery,
    blockedDates: [],
    coupons: [],
    smtp: defaultSmtp,
    slides: defaultSlides,
    googlePlaceId: "ChIJXWlJMC-e4jARLqX9OidpWjY",
    googleReviewsEnabled: true,
    impactEvents: []
  });
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);

  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Replace window.alert inside preview frame to prevent DOMException / sandbox errors
  useEffect(() => {
    window.alert = (message: any) => {
      const msgStr = String(message);
      let type: "success" | "error" | "info" | "warning" = "info";
      
      if (
        msgStr.includes("สำเร็จ") || 
        msgStr.includes("เรียบร้อย") || 
        msgStr.includes("สมัครสมาชิกใหม่") || 
        msgStr.includes("อัปเดต")
      ) {
        type = "success";
      } else if (
        msgStr.includes("เกิดข้อขัดข้อง") || 
        msgStr.includes("เกิดข้อผิดพลาด") || 
        msgStr.includes("ไม่สำเร็จ") || 
        msgStr.includes("ขออภัย") || 
        msgStr.includes("ซ้ำในระบบ") || 
        msgStr.includes("กรุณา")
      ) {
        if (msgStr.includes("กรุณา") || msgStr.includes("ตรงกับวันปิดรับ")) {
          type = "warning";
        } else {
          type = "error";
        }
      }
      showToast(msgStr, type);
    };
  }, []);

  // The server is the source of truth; failed writes must never look successful.
  async function request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.error || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    return data;
  }
  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [data, auth, users, storage] = await Promise.all([
        request('/api/settings'), request('/api/auth/session'), request('/api/members'), request('/api/db-status')
      ]);
      setSettings(proxifyImagesInObject({ ...data.settings, general: { ...defaultGeneral, ...data.settings.general }, smtp: data.settings.smtp || defaultSmtp }));
      setBookings(data.bookings || []);
      setMembers(users.members || []);
      setCurrentMember(auth.member || null);
      setDbStatus(storage);
      setError(null);
      for (const key of ['m5_web_settings','m5_bookings','m5_members','m5_current_member','m5_admins_backup']) localStorage.removeItem(key);
    } catch (error: any) {
      setError(error.message);
      showToast('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบเซิร์ฟเวอร์แล้วรีเฟรชหน้า', 'error');
    } finally { setIsLoading(false); }
  };
  useEffect(() => { void loadAll(); }, []);
  const refreshSettings = loadAll;
  const updateSettings = async (newSettings: WebSettings): Promise<boolean> => {
    try { await request('/api/settings', { method: 'POST', body: JSON.stringify({ settings: newSettings }) }); await loadAll(); return true; }
    catch (e: any) { showToast(e.message, 'error'); return false; }
  };
  const addBooking = async (booking: Omit<BookingRecord, 'id' | 'status' | 'createdAt'>): Promise<BookingRecord | null> => {
    const data = await request('/api/bookings', { method: 'POST', body: JSON.stringify({ booking }) });
    setBookings(previous => [data.booking, ...previous.filter(b => b.id !== data.booking.id)]);
    return data.booking;
  };
  const mutateBooking = async (url: string, method: string, body?: any): Promise<boolean> => {
    try { await request(url, { method, body: body ? JSON.stringify(body) : undefined }); await loadAll(); return true; }
    catch (e: any) { showToast(e.message, 'error'); return false; }
  };
  const updateBookingStatus = (id: string, status: BookingRecord['status']) => mutateBooking('/api/bookings/' + id + '/status', 'POST', { status });
  const updateBooking = (id: string, booking: Partial<BookingRecord>) => mutateBooking('/api/bookings/' + id, 'PUT', { booking });
  const deleteBooking = (id: string) => mutateBooking('/api/bookings/' + id, 'DELETE');

  const reseedDatabase = async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/reseed", { method: "POST" });
      if (res.ok) {
        localStorage.removeItem("m5_web_settings");
        localStorage.removeItem("m5_bookings");
        localStorage.removeItem("m5_members");
        localStorage.removeItem("m5_current_member");
        await loadAll();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const registerMember = async (memberData: Omit<Member, "id" | "points" | "joinedBookingsCount" | "createdAt">): Promise<Member | null> => {
    try {
      const res = await fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: memberData })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.member) {
          const updated = [data.member, ...members];
          setMembers(updated);
          localStorage.setItem("m5_members", JSON.stringify(updated));
          setCurrentMember(data.member);
          localStorage.setItem("m5_current_member", JSON.stringify(data.member));
          await loadAll();
          return data.member;
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "สมัครสมาชิกไม่สำเร็จ");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อสมัครสมาชิก");
    }
    return null;
  };

  const loginMember = async (email: string, password?: string): Promise<Member | null> => {
    try {
      const res = await fetch("/api/members/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.member) {
          setCurrentMember(data.member);
          localStorage.setItem("m5_current_member", JSON.stringify(data.member));
          await loadAll();
          return data.member;
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
    return null;
  };

  const logoutMember = () => {
    void fetch("/api/members/logout", { method: "POST" }).then(() => loadAll());
    setCurrentMember(null);
    localStorage.removeItem("m5_current_member");
  };

  const updateMemberOnServer = async (id: string, member: Partial<Member>): Promise<boolean> => {
    try { await request('/api/members/' + id, { method: 'PUT', body: JSON.stringify({ member }) }); await loadAll(); return true; }
    catch (e: any) { showToast(e.message, 'error'); return false; }
  };
  const deleteMemberOnServer = async (id: string): Promise<boolean> => {
    try { await request('/api/members/' + id, { method: 'DELETE' }); await loadAll(); return true; }
    catch (e: any) { showToast(e.message, 'error'); return false; }
  };

  const addMemberOnServer = async (memberData: Omit<Member, "id" | "createdAt">): Promise<Member | null> => {
    try {
      const res = await fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: memberData })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.member) {
          let created = data.member;
          if (
            memberData.points !== created.points || 
            memberData.tier !== created.tier || 
            memberData.joinedBookingsCount !== created.joinedBookingsCount
          ) {
            const updateRes = await fetch(`/api/members/${created.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ member: memberData })
            });
            if (updateRes.ok) {
              const uData = await updateRes.json();
              created = uData.member;
            }
          }
          const updated = [created, ...members];
          setMembers(updated);
          localStorage.setItem("m5_members", JSON.stringify(updated));
          return created;
        }
      }
    } catch (err) {
      console.error("Error adding member", err);
    }
    return null;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        bookings,
        members,
        currentMember,
        isLoading,
        error,
        dbStatus,
        refreshSettings,
        updateSettings,
        addBooking,
        updateBookingStatus,
        updateBooking,
        deleteBooking,
        reseedDatabase,
        registerMember,
        loginMember,
        logoutMember,
        updateMemberOnServer,
        deleteMemberOnServer,
        addMemberOnServer,
        showToast
      }}
    >
      {children}

      {/* Styled custom notification banner / Toast Stack */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgColor = "bg-neutral-900 border-neutral-800";
          let accentColor = "bg-blue-500";
          let icon = "🔔";

          if (t.type === "success") {
            bgColor = "bg-[#141414] border-emerald-900/60";
            accentColor = "bg-emerald-500";
            icon = "✅";
          } else if (t.type === "error") {
            bgColor = "bg-[#141414] border-red-950";
            accentColor = "bg-red-500";
            icon = "❌";
          } else if (t.type === "warning") {
            bgColor = "bg-[#141414] border-amber-950";
            accentColor = "bg-amber-500";
            icon = "⚠️";
          }

          return (
            <div
              key={t.id}
              className={`flex items-stretch rounded-lg shadow-2xl border ${bgColor} overflow-hidden pointer-events-auto transition-all duration-300 hover:scale-[1.02]`}
              style={{
                animation: "toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              }}
            >
              <div className={`w-1.5 ${accentColor} shrink-0`} />
              <div className="p-4 flex items-start gap-3 w-full">
                <span className="text-sm shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 text-xs font-light leading-relaxed text-neutral-200 font-sans">
                  {t.message}
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer text-xs p-0.5 shrink-0 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%) scale(0.9);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
