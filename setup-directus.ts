import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

// Load from local db.json if available
let configUrl = process.env.DIRECTUS_INTERNAL_URL || process.env.DIRECTUS_URL || "https://data.them5residence.com";
let configToken = process.env.DIRECTUS_TOKEN || "lQQ9k-PdtLixFi2LUA-MSxF2n8ucQ96a";

const DB_PATH = path.join(process.cwd(), "db.json");
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.directus) {
      if (parsed.directus.internalUrl) {
        configUrl = parsed.directus.internalUrl;
      } else if (parsed.directus.url) {
        configUrl = parsed.directus.url;
      }
      if (parsed.directus.token) {
        configToken = parsed.directus.token;
      }
    }
  } catch (e: any) {
    console.warn("Failed to load db.json in setup-directus.ts:", e.message);
  }
}

const url = configUrl;
const token = configToken;

console.log(`Using Directus URL: ${url}`);
console.log(`Using Directus Token: ${token ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : "None"}`);

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
  logoUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=100&q=80",
  coverImg1: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  coverImg2: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  coverImg3: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
  heroCardImg: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  heroBgImg: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
  seoTitle: "The M5 Residence | ที่พักสไตล์ลอฟท์ ปากเกร็ด นนทบุรี ใกล้อิมแพ็ค อารีน่า",
  seoDescription: "เดอะ เอ็มไฟว์ เรสซิเดนซ์ (The M5 Residence) นิยามใหม่ของการพักผ่อนสไตล์อินดัสเทรียลลอฟท์ ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอน และเมืองทองธานี ห้องพักหรูราคาประหยัด",
  seoKeywords: "The M5 Residence, เดอะ เอ็มไฟว์ เรสซิเดนซ์, ที่พักปากเกร็ด, โรงแรมปากเกร็ด, ที่พักใกล้อิมแพ็ค, ที่พักใกล้เมืองทอง, โรงแรมสไตล์ลอฟท์, โรงแรมนนทบุรี, จองห้องพักนนทบุรี",
  allowRegistration: true,
  bookingEnabled: true,
  bookingDisabledMessage: "ขออภัย ระบบจองห้องพักออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ",
  eventPopupTimeout: 10,
  adminPath: "/admin"
};

const initialSmtp = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "notification@them5residence.com",
  pass: "m5residence2026",
  fromName: "The M5 Residence Loft",
  fromEmail: "no-reply@them5residence.com",
  adminNotifyEmail: "booking@them5residence.com"
};

const initialRooms: any[] = [];
const initialPromotions: any[] = [];
const initialAmenities: any[] = [];
const initialFaqs: any[] = [];
const initialReviews: any[] = [];
const initialGallery: any[] = [];
const initialCoupons: any[] = [];
const initialImpactEvents: any[] = [];

// Helper functions for API calls
async function collectionExists(colName: string) {
  try {
    const res = await fetch(`${url}/collections/${colName}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fieldExists(colName: string, fieldName: string) {
  try {
    const res = await fetch(`${url}/fields/${colName}/${fieldName}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

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
        { name: "bookingDisabledMessage", type: "text", interface: "textarea" },
        { name: "eventPopupEnabled", type: "boolean", interface: "boolean" },
        { name: "eventPopupMode", type: "string", interface: "input" },
        { name: "eventPopupSelectedId", type: "string", interface: "input" },
        { name: "eventPopupCustomTitle", type: "string", interface: "input" },
        { name: "eventPopupCustomDesc", type: "text", interface: "textarea" },
        { name: "eventPopupCustomImg", type: "string", interface: "input" },
        { name: "eventPopupTimeout", type: "integer", interface: "input" },
        { name: "lineLink", type: "string", interface: "input" },
        { name: "facebookUrl", type: "string", interface: "input" },
        { name: "adminPath", type: "string", interface: "input" }
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
      seed: [] // real database starts with empty bookings, or we can use empty array to conform to "no mock transactions"
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
      seed: [] // keep empty for real-world usage
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
      seed: [] // empty for real usage
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
          password: "asd024865", // matching user admin password in db.json
          name: "System Chief Manager",
          role: "Super Admin"
        }
      ]
    },
    {
      name: "m5_impact_events",
      singleton: false,
      fields: [
        { name: "eventId", type: "string", interface: "input" },
        { name: "title", type: "string", interface: "input" },
        { name: "date", type: "string", interface: "input" },
        { name: "time", type: "string", interface: "input" },
        { name: "venue", type: "string", interface: "input" },
        { name: "description", type: "text", interface: "textarea" },
        { name: "imageUrl", type: "string", interface: "input" },
        { name: "category", type: "string", interface: "input" },
        { name: "active", type: "boolean", interface: "boolean" }
      ],
      seed: initialImpactEvents
    }
  ];

  // 0. Bootstrap static API token for admin user
  await bootstrapAdminToken(url, ADMIN_EMAIL, ADMIN_PASSWORD, token);

  // 1. Check and build each collection non-destructively
  const forceReset = process.argv.includes("--force");
  
  for (const col of collections) {
    const exists = await collectionExists(col.name);
    if (exists && forceReset) {
      console.log(`Force reset enabled. Deleting collection [${col.name}]...`);
      await deleteCollection(col.name);
    }

    const currentExists = exists && !forceReset;

    if (!currentExists) {
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
    } else {
      console.log(`Collection [${col.name}] already exists. Verifying fields are present...`);
      // Collection exists, let's make sure all fields are present (non-destructive migration)
      for (const field of col.fields) {
        const fExists = await fieldExists(col.name, field.name);
        if (!fExists) {
          const fieldOk = await createField(col.name, field.name, field.type, field.interface);
          if (fieldOk) {
            console.log(`  - Added missing field: ${field.name} (${field.type}) to [${col.name}]`);
          }
        }
      }
    }
    console.log(`Finished [${col.name}]\n`);
  }

  console.log("=== ALL DIRECTUS SCHEMA SETUP AND SEEDING COMPLETED ===");
}

main().catch(err => {
  console.error("Critical error in Directus setup script:", err);
});
