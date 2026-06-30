import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const url = process.env.DIRECTUS_INTERNAL_URL || process.env.DIRECTUS_URL || "https://data.them5residence.com";
const token = process.env.DIRECTUS_TOKEN || "ibtpkr40rF1BkNCEA4plXirxaDfn07S5";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@them5residence.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin_P@ssw0rd_M5!";

// Bootstrapping function to login and set the static token for the admin user
async function bootstrapAdminToken(directusUrl: string, adminEmail: string, adminPass: string, targetToken: string) {
  console.log(`Attempting to bootstrap static token in Directus at ${directusUrl}...`);
  try {
    const loginRes = await fetch(`${directusUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPass })
    });

    if (!loginRes.ok) {
      const txt = await loginRes.text();
      console.warn(`Login attempt to Directus failed (${loginRes.status}). Maybe token is already configured or credentials differ:`, txt);
      return false;
    }

    const loginData = await loginRes.json();
    const accessToken = loginData.data?.access_token;
    if (!accessToken) {
      console.error("No access token returned from login.");
      return false;
    }

    console.log("Logged in successfully. Retrieving user profile...");
    const meRes = await fetch(`${directusUrl}/users/me`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!meRes.ok) {
      const txt = await meRes.text();
      console.error(`Fetching user profile failed (${meRes.status}):`, txt);
      return false;
    }

    const meData = await meRes.json();
    const userId = meData.data?.id;
    if (!userId) {
      console.error("User ID not found in profile response.");
      return false;
    }

    console.log(`Setting static token for admin user (ID: ${userId})...`);
    const updateRes = await fetch(`${directusUrl}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({ token: targetToken })
    });

    if (!updateRes.ok) {
      const txt = await updateRes.text();
      console.error(`Failed to assign static token (${updateRes.status}):`, txt);
      return false;
    }

    console.log("SUCCESS: Static token has been assigned to the admin user!");
    return true;
  } catch (err) {
    console.error("Error during admin token bootstrapping:", err);
    return false;
  }
}

// Default seed data
const initialGeneral = {
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

const initialSmtp = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "The M5 Residence",
  fromEmail: "",
  adminNotifyEmail: "admin@m5residence.com"
};

const initialRooms = [
  {
    roomId: "superior",
    name: "Superior Loft Suite",
    thaiName: "ซูพีเรียร์ ลอฟท์ สวีท",
    price: 1800,
    size: 35,
    capacity: 3,
    bedType: "King Size Bed (เตียงคิงไซส์ 6 ฟุต)",
    description: "ห้องพักขนาดกว้างขวาง เหมาะสำหรับผู้เข้าพักที่ต้องการพื้นที่ใช้สอยพิเศษ ผนังปูนเปลือยดีไซน์สูงโปร่งอบอุ่น",
    longDescription: "สุดยอดแห่งการดีไซน์ในสไตล์แวร์เฮาส์ลอฟต์แท้ๆ ห้องนี้โดดเด่นด้วยเพดานที่ได้รับการออกแบบให้สูงเป็นพิเศษถึง 3.2 เมตร ผนังด้านหลังกรุหน้าด้วยกระเบื้องอิฐมอญสีส้มธรรมชาติเข้ากับโครงเหล็กท่อสีดำด้าน ชุดเครื่องนอนเป็นด้ายคอตตอนเกรดพรีเมียมหนานุ่มพิเศษ มีพื้นที่เลานจ์สำหรับการนั่งเล่นอ่านหนังสือ พร้อมโซลูชันห้องน้ำกระจกเทมเปอร์ดาร์คสไตล์และระบบฝักบัว Rain Shower อุณหภูมิคงที่",
    imageUrl: "",
    amenities: JSON.stringify(["Free High-speed Wi-Fi 1000Mbps", "Smart TV 55\" พร้อม Netflix", "มินิบาร์และสแน็คบาร์จัดเตรียมครบ", "โซฟาเบดเกรดพรีเมียมสำหรับพักผ่อน", "เครื่องเป่าผม และเสื้อคลุมอาบน้ำสไตล์ลอฟท์", "ตู้เซฟอิเล็กทรอนิกส์ส่วนตัว"]),
    matterportUrl: "https://my.matterport.com/show/?m=Pcjj9wmA98W"
  },
  {
    roomId: "deluxe",
    name: "Deluxe Balcony Loft",
    thaiName: "ดีลักซ์ บัลโคนี ลอฟท์",
    price: 1500,
    size: 30,
    capacity: 2,
    bedType: "King Size Bed (เตียงคิงไซส์ 6 ฟุต)",
    description: "สัมผัสอากาศบริสุทธิ์รอบปากเกร็ดกับระเบียงคอนกรีตขัดมันส่วนตัวสไตล์ธรรมชาติพร้อมพืชพรรณพริ้วไหว",
    longDescription: "ห้องพักดีไซน์ทันสมัยที่ประยุกต์ความเป็น Loft เข้ากับความโปร่งโล่งสบายตาอย่างลงตัว จุดเด่นคือ ประตูกระจกบานใหญ่แบบเลื่อนไร้เสียงที่สามารถสไลด์เปิดสู่ระเบียงส่วนตัว คอนกรีตบล็อกดีไซน์โมเดิร์นรายล้อมด้วยพืชพรรณสีเขียวชอุ่ม ให้ความเป็นส่วนตัวสูดอากาศพัดสบาย ยามค่ำคืนสามารถดื่มด่ำกับบรรยากาศรื่นรมย์ของแสงไฟในย่านนนทบุรีรอบข้างได้เหมาะสม",
    imageUrl: "",
    amenities: JSON.stringify(["ระเบียงส่วนตัวชมวิวเมืองภายนอก", "Free High-speed Wi-Fi 1000Mbps", "Smart TV 50\" สตรีมมิ่งไร้ขัดข้อง", "เครื่องชงกาแฟแคปซูลระดับพรีเมียม", "ฝักบัวอาบน้ำเพดานสูง Rain Shower", "โต๊ะทำงานไม้คลาสสิก"]),
    matterportUrl: "https://my.matterport.com/show/?m=u6Q8X6mK4cW"
  },
  {
    roomId: "studio",
    name: "Studio Loft",
    thaiName: "สตูดิโอ ลอฟท์",
    price: 1200,
    size: 28,
    capacity: 2,
    bedType: "Queen Size Bed (เตียงควีนไซส์ 5 ฟุต)",
    description: "ห้องสตูดิโอบรรยากาศอบอุ่นคลาสสิก พร้อมโต๊ะทำงานและเก้าอี้หนังสไตล์อินดัสเทรียลเพื่อเหล่านักเดินทางครีเอทีฟ",
    longDescription: "ความเรียบหรูระดับดีไซน์ในพื้นที่กะทัดรัด ห้อง Studio Loft โชว์พื้นผิวคอนกรีตหล่อแบบผสมผสานแผ่นไม้ธรรมชาติคัดสรร เหมาะสำหรับนักธุรกิจ ศิลปิน ครีเอเตอร์ หรือคู่รักที่มองหาห้องพักอันอบอุ่น ตกแต่งคุ้มค่า มีโต๊ะทำงานขอบเหล็กเข้าสไตล์เก้าอี้หนังแบบย้อนยุครวมถึงโคมไฟกรงนกเหล็กดัด ให้แสงวอร์มไวท์นุ่มสบายสายตาเพื่อปลุกไอเดียสร้างสรรค์ใหม่ๆ",
    imageUrl: "",
    amenities: JSON.stringify(["Free High-speed Wi-Fi 1000Mbps", "Smart TV 43\" ดีไซน์เรียบหรู", "โต๊ะทำงานทำงานสไตล์ดีไซน์ออฟฟิศ", "ชุดชงชากาแฟแฮนด์เมด", "ตู้เย็นขนาดกลางแยกช่องฟรีซ", "เครื่องเป่าผมและไดร์เป่าสไตล์"]),
    matterportUrl: "https://my.matterport.com/show/?m=SxZJMz3Sg6v"
  }
];

const initialPromotions = [
  {
    promoId: "promo-concert",
    badge: "CONCERT SPECIAL",
    title: "Concert Goer Package 🎸",
    desc: "สำหรับสายรักเสียงดนตรี! เข้าพักห้อง Deluxe Balcony เพียงคุณแสดงบัตรคอนเสิร์ตที่จะแสดง ณ อิมแพ็ค อารีน่า ในรอบสัปดาห์นั้น รับฟรีทันที คูปองเครื่องดื่ม Signature 2 แก้ว เลือกลองได้ที่คราฟต์คาเฟ่ Copper & Steam ของโรงแรม",
    highlight: "ฟรีคูปองเครื่องดื่มคราฟต์ 2 แก้ว"
  },
  {
    promoId: "promo-stay",
    badge: "STAY & SAVE",
    title: "พักยาว ประหยัดกว่า (Stay & Save) 📅",
    desc: "จองห้องพักทุกสไตล์ตั้งแต่ 2 คืนขึ้นไปผ่านหน้าเว็บไซต์หลัก รับส่วนลดค่าห้องทันที 10% พร้อมสิทธิ์เลทเช็คเอาท์ (Late Check-out) ได้ถึงเวลา 14:00 น. เพื่อให้คุณได้พักผ่อนหลังจบคอนเสิร์ตยามดึกอย่างผ่อนคลายเต็มอิ่ม",
    highlight: "ส่วนลด 10% + เลทเช็คเอาท์ 14.00 น."
  }
];

const initialAmenities = [
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
    desc: "ยิมออกกำลังกายสไตล์แวร์เฮ้าส์ ดิบเท่สปอร์ต ผนังคอนกรีตฉลุลาย พร้อมอุปกรณ์ออกกำลังและฟรีเวทครบครันครบถ้วน"
  },
  {
    iconName: "ShieldCheck",
    title: "ความปลอดภัยระดับ 24 ชั่วโมง",
    desc: "ที่จอดรถในร่มกว้างขวาง ดูแลความปลอดภัยด้วยกล้องโทรทัศน์วงจรปิด CCTV ทุกจุดร่วมกับเจ้าหน้าที่รปภ. มืออาชีพตลอดวัน"
  }
];

const initialFaqs = [
  { q: "ห่างจาก อิมแพ็ค เมืองทองธานี กี่นาทีและไปยังไง?", a: "ห่างเพียง 5-10 นาทีเท่านั้น (ประมาณ 2.5 กิโลเมตร) เดินทางได้สะดวกสุดด่วนโดยรถยนต์, แท็กซี่ หรือมอเตอร์ไซค์รับจ้างที่มีปักหลักตลอดหน้าซอยปากเกร็ด" },
  { q: "ทางโรงแรมมีที่จอดรถยนต์ส่วนตัวให้บริการหรือไม่?", a: "มีครับ เราจัดสรรบริการที่จอดรถยนต์ในร่มส่วนตัวรอบบริเวณอาคารที่พักฟรีสำหรับผู้จองห้องพักทุกท่าน ดูแลปลอดภัยสูงสุดด้วยกล้อง CCTV คู่บุคลากรรปภ. ตลอดเวลา" },
  { q: "ถ้าคอนเสิร์ตจบดึก, สามารถเลทเช็คอินได้หรือไม่?", a: "สามารถเช็คอินตลอด 24 ชั่วโมงได้เลยครับ เนื่องจากเรามีเจ้าหน้าที่บริการที่เคาน์เตอร์ และระบบประตูล็อคอัจฉริยะคีย์การ์ด โดยรบกวนแจ้งความต้องการเช็คอินล่าช้าลงบนคำขอแบบฟอร์มจองห้อง" },
  { q: "สามารถเลื่อนนัดวันเข้าพัก หรือยกเลิกการจองอย่างไร?", a: "คุณสามารถยกเลิกฟรีได้ภายใน 3 วันก่อนเข้าพักจริง หรือสามารถทักแชทสอบถามผู้ช่วยสั่งแก้ข้อมูล ผ่านระบบซัพพอร์ต AI Chatbot ในหน้านี้ หรือติดต่อ Line ID ของโรงแรมได้สะดวกสุด" }
];

const initialReviews = [
  { name: "คุณณภัทร สรวิศิษฐ์", role: "Concert Attendee 🎸", review: "มาดูคอนเสิร์ตที่อิมแพ็ค สะดวกมากๆ นั่งวินไป 5 นาทีถึง ล็อบบี้ตกแต่งสวย ปูนเปลือยขัดมันเท่และสะอาดสะอ้าน แนะนำเลยค่ะ", rating: 5, date: "มิถุนายน 2026" },
  { name: "คุณลลินา ชัชวัสส์", role: "Staycation Lover ☕", review: "ชอบคราฟต์คาเฟ่ด้านล่างมากค่ะ กาแฟหอมเข้ม เตียงในห้อง Deluxe Balcony หนาหนุ่มนอนแอร์พัดผ่อนฟินๆ พนักงานบริการเอาใจใส่ดีมาก", rating: 5, date: "พฤษภาคม 2026" },
  { name: "Mr. David Miller", role: "Digital Nomad 💻", review: "Wonderful gigabit connection and modern industrial vibes. Safe parking spaces, secure guard check. I'll definitely come back next time.", rating: 5, date: "พฤษภาคม 2026" }
];

const initialGallery = [
  { url: "", title: "คอนกรีตลอฟท์ล็อบบี้ & คาเฟ่บาร์", cat: "Copper Cafe Bar" },
  { url: "", title: "ดีไซน์ปูนเปลือย & แผ่นไม้มะค่าธรรมชาติ", cat: "Superior Suite" },
  { url: "", title: "ระเบียงพืชพรรณสไลด์สูดอากาศภายนอก", cat: "Deluxe Balcony" },
  { url: "", title: "สเปซส่วนตัวโฮมมี่พร้อมมุมครีเอทีฟทำงาน", cat: "Studio corner" }
];

const initialCoupons = [
  {
    code: "WELCOME10",
    type: "percent",
    value: 10,
    minNights: 1,
    active: true,
    description: "ส่วนลดพิเศษ 10% สำหรับผู้ใช้หน้าเว็บใหม่"
  },
  {
    code: "LOFT100",
    type: "fixed",
    value: 100,
    minNights: 1,
    active: true,
    description: "ส่วนลดเงินสด 100 บาท ต้อนรับฤดูกาลคอนเสิร์ต"
  }
];

const initialBookings = [
  {
    bookingId: "B-1001",
    roomType: "deluxe",
    roomName: "Deluxe Balcony Loft",
    checkIn: "2026-06-25",
    checkOut: "2026-06-27",
    guests: 2,
    guestName: "สมศักดิ์ รักดี",
    guestEmail: "somsak@gmail.com",
    guestPhone: "081-222-3344",
    totalPrice: 3000,
    status: "Confirmed",
    specialRequest: "ขอเตียงเสริมและต้องการที่จอดรถใกล้ทางเข้า",
    createdAt: "2026-06-23T01:50:00.000Z"
  },
  {
    bookingId: "B-1002",
    roomType: "superior",
    roomName: "Superior Loft Suite",
    checkIn: "2026-07-02",
    checkOut: "2026-07-03",
    guests: 3,
    guestName: "Jane Doe",
    guestEmail: "jane@example.com",
    guestPhone: "+1 555-0199",
    totalPrice: 1800,
    status: "Paid",
    specialRequest: "ต้องการเช็คอินช่วงเวลา 21:00 น. เนื่องจากติดคอนเสิร์ต",
    createdAt: "2026-06-22T14:30:00.000Z"
  }
];

const initialBlockedDates = [
  {
    blockedId: "bd-1",
    date: "2026-06-30",
    roomId: "all",
    note: "ปิดบำรุงรักษาระบบไฟฟ้าส่วนกลาง"
  },
  {
    blockedId: "bd-2",
    date: "2026-07-05",
    roomId: "superior",
    note: "ห้อง Superior ปิดพ่นสีและเคลือบเงาเฟอร์นิเจอร์ไม้"
  }
];

const initialMembers = [
  {
    memberId: "M5-MEM-1001",
    name: "สมชาย รักสงบ",
    email: "somchai@m5.com",
    phone: "089-111-2222",
    password: "password123",
    tier: "Elite",
    points: 250,
    joinedBookingsCount: 3,
    createdAt: new Date().toISOString()
  },
  {
    memberId: "M5-MEM-1002",
    name: "วิภาดา งามวิไล",
    email: "wipada@gmail.com",
    phone: "085-555-6666",
    password: "password123",
    tier: "Gold",
    points: 120,
    joinedBookingsCount: 1,
    createdAt: new Date().toISOString()
  },
  {
    memberId: "M5-MEM-1003",
    name: "เกียรติศักดิ์ ยอดดนตรี",
    email: "kiatisak@m5.com",
    phone: "082-999-8888",
    password: "password123",
    tier: "Silver",
    points: 40,
    joinedBookingsCount: 0,
    createdAt: new Date().toISOString()
  }
];

// Helper functions for API calls
async function createCollection(collectionName: string, isSingleton = false) {
  console.log(`Creating collection [${collectionName}] (singleton: ${isSingleton})...`);
  const res = await fetch(`${url}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      collection: collectionName,
      schema: {},
      meta: {
        singleton: isSingleton,
        note: `Collection for ${collectionName}`
      }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Warning/Error creating ${collectionName}: ${res.status}. Response: ${text}`);
    return false;
  }
  console.log(`Successfully created collection: ${collectionName}`);
  return true;
}

async function deleteCollection(collectionName: string) {
  console.log(`Deleting collection [${collectionName}]...`);
  const res = await fetch(`${url}/collections/${collectionName}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (res.ok) {
    console.log(`Successfully deleted collection: ${collectionName}`);
    return true;
  }
  return false;
}

async function createField(collectionName: string, fieldName: string, type: string, interfaceType = "input") {
  const res = await fetch(`${url}/fields/${collectionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      field: fieldName,
      type: type,
      meta: {
        interface: interfaceType,
        width: "full"
      }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Error creating field ${fieldName} in ${collectionName}: ${res.status}. Msg: ${text}`);
    return false;
  }
  return true;
}

async function insertItem(collectionName: string, item: any) {
  const res = await fetch(`${url}/items/${collectionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(item)
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Error inserting item into ${collectionName}: ${res.status}. Msg: ${text}`);
    return null;
  }
  return await res.json();
}

async function main() {
  console.log("=== STARTING DIRECTUS SCHEMA SETUP & SEEDING ===");

  // Define collections and their fields
  const collections = [
    {
      name: "m5_general",
      singleton: false,
      fields: [
        { name: "hotelName", type: "string", interface: "input" },
        { name: "thaiName", type: "string", interface: "input" },
        { name: "heroTitle", type: "string", interface: "input" },
        { name: "heroSubtitle", type: "text", interface: "textarea" },
        { name: "gps", type: "string", interface: "input" },
        { name: "contactAddress", type: "text", interface: "textarea" },
        { name: "contactPhone", type: "string", interface: "input" },
        { name: "facebook", type: "string", interface: "input" },
        { name: "lineId", type: "string", interface: "input" },
        { name: "logoUrl", type: "string", interface: "input" },
        { name: "coverImg1", type: "string", interface: "input" },
        { name: "coverImg2", type: "string", interface: "input" },
        { name: "coverImg3", type: "string", interface: "input" },
        { name: "heroCardImg", type: "string", interface: "input" },
        { name: "heroBgImg", type: "string", interface: "input" },
        { name: "seoTitle", type: "string", interface: "input" },
        { name: "seoDescription", type: "text", interface: "textarea" },
        { name: "seoKeywords", type: "text", interface: "textarea" },
        { name: "allowRegistration", type: "boolean", interface: "boolean" },
        { name: "bookingEnabled", type: "boolean", interface: "boolean" },
        { name: "bookingDisabledMessage", type: "text", interface: "textarea" }
      ],
      seed: [initialGeneral]
    },
    {
      name: "m5_smtp",
      singleton: false,
      fields: [
        { name: "host", type: "string", interface: "input" },
        { name: "port", type: "integer", interface: "input" },
        { name: "secure", type: "boolean", interface: "boolean" },
        { name: "user", type: "string", interface: "input" },
        { name: "pass", type: "string", interface: "input" },
        { name: "fromName", type: "string", interface: "input" },
        { name: "fromEmail", type: "string", interface: "input" },
        { name: "adminNotifyEmail", type: "string", interface: "input" }
      ],
      seed: [initialSmtp]
    },
    {
      name: "m5_rooms",
      singleton: false,
      fields: [
        { name: "roomId", type: "string", interface: "input" },
        { name: "name", type: "string", interface: "input" },
        { name: "thaiName", type: "string", interface: "input" },
        { name: "price", type: "integer", interface: "input" },
        { name: "size", type: "integer", interface: "input" },
        { name: "capacity", type: "integer", interface: "input" },
        { name: "bedType", type: "string", interface: "input" },
        { name: "description", type: "text", interface: "textarea" },
        { name: "longDescription", type: "text", interface: "textarea" },
        { name: "imageUrl", type: "string", interface: "input" },
        { name: "amenities", type: "text", interface: "textarea" }, // stringified array
        { name: "matterportUrl", type: "string", interface: "input" }
      ],
      seed: initialRooms
    },
    {
      name: "m5_promotions",
      singleton: false,
      fields: [
        { name: "promoId", type: "string", interface: "input" },
        { name: "badge", type: "string", interface: "input" },
        { name: "title", type: "string", interface: "input" },
        { name: "desc", type: "text", interface: "textarea" },
        { name: "highlight", type: "string", interface: "input" }
      ],
      seed: initialPromotions
    },
    {
      name: "m5_amenities",
      singleton: false,
      fields: [
        { name: "iconName", type: "string", interface: "input" },
        { name: "title", type: "string", interface: "input" },
        { name: "desc", type: "text", interface: "textarea" }
      ],
      seed: initialAmenities
    },
    {
      name: "m5_faqs",
      singleton: false,
      fields: [
        { name: "q", type: "string", interface: "input" },
        { name: "a", type: "text", interface: "textarea" }
      ],
      seed: initialFaqs
    },
    {
      name: "m5_reviews",
      singleton: false,
      fields: [
        { name: "name", type: "string", interface: "input" },
        { name: "role", type: "string", interface: "input" },
        { name: "review", type: "text", interface: "textarea" },
        { name: "rating", type: "integer", interface: "input" },
        { name: "date", type: "string", interface: "input" }
      ],
      seed: initialReviews
    },
    {
      name: "m5_gallery",
      singleton: false,
      fields: [
        { name: "url", type: "string", interface: "input" },
        { name: "title", type: "string", interface: "input" },
        { name: "cat", type: "string", interface: "input" }
      ],
      seed: initialGallery
    },
    {
      name: "m5_coupons",
      singleton: false,
      fields: [
        { name: "code", type: "string", interface: "input" },
        { name: "type", type: "string", interface: "input" },
        { name: "value", type: "integer", interface: "input" },
        { name: "minNights", type: "integer", interface: "input" },
        { name: "active", type: "boolean", interface: "boolean" },
        { name: "description", type: "string", interface: "input" }
      ],
      seed: initialCoupons
    },
    {
      name: "m5_bookings",
      singleton: false,
      fields: [
        { name: "bookingId", type: "string", interface: "input" },
        { name: "roomType", type: "string", interface: "input" },
        { name: "roomName", type: "string", interface: "input" },
        { name: "checkIn", type: "string", interface: "input" },
        { name: "checkOut", type: "string", interface: "input" },
        { name: "guests", type: "integer", interface: "input" },
        { name: "guestName", type: "string", interface: "input" },
        { name: "guestEmail", type: "string", interface: "input" },
        { name: "guestPhone", type: "string", interface: "input" },
        { name: "totalPrice", type: "integer", interface: "input" },
        { name: "status", type: "string", interface: "input" },
        { name: "specialRequest", type: "text", interface: "textarea" },
        { name: "createdAt", type: "string", interface: "input" }
      ],
      seed: initialBookings
    },
    {
      name: "m5_blocked_dates",
      singleton: false,
      fields: [
        { name: "blockedId", type: "string", interface: "input" },
        { name: "date", type: "string", interface: "input" },
        { name: "roomId", type: "string", interface: "input" },
        { name: "note", type: "string", interface: "input" }
      ],
      seed: initialBlockedDates
    },
    {
      name: "m5_members",
      singleton: false,
      fields: [
        { name: "memberId", type: "string", interface: "input" },
        { name: "name", type: "string", interface: "input" },
        { name: "email", type: "string", interface: "input" },
        { name: "phone", type: "string", interface: "input" },
        { name: "password", type: "string", interface: "input" },
        { name: "tier", type: "string", interface: "input" },
        { name: "points", type: "integer", interface: "input" },
        { name: "joinedBookingsCount", type: "integer", interface: "input" },
        { name: "createdAt", type: "string", interface: "input" }
      ],
      seed: initialMembers
    },
    {
      name: "m5_admins",
      singleton: false,
      fields: [
        { name: "adminId", type: "string", interface: "input" },
        { name: "username", type: "string", interface: "input" },
        { name: "password", type: "string", interface: "input" },
        { name: "name", type: "string", interface: "input" },
        { name: "role", type: "string", interface: "input" }
      ],
      seed: [
        {
          adminId: "admin-1",
          username: "admin",
          password: "password123",
          name: "System Chief Manager",
          role: "Super Admin"
        },
        {
          adminId: "admin-2",
          username: "m5loft",
          password: "password123",
          name: "M5 Loft Manager",
          role: "Loft Admin"
        }
      ]
    }
  ];

  // 0. Bootstrap static API token for admin user
  await bootstrapAdminToken(url, ADMIN_EMAIL, ADMIN_PASSWORD, token);

  // 1. Delete and create each collection, then add fields, then seed
  for (const col of collections) {
    // Delete if existing first to ensure fresh clean state
    await deleteCollection(col.name);
    
    // Create collection
    const created = await createCollection(col.name, col.singleton);
    if (!created) continue;

    // Create fields
    console.log(`Creating fields for [${col.name}]...`);
    for (const field of col.fields) {
      const fieldOk = await createField(col.name, field.name, field.type, field.interface);
      if (fieldOk) {
        console.log(`  - Created field: ${field.name} (${field.type})`);
      }
    }

    // Seed data
    console.log(`Seeding data for [${col.name}]...`);
    for (const item of col.seed) {
      const res = await insertItem(col.name, item);
      if (res) {
        console.log(`  - Inserted seed item`);
      }
    }
    console.log(`Finished [${col.name}]\n`);
  }

  console.log("=== ALL DIRECTUS SCHEMA SETUP AND SEEDING COMPLETED ===");
}

main().catch(err => {
  console.error("Critical error in Directus setup script:", err);
});
