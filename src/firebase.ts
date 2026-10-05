import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocFromServer
} from "firebase/firestore";
import { RoomType, BookingDetails, Member, NotificationLog } from "./types";
import { WebSettings, BookingRecord } from "./context/SettingsContext";
import { BillingDocument, CompanyProfile, defaultCompanyProfile } from "./types/billing";

// Firebase configuration from environment variables with standard fallbacks
const metaEnv = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyAfgOIkvXad9NYeki2YICjSub0gQwKen9A",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0607463040.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0607463040",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0607463040.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "1075315857958",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:1075315857958:web:bb8e593faa7b2c273c24e7"
};

export const FIRESTORE_DATABASE_ID =
  metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-them5residence-1839dfac-a9c8-4d67-b303-9f0a6186100b";

// Initialize Firebase App
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore with the custom database ID
export const db: Firestore = getFirestore(app, FIRESTORE_DATABASE_ID);

/**
 * Operation types and error handler conforming to Firebase skill
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Validate Firestore connection as required by Firebase integration skill
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "system", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore client is offline or network unavailable.");
    } else {
      console.warn("Firestore connection check info:", error);
    }
    return false;
  }
}

// ----------------------------------------------------
// REAL HOTEL ROOMS (The M5 Residence)
// ----------------------------------------------------
export const initialDefaultRooms: RoomType[] = [
  {
    id: "superior",
    name: "STANDARD TWIN BED ROOM",
    thaiName: "ซูพีเรียร์ ลอฟท์ สวีท",
    price: 1800,
    size: 35,
    capacity: 3,
    bedType: "King Size Bed (เตียงคิงไซส์ 6 ฟุต)",
    description: "ห้องพักขนาดกว้างขวาง เหมาะสำหรับผู้เข้าพักที่ต้องการพื้นที่ใช้สอยพิเศษ ผนังปูนเปลือยดีไซน์สูงโปร่งอบอุ่น",
    longDescription: "สุดยอดแห่งการดีไซน์ในสไตล์แวร์เฮาส์ลอฟต์แท้ๆ ห้องนี้โดดเด่นด้วยเพดานที่ได้รับการออกแบบให้สูงเป็นพิเศษถึง 3.2 เมตร ผนังด้านหลังกรุหน้าด้วยกระเบื้องอิฐมอญสีส้มธรรมชาติเข้ากับโครงเหล็กท่อสีดำด้าน ชุดเครื่องนอนเป็นด้ายคอตตอนเกรดพรีเมียมหนานุ่มพิเศษ มีพื้นที่เลานจ์สำหรับการนั่งเล่นอ่านหนังสือ พร้อมโซลูชันห้องน้ำกระจกเทมเปอร์ดาร์คสไตล์และระบบฝักบัว Rain Shower อุณหภูมิคงที่",
    imageUrl: "/images/bedroom_superior_m5_1782203272229.jpg",
    amenities: [
      "Free High-speed Wi-Fi 1000Mbps",
      "Smart TV 55\" พร้อม Netflix",
      "มินิบาร์และสแน็คบาร์จัดเตรียมครบ",
      "โซฟาเบดเกรดพรีเมียมสำหรับพักผ่อน",
      "เครื่องเป่าผม และเสื้อคลุมอาบน้ำสไตล์ลอฟท์",
      "ตู้เซฟอิเล็กทรอนิกส์ส่วนตัว"
    ],
    matterportUrl: "https://my.matterport.com/show/?m=Pcjj9wmA98W",
    active: true
  },
  {
    id: "sup_queen_01",
    name: "Superior Room",
    thaiName: "ห้องซูพีเรีย",
    price: 1350,
    size: 20,
    capacity: 2,
    bedType: "เตียงควีนไซส์ 5 ฟุต (1 Queen Bed)",
    description: "ห้องพักพื้นที่กว้างขวางขึ้น ให้ความรู้สึกเป็นส่วนตัว พร้อมการตกแต่งที่ทันสมัยเพื่อการพักผ่อนที่เหนือกว่า",
    longDescription: "ยกระดับประสบการณ์การพักผ่อนของคุณด้วยห้อง Superior ที่มาพร้อมการออกแบบพื้นที่ให้กว้างขวางและใช้งานได้สะดวกสบายยิ่งขึ้น เหมาะอย่างยิ่งสำหรับผู้ที่ต้องการมุมพักผ่อนที่เงียบสงบ ด้วยเตียงขนาด 5 ฟุตที่นุ่มสบาย ท่ามกลางบรรยากาศโมเดิร์นที่ผสมผสานความดิบเท่ พร้อมระเบียงส่วนตัว",
    imageUrl: "/images/bedroom_deluxe_m5_1782203318372.jpg",
    amenities: [
      "Wi-Fi ความเร็วสูง",
      "เครื่องปรับอากาศ",
      "ทีวีจอแบน",
      "ตู้เย็น",
      "เครื่องทำน้ำอุ่น",
      "ระเบียง"
    ],
    matterportUrl: "https://discover.matterport.com/space/hDvz1nJbtRV",
    active: true
  },
  {
    id: "dlx_queen_01",
    name: "Deluxe Room",
    thaiName: "ห้องดีลักซ์",
    price: 2550,
    size: 20,
    capacity: 2,
    bedType: "เตียงควีนไซส์ 5 ฟุต (1 Queen Bed)",
    description: "ห้องพักระดับท็อปที่มอบความเป็นส่วนตัวสูงสุด พร้อมฟังก์ชันที่ครบครันสำหรับผู้ที่มองหาความหรูหราและความสะดวกสบาย",
    longDescription: "ดื่มด่ำกับห้องพักที่เปี่ยมไปด้วยสไตล์และความเหนือระดับที่สุดของเรา ห้อง Deluxe ถูกจัดเตรียมไว้อย่างพิถีพิถันด้วยพื้นที่ใช้สอยที่กว้างขวางเป็นพิเศษ ดีไซน์ที่โดดเด่นพร้อมเฟอร์นิเจอร์ระดับพรีเมียม มอบค่ำคืนคลาสสิกที่สมบูรณ์แบบและการพักผ่อนที่ล้ำลึกที่สุด พร้อมระเบียงส่วนตัวชมวิว",
    imageUrl: "/images/bedroom_studio_m5_1782203293730.jpg",
    amenities: [
      "Wi-Fi ความเร็วสูง",
      "เครื่องปรับอากาศ",
      "ทีวีจอแบน",
      "ตู้เย็น",
      "เครื่องทำน้ำอุ่น",
      "ระเบียง"
    ],
    matterportUrl: "https://discover.matterport.com/space/4mbZem6RjGN",
    active: true
  }
];

// Helper to normalize image paths to local /images/ if they point to known files
export function normalizeImagePath(path: string | undefined): string {
  if (!path) return "";
  if (path.includes("bedroom_superior")) return "/images/bedroom_superior_m5_1782203272229.jpg";
  if (path.includes("bedroom_deluxe")) return "/images/bedroom_deluxe_m5_1782203318372.jpg";
  if (path.includes("bedroom_studio")) return "/images/bedroom_studio_m5_1782203293730.jpg";
  if (path.includes("lobby_loft")) return "/images/lobby_loft_m5_1782203250164.jpg";
  return path;
}

// ----------------------------------------------------
// FIRESTORE CRUD OPERATIONS
// ----------------------------------------------------

// ROOMS
export async function getRoomsFromFirestore(): Promise<RoomType[]> {
  try {
    const snap = await getDocs(collection(db, "rooms"));
    if (!snap.empty) {
      const list: RoomType[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data() as RoomType;
        list.push({
          ...data,
          id: docSnap.id || data.id,
          imageUrl: normalizeImagePath(data.imageUrl)
        });
      });
      return list;
    }
  } catch (err) {
    console.warn("Could not read rooms from Firestore:", err);
  }
  return initialDefaultRooms;
}

export async function saveRoomToFirestore(room: RoomType): Promise<void> {
  const roomData = {
    ...room,
    imageUrl: normalizeImagePath(room.imageUrl)
  };
  await setDoc(doc(db, "rooms", room.id), roomData, { merge: true });
}

export async function saveAllRoomsToFirestore(rooms: RoomType[]): Promise<void> {
  for (const r of rooms) {
    await saveRoomToFirestore(r);
  }
}

export const saveRoomsToFirestore = saveAllRoomsToFirestore;

// BOOKINGS
export async function getBookingsFromFirestore(): Promise<BookingRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc")));
    const list: BookingRecord[] = [];
    snap.forEach(docSnap => {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      } as BookingRecord);
    });
    return list;
  } catch (err) {
    console.warn("Could not read bookings from Firestore:", err);
    return [];
  }
}

export async function addBookingToFirestore(booking: BookingRecord): Promise<void> {
  await setDoc(doc(db, "bookings", booking.id), booking);
}

export async function updateBookingInFirestore(id: string, fields: Partial<BookingRecord>): Promise<void> {
  await updateDoc(doc(db, "bookings", id), fields);
}

export async function deleteBookingFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, "bookings", id));
}

// EVENTS
export async function getEventsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "events"));
    const list: any[] = [];
    snap.forEach(docSnap => {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    return list;
  } catch (err) {
    console.warn("Could not read events from Firestore:", err);
    return [];
  }
}

export async function saveEventsToFirestore(events: any[]): Promise<void> {
  for (const e of events) {
    if (e.id) {
      await setDoc(doc(db, "events", String(e.id)), e, { merge: true });
    }
  }
}

// SETTINGS
export async function getSettingsFromFirestore(): Promise<Partial<WebSettings> | null> {
  try {
    const snap = await getDoc(doc(db, "settings", "web"));
    if (snap.exists()) {
      return snap.data() as Partial<WebSettings>;
    }
  } catch (err) {
    console.warn("Could not read settings from Firestore:", err);
  }
  return null;
}

export async function saveSettingsToFirestore(settings: WebSettings): Promise<void> {
  await setDoc(doc(db, "settings", "web"), settings, { merge: true });
}

// MEMBERS
export async function getMembersFromFirestore(): Promise<Member[]> {
  try {
    const snap = await getDocs(collection(db, "members"));
    const list: Member[] = [];
    snap.forEach(docSnap => {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Member);
    });
    return list;
  } catch (err) {
    console.warn("Could not read members from Firestore:", err);
    return [];
  }
}

export async function saveMemberToFirestore(member: Member): Promise<void> {
  await setDoc(doc(db, "members", member.id), member, { merge: true });
}

export async function deleteMemberFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, "members", id));
}

// NOTIFICATIONS AUDIT LOG
export async function getNotificationsFromFirestore(): Promise<NotificationLog[]> {
  try {
    const snap = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50)));
    const list: NotificationLog[] = [];
    snap.forEach(docSnap => {
      list.push({
        id: docSnap.id,
        ...docSnap.data()
      } as NotificationLog);
    });
    return list;
  } catch (err) {
    console.warn("Could not read notifications from Firestore:", err);
    return [];
  }
}

export async function addNotificationToFirestore(notif: NotificationLog): Promise<void> {
  try {
    await setDoc(doc(db, "notifications", notif.id), notif);
  } catch (err) {
    console.warn("Could not write notification to Firestore:", err);
  }
}

// ----------------------------------------------------
// BILLING DOCUMENTS & TAX INVOICES / QUOTATIONS
// ----------------------------------------------------

export const initialDefaultBillingDocuments: BillingDocument[] = [];

export async function getBillingDocumentsFromFirestore(): Promise<BillingDocument[]> {
  try {
    const snap = await getDocs(query(collection(db, "documents"), orderBy("createdAt", "desc")));
    if (!snap.empty) {
      const list: BillingDocument[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as BillingDocument);
      });
      return list;
    }
  } catch (err) {
    console.warn("Could not read billing documents from Firestore:", err);
  }
  return [];
}

export async function saveBillingDocumentToFirestore(document: BillingDocument): Promise<void> {
  await setDoc(doc(db, "documents", document.id), document, { merge: true });
}

export async function deleteBillingDocumentFromFirestore(id: string): Promise<void> {
  await deleteDoc(doc(db, "documents", id));
}

export async function getCompanyProfileFromFirestore(): Promise<CompanyProfile | null> {
  try {
    const snap = await getDoc(doc(db, "settings", "company"));
    if (snap.exists()) {
      return snap.data() as CompanyProfile;
    }
  } catch (err) {
    console.warn("Could not read company profile from Firestore:", err);
  }
  return defaultCompanyProfile;
}

export async function saveCompanyProfileToFirestore(profile: CompanyProfile): Promise<void> {
  await setDoc(doc(db, "settings", "company"), profile, { merge: true });
}

