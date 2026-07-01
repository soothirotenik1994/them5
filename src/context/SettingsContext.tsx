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
  seoDescription: "เดอะ เอ็มไฟว์ เรสซิเดนซ์ (The M5 Residence) นิยามใหม่ของการพักผ่อนสไตล์อินดัสเทรียลลอฟท์ ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอน และเมืองทองธานี ห้องพักหรูราคาประหยัด",
  seoKeywords: "The M5 Residence, เดอะ เอ็มไฟว์ เรสซิเดนซ์, ที่พักปากเกร็ด, โรงแรมปากเกร็ด, ที่พักใกล้อิมแพ็ค, ที่พักใกล้เมืองทอง, โรงแรมสไตล์ลอฟท์, โรงแรมนนทบุรี, จองห้องพักนนทบุรี",
  allowRegistration: true,
  bookingEnabled: true,
  bookingDisabledMessage: "ขออภัย ระบบจองห้องพักออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากมีข้อสงสัยหรือต้องการจองด่วน สามารถติดต่อผ่าน Line ID หรือเบอร์โทรศัพท์ได้โดยตรง"
};

const defaultRooms: RoomType[] = [
  {
    id: "superior",
    name: "Superior Loft Suite",
    thaiName: "ซูพีเรียร์ ลอฟท์ สวีท",
    price: 1800,
    size: 35,
    capacity: 3,
    bedType: "King Size Bed (เตียงคิงไซส์ 6 ฟุต)",
    description: "ห้องพักขนาดกว้างขวาง เหมาะสำหรับผู้เข้าพักที่ต้องการพื้นที่ใช้สอยพิเศษ ผนังปูนเปลือยดีไซน์สูงโปร่งอบอุ่น",
    longDescription: "สุดยอดแห่งการดีไซน์ในสไตล์แวร์เฮาส์ลอฟต์แท้ๆ ห้องนี้โดดเด่นด้วยเพดานที่ได้รับการออกแบบให้สูงเป็นพิเศษถึง 3.2 เมตร ผนังด้านหลังกรุหน้าด้วยกระเบื้องอิฐมอญสีส้มธรรมชาติเข้ากับโครงเหล็กท่อสีดำด้าน ชุดเครื่องนอนเป็นด้ายคอตตอนเกรดพรีเมียมหนานุ่มพิเศษ มีพื้นที่เลานจ์สำหรับการนั่งเล่นอ่านหนังสือ พร้อมโซลูชันห้องน้ำกระจกเทมเปอร์ดาร์คสไตล์และระบบฝักบัว Rain Shower อุณหภูมิคงที่",
    imageUrl: "", // fallback handled in components
    amenities: ["Free High-speed Wi-Fi 1000Mbps", "Smart TV 55\" พร้อม Netflix", "มินิบาร์และสแน็คบาร์จัดเตรียมครบ", "โซฟาเบดเกรดพรีเมียมสำหรับพักผ่อน", "เครื่องเป่าผม และเสื้อคลุมอาบน้ำสไตล์ลอฟท์", "ตู้เซฟอิเล็กทรอนิกส์ส่วนตัว"],
    matterportUrl: "https://my.matterport.com/show/?m=Pcjj9wmA98W"
  },
  {
    id: "deluxe",
    name: "Deluxe Balcony Loft",
    thaiName: "ดีลักซ์ บัลโคนี ลอฟท์",
    price: 1500,
    size: 30,
    capacity: 2,
    bedType: "King Size Bed (เตียงคิงไซส์ 6 ฟุต)",
    description: "สัมผัสอากาศบริสุทธิ์รอบปากเกร็ดกับระเบียงคอนกรีตขัดมันส่วนตัวสไตล์ธรรมชาติพร้อมพืชพรรณพริ้วไหว",
    longDescription: "ห้องพักดีไซน์ทันสมัยที่ประยุกต์ความเป็น Loft เข้ากับความโปร่งโล่งสบายตาอย่างลงตัว จุดเด่นคือ ประตูกระจกบานใหญ่แบบเลื่อนไร้เสียงที่สามารถสไลด์เปิดสู่ระเบียงส่วนตัว คอนกรีตบล็อกดีไซน์โมเดิร์นรายล้อมด้วยพืชพรรณสีเขียวชอุ่ม ให้ความเป็นส่วนตัวสูดอากาศพัดสบาย ยามค่ำคืนสามารถดื่มด่ำกับบรรยากาศรื่นรมย์ของแสงไฟในย่านนนทบุรีรอบข้างได้เหมาะสม",
    imageUrl: "",
    amenities: ["ระเบียงส่วนตัวชมวิวเมืองภายนอก", "Free High-speed Wi-Fi 1000Mbps", "Smart TV 50\" สตรีมมิ่งไร้ขัดข้อง", "เครื่องชงกาแฟแคปซูลระดับพรีเมียม", "ฝักบัวอาบน้ำเพดานสูง Rain Shower", "โต๊ะทำงานไม้คลาสสิก"],
    matterportUrl: "https://my.matterport.com/show/?m=u6Q8X6mK4cW"
  },
  {
    id: "studio",
    name: "Studio Loft",
    thaiName: "สตูดิโอ ลอฟท์",
    price: 1200,
    size: 28,
    capacity: 2,
    bedType: "Queen Size Bed (เตียงควีนไซส์ 5 ฟุต)",
    description: "ห้องสตูดิโอบรรยากาศอบอุ่นคลาสสิก พร้อมโต๊ะทำงานและเก้าอี้หนังสไตล์อินดัสเทรียลเพื่อเหล่านักเดินทางครีเอทีฟ",
    longDescription: "ความเรียบหรูระดับดีไซน์ในพื้นที่กะทัดรัด ห้อง Studio Loft โชว์พื้นผิวคอนกรีตหล่อแบบผสมผสานแผ่นไม้ธรรมชาติคัดสรร เหมาะสำหรับนักธุรกิจ ศิลปิน ครีเอเตอร์ หรือคู่รักที่มองหาห้องพักอันอบอุ่น ตกแต่งคุ้มค่า มีโต๊ะทำงานขอบเหล็กเข้าสไตล์เก้าอี้หนังแบบย้อนยุครวมถึงโคมไฟกรงนกเหล็กดัด ให้แสงวอร์มไวท์นุ่มสบายสายตาเพื่อปลุกไอเดียสร้างสรรค์ใหม่ๆ",
    imageUrl: "",
    amenities: ["Free High-speed Wi-Fi 1000Mbps", "Smart TV 43\" ดีไซน์เรียบหรู", "โต๊ะทำงานทำงานสไตล์ดีไซน์ออฟฟิศ", "ชุดชงชากาแฟแฮนด์เมด", "ตู้เย็นขนาดกลางแยกช่องฟรีซ", "เครื่องเป่าผมและไดร์เป่าสไตล์"],
    matterportUrl: "https://my.matterport.com/show/?m=SxZJMz3Sg6v"
  }
];

const defaultPromotions = [
  {
    id: "promo-concert",
    badge: "CONCERT SPECIAL",
    title: "Concert Goer Package 🎸",
    desc: "สำหรับสายรักเสียงดนตรี! เข้าพักห้อง Deluxe Balcony เพียงคุณแสดงบัตรคอนเสิร์ตที่จะแสดง ณ อิมแพ็ค อารีน่า ในรอบสัปดาห์นั้น รับฟรีทันที คูปองเครื่องดื่ม Signature 2 แก้ว เลือกลองได้ที่คราฟต์คาเฟ่ Copper & Steam ของโรงแรม",
    highlight: "ฟรีคูปองเครื่องดื่มคราฟต์ 2 แก้ว"
  },
  {
    id: "promo-stay",
    badge: "STAY & SAVE",
    title: "พักยาว ประหยัดกว่า (Stay & Save) 📅",
    desc: "จองห้องพักทุกสไตล์ตั้งแต่ 2 คืนขึ้นไปผ่านหน้าเว็บไซต์หลัก รับส่วนลดค่าห้องทันที 10% พร้อมสิทธิ์เลทเช็คเอาท์ (Late Check-out) ได้ถึงเวลา 14:00 น. เพื่อให้คุณได้พักผ่อนหลังจบคอนเสิร์ตยามดึกอย่างผ่อนคลายเต็มอิ่ม",
    highlight: "ส่วนลด 10% + เลทเช็คเอาท์ 14.00 น."
  }
];

const defaultAmenities = [
  {
    iconName: "Wifi",
    title: "ความเร็วสูงพิเศษ Free Wi-Fi",
    desc: "ความเร็วระดับกิกะบิต (1000 Mbps) ครอบคลุมทั่วอาคาร ทำงานสปอร์ตไฟล์ไร้รอยต่อ เช็คตารางคอนเสิร์ตสะดวกทันใจ"
  },
  {
    iconName: "Coffee",
    title: "Copper & Steam Cafe / Bar",
    desc: "คาเฟ่บรรยากาศดิบพรีเมียมที่จัดเสิร์ฟกาแฟจากเมล็ดพันธุ์ออร์แกนิคชั้นดี และคราฟต์เบียร์แบรนด์ไทย-เทศยามดีกรีช่วงเย็น"
  },
  {
    iconName: "Dumbbell",
    title: "Loft Fitness & Gym Hub",
    desc: "ยิมออกกำลังกายสไตล์แวร์ّه้าส์ ดิบเท่สปอร์ต ผนังคอนกรีตฉลุลาย พร้อมอุปกรณ์ออกกำลังและฟรีเวทครบครันครบถ้วน"
  },
  {
    iconName: "ShieldCheck",
    title: "ความปลอดภัยระดับ 24 ชั่วโมง",
    desc: "ที่จอดรถในร่มกว้างขวาง ดูแลความปลอดภัยด้วยกล้องโทรทัศน์วงจรปิด CCTV ทุกจุดร่วมกับเจ้าหน้าที่รปภ. มืออาชีพตลอดวัน"
  }
];

export const defaultFaqs = [
  { q: "ห่างจาก อิมแพ็ค เมืองทองธานี กี่นาทีและไปยังไง?", a: "ห่างเพียง 5-10 นาทีเท่านั้น (ประมาณ 2.5 กิโลเมตร) เดินทางได้สะดวกสุดด่วนโดยรถยนต์, แท็กซี่ หรือมอเตอร์ไซค์รับจ้างที่มีปักหลักตลอดหน้าซอยปากเกร็ด" },
  { q: "ทางโรงแรมมีที่จอดรถยนต์ส่วนตัวให้บริการหรือไม่?", a: "มีครับ เราจัดสรรบริการที่จอดรถยนต์ในร่มส่วนตัวรอบบริเวณอาคารที่พักฟรีสำหรับผู้จองห้องพักทุกท่าน ดูแลปลอดภัยสูงสุดด้วยกล้อง CCTV คู่บุคลากรรปภ. ตลอดเวลา" },
  { q: "ถ้าคอนเสิร์ตจบดึก, สามารถเลทเช็คอินได้หรือไม่?", a: "สามารถเช็คอินตลอด 24 ชั่วโมงได้เลยครับ เนื่องจากเรามีเจ้าหน้าที่บริการที่เคาน์เตอร์ และระบบประตูล็อคอัจฉริยะคีย์การ์ด โดยรบกวนแจ้งความต้องการเช็คอินล่าช้าลงบนคำขอแบบฟอร์มจองห้อง" },
  { q: "สามารถเลื่อนนัดวันเข้าพัก หรือยกเลิกการจองอย่างไร?", a: "คุณสามารถยกเลิกฟรีได้ภายใน 3 วันก่อนเข้าพักจริง หรือสามารถทักแชทสอบถามผู้ช่วยสั่งแก้ข้อมูล ผ่านระบบซัพพอร์ต AI Chatbot ในหน้านี้ หรือติดต่อ Line ID ของโรงแรมได้สะดวกสุด" }
];

export const defaultReviews = [
  { name: "JK SARUTANON", role: "Local Guide 🌐 (Google Review)", review: "ข้อดีคือราคาคุ้มค่ามากเมื่อจองล่วงหน้า มีรถบริการรับส่งเข้าอิมแพ็คฯ (IMPACT) ช่วงเช้าก่อน 10:00 น. ในช่วงที่มีงานคอนเสิร์ตหรืออีเวนต์ สะดวกสบายมากๆ ครับ", rating: 5, date: "1 ปีที่แล้ว" },
  { name: "Teerayut K.", role: "Verified Guest 🌐 (Google Review)", review: "ห้องพักสะอาดมาก ตกแต่งสไตล์ลอฟท์สวย ทันสมัย ใกล้อิมแพ็คเมืองทองธานี เดินทางสะดวก มีพนักงานดูแลและบริการดีมาก เตียงนอนหนานุ่มนอนสบาย แนะนำเลยสำหรับคนที่จะมาทำธุระหรือดูคอนเสิร์ต", rating: 5, date: "3 เดือนที่แล้ว" },
  { name: "Pattarapon S.", role: "Guest Reviewer 🌐 (Google Review)", review: "ชอบที่พักมากครับ สะอาดและปลอดภัย มีรปภ.ดูแลตลอด 24 ชม. ที่จอดรถสะดวกสบาย และยังมีคาเฟ่บริการอยู่ชั้นล่าง กาแฟหอมอร่อย ห้องน้ำสะอาด น้ำไหลแรงดีมาก คุ้มค่าเงินที่สุด", rating: 4, date: "6 เดือนที่แล้ว" },
  { name: "Nattida P.", role: "Concert Attendee 🌐 (Google Review)", review: "มาพักเพื่อไปดูคอนเสิร์ตที่อิมแพ็ค สะดวกสบายสุดๆ ค่ะ ห้องสะอาดสะอ้าน แอร์เย็นเจี๊ยบ เตียงนอนสบายมาก มีบริการรถตู้รับส่งของโรงแรมประทับใจสุดๆ รอบหน้าถ้ามีคอนเสิร์ตอีกมาพักที่นี่อีกแน่นอนค่ะ", rating: 5, date: "2 สัปดาห์ที่แล้ว" }
];

export const defaultGallery = [
  { url: "", title: "คอนกรีตลอฟท์ล็อบบี้ & คาเฟ่บาร์", cat: "Copper Cafe Bar" },
  { url: "", title: "ดีไซน์ปูนเปลือย & แผ่นไม้มะค่าธรรมชาติ", cat: "Superior Suite" },
  { url: "", title: "ระเบียงพืชพรรณสไลด์สูดอากาศภายนอก", cat: "Deluxe Balcony" },
  { url: "", title: "สเปซส่วนตัวโฮมมี่พร้อมมุมครีเอทีฟทำงาน", cat: "Studio corner" }
];

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

export const defaultSlides = [
  { url: "", label: "LOBBY RECEPTION", desc: "โชว์เนื้อไม้สักป่าประกอบโครงเหล็กท่อดำสไตล์อินดัสเทรียลลอฟท์" },
  { url: "", label: "SUPERIOR ROOM", desc: "ห้องนอนแต่งขอบปูนเปลือยขัดมันพร้อมเฟอร์นิเจอร์สั่งตัดพิเศษ" },
  { url: "", label: "DELUXE ROOM", desc: "สเปซส่วนตัวกว้างขวางโอบรับแสงแดดยามเช้าผ่านกระจกบานใหญ่" }
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
    slides: defaultSlides,
    googlePlaceId: "ChIJXWlJMC-e4jARLqX9OidpWjY",
    googleReviewsEnabled: true,
    impactEvents: []
  });
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
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
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          // Merge images loaded client side if backend does not return them and deduplicate rooms by ID
          const uniqueRoomsMap = new Map();
          const rawRooms = data.settings.rooms || [];
          rawRooms.forEach((room: RoomType) => {
            const defRoom = defaultRooms.find(r => r.id === room.id);
            const merged = {
              ...room,
              imageUrl: room.imageUrl || defRoom?.imageUrl || ""
            };
            uniqueRoomsMap.set(room.id, merged);
          });
          const mergedRooms = Array.from(uniqueRoomsMap.values());

          // Get local storage backups to intelligently restore data if server got reset
          const localSettingsStr = localStorage.getItem("m5_web_settings");
          const localBookingsStr = localStorage.getItem("m5_bookings");
          const localMembersStr = localStorage.getItem("m5_members");

          let finalSettings = {
            ...data.settings,
            general: { ...defaultGeneral, ...data.settings.general },
            rooms: mergedRooms,
            faqs: data.settings.faqs || defaultFaqs,
            reviews: data.settings.reviews || defaultReviews,
            gallery: data.settings.gallery || defaultGallery,
            blockedDates: data.settings.blockedDates || [],
            coupons: data.settings.coupons || [],
            smtp: data.settings.smtp || defaultSmtp,
            slides: data.settings.slides || defaultSlides,
            googlePlaceId: data.settings.googlePlaceId !== undefined ? data.settings.googlePlaceId : "ChIJXWlJMC-e4jARLqX9OidpWjY",
            googleReviewsEnabled: data.settings.googleReviewsEnabled !== undefined ? data.settings.googleReviewsEnabled : true,
            impactEvents: data.settings.impactEvents || []
          };

          let needsSyncSettings = false;

          if (localSettingsStr) {
            try {
              const localSettings = JSON.parse(localSettingsStr);
              if (localSettings) {
                // 1. Merge general settings
                if (localSettings.general) {
                  const isServerDefault = data.settings?.general?.hotelName === defaultGeneral.hotelName && 
                                          data.settings?.general?.contactPhone === defaultGeneral.contactPhone &&
                                          data.settings?.general?.heroTitle === defaultGeneral.heroTitle;
                                          
                  const localIsCustom = localSettings.general.hotelName !== defaultGeneral.hotelName || 
                                        localSettings.general.contactPhone !== defaultGeneral.contactPhone ||
                                        localSettings.general.heroTitle !== defaultGeneral.heroTitle;

                  if (isServerDefault && localIsCustom) {
                    finalSettings.general = { ...localSettings.general };
                    needsSyncSettings = true;
                  } else {
                    const mergedGeneral = { ...finalSettings.general, ...localSettings.general };
                    if (JSON.stringify(mergedGeneral) !== JSON.stringify(finalSettings.general)) {
                      finalSettings.general = mergedGeneral;
                      needsSyncSettings = true;
                    }
                  }
                }

                // 2. Merge list settings
                const listsToMerge: (keyof typeof finalSettings)[] = [
                  "rooms", "promotions", "amenities", "faqs", "reviews", "gallery", "blockedDates", "coupons", "slides", "impactEvents"
                ];

                listsToMerge.forEach((key) => {
                  const serverList = finalSettings[key] || [];
                  const localList = localSettings[key] || [];
                  
                  if (Array.isArray(localList) && localList.length > 0) {
                    if (serverList.length === 0) {
                      (finalSettings as any)[key] = localList;
                      needsSyncSettings = true;
                    } else if (key === "rooms") {
                      let changed = false;
                      const merged = [...(serverList as any)];
                      localList.forEach((lr: any) => {
                        const idx = merged.findIndex((r: any) => r.id === lr.id);
                        if (idx === -1) {
                          merged.push(lr);
                          changed = true;
                        } else if (JSON.stringify(merged[idx]) !== JSON.stringify(lr)) {
                          merged[idx] = { ...merged[idx], ...lr };
                          changed = true;
                        }
                      });
                      if (changed) {
                        finalSettings.rooms = merged;
                        needsSyncSettings = true;
                      }
                    } else if (key === "blockedDates") {
                      let changed = false;
                      const merged = [...(serverList as any)];
                      localList.forEach((ld: any) => {
                        const exists = merged.some((d: any) => d.date === ld.date && d.roomId === ld.roomId);
                        if (!exists) {
                          merged.push(ld);
                          changed = true;
                        }
                      });
                      if (changed) {
                        finalSettings.blockedDates = merged;
                        needsSyncSettings = true;
                      }
                    } else if (key === "coupons") {
                      let changed = false;
                      const merged = [...(serverList as any)];
                      localList.forEach((lc: any) => {
                        const exists = merged.some((c: any) => c.code?.toUpperCase() === lc.code?.toUpperCase());
                        if (!exists) {
                          merged.push(lc);
                          changed = true;
                        }
                      });
                      if (changed) {
                        finalSettings.coupons = merged;
                        needsSyncSettings = true;
                      }
                    } else if (localList.length > serverList.length) {
                      (finalSettings as any)[key] = localList;
                      needsSyncSettings = true;
                    }
                  }
                });
              }
            } catch (e) {
              console.error("Failed to parse localSettings backup", e);
            }
          }

          let finalBookings = data.bookings || [];
          const bookingsToSync: any[] = [];

          if (localBookingsStr) {
            try {
              const localBookings = JSON.parse(localBookingsStr);
              if (Array.isArray(localBookings)) {
                localBookings.forEach((lb: any) => {
                  const exists = finalBookings.some((sb: any) => sb.id === lb.id || sb.bookingId === lb.id || sb.bookingId === lb.bookingId);
                  if (!exists) {
                    finalBookings.push(lb);
                    bookingsToSync.push(lb);
                  }
                });
              }
            } catch (e) {
              console.error("Failed to parse local bookings backup", e);
            }
          }

          setSettings(finalSettings);
          setBookings(finalBookings);

          // Save fresh server settings and bookings to localStorage for offline cache
          localStorage.setItem("m5_web_settings", JSON.stringify(finalSettings));
          localStorage.setItem("m5_bookings", JSON.stringify(finalBookings));

          // Sync back to server if client has newer/restored data
          if (needsSyncSettings) {
            fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ settings: finalSettings })
            }).catch(err => console.error("Error syncing restored settings back to database:", err));
          }

          if (bookingsToSync.length > 0) {
            bookingsToSync.forEach(b => {
              fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ booking: b })
              }).catch(err => console.error("Error syncing restored booking back to database:", err));
            });
          }

          // Fetch database connection status
          try {
            const dbRes = await fetch("/api/db-status");
            if (dbRes.ok) {
              const dbData = await dbRes.json();
              setDbStatus({
                connected: dbData.connected,
                database: dbData.database,
                url: dbData.url,
                internalUrl: dbData.internalUrl,
                token: dbData.token,
                reason: dbData.reason
              });
            }
          } catch (e) {
            console.error("Error fetching db status", e);
            setDbStatus({
              connected: false,
              database: "Local JSON (db.json Fallback)",
              reason: "Failed to fetch status"
            });
          }

          // Fetch members list
          try {
            const memRes = await fetch("/api/members");
            if (memRes.ok) {
              const memData = await memRes.json();
              if (memData.success && memData.members) {
                let finalMembers = memData.members;
                const membersToSync: any[] = [];

                if (localMembersStr) {
                  try {
                    const localMembers = JSON.parse(localMembersStr);
                    if (Array.isArray(localMembers)) {
                      localMembers.forEach((lm: any) => {
                        const exists = finalMembers.some((sm: any) => sm.id === lm.id || sm.email === lm.email);
                        if (!exists) {
                          finalMembers.push(lm);
                          membersToSync.push(lm);
                        }
                      });
                    }
                  } catch (e) {
                    console.error("Failed to parse local members backup", e);
                  }
                }

                setMembers(finalMembers);
                localStorage.setItem("m5_members", JSON.stringify(finalMembers));

                // Sync back missing members to server database
                if (membersToSync.length > 0) {
                  membersToSync.forEach((m: any) => {
                    fetch("/api/members/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ member: m })
                    }).catch(err => console.error("Error syncing restored member back to database:", err));
                  });
                }

                // Sync current logged-in member data if active
                if (currentMember) {
                  const refreshedCurrent = finalMembers.find((m: Member) => m.id === currentMember.id);
                  if (refreshedCurrent) {
                    setCurrentMember(refreshedCurrent);
                    localStorage.setItem("m5_current_member", JSON.stringify(refreshedCurrent));
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error loading members in background", err);
          }
        }
      } else {
        throw new Error("Failed to load settings from server");
      }
    } catch (err: any) {
      console.warn("Backend API not loaded yet, falling back to local state and defaults", err);
      // Try local storage for offline development support
      const cached = localStorage.getItem("m5_web_settings");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          
          // Deduplicate rooms by ID in offline fallback too
          const uniqueRoomsMap = new Map();
          const rawRooms = parsed.rooms || defaultRooms;
          rawRooms.forEach((room: RoomType) => {
            const defRoom = defaultRooms.find(r => r.id === room.id);
            const merged = {
              ...room,
              imageUrl: room.imageUrl || defRoom?.imageUrl || ""
            };
            uniqueRoomsMap.set(room.id, merged);
          });
          const mergedRooms = Array.from(uniqueRoomsMap.values());

          setSettings({
            ...parsed,
            general: { ...defaultGeneral, ...parsed.general },
            rooms: mergedRooms,
            faqs: parsed.faqs || defaultFaqs,
            reviews: parsed.reviews || defaultReviews,
            gallery: parsed.gallery || defaultGallery,
            blockedDates: parsed.blockedDates || [],
            coupons: parsed.coupons || [],
            smtp: parsed.smtp || defaultSmtp,
            googlePlaceId: parsed.googlePlaceId !== undefined ? parsed.googlePlaceId : "ChIJXWlJMC-e4jARLqX9OidpWjY",
            googleReviewsEnabled: parsed.googleReviewsEnabled !== undefined ? parsed.googleReviewsEnabled : true,
            impactEvents: parsed.impactEvents || []
          });
        } catch (_) {}
      }
      const cachedBk = localStorage.getItem("m5_bookings");
      if (cachedBk) {
        try {
          setBookings(JSON.parse(cachedBk));
        } catch (_) {}
      }
      const cachedMembers = localStorage.getItem("m5_members");
      if (cachedMembers) {
        try {
          setMembers(JSON.parse(cachedMembers));
        } catch (_) {}
      }
      setError("Using offline backup settings.");
      setDbStatus({
        connected: false,
        database: "Local JSON (db.json Fallback)",
        reason: "Offline / Developer Mode"
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
      setSettings(newSettings);

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings })
      });

      if (res.ok) {
        const data = await res.json();
        return data.success;
      }
      return true; // proceed anyway as local is set
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

      // Hit API
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: newRecord })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.booking) {
          // Replace with backend confirmed booking
          const verifiedBookings = bookings.map(b => b.id === tempId ? data.booking : b);
          setBookings(verifiedBookings);
          localStorage.setItem("m5_bookings", JSON.stringify(verifiedBookings));
          return data.booking;
        }
      }
      return newRecord;
    } catch (err) {
      console.error("Error sending booking to server, saved locally", err);
      const tempId = "B-" + Math.floor(1000 + Math.random() * 9000);
      const offlineRecord: BookingRecord = {
        ...booking,
        id: tempId,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
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
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem("m5_bookings", JSON.stringify(updated));

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
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    localStorage.setItem("m5_members", JSON.stringify(updated));

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
