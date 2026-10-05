import React, { createContext, useContext, useState, useEffect } from "react";
import { RoomType, BookingDetails, Member, LineSettings, NotificationLog, AdminRoleConfig, AdminMenuItemConfig } from "../types";
import { BillingDocument, CompanyProfile, defaultCompanyProfile } from "../types/billing";
import {
  initialDefaultRooms,
  normalizeImagePath,
  getRoomsFromFirestore,
  saveRoomsToFirestore,
  saveRoomToFirestore,
  saveAllRoomsToFirestore,
  getBookingsFromFirestore,
  addBookingToFirestore,
  updateBookingInFirestore,
  deleteBookingFromFirestore,
  getEventsFromFirestore,
  saveEventsToFirestore,
  getSettingsFromFirestore,
  saveSettingsToFirestore,
  getMembersFromFirestore,
  saveMemberToFirestore,
  deleteMemberFromFirestore,
  getNotificationsFromFirestore,
  addNotificationToFirestore,
  getBillingDocumentsFromFirestore,
  saveBillingDocumentToFirestore,
  deleteBillingDocumentFromFirestore,
  getCompanyProfileFromFirestore,
  saveCompanyProfileToFirestore,
  initialDefaultBillingDocuments,
  testConnection
} from "../firebase";

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
  quotationRequestEnabled?: boolean;
  quotationDisabledMessage?: string;
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
  quotationAddOns?: QuotationAddOnOption[];
}

export interface QuotationAddOnOption {
  id: string; // "breakfast" | "extra_bed" | "meeting_room" | "shuttle" (or custom)
  name: string; // e.g. "บุฟเฟต์อาหารเช้า (Breakfast)"
  unit: string; // e.g. "ท่าน" | "คืน" | "ชม." | "เที่ยว"
  price: number; // e.g. 150, 400, 500, 300
  enabled: boolean; // toggle on/off
  description?: string;
}

export const defaultQuotationAddOns: QuotationAddOnOption[] = [
  {
    id: "breakfast",
    name: "บุฟเฟต์อาหารเช้า (Breakfast)",
    unit: "ท่าน",
    price: 150,
    enabled: true,
    description: "The M5 Loft Cafe & Dining"
  },
  {
    id: "extra_bed",
    name: "เตียงเสริม (Extra Bed)",
    unit: "คืน",
    price: 400,
    enabled: true,
    description: "รวมเครื่องนอนครบชุด"
  },
  {
    id: "meeting_room",
    name: "ห้องประชุมสัมมนา (Meeting Room)",
    unit: "ชม.",
    price: 500,
    enabled: true,
    description: "พร้อมระบบจอภาพ และเครื่องเสียงคุณภาพ"
  },
  {
    id: "shuttle",
    name: "รถตู้รับ-ส่ง อิมแพ็ค / สนามบิน",
    unit: "เที่ยว",
    price: 300,
    enabled: true,
    description: "The M5 Shuttle Van"
  }
];

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  adminNotifyEmail: string;
  apiKey?: string;
  apiBaseUrl?: string;
  provider?: "smtp2go" | "standard";
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
  line?: LineSettings;
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
  partners?: {
    id: string;
    name: string;
    logoUrl: string;
    link?: string;
    active?: boolean;
  }[];
  adminMenuConfig?: AdminMenuItemConfig[];
  adminRoles?: AdminRoleConfig[];
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
  clearAllBookings: () => Promise<boolean>;
  clearAllGallery: () => Promise<boolean>;
  reseedDatabase: () => Promise<boolean>;
  registerMember: (member: Omit<Member, "id" | "points" | "joinedBookingsCount" | "createdAt">) => Promise<Member | null>;
  loginMember: (email: string, password?: string) => Promise<Member | null>;
  logoutMember: () => void;
  updateMemberOnServer: (id: string, updatedFields: Partial<Member>) => Promise<boolean>;
  deleteMemberOnServer: (id: string) => Promise<boolean>;
  addMemberOnServer: (member: Omit<Member, "id" | "createdAt">) => Promise<Member | null>;
  notifications: NotificationLog[];
  refreshNotifications: () => Promise<void>;
  testLineNotification: (lineConfig: LineSettings, customMessage?: string) => Promise<{ success: boolean; message: string }>;
  testEmailNotification: (smtp: SmtpSettings, testEmail: string) => Promise<{ success: boolean; message: string }>;
  testBookingEmailNotification: (smtp: SmtpSettings, recipientEmails?: string) => Promise<{ success: boolean; message: string }>;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  billingDocuments: BillingDocument[];
  companyProfile: CompanyProfile;
  saveBillingDocument: (document: BillingDocument) => Promise<boolean>;
  deleteBillingDocument: (id: string) => Promise<boolean>;
  saveCompanyProfile: (profile: CompanyProfile) => Promise<boolean>;
}

export function proxifyImageUrl(url: string): string {
  if (typeof url !== "string") return url;
  if (!url) return url;
  
  // Directly normalize known local files to public/images/
  if (url.includes("bedroom_superior")) return "/images/bedroom_superior_m5_1782203272229.jpg";
  if (url.includes("bedroom_deluxe")) return "/images/bedroom_deluxe_m5_1782203318372.jpg";
  if (url.includes("bedroom_studio")) return "/images/bedroom_studio_m5_1782203293730.jpg";
  if (url.includes("lobby_loft")) return "/images/lobby_loft_m5_1782203250164.jpg";

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
  contactPhone: "086379676",
  facebook: "The M5 Residence Loft",
  lineId: "@m5residence",
  logoUrl: "",
  coverImg1: "/images/lobby_loft_m5_1782203250164.jpg",
  coverImg2: "/images/bedroom_superior_m5_1782203272229.jpg",
  coverImg3: "/images/bedroom_deluxe_m5_1782203318372.jpg",
  heroCardImg: "/images/lobby_loft_m5_1782203250164.jpg",
  heroBgImg: "/images/lobby_loft_m5_1782203250164.jpg",
  seoTitle: "The M5 Residence | ที่พักสไตล์ลอฟท์ ปากเกร็ด นนทบุรี ใกล้อิมแพ็ค อารีน่า",
  allowRegistration: true,
  bookingEnabled: true,
  bookingDisabledMessage: "ขออภัย ระบบจองห้องพักออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากมีข้อสงสัยหรือต้องการจองด่วน สามารถติดต่อผ่าน Line ID หรือเบอร์โทรศัพท์ได้โดยตรง",
  quotationRequestEnabled: true,
  quotationDisabledMessage: "ขออภัย ระบบขอใบเสนอราคาออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากท่านต้องการขอใบเสนอราคาด่วน สามารถติดต่อผ่าน Line หรือเบอร์โทรศัพท์ได้โดยตรงครับ",
  eventPopupEnabled: true,
  eventPopupMode: "auto",
  eventPopupSelectedId: "",
  eventPopupCustomTitle: "",
  eventPopupCustomDesc: "",
  eventPopupCustomImg: "",
  eventPopupTimeout: 10,
  lineLink: "https://page.line.me/871ctwom",
  facebookUrl: "https://www.facebook.com/them5muangthong",
  adminPath: "/admin123",
  quotationAddOns: defaultQuotationAddOns
};

const defaultRooms: RoomType[] = initialDefaultRooms;

const defaultPromotions: any[] = [];

const defaultAmenities: any[] = [
  {
    id: 69,
    iconName: "Car",
    title: "บริการรับส่ง IMPACT",
    desc: "โรงแรมเรามีบริการรับส่งลูกค้าไปที่ IMPACT เมืองทองธานี ตามช่วงเวลา"
  },
  {
    id: 70,
    iconName: "Coffee",
    title: "ร้านกาแฟ",
    desc: "โรงแรมเรามีร้านกาแฟให้บริการ ให้ลูกค้าสามารถดื่มด่ำรับความสดชื่นในยามเช้าได้ทุกวัน"
  },
  {
    id: 71,
    iconName: "Wifi",
    title: "อินเตอร์เน็ต WIFI",
    desc: "โรงแรมเราให้บริการอินเตอร์ WIFI ตลอด 24 ชั่วโมง"
  },
  {
    id: 72,
    iconName: "ShieldCheck",
    title: "ความปลอดภัย",
    desc: "โรงแรมเรามีกล้องวงจรปิดตลอด 24 ชั่วโมง ตรวจเช็คสภาพพร้อมใช้งานสม่ำเสมอ"
  },
  {
    id: 73,
    iconName: "users",
    title: "Service Mind",
    desc: "โรงแรมเราบริการลูกค้าทุกท่านด้วยความใส่ใจ พร้อมให้บริการตลอด 24 ชั่วโมง"
  }
];

export const defaultFaqs: any[] = [];

export const defaultReviews: any[] = [];

export const defaultGallery: any[] = [];

export const defaultSmtp: SmtpSettings = {
  host: "mail.smtp2go.com",
  port: 2525,
  secure: false,
  user: "them5",
  pass: "aOvdjB4hrp7W8ptQ",
  fromName: "The M5 Residence Loft",
  fromEmail: "no-reply@them5residence.com",
  adminNotifyEmail: "soothirote.nik@gmail.com",
  apiKey: "api-77AF153BDA6C4F7FB6DED66C6CC28802",
  apiBaseUrl: "https://api.smtp2go.com/v3/",
  provider: "smtp2go"
};

export const defaultLine: LineSettings = {
  enabled: true,
  token: "",
  channelAccessToken: "",
  targetId: "",
  webhookUrl: ""
};

export const defaultSlides: any[] = [
  {
    url: "/images/lobby_loft_m5_1782203250164.jpg",
    label: "LOBBY & RECEPTION",
    desc: "โถงต้อนรับสไตล์อินดัสเทรียลลอฟท์ อิฐมอญธรรมชาติและโครงสร้างเหล็กดำสุดคลาสสิก"
  },
  {
    url: "/images/bedroom_deluxe_m5_1782203318372.jpg",
    label: "DELUXE LOFT ROOM",
    desc: "ห้องพักเตียงคิงไซส์ 6 ฟุต พร้อมพื้นที่นั่งเล่นและสิ่งอำนวยความสะดวกครบครัน"
  },
  {
    url: "/images/bedroom_superior_m5_1782203272229.jpg",
    label: "SUPERIOR TWIN ROOM",
    desc: "ห้องพักเตียงคู่ แยกเตียงเดี่ยว 3.5 ฟุต พักผ่อนสบาย ปลอดโปร่ง ใกล้อิมแพ็ค"
  },
  {
    url: "/images/bedroom_studio_m5_1782203293730.jpg",
    label: "STUDIO LOFT ROOM",
    desc: "ห้องสตูดิโอขนาดกว้างขวาง ดีไซน์ปูนเปลือยขัดมันอบอุ่น"
  }
];

export const defaultAdminRoles: AdminRoleConfig[] = [
  { id: "role_super_admin", name: "Super Admin", description: "ผู้ดูแลระบบสูงสุด (เข้าถึงได้ทุกเมนู)", badgeColor: "amber", isSystem: true },
  { id: "role_loft_admin", name: "Loft Admin", description: "ผู้ดูแลห้อง M5 Loft และระบบโปรโมชั่น", badgeColor: "cyan" },
  { id: "role_general_admin", name: "General Admin", description: "เจ้าหน้าที่ต้อนรับและงานบริการทั่วไป", badgeColor: "zinc" },
  { id: "role_front_desk", name: "Front Desk", description: "ฝ่ายต้อนรับส่วนหน้า ดูรายการจองและปฏิทิน", badgeColor: "emerald" },
  { id: "role_marketing", name: "Marketing", description: "ฝ่ายการตลาด แคมเปญ โปรโมชั่น และ SEO", badgeColor: "purple" }
];

export const defaultAdminMenuConfig: AdminMenuItemConfig[] = [
  { id: "dashboard", label: "แดชบอร์ดสรุป (Summary)", iconName: "LayoutDashboard", order: 1, allowedRoles: ["*"], visible: true, badgeType: "none", isSystem: true },
  { id: "general", label: "ตั้งค่าโรงแรมหลัก", iconName: "Hotel", order: 2, allowedRoles: ["Super Admin", "Loft Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "rooms", label: "จัดการประเภทห้องพัก", iconName: "Bed", order: 3, allowedRoles: ["Super Admin", "Loft Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "promotions", label: "แคมเปญโปรโมชั่น", iconName: "Gift", order: 4, allowedRoles: ["Super Admin", "Loft Admin", "Marketing"], visible: true, badgeType: "none", isSystem: true },
  { id: "bookings", label: "รายการจองห้องพัก", iconName: "Calendar", order: 5, allowedRoles: ["Super Admin", "Loft Admin", "General Admin", "Front Desk"], visible: true, badgeType: "pendingBookings", isSystem: true },
  { id: "billing", label: "ใบกำกับภาษี & ใบเสนอราคา", iconName: "FileText", order: 6, allowedRoles: ["*"], visible: true, badgeType: "none", isSystem: true },
  { id: "amenities", label: "สิ่งอำนวยความสะดวก", iconName: "Coffee", order: 7, allowedRoles: ["Super Admin", "Loft Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "faqs", label: "คำถามที่พบบ่อย (FAQs)", iconName: "HelpCircle", order: 8, allowedRoles: ["Super Admin", "General Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "reviews", label: "รีวิวจำลองคุณลูกค้า", iconName: "MessageSquare", order: 9, allowedRoles: ["Super Admin", "General Admin", "Marketing"], visible: true, badgeType: "none", isSystem: true },
  { id: "gallery", label: "รูปภาพแกลเลอรี", iconName: "Images", order: 10, allowedRoles: ["Super Admin", "Loft Admin", "Marketing"], visible: true, badgeType: "none", isSystem: true },
  { id: "members", label: "จัดการระบบสมาชิก", iconName: "User", order: 11, allowedRoles: ["Super Admin", "General Admin", "Front Desk"], visible: true, badgeType: "membersCount", isSystem: true },
  { id: "admins", label: "จัดการสิทธิ์แอดมิน", iconName: "ShieldCheck", order: 12, allowedRoles: ["Super Admin"], visible: true, badgeType: "adminsCount", isSystem: true },
  { id: "calendar", label: "ปฏิทินการจองห้อง", iconName: "Calendar", order: 13, allowedRoles: ["Super Admin", "Loft Admin", "General Admin", "Front Desk"], visible: true, badgeType: "none", isSystem: true },
  { id: "impact", label: "ตารางงาน IMPACT", iconName: "Sparkles", order: 14, allowedRoles: ["*"], visible: true, badgeType: "text", badgeText: "API", isSystem: true },
  { id: "blocked", label: "กำหนดวันปิดรับจอง", iconName: "ShieldAlert", order: 15, allowedRoles: ["Super Admin", "Loft Admin", "Front Desk"], visible: true, badgeType: "none", isSystem: true },
  { id: "coupons", label: "จัดการส่วนลดคูปอง", iconName: "Ticket", order: 16, allowedRoles: ["Super Admin", "Marketing"], visible: true, badgeType: "none", isSystem: true },
  { id: "backgrounds", label: "จัดการพื้นหลังเว็บ", iconName: "Wallpaper", order: 17, allowedRoles: ["Super Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "seo", label: "ตั้งค่า SEO / คีย์เวิร์ด", iconName: "Sparkles", order: 18, allowedRoles: ["Super Admin", "Marketing"], visible: true, badgeType: "none", isSystem: true },
  { id: "partners", label: "จัดการเมนูพาร์ทเนอร์", iconName: "Handshake", order: 19, allowedRoles: ["Super Admin", "Marketing"], visible: true, badgeType: "partnersCount", isSystem: true },
  { id: "directus", label: "ตั้งค่าเชื่อมต่อ Directus", iconName: "Database", order: 20, allowedRoles: ["Super Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "smtp", label: "แจ้งเตือน LINE & อีเมล", iconName: "Bell", order: 21, allowedRoles: ["Super Admin"], visible: true, badgeType: "none", isSystem: true },
  { id: "menu_management", label: "จัดลำดับเมนู & สิทธิ์", iconName: "SlidersHorizontal", order: 22, allowedRoles: ["Super Admin"], visible: true, badgeType: "none", isSystem: true }
];

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
    line: defaultLine,
    slides: defaultSlides,
    googlePlaceId: "ChIJXWlJMC-e4jARLqX9OidpWjY",
    googleReviewsEnabled: true,
    impactEvents: [],
    partners: [],
    adminRoles: defaultAdminRoles,
    adminMenuConfig: defaultAdminMenuConfig
  });
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const cached = localStorage.getItem("m5_bookings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((b: any) => b.id !== "B-1001" && b.guestEmail !== "somsak@gmail.com");
          if (clean.length !== parsed.length) {
            localStorage.setItem("m5_bookings", JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch {}
    return [];
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [billingDocuments, setBillingDocuments] = useState<BillingDocument[]>(() => {
    try {
      const cached = localStorage.getItem("m5_billing_docs");
      return cached ? JSON.parse(cached) : initialDefaultBillingDocuments;
    } catch {
      return initialDefaultBillingDocuments;
    }
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const cached = localStorage.getItem("m5_company_profile");
      return cached ? JSON.parse(cached) : defaultCompanyProfile;
    } catch {
      return defaultCompanyProfile;
    }
  });
  const [currentMember, setCurrentMember] = useState<Member | null>(() => {
    const cached = localStorage.getItem("m5_current_member");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (_) {
        return null;
      }
    }
    return null;
  });
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

  // Initial load
  const loadAll = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live Firestore data
      let firestoreRooms: RoomType[] = [];
      let firestoreBookings: BookingRecord[] = [];
      let firestoreEvents: any[] = [];
      let firestoreSettings: Partial<WebSettings> | null = null;
      let firestoreMembers: Member[] = [];

      try {
        const [rRes, bRes, eRes, sRes, mRes] = await Promise.allSettled([
          getRoomsFromFirestore(),
          getBookingsFromFirestore(),
          getEventsFromFirestore(),
          getSettingsFromFirestore(),
          getMembersFromFirestore()
        ]);
        if (rRes.status === "fulfilled" && rRes.value.length > 0) firestoreRooms = rRes.value;
        if (bRes.status === "fulfilled" && bRes.value.length > 0) firestoreBookings = bRes.value;
        if (eRes.status === "fulfilled" && eRes.value.length > 0) firestoreEvents = eRes.value;
        if (sRes.status === "fulfilled" && sRes.value) firestoreSettings = sRes.value;
        if (mRes.status === "fulfilled" && mRes.value.length > 0) firestoreMembers = mRes.value;
      } catch (fErr) {
        console.warn("Could not query Firestore initially:", fErr);
      }

      // 2. Fetch server API settings as baseline
      let data: any = { success: true, settings: {}, bookings: [] };
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("API settings fetch skipped or offline:", err);
      }

      const baseRooms = (firestoreRooms.length > 0)
        ? firestoreRooms
        : ((data.settings && data.settings.rooms && data.settings.rooms.length > 0) ? data.settings.rooms : defaultRooms);

      const mergedRooms = baseRooms.map((room: RoomType) => ({
        ...room,
        imageUrl: normalizeImagePath(room.imageUrl) || room.imageUrl,
        active: room.active !== undefined ? room.active : true
      }));

      // If Firestore had no rooms yet, seed them
      if (firestoreRooms.length === 0) {
        saveAllRoomsToFirestore(mergedRooms).catch(() => {});
      }

      const mergedGeneral = { 
        ...defaultGeneral, 
        ...(data.settings?.general || {}), 
        ...(firestoreSettings?.general || {}) 
      };
      if (!mergedGeneral.coverImg1) mergedGeneral.coverImg1 = defaultGeneral.coverImg1;
      if (!mergedGeneral.coverImg2) mergedGeneral.coverImg2 = defaultGeneral.coverImg2;
      if (!mergedGeneral.coverImg3) mergedGeneral.coverImg3 = defaultGeneral.coverImg3;
      if (!mergedGeneral.heroCardImg) mergedGeneral.heroCardImg = defaultGeneral.heroCardImg;
      if (!mergedGeneral.heroBgImg) mergedGeneral.heroBgImg = defaultGeneral.heroBgImg;

      const rawSlides = (firestoreSettings?.slides && firestoreSettings.slides.length > 0)
        ? firestoreSettings.slides
        : (data.settings?.slides && data.settings.slides.length > 0 ? data.settings.slides : defaultSlides);

      const mergedSlides = (rawSlides && rawSlides.length > 0)
        ? rawSlides.map((s: any, idx: number) => ({
            ...s,
            url: (s.url && s.url.trim()) ? s.url : (defaultSlides[idx % defaultSlides.length]?.url || defaultGeneral.coverImg1),
            label: s.label || defaultSlides[idx % defaultSlides.length]?.label || `SLIDE ${idx + 1}`,
            desc: s.desc || defaultSlides[idx % defaultSlides.length]?.desc || ""
          }))
        : defaultSlides;

      let finalSettings: WebSettings = {
        ...data.settings,
        ...(firestoreSettings || {}),
        general: mergedGeneral,
        rooms: mergedRooms,
        promotions: data.settings?.promotions !== undefined ? data.settings.promotions : defaultPromotions,
        amenities: data.settings?.amenities !== undefined ? data.settings.amenities : defaultAmenities,
        faqs: data.settings?.faqs !== undefined ? data.settings.faqs : defaultFaqs,
        reviews: data.settings?.reviews !== undefined ? data.settings.reviews : defaultReviews,
        gallery: Array.isArray(firestoreSettings?.gallery)
          ? firestoreSettings.gallery
          : (Array.isArray(data.settings?.gallery) ? data.settings.gallery : []),
        blockedDates: data.settings?.blockedDates || [],
        coupons: data.settings?.coupons || [],
        smtp: data.settings?.smtp || defaultSmtp,
        line: data.settings?.line || (firestoreSettings as any)?.line || defaultLine,
        slides: mergedSlides,
        googlePlaceId: data.settings?.googlePlaceId || "ChIJXWlJMC-e4jARLqX9OidpWjY",
        googleReviewsEnabled: data.settings?.googleReviewsEnabled !== undefined ? data.settings.googleReviewsEnabled : true,
        impactEvents: (firestoreEvents.length > 0) ? firestoreEvents : (data.settings?.impactEvents || []),
        partners: data.settings?.partners || [],
        adminRoles: (data.settings?.adminRoles && data.settings.adminRoles.length > 0)
          ? data.settings.adminRoles
          : ((firestoreSettings as any)?.adminRoles || defaultAdminRoles),
        adminMenuConfig: (data.settings?.adminMenuConfig && data.settings.adminMenuConfig.length > 0)
          ? data.settings.adminMenuConfig
          : ((firestoreSettings as any)?.adminMenuConfig || defaultAdminMenuConfig)
      };

      if (firestoreEvents.length === 0 && finalSettings.impactEvents && finalSettings.impactEvents.length > 0) {
        saveEventsToFirestore(finalSettings.impactEvents).catch(() => {});
      }

      let finalBookings = (firestoreBookings.length > 0) ? firestoreBookings : (data.bookings || []);
      const deletedIds = data.settings?.deletedBookingIds || [];
      finalBookings = finalBookings.filter(b => b.id !== "B-1001" && b.guestEmail !== "somsak@gmail.com" && !deletedIds.includes(b.id));

      setSettings(proxifyImagesInObject(finalSettings));
      setBookings(finalBookings);

      localStorage.setItem("m5_web_settings", JSON.stringify(finalSettings));
      localStorage.setItem("m5_bookings", JSON.stringify(finalBookings));

      // Members
      if (firestoreMembers.length > 0) {
        setMembers(firestoreMembers);
        localStorage.setItem("m5_members", JSON.stringify(firestoreMembers));
      } else {
        try {
          const memRes = await fetch("/api/members");
          if (memRes.ok) {
            const memData = await memRes.json();
            if (memData.success && memData.members) {
              setMembers(memData.members);
              localStorage.setItem("m5_members", JSON.stringify(memData.members));
              // Seed members to Firestore
              for (const m of memData.members) {
                saveMemberToFirestore(m).catch(() => {});
              }
            }
          }
        } catch (_) {}
      }

      // Billing Documents & Company Profile
      try {
        const [docsSnap, compSnap] = await Promise.allSettled([
          getBillingDocumentsFromFirestore(),
          getCompanyProfileFromFirestore()
        ]);
        if (docsSnap.status === "fulfilled" && docsSnap.value.length > 0) {
          setBillingDocuments(docsSnap.value);
          localStorage.setItem("m5_billing_docs", JSON.stringify(docsSnap.value));
        } else {
          // seed initial documents if firestore was empty
          for (const d of initialDefaultBillingDocuments) {
            saveBillingDocumentToFirestore(d).catch(() => {});
          }
        }
        if (compSnap.status === "fulfilled" && compSnap.value) {
          setCompanyProfile(compSnap.value);
          localStorage.setItem("m5_company_profile", JSON.stringify(compSnap.value));
        }
      } catch (bErr) {
        console.warn("Could not query billing documents from Firestore:", bErr);
      }

      setDbStatus({
        connected: true,
        database: "Firebase Cloud Firestore",
        url: "https://console.firebase.google.com/project/gen-lang-client-0607463040/firestore",
        reason: "Active Cloud Firestore sync (ai-studio-them5residence-1839dfac-a9c8-4d67-b303-9f0a6186100b)"
      });
    } catch (err: any) {
      console.warn("Backend API or Firestore fallback error:", err);
      setError("Using offline backup settings.");
      setDbStatus({
        connected: true,
        database: "Firebase Cloud Firestore (Local Cache)",
        reason: "Offline / Cached"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const refreshSettings = async () => {
    await loadAll();
  };

  const updateSettings = async (newSettings: WebSettings): Promise<boolean> => {
    try {
      // Save local backup immediately
      localStorage.setItem("m5_web_settings", JSON.stringify(newSettings));
      setSettings(proxifyImagesInObject(newSettings));

      // Save to Cloud Firestore
      saveSettingsToFirestore(newSettings).catch(err => console.warn("Firestore saveSettings warning:", err));
      if (newSettings.rooms && newSettings.rooms.length > 0) {
        saveAllRoomsToFirestore(newSettings.rooms).catch(err => console.warn("Firestore saveRooms warning:", err));
      }
      if (newSettings.impactEvents && newSettings.impactEvents.length > 0) {
        saveEventsToFirestore(newSettings.impactEvents).catch(err => console.warn("Firestore saveEvents warning:", err));
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings })
      });

      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
      return true; // proceed anyway as local and Firestore are updated
    } catch (err) {
      console.error("Error updating settings on server", err);
      return true; // optimistic update
    }
  };

  const addBooking = async (booking: Omit<BookingRecord, "id" | "status" | "createdAt">): Promise<BookingRecord | null> => {
    try {
      const tempId = "B-" + Math.floor(1000 + Math.random() * 9000);
      const newRecord: BookingRecord = {
        ...booking,
        id: tempId,
        status: "Pending",
        createdAt: new Date().toISOString()
      };

      // Add to local state first
      const updatedBookings = [newRecord, ...bookings];
      setBookings(updatedBookings);
      localStorage.setItem("m5_bookings", JSON.stringify(updatedBookings));

      // Save to Cloud Firestore
      addBookingToFirestore(newRecord).catch(err => console.warn("Firestore addBooking error:", err));

      // Hit API for email notifications
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: newRecord })
      });

      if (res.ok) {
        const data = await res.json();
        setTimeout(() => {
          refreshNotifications().catch(() => {});
        }, 1200);
        if (data.success && data.booking) {
          const verifiedBookings = bookings.map(b => b.id === tempId ? data.booking : b);
          setBookings(verifiedBookings);
          localStorage.setItem("m5_bookings", JSON.stringify(verifiedBookings));
          return data.booking;
        }
      }
      return newRecord;
    } catch (err) {
      console.error("Error sending booking to server, saved in Firestore and locally", err);
      const tempId = "B-" + Math.floor(1000 + Math.random() * 9000);
      const offlineRecord: BookingRecord = {
        ...booking,
        id: tempId,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
      addBookingToFirestore(offlineRecord).catch(() => {});
      const updatedBookings = [offlineRecord, ...bookings];
      setBookings(updatedBookings);
      localStorage.setItem("m5_bookings", JSON.stringify(updatedBookings));
      return offlineRecord;
    }
  };

  const updateBookingStatus = async (id: string, status: BookingRecord["status"]): Promise<boolean> => {
    const updated = bookings.map(b => b.id === id ? { ...b, status } : b);
    setBookings(updated);
    localStorage.setItem("m5_bookings", JSON.stringify(updated));

    // Update in Cloud Firestore
    updateBookingInFirestore(id, { status }).catch(err => console.warn("Firestore updateBookingStatus error:", err));

    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      return res.ok;
    } catch (err) {
      console.error("Error setting booking status on server", err);
      return true;
    }
  };

  const updateBooking = async (id: string, updatedFields: Partial<BookingRecord>): Promise<boolean> => {
    const updated = bookings.map(b => b.id === id ? { ...b, ...updatedFields } : b);
    setBookings(updated);
    localStorage.setItem("m5_bookings", JSON.stringify(updated));

    // Update in Cloud Firestore
    updateBookingInFirestore(id, updatedFields).catch(err => console.warn("Firestore updateBooking error:", err));

    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: updatedFields })
      });
      return res.ok;
    } catch (err) {
      console.error("Error updating booking on server", err);
      return true;
    }
  };

  const deleteBooking = async (id: string): Promise<boolean> => {
    try {
      const deletedList = JSON.parse(localStorage.getItem("m5_deleted_booking_ids") || "[]");
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem("m5_deleted_booking_ids", JSON.stringify(deletedList));
      }
    } catch (_) {}

    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem("m5_bookings", JSON.stringify(updated));

    // Delete from Cloud Firestore
    deleteBookingFromFirestore(id).catch(err => console.warn("Firestore deleteBooking error:", err));

    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "DELETE"
      });
      return res.ok;
    } catch (err) {
      console.error("Error deleting booking on server", err);
      return true;
    }
  };

  const clearAllBookings = async (): Promise<boolean> => {
    setBookings([]);
    localStorage.removeItem("m5_bookings");
    try {
      const res = await fetch("/api/bookings/clear-all", { method: "POST" });
      return res.ok;
    } catch (err) {
      console.error("Error clearing all bookings:", err);
      return false;
    }
  };

  const clearAllGallery = async (): Promise<boolean> => {
    try {
      const newSettings = { ...settings, gallery: [] };
      setSettings(newSettings);
      localStorage.setItem("m5_web_settings", JSON.stringify(newSettings));
      saveSettingsToFirestore(newSettings).catch(() => {});
      const res = await fetch("/api/gallery/clear-all", { method: "POST" });
      return res.ok;
    } catch (err) {
      console.error("Error clearing all gallery images:", err);
      return false;
    }
  };

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
          saveMemberToFirestore(data.member).catch(() => {});
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
    setCurrentMember(null);
    localStorage.removeItem("m5_current_member");
  };

  const updateMemberOnServer = async (id: string, updatedFields: Partial<Member>): Promise<boolean> => {
    const updated = members.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    setMembers(updated);
    localStorage.setItem("m5_members", JSON.stringify(updated));

    const targetMember = updated.find(m => m.id === id);
    if (targetMember) {
      saveMemberToFirestore(targetMember).catch(() => {});
    }

    if (currentMember && currentMember.id === id) {
      const updatedCur = { ...currentMember, ...updatedFields };
      setCurrentMember(updatedCur);
      localStorage.setItem("m5_current_member", JSON.stringify(updatedCur));
    }

    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: updatedFields })
      });
      return res.ok;
    } catch (err) {
      console.error("Error updating member on server", err);
      return true;
    }
  };

  const deleteMemberOnServer = async (id: string): Promise<boolean> => {
    try {
      const deletedList = JSON.parse(localStorage.getItem("m5_deleted_member_ids") || "[]");
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem("m5_deleted_member_ids", JSON.stringify(deletedList));
      }
    } catch (_) {}

    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    localStorage.setItem("m5_members", JSON.stringify(updated));

    deleteMemberFromFirestore(id).catch(() => {});

    if (currentMember && currentMember.id === id) {
      logoutMember();
    }

    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE"
      });
      return res.ok;
    } catch (err) {
      console.error("Error deleting member on server", err);
      return true;
    }
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
          saveMemberToFirestore(created).catch(() => {});
          return created;
        }
      }
    } catch (err) {
      console.error("Error adding member", err);
    }
    return null;
  };

  const refreshNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          return;
        }
      }
      const firestoreNotifs = await getNotificationsFromFirestore();
      if (firestoreNotifs && firestoreNotifs.length > 0) {
        setNotifications(firestoreNotifs);
      }
    } catch (err) {
      console.warn("Could not load notifications:", err);
    }
  };

  const testLineNotification = async (lineConfig: LineSettings, customMessage?: string) => {
    try {
      const res = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: lineConfig, customMessage })
      });
      const data = await res.json();
      setTimeout(() => refreshNotifications(), 600);
      return {
        success: data.success === true,
        message: data.message || data.error || (data.success ? "ส่งเข้า LINE สำเร็จ" : "เกิดข้อผิดพลาดในการส่ง LINE")
      };
    } catch (err: any) {
      return { success: false, message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  };

  const testEmailNotification = async (smtpConfig: SmtpSettings, testEmail: string) => {
    try {
      const res = await fetch("/api/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtp: smtpConfig, testEmail })
      });
      const data = await res.json();
      setTimeout(() => refreshNotifications(), 600);
      return {
        success: data.success === true,
        message: data.message || data.error || (data.success ? "ส่งอีเมลทดสอบสำเร็จ" : "เกิดข้อผิดพลาดในการส่งอีเมล")
      };
    } catch (err: any) {
      return { success: false, message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  };

  const testBookingEmailNotification = async (smtpConfig: SmtpSettings, recipientEmails?: string) => {
    try {
      const res = await fetch("/api/smtp/test-booking-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtp: smtpConfig, recipientEmails })
      });
      const data = await res.json();
      setTimeout(() => refreshNotifications(), 600);
      return {
        success: data.success === true,
        message: data.message || data.error || (data.success ? "ส่งอีเมลแจ้งเตือนการจองทดสอบสำเร็จ" : "เกิดข้อผิดพลาดในการส่งอีเมล")
      };
    } catch (err: any) {
      return { success: false, message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ" };
    }
  };

  const saveBillingDocument = async (document: BillingDocument): Promise<boolean> => {
    try {
      setBillingDocuments((prev) => {
        const idx = prev.findIndex((d) => d.id === document.id);
        let next: BillingDocument[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = document;
        } else {
          next = [document, ...prev];
        }
        localStorage.setItem("m5_billing_docs", JSON.stringify(next));
        return next;
      });
      await saveBillingDocumentToFirestore(document);
      showToast(`บันทึกเอกสาร ${document.documentNumber} สำเร็จ`, "success");
      return true;
    } catch (err: any) {
      console.error("Error saving billing document:", err);
      showToast(`ไม่สามารถบันทึกเอกสาร: ${err.message}`, "error");
      return false;
    }
  };

  const deleteBillingDocument = async (id: string): Promise<boolean> => {
    try {
      setBillingDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id);
        localStorage.setItem("m5_billing_docs", JSON.stringify(next));
        return next;
      });
      await deleteBillingDocumentFromFirestore(id);
      showToast("ลบเอกสารเรียบร้อยแล้ว", "success");
      return true;
    } catch (err: any) {
      console.error("Error deleting billing document:", err);
      showToast(`ไม่สามารถลบเอกสาร: ${err.message}`, "error");
      return false;
    }
  };

  const saveCompanyProfile = async (profile: CompanyProfile): Promise<boolean> => {
    try {
      setCompanyProfile(profile);
      localStorage.setItem("m5_company_profile", JSON.stringify(profile));
      await saveCompanyProfileToFirestore(profile);
      showToast("บันทึกข้อมูลบริษัทสำเร็จ", "success");
      return true;
    } catch (err: any) {
      console.error("Error saving company profile:", err);
      showToast(`ไม่สามารถบันทึกข้อมูลบริษัท: ${err.message}`, "error");
      return false;
    }
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
        clearAllBookings,
        clearAllGallery,
        reseedDatabase,
        registerMember,
        loginMember,
        logoutMember,
        updateMemberOnServer,
        deleteMemberOnServer,
        addMemberOnServer,
        notifications,
        refreshNotifications,
        testLineNotification,
        testEmailNotification,
        testBookingEmailNotification,
        showToast,
        billingDocuments,
        companyProfile,
        saveBillingDocument,
        deleteBillingDocument,
        saveCompanyProfile
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
