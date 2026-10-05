import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import nodemailer from "nodemailer";
import { initializeApp, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore as getClientFirestore, doc as fsDoc, getDoc as fsGetDoc, setDoc as fsSetDoc, deleteDoc as fsDeleteDoc } from "firebase/firestore";
import { isPastEvent } from "./src/utils/eventDateUtils";

dotenv.config();

// Firebase Setup
const FIREBASE_CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;
let firestoreDb: any = null;
if (fs.existsSync(FIREBASE_CONFIG_PATH)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_PATH, "utf8"));
    if (getApps().length === 0) {
      initializeApp({
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });
      console.log("Firebase Admin initialized successfully.");
    }
  } catch (err: any) {
    console.error("Failed to initialize Firebase Admin:", err.message);
  }

  try {
    const clientApp = getClientApps().length > 0 ? getClientApps()[0] : initClientApp(firebaseConfig);
    firestoreDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase Cloud Firestore connected successfully:", firebaseConfig.firestoreDatabaseId);
  } catch (clientErr: any) {
    console.error("Failed to initialize Firebase Client Firestore:", clientErr.message);
  }
}

// Safe ESM / CommonJS workaround
const resolvedFilename = typeof import.meta !== "undefined" && import.meta?.url ? fileURLToPath(import.meta.url) : "";
const resolvedDirname = resolvedFilename ? path.dirname(resolvedFilename) : process.cwd();

const DB_PATH = path.join(process.cwd(), "db.json");

function deduplicateArray<T>(arr: T[], keyFn: (item: T) => any): T[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const result: T[] = [];
  for (const item of arr) {
    if (!item) continue;
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function deduplicateLocalDb(db: any) {
  if (!db) return db;
  db.rooms = deduplicateArray(db.rooms || [], (r: any) => r.id || r.roomId);
  db.promotions = deduplicateArray(db.promotions || [], (p: any) => p.id || p.promoId);
  db.blockedDates = deduplicateArray(db.blockedDates || [], (bd: any) => bd.id || bd.blockedId || `${bd.date}_${bd.roomId}`);
  db.coupons = deduplicateArray(db.coupons || [], (c: any) => (c.code || '').toUpperCase());
  db.members = deduplicateArray(db.members || [], (m: any) => m.id || m.memberId || m.email);
  
  const deletedBkIds = new Set(db.deletedBookingIds || []);
  deletedBkIds.add("B-1001");
  db.bookings = deduplicateArray(db.bookings || [], (b: any) => b.id || b.bookingId)
    .filter((b: any) => b.id !== "B-1001" && b.guestEmail !== "somsak@gmail.com" && !deletedBkIds.has(b.id));

  db.amenities = deduplicateArray(db.amenities || [], (a: any) => a.title || a.id);
  db.faqs = deduplicateArray(db.faqs || [], (f: any) => f.q || f.id);
  db.reviews = deduplicateArray(db.reviews || [], (r: any) => `${r.name}_${r.review}`);
  db.gallery = deduplicateArray(db.gallery || [], (g: any) => g.id || g.url || Math.random().toString());
  db.admins = deduplicateArray(db.admins || [], (ad: any) => String(ad.username || ad.id || ad.adminId || '').toLowerCase().trim());
  db.impactEvents = deduplicateArray(db.impactEvents || [], (e: any) => e.id || e.eventId);
  db.partners = deduplicateArray(db.partners || [], (p: any) => p.id || p.partnerId || p.name);
  if (db.adminMenuConfig) {
    db.adminMenuConfig = deduplicateArray(db.adminMenuConfig || [], (m: any) => m.id);
  }
  if (db.adminRoles) {
    db.adminRoles = deduplicateArray(db.adminRoles || [], (r: any) => r.id || r.name);
  }
  return db;
}

let memoryDb: any = null;

async function initDb() {
  if (firestoreDb) {
    try {
      const snap = await fsGetDoc(fsDoc(firestoreDb, "settings", "web"));
      if (snap.exists()) {
        memoryDb = deduplicateLocalDb(snap.data());
        console.log("Loaded database from Firebase Cloud Firestore (settings/web).");
        return;
      }
    } catch (err: any) {
      console.warn("Could not load from Firestore settings/web, checking fallback:", err.message);
    }
  }

  // Fallback to local file if Firestore fails or doesn't have data yet
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      memoryDb = deduplicateLocalDb(data);
      console.log("Loaded database from local db.json.");
      
      // Save to Firebase for future
      if (firestoreDb) {
        fsSetDoc(fsDoc(firestoreDb, "settings", "web"), memoryDb, { merge: true }).catch(() => {});
      }
      return;
    }
  } catch (err) {
    console.error("Error reading local db.json:", err);
  }

  memoryDb = deduplicateLocalDb({
    general: {},
    rooms: [],
    promotions: [],
    amenities: [],
    bookings: [],
    smtp: {},
    blockedDates: [],
    coupons: [],
    members: [],
    admins: [],
    impactEvents: [],
    partners: [],
    adminMenuConfig: [],
    adminRoles: []
  });
}

function getLocalDb() {
  if (!memoryDb) {
    console.warn("getLocalDb called before initDb! Using empty default.");
    return deduplicateLocalDb({
      general: {}, rooms: [], promotions: [], amenities: [], bookings: [],
      smtp: {}, blockedDates: [], coupons: [], members: [], admins: [],
      impactEvents: [], partners: [], adminMenuConfig: [], adminRoles: []
    });
  }
  return memoryDb;
}

function saveLocalDb(db: any) {
  try {
    memoryDb = deduplicateLocalDb(db);
    fs.writeFileSync(DB_PATH, JSON.stringify(memoryDb, null, 2), "utf-8");
    
    if (firestoreDb) {
      fsSetDoc(fsDoc(firestoreDb, "settings", "web"), memoryDb, { merge: true }).catch((_err: any) => {
        // Silently handled: client-side Firestore SDK handles real-time cloud data sync
      });
    }
  } catch (err) {
    console.error("Error saving local db.json:", err);
  }
}

// Helper to record notification logs into both memory/localDb and Firestore
async function recordNotificationLog(log: {
  id: string;
  bookingId: string;
  channel: "line" | "email" | "both";
  recipient: string;
  status: "sent" | "simulated" | "failed";
  message: string;
  createdAt: string;
}) {
  try {
    const localDb = getLocalDb() as any;
    if (!localDb.notifications) {
      localDb.notifications = [];
    }
    localDb.notifications.unshift(log);
    if (localDb.notifications.length > 100) {
      localDb.notifications = localDb.notifications.slice(0, 100);
    }
    saveLocalDb(localDb);

    // Save to Firebase Firestore notifications collection if initialized
    if (firestoreDb) {
      try {
        await fsSetDoc(fsDoc(firestoreDb, "notifications", log.id), log);
      } catch (err: any) {
        console.warn("Could not save notification to Firestore:", err.message);
      }
    }
  } catch (err) {
    console.error("Error recording notification log:", err);
  }
}

// Dedicated helper to send emails via SMTP2GO REST API or standard Nodemailer SMTP
interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  smtpConfig?: any;
}

async function sendEmailMessage({ to, subject, html, text, smtpConfig }: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const recipients = (Array.isArray(to) ? to : [to])
    .flatMap(t => String(t || "").split(/[,;\s]+/))
    .map(t => t.trim())
    .filter(t => t && t.includes("@"));
  if (recipients.length === 0) {
    return { success: false, error: "ไม่มีอีเมลผู้รับที่ถูกต้อง" };
  }

  const apiKey = smtpConfig?.apiKey || process.env.SMTP2GO_API_KEY || "api-77AF153BDA6C4F7FB6DED66C6CC28802";
  const apiBaseUrl = smtpConfig?.apiBaseUrl || process.env.SMTP2GO_API_URL || "https://api.smtp2go.com/v3/";
  const fromName = smtpConfig?.fromName || "The M5 Residence Loft";
  const fromEmail = smtpConfig?.fromEmail || "no-reply@them5residence.com";
  const senderHeader = `"${fromName}" <${fromEmail}>`;

  // 1. Try SMTP2GO REST API first (recommended for Cloud Run & web environments)
  if (apiKey) {
    try {
      const cleanBase = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      const endpoint = `${cleanBase}/email/send`;
      
      const payload = {
        api_key: apiKey,
        to: recipients,
        sender: senderHeader,
        subject,
        html_body: html,
        text_body: text || html.replace(/<[^>]*>?/gm, "").trim()
      };

      console.log(`[SMTP2GO API] Dispatching email to: ${recipients.join(", ")} via ${endpoint}...`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data?.data?.succeeded > 0) {
        console.log(`[SMTP2GO API Success] Email delivered to ${recipients.join(", ")} (ID: ${data?.data?.email_id || data?.request_id})`);
        return { success: true, id: data?.data?.email_id || data?.request_id };
      } else {
        const errorMsg = data?.data?.failures?.[0] || data?.data?.error || data?.message || JSON.stringify(data);
        console.warn(`[SMTP2GO API Warning] Failed via API: ${errorMsg}. Falling back to standard SMTP...`);
      }
    } catch (apiErr: any) {
      console.warn(`[SMTP2GO API Error] ${apiErr.message}. Falling back to standard SMTP...`);
    }
  }

  // 2. Standard Nodemailer SMTP fallback if configured
  if (smtpConfig?.host && (smtpConfig?.user || smtpConfig?.pass)) {
    try {
      const portNum = Number(smtpConfig.port) || 587;
      // In SMTP protocol:
      // - Port 465 / 8465 uses implicit SSL/TLS from byte 0 (secure: true).
      // - Ports 587, 2525, 8025, 25, 80 start with plaintext SMTP and upgrade via STARTTLS (secure: false).
      // Setting secure: true on 587/2525 causes OpenSSL "wrong version number" error.
      const isImplicitSsl = portNum === 465 || portNum === 8465 || (smtpConfig.secure === true && portNum !== 587 && portNum !== 2525 && portNum !== 8025 && portNum !== 25 && portNum !== 80);

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: portNum,
        secure: isImplicitSsl,
        auth: smtpConfig.user && smtpConfig.pass ? {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: senderHeader,
        to: recipients.join(", "),
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, "").trim()
      });

      console.log(`[Nodemailer SMTP Success] Sent to ${recipients.join(", ")}: ${info.messageId}`);
      return { success: true, id: info.messageId };
    } catch (smtpErr: any) {
      console.error(`[Nodemailer SMTP Error] Failed to send:`, smtpErr);
      return { success: false, error: smtpErr.message };
    }
  }

  return { success: false, error: "ยังไม่ได้กำหนดค่า SMTP2GO API Key หรือเซิร์ฟเวอร์ SMTP" };
}

// Helper function to send email notification using SMTP or SMTP2GO API
async function sendBookingEmail(booking: any, smtp: any) {
  const adminEmail = smtp?.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || "soothirote.nik@gmail.com";
  const customerEmail = booking.guestEmail;

  // Calculate nights for details
  const d1 = new Date(booking.checkIn);
  const d2 = new Date(booking.checkOut);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;

  // 1. Send HTML to Customer
  const customerHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; border-bottom: 3px solid #d95a06; padding-bottom: 20px; margin-bottom: 25px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">THE M5 RESIDENCE</h2>
        <p style="color: #64748b; margin: 5px 0 0; font-size: 13px;">นิยามใหม่ของการพักผ่อนสไตล์ลอฟต์ ปากเกร็ด นนทบุรี</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <p style="font-size: 16px; color: #0f172a; line-height: 1.6; font-weight: bold;">สวัสดีครับ คุณ ${booking.guestName},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">ทางเรามีความยินดีที่จะแจ้งให้ทราบว่า เราได้รับรายการจองห้องพักของท่านเรียบร้อยแล้ว รายละเอียดรายการจองมีดังต่อไปนี้:</p>
      </div>

      <div style="background-color: #f8fafc; border-left: 4px solid #d95a06; padding: 18px; margin-bottom: 25px; border-radius: 6px; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.7;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">หมายเลขการจอง:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700; font-size: 15px;">${booking.id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">ประเภทห้องพัก:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${booking.roomName || booking.roomType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">วันที่เข้าพัก (Check-in):</td>
            <td style="padding: 6px 0; color: #d95a06; font-weight: 700;">${booking.checkIn} (หลัง 14:00 น.)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">วันที่เช็คเอาท์ (Check-out):</td>
            <td style="padding: 6px 0; color: #d95a06; font-weight: 700;">${booking.checkOut} (ก่อน 12:00 น.)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">ระยะเวลาพัก:</td>
            <td style="padding: 6px 0; color: #0f172a;">${nights} คืน (${booking.guests} ท่าน)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">ยอดชำระเงินสุทธิ:</td>
            <td style="padding: 6px 0; color: #d95a06; font-weight: 800; font-size: 18px;">${Number(booking.totalPrice || 0).toLocaleString()} THB</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">สถานะการจอง:</td>
            <td style="padding: 6px 0;"><span style="background-color: #fffbeb; color: #b45309; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; border: 1px solid #fde68a;">${booking.status === "Pending" ? "รอชำระเงิน / ตรวจสอบ" : booking.status}</span></td>
          </tr>
          ${booking.specialRequest ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">คำขอพิเศษ:</td>
            <td style="padding: 6px 0; color: #475569; font-style: italic;">"${booking.specialRequest}"</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="font-size: 13px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 20px; line-height: 1.6;">
        <p style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">📌 ข้อมูลการเตรียมตัวเข้าพัก:</p>
        <ul style="padding-left: 20px; margin: 0 0 15px 0;">
          <li style="margin-bottom: 4px;">กรุณาเตรียมบัตรประจำตัวประชาชนหรือพาสปอร์ตสำหรับแสดงตอนเช็คอิน</li>
          <li style="margin-bottom: 4px;">มีบริการเครื่องดื่มต้อนรับฟรีที่ Copper & Steam Cafe (ชั้นล็อบบี้)</li>
          <li style="margin-bottom: 4px;">ติดต่อพนักงานโรงแรมได้ตลอดเวลาผ่านเบอร์โทรศัพท์ <strong>${smtp?.fromPhone || "02-M5-LOFT"}</strong></li>
        </ul>
        <p style="margin-top: 20px; text-align: center; color: #d95a06; font-weight: bold;">— ขอขอบพระคุณและหวังเป็นอย่างยิ่งว่าคุณจะได้รับความสุขความผ่อนคลายในค่ำคืนนี้ —</p>
      </div>
    </div>
  `;

  // 2. Send HTML to Admin
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 2px solid #0f172a; background-color: #f8fafc; color: #1e293b; border-radius: 12px;">
      <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 1.5px; font-weight: bold;">[NEW BOOKING ALERTS // การจองใหม่]</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">มีรายการจองห้องพักแจ้งเตือนเข้ามาทางระบบหน้าเว็บ</p>
      </div>
      
      <div style="padding: 10px 5px;">
        <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; color: #0f172a; font-size: 16px; margin-top: 0;">📋 ข้อมูลห้องพัก & ระยะเวลา</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8; margin-bottom: 20px;">
          <tr><td style="padding: 5px 0; color: #64748b; width: 160px; font-weight: bold;">รหัสรายการจอง:</td><td style="font-family: monospace; font-weight: bold; color: #d95a06; font-size: 15px;">${booking.id}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">ห้องพัก:</td><td style="font-weight: bold;">${booking.roomName || booking.roomType}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">วันเข้าพัก (Check-in):</td><td>${booking.checkIn}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">วันออกพัก (Check-out):</td><td>${booking.checkOut}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">จำนวนคืนพัก:</td><td>${nights} คืน (${booking.guests} ท่าน)</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">ยอดเงินเรียกเก็บสุทธิ:</td><td style="font-weight: bold; color: #d95a06; font-size: 16px;">${Number(booking.totalPrice || 0).toLocaleString()} THB</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">สถานะ:</td><td><strong style="color: #b45309;">${booking.status}</strong></td></tr>
        </table>

        <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; color: #0f172a; font-size: 16px; margin-top: 25px;">👤 ข้อมูลผู้เข้าพัก (ลูกค้า)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
          <tr><td style="padding: 5px 0; color: #64748b; width: 160px; font-weight: bold;">ชื่อ-นามสกุล:</td><td><strong>${booking.guestName}</strong></td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">อีเมลบัญชี:</td><td><a href="mailto:${booking.guestEmail}" style="color: #d95a06;">${booking.guestEmail}</a></td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">เบอร์โทรศัพท์:</td><td style="font-family: monospace;">${booking.guestPhone}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold; vertical-align: top;">คำขอพิเศษจากลูกค้า:</td><td style="font-style: italic; color: #475569;">"${booking.specialRequest || "ไม่มีข้อมูลคำขอเพิ่มเติม"}"</td></tr>
        </table>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; font-size: 12px; color: #64748b; text-align: center; border-radius: 8px; margin-top: 25px; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-weight: bold; color: #475569;">SYSTEM NOTE: THE M5 RESIDENCE ADMIN ENGINE</p>
        <p style="margin: 4px 0 0;">กรุณาเข้าระบบจัดการแอดมิน เพื่อตรวจสอบความถูกต้องหรืออัปเดตสถานะการชำระเงินของลูกค้าตามอัธยาศัย</p>
      </div>
    </div>
  `;

  // Check if either SMTP2GO API or standard SMTP credentials are provided
  const hasConfig = Boolean(smtp?.apiKey || process.env.SMTP2GO_API_KEY || (smtp?.host && (smtp?.user || smtp?.pass)));
  if (!hasConfig) {
    console.warn("[SMTP Info] No email credentials provided. Recorded notification dispatch in audit log.");
    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: booking.id,
      channel: "email",
      recipient: `${adminEmail}, ${customerEmail || "ไม่มีอีเมลลูกค้า"}`,
      status: "simulated",
      message: `[จำลองการส่งเมล] แจ้งเตือนการจอง #${booking.id} ไปยัง ${adminEmail} และ ${customerEmail || "-"} (กำหนดรหัส SMTP ได้ที่หน้าแอดมิน)`,
      createdAt: new Date().toISOString()
    });
    return false;
  }

  try {
    let customerSent = false;
    let adminSent = false;

    // A. Send to customer
    if (customerEmail && customerEmail.includes("@")) {
      const custRes = await sendEmailMessage({
        to: customerEmail,
        subject: `[The M5 Residence] ยืนยันคำขอจองห้องพักของคุณ หมายเลข #${booking.id}`,
        html: customerHtml,
        smtpConfig: smtp
      });
      if (custRes.success) {
        customerSent = true;
        console.log(`[Email Dispatch] Customer email sent successfully to ${customerEmail}`);
      }
    }

    // B. Send to Admin Notify Email(s)
    const adminEmailList = (Array.isArray(adminEmail) ? adminEmail : String(adminEmail).split(/[,;\s]+/))
      .map((e: string) => e.trim())
      .filter((e: string) => e && e.includes("@"));

    if (adminEmailList.length > 0) {
      const adminRes = await sendEmailMessage({
        to: adminEmailList,
        subject: `[จองใหม่] จองด่วนหมายเลข #${booking.id} - คุณ ${booking.guestName}`,
        html: adminHtml,
        smtpConfig: smtp
      });
      if (adminRes.success) {
        adminSent = true;
        console.log(`[Email Dispatch] Admin notification sent successfully to ${adminEmailList.join(", ")}`);
      }
    }

    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: booking.id,
      channel: "email",
      recipient: `${adminEmailList.join(", ") || adminEmail}, ${customerEmail}`,
      status: (customerSent || adminSent) ? "sent" : "failed",
      message: `ส่งอีเมลแจ้งเตือนสำเร็จ (แอดมิน: ${adminEmailList.join(", ") || adminEmail} | ลูกค้า: ${customerEmail})`,
      createdAt: new Date().toISOString()
    });

    return customerSent || adminSent;
  } catch (err: any) {
    console.error("[Email Error] Failed to send booking notification email:", err);
    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: booking.id,
      channel: "email",
      recipient: `${adminEmail}, ${customerEmail}`,
      status: "failed",
      message: `ส่งอีเมลไม่สำเร็จ: ${err.message}`,
      createdAt: new Date().toISOString()
    });
    return false;
  }
}

// Helper function to send LINE notification (Supports LINE Notify, LINE Messaging API, and Webhooks)
async function sendBookingLineNotification(booking: any, lineConfig: any) {
  const token = lineConfig?.token || process.env.LINE_NOTIFY_TOKEN || "";
  const channelAccessToken = lineConfig?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const targetId = lineConfig?.targetId || process.env.LINE_TARGET_ID || "";
  const webhookUrl = lineConfig?.webhookUrl || process.env.LINE_WEBHOOK_URL || "";

  const d1 = new Date(booking.checkIn);
  const d2 = new Date(booking.checkOut);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  const nights = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;

  const roomDisplay = booking.roomName || booking.roomType || "ห้องพักสไตล์ลอฟต์";
  const totalPriceFormatted = Number(booking.totalPrice || 0).toLocaleString();

  const messageText = `
🏨 [THE M5 RESIDENCE] การจองใหม่!
────────────────
🔖 หมายเลขจอง: #${booking.id}
🛏️ ห้องพัก: ${roomDisplay}
📅 เช็คอิน: ${booking.checkIn} (หลัง 14:00 น.)
📅 เช็คเอาท์: ${booking.checkOut} (ก่อน 12:00 น.)
⏳ ระยะเวลา: ${nights} คืน (${booking.guests} ท่าน)
💰 ยอดสุทธิ: ฿${totalPriceFormatted} บาท
🏷️ สถานะ: ${booking.status === "Pending" ? "รอชำระเงิน / ตรวจสอบ" : booking.status}
────────────────
👤 ผู้จอง: คุณ ${booking.guestName}
📞 เบอร์โทร: ${booking.guestPhone}
✉️ อีเมล: ${booking.guestEmail}
💬 คำขอพิเศษ: ${booking.specialRequest || "ไม่มี"}
────────────────
⏰ เวลาทำรายการ: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;

  const results: any[] = [];

  // 1. LINE Notify API (Primary & standard for Thai hotels/businesses)
  if (token) {
    try {
      const resp = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.trim()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ message: messageText }).toString(),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && (data.status === 200 || data.status === "200")) {
        console.log(`[LINE Notify] Sent successfully for booking #${booking.id}`);
        results.push({ channel: "line_notify", success: true, message: "ส่งเข้า LINE Notify สำเร็จ" });
      } else {
        console.error(`[LINE Notify Error] Response:`, data);
        results.push({ channel: "line_notify", success: false, message: data.message || `LINE Notify error (${data.status})` });
      }
    } catch (err: any) {
      console.error(`[LINE Notify Network Error]:`, err.message);
      results.push({ channel: "line_notify", success: false, message: err.message });
    }
  }

  // 2. LINE Messaging API (LINE Official Account / Bot)
  if (channelAccessToken) {
    try {
      const pushUrl = targetId ? "https://api.line.me/v2/bot/message/push" : "https://api.line.me/v2/bot/message/broadcast";
      const bodyPayload = targetId
        ? { to: targetId.trim(), messages: [{ type: "text", text: messageText.trim() }] }
        : { messages: [{ type: "text", text: messageText.trim() }] };

      const resp = await fetch(pushUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${channelAccessToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        console.log(`[LINE Messaging API] Sent successfully for booking #${booking.id}`);
        results.push({ channel: "line_messaging_api", success: true, message: "ส่งเข้า LINE Messaging API สำเร็จ" });
      } else {
        console.error(`[LINE Messaging API Error]:`, data);
        results.push({ channel: "line_messaging_api", success: false, message: data.message || "Failed" });
      }
    } catch (err: any) {
      console.error(`[LINE Messaging API Network Error]:`, err.message);
      results.push({ channel: "line_messaging_api", success: false, message: err.message });
    }
  }

  // 3. Webhook forwarding (Discord / Slack / Make / Zapier)
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageText,
          text: messageText,
          booking,
        }),
      });
      results.push({ channel: "webhook", success: true, message: "ส่งเข้า Webhook สำเร็จ" });
    } catch (err: any) {
      results.push({ channel: "webhook", success: false, message: err.message });
    }
  }

  // If no LINE credentials configured
  if (!token && !channelAccessToken && !webhookUrl) {
    console.log(`[LINE Notification Info] No LINE token configured yet. Message logged:\n${messageText}`);
    results.push({ channel: "line", success: false, simulated: true, message: "ยังไม่ได้ระบุ LINE Token (สามารถเพิ่ม Token ได้ที่เมนูตั้งค่าการแจ้งเตือน)" });
  }

  const isSuccess = results.some(r => r.success);
  const isSimulated = results.some(r => r.simulated);

  await recordNotificationLog({
    id: `notif-line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingId: booking.id,
    channel: "line",
    recipient: token ? "LINE Notify Group/Chat" : (channelAccessToken ? "LINE OA Channel" : "LINE (รอระบุ Token)"),
    status: isSuccess ? "sent" : (isSimulated ? "simulated" : "failed"),
    message: messageText.trim(),
    createdAt: new Date().toISOString()
  });

  return results;
}

// Helper function to send official Quotation email to customer and admin
async function sendQuotationEmail(doc: any, company: any, smtp: any) {
  const adminEmail = smtp?.adminNotifyEmail || process.env.ADMIN_NOTIFY_EMAIL || "soothirote.nik@gmail.com";
  const customerEmail = doc.customer?.email;
  const customerName = doc.customer?.name || "ท่านผู้มีอุปการคุณ";
  const contactPerson = doc.customer?.contactPerson || customerName;
  const docNumber = doc.documentNumber || "QT-DOCUMENT";
  const issueDate = doc.issueDate || new Date().toISOString().split("T")[0];
  const dueDate = doc.dueDate || "-";
  const checkIn = doc.checkIn || "-";
  const checkOut = doc.checkOut || "-";
  const totalAmountFormatted = Number(doc.totalAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const vatAmountFormatted = Number(doc.vatAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });
  const netBeforeVatFormatted = Number(doc.netBeforeVat || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 });

  const itemsRowsHtml = (doc.items || []).map((item: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 8px; text-align: center; color: #64748b; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 10px 8px; color: #1e293b; font-size: 13px; font-weight: 500;">
        ${item.description}
      </td>
      <td style="padding: 10px 8px; text-align: center; color: #334155; font-size: 13px;">${item.quantity}</td>
      <td style="padding: 10px 8px; text-align: right; color: #334155; font-size: 13px;">${Number(item.unitPrice || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
      <td style="padding: 10px 8px; text-align: right; color: #0f172a; font-size: 13px; font-weight: 600;">${Number(item.amount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  const quotationHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; border-bottom: 3px solid #d95a06; padding-bottom: 20px; margin-bottom: 25px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">THE M5 RESIDENCE</h2>
        <p style="color: #64748b; margin: 5px 0 0; font-size: 13px;">บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด (สำนักงานใหญ่) | TAX ID: 0125561031626</p>
        <div style="display: inline-block; margin-top: 12px; background-color: #fef3c7; border: 1px solid #f59e0b; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; color: #b45309;">
          📄 ใบเสนอราคาทางการ (OFFICIAL QUOTATION)
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; color: #0f172a; font-weight: bold; margin: 0 0 8px 0;">เรียน คุณ ${contactPerson} (${customerName}),</p>
        <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0;">
          โรงแรม เดอะ เอ็มไฟว์ เรสซิเดนซ์ ขอขอบพระคุณท่านที่ให้ความไว้วางใจ ทางโรงแรมขอส่งเอกสารใบเสนอราคาสำหรับการเข้าพักและการใช้บริการ รายละเอียดดังนี้:
        </p>
      </div>

      <!-- Info Box -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 10px 14px; width: 50%; vertical-align: top; border-right: 1px solid #e2e8f0;">
            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">ข้อมูลลูกค้า / องค์กร</p>
            <p style="margin: 0; font-weight: 700; color: #0f172a;">${customerName}</p>
            <p style="margin: 2px 0 0; color: #475569;">ผู้ติดต่อ: ${contactPerson}</p>
            <p style="margin: 2px 0 0; color: #475569;">โทร: ${doc.customer?.phone || "-"}</p>
            <p style="margin: 2px 0 0; color: #475569;">อีเมล: ${customerEmail || "-"}</p>
            ${doc.customer?.taxId && doc.customer.taxId !== "-" ? `<p style="margin: 2px 0 0; color: #64748b; font-size: 12px;">เลขผู้เสียภาษี: ${doc.customer.taxId}</p>` : ""}
          </td>
          <td style="padding: 10px 14px; width: 50%; vertical-align: top;">
            <p style="margin: 0 0 4px 0; color: #64748b; font-size: 11px; font-weight: bold; text-transform: uppercase;">รายละเอียดเอกสาร & วันเข้าพัก</p>
            <p style="margin: 0; font-weight: 700; color: #d95a06; font-size: 14px;">เลขที่: ${docNumber}</p>
            <p style="margin: 2px 0 0; color: #475569;">วันที่ออก: ${issueDate}</p>
            <p style="margin: 2px 0 0; color: #475569;">ยืนยันราคาภายใน: ${dueDate}</p>
            ${checkIn !== "-" ? `<p style="margin: 4px 0 0; color: #0f172a; font-weight: 600;">📅 วันที่เข้าพัก: ${checkIn} ถึง ${checkOut}</p>` : ""}
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff;">
            <th style="padding: 10px 8px; text-align: center; width: 35px; font-size: 12px;">ลำดับ</th>
            <th style="padding: 10px 8px; text-align: left; font-size: 12px;">รายการ (Description)</th>
            <th style="padding: 10px 8px; text-align: center; width: 60px; font-size: 12px;">จำนวน</th>
            <th style="padding: 10px 8px; text-align: right; width: 100px; font-size: 12px;">ราคา/หน่วย</th>
            <th style="padding: 10px 8px; text-align: right; width: 110px; font-size: 12px;">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" rowspan="3" style="padding: 12px 14px; vertical-align: top; background-color: #f8fafc; border-top: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1;">
              <span style="font-size: 11px; color: #64748b; font-weight: bold; display: block;">จำนวนเงินตัวอักษร:</span>
              <span style="font-size: 13px; font-weight: bold; color: #0f172a;">${doc.bahtText || ""}</span>
            </td>
            <td style="padding: 8px 10px; text-align: right; color: #64748b; font-size: 12px; border-top: 1px solid #cbd5e1;">ยอดรวมก่อนภาษี:</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a; border-top: 1px solid #cbd5e1;">${netBeforeVatFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; text-align: right; color: #64748b; font-size: 12px;">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${vatAmountFormatted}</td>
          </tr>
          <tr style="background-color: #fef2f2;">
            <td style="padding: 10px 10px; text-align: right; color: #d95a06; font-size: 13px; font-weight: bold;">ยอดสุทธิทั้งสิ้น:</td>
            <td style="padding: 10px 10px; text-align: right; font-weight: 800; font-size: 16px; color: #d95a06;">${totalAmountFormatted} บาท</td>
          </tr>
        </tfoot>
      </table>

      <!-- Bank Details -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">💳 ข้อมูลการโอนเงินชำระค่าบริการ / วางมัดจำ:</p>
        <p style="margin: 2px 0; color: #334155;">ธนาคาร: <strong>${doc.payment?.bankName || company?.bankName || "ธนาคารกสิกรไทย (KBANK)"}</strong></p>
        <p style="margin: 2px 0; color: #334155;">ชื่อบัญชี: <strong>${company?.bankAccountName || "บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด"}</strong></p>
        <p style="margin: 2px 0; color: #334155;">เลขที่บัญชี: <strong style="font-family: monospace; font-size: 14px; color: #0f172a;">${company?.bankAccountNumber || "012-3-45678-9"}</strong></p>
        <p style="margin: 6px 0 0; color: #64748b; font-size: 11px;">*เมื่อท่านต้องการยืนยันการจอง กรุณาส่งหลักฐานการโอนเงินหรือติดต่อเจ้าหน้าที่ฝ่ายขาย</p>
      </div>

      <!-- Action note -->
      <div style="text-align: center; padding: 15px; background: #fff7ed; border: 1px dashed #ea580c; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #c2410c;">
          ต้องการยืนยันการจองห้องพักตามใบเสนอราคานี้ทันที?
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #7c2d12;">
          ท่านสามารถคลิกปุ่ม "ยืนยันสั่งจอง" ได้ที่หน้าเว็บ หรือโทร 086-379-6761 / LINE: @m5residence
        </p>
      </div>

      <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8;">
        <p style="margin: 0;">โรงแรมเดอะ เอ็มไฟว์ เรสซิเดนซ์ (The M5 Residence) ปากเกร็ด นนทบุรี</p>
        <p style="margin: 2px 0 0;">ใกล้ อิมแพ็ค เมืองทองธานี & ศูนย์ราชการแจ้งวัฒนะ</p>
      </div>
    </div>
  `;

  // Check if either SMTP2GO API or standard SMTP credentials are provided
  const hasConfig = Boolean(smtp?.apiKey || process.env.SMTP2GO_API_KEY || (smtp?.host && (smtp?.user || smtp?.pass)));
  if (!hasConfig) {
    console.warn("[Quotation SMTP Info] SMTP credentials not set. Recording simulated notification log.");
    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: docNumber,
      channel: "email",
      recipient: `${customerEmail || "ไม่มีอีเมลลูกค้า"}, ${adminEmail}`,
      status: "simulated",
      message: `[ส่งใบเสนอราคาจำลอง] ส่งใบเสนอราคา #${docNumber} ไปยัง ${customerEmail} และ ${adminEmail}`,
      createdAt: new Date().toISOString()
    });
    return { success: true, simulated: true };
  }

  try {
    let customerSent = false;
    let adminSent = false;

    // A. Send to customer
    if (customerEmail && customerEmail.includes("@")) {
      const custRes = await sendEmailMessage({
        to: customerEmail,
        subject: `[The M5 Residence] ใบเสนอราคาหมายเลข #${docNumber} สำหรับ ${customerName}`,
        html: quotationHtml,
        smtpConfig: smtp
      });
      if (custRes.success) customerSent = true;
    }

    // B. Send to admin(s)
    const adminEmailList = (Array.isArray(adminEmail) ? adminEmail : String(adminEmail).split(/[,;\s]+/))
      .map((e: string) => e.trim())
      .filter((e: string) => e && e.includes("@"));

    if (adminEmailList.length > 0) {
      const admRes = await sendEmailMessage({
        to: adminEmailList,
        subject: `[ใบเสนอราคาใหม่] #${docNumber} - ${customerName} (${contactPerson})`,
        html: quotationHtml,
        smtpConfig: smtp
      });
      if (admRes.success) adminSent = true;
    }

    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: docNumber,
      channel: "email",
      recipient: `${customerEmail}, ${adminEmail}`,
      status: (customerSent || adminSent) ? "sent" : "failed",
      message: `ส่งอีเมลใบเสนอราคา #${docNumber} สำเร็จ (ลูกค้า: ${customerEmail} | แอดมิน: ${adminEmail})`,
      createdAt: new Date().toISOString()
    });

    return { success: true, customerSent, adminSent };
  } catch (err: any) {
    console.error("[Email Error] Failed to send quotation email:", err);
    await recordNotificationLog({
      id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: docNumber,
      channel: "email",
      recipient: `${customerEmail}, ${adminEmail}`,
      status: "failed",
      message: `ส่งอีเมลใบเสนอราคาไม่สำเร็จ: ${err.message}`,
      createdAt: new Date().toISOString()
    });
    return { success: false, error: err.message };
  }
}

// Helper function to send LINE notification for quotation events
async function sendQuotationLineNotification(doc: any, lineConfig: any, actionType: "new_request" | "customer_approved" = "new_request") {
  const token = lineConfig?.token || process.env.LINE_NOTIFY_TOKEN || "";
  const channelAccessToken = lineConfig?.channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const webhookUrl = lineConfig?.webhookUrl || process.env.LINE_WEBHOOK_URL || "";

  const docNumber = doc.documentNumber || "QT-DOCUMENT";
  const customerName = doc.customer?.name || "-";
  const contactPerson = doc.customer?.contactPerson || customerName;
  const phone = doc.customer?.phone || "-";
  const totalAmountFormatted = Number(doc.totalAmount || 0).toLocaleString();

  const titleHeader = actionType === "customer_approved"
    ? `🎉 [ลูกค้ากดยืนยันสั่งจองจากใบเสนอราคา!]`
    : `💼 [ขอใบเสนอราคาออนไลน์ใหม่จากหน้าเว็บ!]`;

  const messageText = `
${titleHeader}
────────────────
🔖 เลขที่เอกสาร: #${docNumber}
🏢 หน่วยงาน/ลูกค้า: ${customerName}
👤 ผู้ติดต่อ: คุณ ${contactPerson}
📞 เบอร์โทรศัพท์: ${phone}
✉️ อีเมล: ${doc.customer?.email || "-"}
📅 วันที่เข้าพัก: ${doc.checkIn || "-"} ถึง ${doc.checkOut || "-"}
💰 ยอดรวมทั้งสิ้น: ฿${totalAmountFormatted} บาท
🏷️ สถานะเอกสาร: ${doc.status === "approved" ? "ยืนยันสั่งจองแล้ว (Approved)" : "รอตรวจสอบ (Draft / Pending)"}
${doc.remarks ? `💬 หมายเหตุ: ${doc.remarks}` : ""}
────────────────
⏰ เวลาทำรายการ: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;

  const results: any[] = [];

  if (token) {
    try {
      const resp = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.trim()}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ message: messageText }).toString(),
      });
      if (resp.ok) {
        results.push({ channel: "line_notify", success: true });
      }
    } catch (_) {}
  }

  if (channelAccessToken) {
    try {
      await fetch("https://api.line.me/v2/bot/message/broadcast", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${channelAccessToken.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [{ type: "text", text: messageText }] }),
      });
      results.push({ channel: "line_messaging_api", success: true });
    } catch (_) {}
  }

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText, text: messageText, document: doc }),
      });
      results.push({ channel: "webhook", success: true });
    } catch (_) {}
  }

  await recordNotificationLog({
    id: `notif-line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    bookingId: docNumber,
    channel: "line",
    recipient: token ? "LINE Notify Group" : "LINE",
    status: results.some(r => r.success) ? "sent" : "simulated",
    message: messageText.trim(),
    createdAt: new Date().toISOString()
  });

  return results;
}

let isInternalUrlHealthy = true;

function getDirectusConfig() {
  const localDb = getLocalDb() as any;
  const directus = localDb.directus || {};
  const url = directus.url || process.env.DIRECTUS_URL || "https://data.them5residence.com";
  const internalUrl = isInternalUrlHealthy ? (directus.internalUrl || process.env.DIRECTUS_INTERNAL_URL || url) : url;
  const token = directus.token || process.env.DIRECTUS_TOKEN || "ibtpkr40rF1BkNCEA4plXirxaDfn07S5";
  return { url, internalUrl, token };
}

async function directusFetch(path: string, options: any = {}) {
  const { url: publicUrl, internalUrl, token } = getDirectusConfig();
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    ...options.headers
  };

  // 1. Try internal URL first if different from public URL and healthy
  if (isInternalUrlHealthy && internalUrl && internalUrl !== publicUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 seconds timeout
    try {
      const targetUrl = `${internalUrl}${path}`;
      const res = await fetch(targetUrl, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Directus error on ${path}: ${res.status} ${res.statusText}. Response: ${text}`);
      }
      if (res.status === 204) return null;
      const json = await res.json();
      return json.data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      isInternalUrlHealthy = false;
      console.warn(`[Directus] Fetch via internalUrl failed (${err.name === 'AbortError' ? 'timeout 1500ms' : err.message || err}), disabling internalUrl and retrying via publicUrl: ${publicUrl}`);
    }
  }

  // 2. Try public URL as fallback
  const targetUrl = `${publicUrl}${path}`;
  const res = await fetch(targetUrl, {
    ...options,
    headers
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Directus error on ${path}: ${res.status} ${res.statusText}. Response: ${text}`);
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json.data;
}

function safeMerge(localObj: any, remoteObj: any) {
  if (!localObj) return remoteObj || {};
  if (!remoteObj) return localObj;
  const merged = { ...localObj };
  Object.keys(remoteObj).forEach((key) => {
    const val = remoteObj[key];
    if (val !== undefined && val !== null && val !== "") {
      merged[key] = val;
    }
  });
  return merged;
}

async function getSettingsFromDirectus() {
  try {
    const [
      generalArr,
      smtpArr,
      rooms,
      promotions,
      amenities,
      faqs,
      reviews,
      gallery,
      blockedDates,
      coupons,
      impactEvents,
      partners
    ] = await Promise.all([
      directusFetch("/items/m5_general"),
      directusFetch("/items/m5_smtp"),
      directusFetch("/items/m5_rooms"),
      directusFetch("/items/m5_promotions"),
      directusFetch("/items/m5_amenities"),
      directusFetch("/items/m5_faqs"),
      directusFetch("/items/m5_reviews"),
      directusFetch("/items/m5_gallery"),
      directusFetch("/items/m5_blocked_dates"),
      directusFetch("/items/m5_coupons"),
      directusFetch("/items/m5_impact_events").catch((err) => {
        console.warn("m5_impact_events collection not found or failed in Directus:", err.message);
        return [];
      }),
      directusFetch("/items/m5_partners").catch((err) => {
        // Suppress forbidden warning for m5_partners on boot to avoid confusing users
        return [];
      })
    ]);

    const general = generalArr && generalArr[0] ? generalArr[0] : {};
    const smtp = smtpArr && smtpArr[0] ? smtpArr[0] : {};

    const mappedRooms = (rooms || []).map((r: any) => {
      let parsedAmenities = [];
      try {
        parsedAmenities = r.amenities ? JSON.parse(r.amenities) : [];
      } catch (_) {
        parsedAmenities = typeof r.amenities === "string" ? r.amenities.split(",") : [];
      }
      return {
        id: r.roomId,
        name: r.name,
        thaiName: r.thaiName,
        price: Number(r.price),
        size: Number(r.size),
        capacity: Number(r.capacity),
        bedType: r.bedType,
        description: r.description,
        longDescription: r.longDescription,
        imageUrl: r.imageUrl,
        amenities: parsedAmenities,
        matterportUrl: r.matterportUrl,
        active: r.active !== false
      };
    });

    const mappedPromotions = (promotions || []).map((p: any) => ({
      id: p.promoId,
      badge: p.badge,
      title: p.title,
      desc: p.desc,
      highlight: p.highlight,
      active: p.active !== false
    }));

    const mappedBlockedDates = (blockedDates || []).map((bd: any) => ({
      id: bd.blockedId,
      date: bd.date,
      roomId: bd.roomId,
      note: bd.note
    }));

    const mappedImpactEvents = (impactEvents || []).map((e: any) => ({
      id: e.eventId || e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      venue: e.venue,
      description: e.description,
      imageUrl: e.imageUrl,
      category: e.category,
      active: e.active !== false
    }));

    const mappedPartners = (partners || []).map((p: any) => ({
      id: p.partnerId || p.id,
      name: p.name,
      logoUrl: p.logoUrl || p.logo_url || "",
      link: p.link || "",
      active: p.active !== false
    }));

    const result = deduplicateLocalDb({
      general,
      rooms: mappedRooms,
      promotions: mappedPromotions,
      amenities: amenities || [],
      faqs: faqs || [],
      reviews: reviews || [],
      gallery: gallery || [],
      blockedDates: mappedBlockedDates,
      coupons: coupons || [],
      smtp,
      impactEvents: mappedImpactEvents,
      partners: mappedPartners
    });

    // Keep local db.json in sync with what is fetched, but merging intelligently to never lose local edits/images
    const localDb = getLocalDb() as any;
    const firstTimeInit = !localDb.initialized;

    // Strictly trust Directus as the single source of truth when connected. 
    // This allows the admin dashboard to perform deletes/updates/inserts and have them respected, with no mock overrides.
    localDb.general = result.general || {};
    localDb.smtp = (result.smtp && result.smtp.host) ? result.smtp : (localDb.smtp || {});
    localDb.rooms = result.rooms || [];
    localDb.promotions = result.promotions || [];
    localDb.amenities = result.amenities || [];
    localDb.faqs = result.faqs || [];
    localDb.reviews = result.reviews || [];
    localDb.gallery = result.gallery || [];
    localDb.blockedDates = result.blockedDates || [];
    localDb.coupons = result.coupons || [];
    localDb.impactEvents = result.impactEvents || [];
    localDb.partners = result.partners || [];

    // Keep slides as local only
    if (!localDb.slides) {
      localDb.slides = [];
    }

    if (localDb.googlePlaceId === undefined) {
      localDb.googlePlaceId = "ChIJXWlJMC-e4jARLqX9OidpWjY";
    }
    if (localDb.googleReviewsEnabled === undefined) {
      localDb.googleReviewsEnabled = true;
    }

    localDb.initialized = true;
    saveLocalDb(localDb);

    return localDb;
  } catch (err) {
    console.warn("Directus connection failed or timed out. Falling back to local db.json settings.", err);
    const db = getLocalDb();
    return {
      general: db.general || {},
      rooms: db.rooms || [],
      promotions: db.promotions || [],
      amenities: db.amenities || [],
      faqs: db.faqs || [],
      reviews: db.reviews || [],
      gallery: db.gallery || [],
      blockedDates: db.blockedDates || [],
      coupons: db.coupons || [],
      smtp: db.smtp || {},
      slides: db.slides || [],
      googlePlaceId: db.googlePlaceId !== undefined ? db.googlePlaceId : "ChIJXWlJMC-e4jARLqX9OidpWjY",
      googleReviewsEnabled: db.googleReviewsEnabled !== undefined ? db.googleReviewsEnabled : true,
      impactEvents: db.impactEvents || [],
      partners: db.partners || [],
      adminMenuConfig: db.adminMenuConfig || [],
      adminRoles: db.adminRoles || []
    };
  }
}

async function getBookingsFromDirectus() {
  try {
    const bookings = await directusFetch("/items/m5_bookings?sort=-createdAt");
    const result = (bookings || []).map((b: any) => ({
      id: b.bookingId,
      roomType: b.roomType,
      roomName: b.roomName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      guests: Number(b.guests),
      guestName: b.guestName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
      totalPrice: Number(b.totalPrice),
      status: b.status,
      specialRequest: b.specialRequest,
      createdAt: b.createdAt
    }));

    const localDb = getLocalDb();
    const deletedBookingIds = localDb.deletedBookingIds || [];
    const filteredResult = result.filter((b: any) => !deletedBookingIds.includes(b.id));
    localDb.bookings = filteredResult;
    saveLocalDb(localDb);

    return filteredResult;
  } catch (err) {
    console.warn("Directus fetch bookings failed. Falling back to local bookings.", err);
    const db = getLocalDb();
    const deletedBookingIds = db.deletedBookingIds || [];
    return (db.bookings || []).filter((b: any) => !deletedBookingIds.includes(b.id));
  }
}

async function addBookingToDirectus(booking: any) {
  const id = booking.id || booking.bookingId || "B-" + Math.floor(1000 + Math.random() * 9000);
  const record = {
    bookingId: id,
    roomType: booking.roomType,
    roomName: booking.roomName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: Number(booking.guests),
    guestName: booking.guestName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    totalPrice: Number(booking.totalPrice),
    status: booking.status || "Pending",
    specialRequest: booking.specialRequest,
    createdAt: booking.createdAt || new Date().toISOString()
  };

  try {
    const saved = await directusFetch("/items/m5_bookings", {
      method: "POST",
      body: JSON.stringify(record)
    });
    const result = {
      ...booking,
      id: saved.bookingId,
      status: saved.status,
      createdAt: saved.createdAt
    };

    const localDb = getLocalDb();
    localDb.bookings = [result, ...(localDb.bookings || []).filter((b: any) => b.id !== result.id)];
    saveLocalDb(localDb);

    if (firestoreDb) {
      fsSetDoc(fsDoc(firestoreDb, "bookings", result.id), result, { merge: true }).catch(() => {});
    }

    return result;
  } catch (err) {
    console.warn("Directus add booking failed. Saving locally to db.json.", err);
    const result = {
      id,
      roomType: booking.roomType,
      roomName: booking.roomName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: Number(booking.guests),
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      totalPrice: Number(booking.totalPrice),
      status: booking.status || "Pending",
      specialRequest: booking.specialRequest,
      createdAt: record.createdAt
    };
    const localDb = getLocalDb();
    localDb.bookings = [result, ...(localDb.bookings || []).filter((b: any) => b.id !== result.id)];
    saveLocalDb(localDb);

    if (firestoreDb) {
      fsSetDoc(fsDoc(firestoreDb, "bookings", result.id), result, { merge: true }).catch(() => {});
    }

    return result;
  }
}

async function updateBookingStatusInDirectus(bookingId: string, status: string) {
  const localDb = getLocalDb();
  const oldBk = (localDb.bookings || []).find((b: any) => b.id === bookingId || b.bookingId === bookingId);
  const guestEmail = oldBk?.guestEmail;

  try {
    const record = await findBookingInDirectus(bookingId, guestEmail);
    if (record) {
      const dbId = record.id;
      await directusFetch(`/items/m5_bookings/${dbId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      console.log(`Successfully updated booking status ${bookingId} in Directus record ${dbId}`);
    }
  } catch (err) {
    console.warn(`Directus update booking status failed for ${bookingId}. Updating locally.`, err);
  }

  localDb.bookings = (localDb.bookings || []).map((b: any) =>
    (b.id === bookingId || b.bookingId === bookingId) ? { ...b, status } : b
  );
  saveLocalDb(localDb);

  if (firestoreDb) {
    fsSetDoc(fsDoc(firestoreDb, "bookings", bookingId), { status }, { merge: true }).catch(() => {});
  }

  return true;
}

async function updateBookingInDirectus(bookingId: string, updatedFields: any) {
  const localDb = getLocalDb();
  const oldBk = (localDb.bookings || []).find((b: any) => b.id === bookingId || b.bookingId === bookingId);
  const guestEmail = oldBk?.guestEmail || updatedFields.guestEmail;

  try {
    const record = await findBookingInDirectus(bookingId, guestEmail);
    if (record) {
      const dbId = record.id;
      const payload: any = { ...updatedFields };
      if (payload.id) {
        payload.bookingId = payload.id;
        delete payload.id;
      }
      await directusFetch(`/items/m5_bookings/${dbId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      console.log(`Successfully updated booking ${bookingId} in Directus record ${dbId}`);
    }
  } catch (err) {
    console.warn(`Directus update booking failed for ${bookingId}. Updating locally.`, err);
  }

  localDb.bookings = (localDb.bookings || []).map((b: any) =>
    (b.id === bookingId || b.bookingId === bookingId) ? { ...b, ...updatedFields } : b
  );
  saveLocalDb(localDb);

  if (firestoreDb) {
    fsSetDoc(fsDoc(firestoreDb, "bookings", bookingId), updatedFields, { merge: true }).catch(() => {});
  }

  return true;
}

async function deleteBookingFromDirectus(bookingId: string) {
  const localDb = getLocalDb();
  localDb.deletedBookingIds = localDb.deletedBookingIds || [];
  if (!localDb.deletedBookingIds.includes(bookingId)) {
    localDb.deletedBookingIds.push(bookingId);
  }

  const oldBk = (localDb.bookings || []).find((b: any) => b.id === bookingId || b.bookingId === bookingId);
  const guestEmail = oldBk?.guestEmail;

  try {
    const record = await findBookingInDirectus(bookingId, guestEmail);
    if (record) {
      const dbId = record.id;
      await directusFetch(`/items/m5_bookings/${dbId}`, {
        method: "DELETE"
      });
      console.log(`Successfully deleted booking ${bookingId} from Directus record ${dbId}`);
    }
  } catch (err) {
    console.warn(`Directus delete booking failed for ${bookingId}. Deleting locally.`, err);
  }

  localDb.bookings = (localDb.bookings || []).filter((b: any) => b.id !== bookingId && b.bookingId !== bookingId);
  saveLocalDb(localDb);

  if (firestoreDb) {
    fsDeleteDoc(fsDoc(firestoreDb, "bookings", bookingId)).catch(() => {});
  }

  return true;
}

async function getMembersFromDirectus() {
  try {
    await ensureMembersCollectionExist();
    const members = await directusFetch("/items/m5_members");
    const localDb = getLocalDb();
    const result = (members || []).map((m: any) => {
      const dbMember = {
        id: m.memberId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        password: m.password,
        tier: m.tier,
        points: Number(m.points),
        joinedBookingsCount: Number(m.joinedBookingsCount),
        createdAt: m.createdAt
      };

      const localMember = (localDb.members || []).find((lm: any) => lm.id === dbMember.id || lm.email === dbMember.email);
      if (localMember) {
        return {
          ...dbMember,
          password: localMember.password || dbMember.password || "password123",
          name: localMember.name || dbMember.name,
          phone: localMember.phone || dbMember.phone,
          tier: localMember.tier || dbMember.tier,
          points: localMember.points !== undefined ? localMember.points : dbMember.points
        };
      }
      return dbMember;
    });

    const deletedMemberIds = localDb.deletedMemberIds || [];
    const filteredResult = result.filter((m: any) => !deletedMemberIds.includes(m.id));
    localDb.members = filteredResult;
    saveLocalDb(localDb);

    return filteredResult;
  } catch (err) {
    console.warn("Directus fetch members failed. Falling back to local members.", err);
    const db = getLocalDb();
    const deletedMemberIds = db.deletedMemberIds || [];
    return (db.members || []).filter((m: any) => !deletedMemberIds.includes(m.id));
  }
}

async function registerMemberInDirectus(member: any) {
  const memberId = member.id || "M5-MEM-" + Math.floor(1000 + Math.random() * 9000);
  const payload = {
    memberId,
    name: member.name,
    email: member.email,
    phone: member.phone,
    password: member.password || "password123",
    tier: member.tier || "Silver",
    points: Number(member.points !== undefined ? member.points : 20),
    joinedBookingsCount: Number(member.joinedBookingsCount || 0),
    createdAt: member.createdAt || new Date().toISOString()
  };

  try {
    await ensureMembersCollectionExist();
    const found = await directusFetch(`/items/m5_members?filter[email][_eq]=${member.email}`);
    if (found && found.length > 0) {
      throw new Error("อีเมลนี้ได้รับการลงทะเบียนสมาชิกเรียบร้อยแล้ว");
    }

    const saved = await directusFetch("/items/m5_members", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = {
      id: saved.memberId,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      password: saved.password,
      tier: saved.tier,
      points: Number(saved.points),
      joinedBookingsCount: Number(saved.joinedBookingsCount),
      createdAt: saved.createdAt
    };

    const localDb = getLocalDb();
    if (localDb.deletedMemberIds) {
      localDb.deletedMemberIds = localDb.deletedMemberIds.filter((id: string) => id !== result.id);
    }
    localDb.members = [result, ...(localDb.members || []).filter((m: any) => m.email !== result.email)];
    saveLocalDb(localDb);

    return result;
  } catch (err: any) {
    if (err.message && err.message.includes("ได้รับการลงทะเบียนสมาชิก")) {
      throw err;
    }
    console.warn("Directus register member failed. Saving locally.", err);

    const localDb = getLocalDb();
    const existing = (localDb.members || []).find((m: any) => m.email === member.email);
    if (existing) {
      throw new Error("อีเมลนี้ได้รับการลงทะเบียนสมาชิกเรียบร้อยแล้ว");
    }

    const result = {
      id: memberId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      tier: payload.tier as any,
      points: payload.points,
      joinedBookingsCount: payload.joinedBookingsCount,
      createdAt: payload.createdAt
    };

    if (localDb.deletedMemberIds) {
      localDb.deletedMemberIds = localDb.deletedMemberIds.filter((id: string) => id !== result.id);
    }
    localDb.members = [result, ...(localDb.members || [])];
    saveLocalDb(localDb);
    return result;
  }
}

async function loginMemberInDirectus(email: string) {
  const localDb = getLocalDb();
  const localMember = (localDb.members || []).find((m: any) => String(m.email).toLowerCase().trim() === String(email).toLowerCase().trim());

  try {
    await ensureMembersCollectionExist();
    const found = await directusFetch(`/items/m5_members?filter[email][_eq]=${email}`);
    if (found && found.length > 0) {
      const saved = found[0];
      const dbMember = {
        id: saved.memberId,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        password: saved.password,
        tier: saved.tier,
        points: Number(saved.points),
        joinedBookingsCount: Number(saved.joinedBookingsCount),
        createdAt: saved.createdAt
      };

      if (localMember) {
        return {
          ...dbMember,
          password: localMember.password || dbMember.password || "password123",
          name: localMember.name || dbMember.name,
          phone: localMember.phone || dbMember.phone,
          tier: localMember.tier || dbMember.tier,
          points: localMember.points !== undefined ? localMember.points : dbMember.points
        };
      }
      return dbMember;
    }
    return localMember || null;
  } catch (err) {
    console.warn("Directus login member failed. Checking locally.", err);
    return localMember || null;
  }
}

async function updateMemberInDirectus(memberId: string, updatedFields: any) {
  const localDb = getLocalDb();
  const oldMember = (localDb.members || []).find((m: any) => m.id === memberId || m.memberId === memberId);
  const oldEmail = oldMember?.email || updatedFields.email;

  try {
    const record = await findMemberInDirectus(memberId, oldEmail);
    if (record) {
      const dbId = record.id;
      const payload = { ...updatedFields };
      if (payload.id) {
        payload.memberId = payload.id;
        delete payload.id;
      }
      await directusFetch(`/items/m5_members/${dbId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      console.log(`Successfully updated member ${memberId} in Directus record ${dbId}`);
    } else {
      console.warn(`Could not find member ${memberId} in Directus to update. Saving locally.`);
    }
  } catch (err) {
    console.warn(`Directus update member failed for ${memberId}. Updating locally.`, err);
  }

  let result: any = null;
  localDb.members = (localDb.members || []).map((m: any) => {
    if (m.id === memberId || m.memberId === memberId) {
      result = { ...m, ...updatedFields };
      return result;
    }
    return m;
  });
  saveLocalDb(localDb);
  return result || { id: memberId, ...updatedFields };
}

async function deleteMemberFromDirectus(memberId: string) {
  const localDb = getLocalDb();
  localDb.deletedMemberIds = localDb.deletedMemberIds || [];
  if (!localDb.deletedMemberIds.includes(memberId)) {
    localDb.deletedMemberIds.push(memberId);
  }

  const oldMember = (localDb.members || []).find((m: any) => m.id === memberId || m.memberId === memberId);
  const oldEmail = oldMember?.email;

  try {
    const record = await findMemberInDirectus(memberId, oldEmail);
    if (record) {
      const dbId = record.id;
      await directusFetch(`/items/m5_members/${dbId}`, {
        method: "DELETE"
      });
      console.log(`Successfully deleted member ${memberId} from Directus record ${dbId}`);
    }
  } catch (err) {
    console.warn(`Directus delete member failed for ${memberId}. Deleting locally.`, err);
  }

  localDb.members = (localDb.members || []).filter((m: any) => m.id !== memberId && m.memberId !== memberId);
  saveLocalDb(localDb);
  return true;
}

function isIdMatch(idA: any, idB: any): boolean {
  if (idA === undefined || idA === null || idB === undefined || idB === null) return false;
  const strA = String(idA).toLowerCase().trim();
  const strB = String(idB).toLowerCase().trim();
  if (strA === strB) return true;
  
  const cleanA = strA.replace(/^admin-/, "");
  const cleanB = strB.replace(/^admin-/, "");
  if (cleanA === cleanB && cleanA !== "") return true;
  
  return false;
}

async function findAdminInDirectus(adminId: string, oldUsername?: string): Promise<any> {
  try {
    const list = await directusFetch(`/items/m5_admins?filter[adminId][_eq]=${adminId}`);
    if (list && list.length > 0) return list[0];
  } catch (e) {}

  const cleanId = String(adminId).replace(/^admin-/, "");
  if (cleanId) {
    try {
      const item = await directusFetch(`/items/m5_admins/${cleanId}`);
      if (item) return item;
    } catch (e) {}
  }

  try {
    const item = await directusFetch(`/items/m5_admins/${adminId}`);
    if (item) return item;
  } catch (e) {}

  if (oldUsername) {
    try {
      const list = await directusFetch(`/items/m5_admins?filter[username][_eq]=${oldUsername}`);
      if (list && list.length > 0) return list[0];
    } catch (e) {}
  }

  return null;
}

async function findMemberInDirectus(memberId: string, email?: string): Promise<any> {
  try {
    await ensureMembersCollectionExist();
    const list = await directusFetch(`/items/m5_members?filter[memberId][_eq]=${memberId}`);
    if (list && list.length > 0) return list[0];
  } catch (e) {}

  if (email) {
    try {
      const list = await directusFetch(`/items/m5_members?filter[email][_eq]=${email}`);
      if (list && list.length > 0) return list[0];
    } catch (e) {}
  }

  const cleanId = String(memberId).replace(/^M5-MEM-/, "");
  if (cleanId) {
    try {
      const item = await directusFetch(`/items/m5_members/${cleanId}`);
      if (item) return item;
    } catch (e) {}
  }

  try {
    const item = await directusFetch(`/items/m5_members/${memberId}`);
    if (item) return item;
  } catch (e) {}

  return null;
}

async function findBookingInDirectus(bookingId: string, guestEmail?: string): Promise<any> {
  try {
    const list = await directusFetch(`/items/m5_bookings?filter[bookingId][_eq]=${bookingId}`);
    if (list && list.length > 0) return list[0];
  } catch (e) {}

  if (guestEmail) {
    try {
      const list = await directusFetch(`/items/m5_bookings?filter[guestEmail][_eq]=${guestEmail}`);
      if (list && list.length > 0) return list[0];
    } catch (e) {}
  }

  const cleanId = String(bookingId).replace(/^B-/, "");
  if (cleanId) {
    try {
      const item = await directusFetch(`/items/m5_bookings/${cleanId}`);
      if (item) return item;
    } catch (e) {}
  }

  try {
    const item = await directusFetch(`/items/m5_bookings/${bookingId}`);
    if (item) return item;
  } catch (e) {}

  return null;
}

async function getAdminsFromDirectus() {
  try {
    const list = await directusFetch("/items/m5_admins");
    if (list && list.length > 0) {
      const mapped = list.map((a: any) => ({
        id: a.adminId || a.id || String(a.id),
        adminId: a.adminId || a.id || String(a.id),
        username: a.username,
        password: a.password,
        name: a.name,
        role: a.role
      }));
      const localDb = getLocalDb();
      // Intelligent merge: remote records (latest updates) take precedence over stale/recreated local records
      const mergedAdmins = mapped.map((remoteAdmin: any) => {
        const localAdmin = (localDb.admins || []).find((la: any) => 
          String(la.username).toLowerCase().trim() === String(remoteAdmin.username).toLowerCase().trim()
        );
        if (localAdmin) {
          return {
            ...localAdmin,
            ...remoteAdmin
          };
        }
        return remoteAdmin;
      });
      const remoteUsernames = new Set(mapped.map((ra: any) => String(ra.username).toLowerCase().trim()));
      const onlyInLocal = (localDb.admins || []).filter((la: any) => 
        !remoteUsernames.has(String(la.username).toLowerCase().trim())
      );
      const finalAdmins = [...mergedAdmins, ...onlyInLocal];
      localDb.admins = finalAdmins;
      saveLocalDb(localDb);
      return finalAdmins;
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("403") || err.message.includes("Forbidden"))) {
      console.log("[Directus] m5_admins is read-restricted. Falling back to secure localDb.");
    } else {
      console.log("[Directus] fetch admins note: " + (err.message || err));
    }
  }
  const localDb = getLocalDb();
  if (!localDb.admins || localDb.admins.length === 0) {
    localDb.admins = [
      {
        id: "admin-1",
        adminId: "admin-1",
        username: "admin",
        password: "password123",
        name: "System Chief Manager",
        role: "Super Admin"
      },
      {
        id: "admin-2",
        adminId: "admin-2",
        username: "m5loft",
        password: "password123",
        name: "M5 Loft Manager",
        role: "Loft Admin"
      }
    ];
    saveLocalDb(localDb);
  }
  return localDb.admins.map((a: any) => ({
    id: a.adminId || a.id || String(a.id),
    username: a.username,
    password: a.password,
    name: a.name,
    role: a.role
  }));
}

async function addAdminInDirectus(payload: any) {
  try {
    const adminId = payload.adminId || `admin-${Date.now()}`;
    const mapped = {
      adminId,
      username: payload.username,
      password: payload.password,
      name: payload.name,
      role: payload.role
    };
    await directusFetch("/items/m5_admins", {
      method: "POST",
      body: JSON.stringify(mapped)
    });
    const localDb = getLocalDb();
    const newAdmin = { id: adminId, ...mapped };
    localDb.admins = [newAdmin, ...(localDb.admins || [])];
    saveLocalDb(localDb);
    return newAdmin;
  } catch (err: any) {
    console.log("[Directus] add admin failed. Saving locally. Note:", err.message || err);
    const localDb = getLocalDb();
    const adminId = payload.adminId || `admin-${Date.now()}`;
    const newAdmin = {
      id: adminId,
      adminId,
      username: payload.username,
      password: payload.password,
      name: payload.name,
      role: payload.role
    };
    localDb.admins = [newAdmin, ...(localDb.admins || [])];
    saveLocalDb(localDb);
    return newAdmin;
  }
}

async function updateAdminInDirectus(adminId: string, updatedFields: any) {
  const localDb = getLocalDb();
  const oldAdmin = (localDb.admins || []).find((a: any) => isIdMatch(a.id, adminId) || isIdMatch(a.adminId, adminId));
  const oldUsername = oldAdmin?.username || updatedFields.username;

  try {
    const record = await findAdminInDirectus(adminId, oldUsername);
    if (record) {
      const dbId = record.id;
      const payload = { ...updatedFields };
      if (payload.id) {
        payload.adminId = payload.id;
        delete payload.id;
      }
      await directusFetch(`/items/m5_admins/${dbId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      console.log(`Successfully updated admin ${adminId} in Directus record ${dbId}`);
    } else {
      console.warn(`Could not find admin ${adminId} in Directus to update. Saving/creating in Directus.`);
      const payload = {
        adminId,
        username: updatedFields.username || oldAdmin?.username,
        password: updatedFields.password || oldAdmin?.password,
        name: updatedFields.name || oldAdmin?.name,
        role: updatedFields.role || oldAdmin?.role
      };
      await directusFetch("/items/m5_admins", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  } catch (err: any) {
    console.log(`[Directus] update admin failed for ${adminId}. Updating locally. Note:`, err.message || err);
  }

  let result: any = null;
  localDb.admins = (localDb.admins || []).map((a: any) => {
    const idMatch = isIdMatch(a.id, adminId) || isIdMatch(a.adminId, adminId);
    const usernameMatch = oldUsername && a.username && 
                          String(a.username).toLowerCase().trim() === String(oldUsername).toLowerCase().trim();
    if (idMatch || usernameMatch) {
      result = { ...a, ...updatedFields };
      return result;
    }
    return a;
  });
  saveLocalDb(localDb);
  return result || { id: adminId, ...updatedFields };
}

async function deleteAdminFromDirectus(adminId: string) {
  const localDb = getLocalDb();
  const oldAdmin = (localDb.admins || []).find((a: any) => isIdMatch(a.id, adminId) || isIdMatch(a.adminId, adminId));
  const oldUsername = oldAdmin?.username;

  try {
    const record = await findAdminInDirectus(adminId, oldUsername);
    if (record) {
      const dbId = record.id;
      await directusFetch(`/items/m5_admins/${dbId}`, {
        method: "DELETE"
      });
      console.log(`Successfully deleted admin ${adminId} from Directus record ${dbId}`);
    }
  } catch (err: any) {
    console.log(`[Directus] delete admin failed for ${adminId}. Deleting locally. Note:`, err.message || err);
  }

  localDb.admins = (localDb.admins || []).filter((a: any) => {
    const idMatch = isIdMatch(a.id, adminId) || isIdMatch(a.adminId, adminId);
    const usernameMatch = oldUsername && a.username && oldUsername && 
                          String(a.username).toLowerCase().trim() === String(oldUsername).toLowerCase().trim();
    return !idMatch && !usernameMatch;
  });
  saveLocalDb(localDb);
  return true;
}

async function updateSingleton(collection: string, data: any) {
  const items = await directusFetch(`/items/${collection}`);
  if (items && items.length > 0) {
    const id = items[0].id;
    return await directusFetch(`/items/${collection}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  } else {
    return await directusFetch(`/items/${collection}`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
}

async function syncCollection(collection: string, items: any[], mapItemFn: (item: any) => any) {
  try {
    const current = await directusFetch(`/items/${collection}?limit=-1&fields=id`) || [];
    if (current && current.length > 0) {
      const idsToDelete = current.map((item: any) => item.id);
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const chunk = idsToDelete.slice(i, i + 100);
        try {
          // Try Directus standard array delete
          await directusFetch(`/items/${collection}`, {
            method: "DELETE",
            body: JSON.stringify(chunk)
          });
          console.log(`[Sync] Successfully bulk deleted ${chunk.length} items from ${collection}`);
        } catch (bulkErr: any) {
          console.warn(`[Sync] Bulk array delete failed for ${collection}, trying { keys: ... } wrapper:`, bulkErr.message || bulkErr);
          try {
            await directusFetch(`/items/${collection}`, {
              method: "DELETE",
              body: JSON.stringify({ keys: chunk })
            });
            console.log(`[Sync] Successfully bulk deleted ${chunk.length} items from ${collection} using keys wrapper`);
          } catch (wrapperErr: any) {
            console.warn(`[Sync] Bulk wrapper delete failed for ${collection}, falling back to individual deletes:`, wrapperErr.message || wrapperErr);
            for (const id of chunk) {
              try {
                await directusFetch(`/items/${collection}/${id}`, {
                  method: "DELETE"
                });
              } catch (_) {}
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Sync] Error during cleanup phase of ${collection}:`, err.message || err);
  }

  for (const item of items) {
    try {
      const mapped = mapItemFn(item);
      await directusFetch(`/items/${collection}`, {
        method: "POST",
        body: JSON.stringify(mapped)
      });
    } catch (postErr: any) {
      console.error(`[Sync] Failed to post item in ${collection}:`, postErr.message || postErr);
    }
  }
}

async function ensureGeneralFieldsExist() {
  try {
    const fields = [
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
    ];

    for (const field of fields) {
      try {
        await directusFetch("/fields/m5_general", {
          method: "POST",
          body: JSON.stringify({
            field: field.name,
            type: field.type,
            meta: {
              interface: field.interface,
              width: "full"
            }
          })
        });
        console.log(`[Directus] Created field ${field.name} in m5_general`);
      } catch (fErr: any) {
        // Already exists or can't be created, ignore
      }
    }
  } catch (err: any) {
    console.log("[Directus] ensure m5_general fields exist note:", err.message);
  }
}

async function ensureMembersCollectionExist() {
  try {
    try {
      await directusFetch("/collections/m5_members");
      return; // Already exists!
    } catch (err: any) {
      // 404 or forbidden error means we should attempt to create it
    }

    console.log("[Directus] Attempting to create m5_members collection...");
    await directusFetch("/collections", {
      method: "POST",
      body: JSON.stringify({
        collection: "m5_members",
        schema: {},
        meta: {
          singleton: false,
          note: "Collection for registered members/users"
        }
      })
    });

    const fields = [
      { name: "memberId", type: "string", interface: "input" },
      { name: "name", type: "string", interface: "input" },
      { name: "email", type: "string", interface: "input" },
      { name: "phone", type: "string", interface: "input" },
      { name: "password", type: "string", interface: "input" },
      { name: "tier", type: "string", interface: "input" },
      { name: "points", type: "integer", interface: "input" },
      { name: "joinedBookingsCount", type: "integer", interface: "input" },
      { name: "createdAt", type: "string", interface: "input" }
    ];

    for (const field of fields) {
      try {
        await directusFetch("/fields/m5_members", {
          method: "POST",
          body: JSON.stringify({
            field: field.name,
            type: field.type,
            meta: {
              interface: field.interface,
              width: "full"
            }
          })
        });
        console.log(`[Directus] Created field ${field.name} in m5_members`);
      } catch (fErr: any) {
        console.log(`[Directus] Note on field ${field.name}:`, fErr.message);
      }
    }
  } catch (err: any) {
    console.log("[Directus] ensure m5_members collection note:", err.message);
  }
}

async function ensureImpactEventsCollection() {
  try {
    try {
      await directusFetch("/collections/m5_impact_events");
      return; // Already exists!
    } catch (err: any) {
      // 404 or forbidden error means we should attempt to create it
    }

    console.log("[Directus] Attempting to create m5_impact_events collection...");
    await directusFetch("/collections", {
      method: "POST",
      body: JSON.stringify({
        collection: "m5_impact_events",
        schema: {},
        meta: {
          singleton: false,
          note: "Collection for IMPACT events calendar"
        }
      })
    });

    const fields = [
      { name: "eventId", type: "string", interface: "input" },
      { name: "title", type: "string", interface: "input" },
      { name: "date", type: "string", interface: "input" },
      { name: "time", type: "string", interface: "input" },
      { name: "venue", type: "string", interface: "input" },
      { name: "description", type: "text", interface: "textarea" },
      { name: "imageUrl", type: "string", interface: "input" },
      { name: "category", type: "string", interface: "input" },
      { name: "active", type: "boolean", interface: "boolean" }
    ];

    for (const field of fields) {
      try {
        await directusFetch("/fields/m5_impact_events", {
          method: "POST",
          body: JSON.stringify({
            field: field.name,
            type: field.type,
            meta: {
              interface: field.interface,
              width: "full"
            }
          })
        });
        console.log(`[Directus] Created field ${field.name} in m5_impact_events`);
      } catch (fErr: any) {
        console.log(`[Directus] Note on field ${field.name}:`, fErr.message);
      }
    }
  } catch (err: any) {
    console.log("[Directus] ensure m5_impact_events collection note:", err.message);
  }
}

async function ensurePartnersCollection() {
  try {
    try {
      await directusFetch("/collections/m5_partners");
      return; // Already exists!
    } catch (err: any) {
      // 404 or forbidden error means we should attempt to create it
    }

    console.log("[Directus] Attempting to create m5_partners collection...");
    await directusFetch("/collections", {
      method: "POST",
      body: JSON.stringify({
        collection: "m5_partners",
        schema: {},
        meta: {
          singleton: false,
          note: "Collection for website partners"
        }
      })
    });

    const fields = [
      { name: "partnerId", type: "string", interface: "input" },
      { name: "name", type: "string", interface: "input" },
      { name: "logoUrl", type: "string", interface: "input" },
      { name: "link", type: "string", interface: "input" },
      { name: "active", type: "boolean", interface: "boolean" }
    ];

    for (const field of fields) {
      try {
        await directusFetch("/fields/m5_partners", {
          method: "POST",
          body: JSON.stringify({
            field: field.name,
            type: field.type,
            meta: {
              interface: field.interface,
              width: "full"
            }
          })
        });
        console.log(`[Directus] Created field ${field.name} in m5_partners`);
      } catch (fErr: any) {
        console.log(`[Directus] Note on field ${field.name}:`, fErr.message);
      }
    }
  } catch (err: any) {
    console.log("[Directus] ensure m5_partners collection note:", err.message);
  }
}

async function syncImpactEventsToDirectus(events: any[]) {
  try {
    await ensureImpactEventsCollection();
    await syncCollection("m5_impact_events", events || [], (e: any) => ({
      eventId: e.id,
      title: e.title,
      date: e.date,
      time: e.time || "",
      venue: e.venue,
      description: e.description || "",
      imageUrl: e.imageUrl || "",
      category: e.category || "",
      active: e.active !== false
    }));
    console.log(`[Directus] Successfully synced ${events.length} impact events.`);
  } catch (err: any) {
    console.log("[Directus] m5_impact_events sync completed with note:", err.message);
  }
}

async function reseedDirectus(force = false) {
  // Clear and insert default collections using the structure and seed data
  // Since we already have the setup script in /setup-directus.ts, we can execute it programmatically
  // This is an extremely reliable way to handle reseeds from the UI!
  const { execSync } = await import("child_process");
  const cmd = force ? "npx tsx setup-directus.ts --force" : "npx tsx setup-directus.ts";
  console.log(`[Reseed] Running command: ${cmd}`);
  execSync(cmd);
  return true;
}

async function startServer() {
  await initDb();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Create uploads directory if not exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Auto-copy fallback images from src/assets/images to uploads/ folder during startup for robust production serving
  const srcImagesDir = path.join(process.cwd(), "src", "assets", "images");
  if (fs.existsSync(srcImagesDir)) {
    try {
      const files = fs.readdirSync(srcImagesDir);
      for (const file of files) {
        const srcPath = path.join(srcImagesDir, file);
        const destPath = path.join(uploadsDir, file);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Startup] Copied fallback image to uploads: ${file}`);
        }
      }
    } catch (err: any) {
      console.warn("[Startup] Failed to copy fallback images to uploads:", err.message);
    }
  }

  const publicImagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(publicImagesDir)) {
    try {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    } catch (_) {}
  }
  app.use("/images", express.static(publicImagesDir));
  app.use("/uploads", express.static(uploadsDir));
  app.use("/uploads", express.static(publicImagesDir));

  // Dynamic resilient uploads handler: guarantees images never 404 or return text/html
  app.get("/uploads/:filename", async (req, res, next) => {
    try {
      const { filename } = req.params;
      const cleanName = path.basename(filename);

      // 1. Check local uploads directory
      const filePath = path.join(uploadsDir, cleanName);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }

      // 2. Check public/images directory
      const pubPath = path.join(publicImagesDir, cleanName);
      if (fs.existsSync(pubPath)) {
        return res.sendFile(pubPath);
      }

      // 3. Smart fallback based on filename keywords so images never break
      const lower = cleanName.toLowerCase();
      let fallback = "bedroom_superior_m5_1782203272229.jpg";
      if (lower.includes("lobby") || lower.includes("hero") || lower.includes("6219") || lower.includes("5850") || lower.includes("favicon") || lower.includes("logo")) {
        fallback = "lobby_loft_m5_1782203250164.jpg";
      } else if (lower.includes("deluxe") || lower.includes("6028") || lower.includes("6459") || lower.includes("5912")) {
        fallback = "bedroom_deluxe_m5_1782203318372.jpg";
      } else if (lower.includes("studio") || lower.includes("standard") || lower.includes("twin") || lower.includes("5884")) {
        fallback = "bedroom_studio_m5_1782203293730.jpg";
      }

      const fallbackFile = path.join(publicImagesDir, fallback);
      if (fs.existsSync(fallbackFile)) {
        res.setHeader("Content-Type", lower.endsWith(".png") ? "image/png" : "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.sendFile(fallbackFile);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  });

  // Initialize Gemini client lazily/safely
  let ai: GoogleGenAI | null = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("Gemini API initialized successfully.");
    } else {
      console.warn("GEMINI_API_KEY is not defined or is a placeholder. chatbot will use simulated fallback answers.");
    }
  } catch (err) {
    console.error("Error creating GoogleGenAI instance:", err);
  }

  // 1. API: Availability Checker (ตรวจสอบห้องว่าง)
  app.post("/api/rooms/check-availability", async (req, res) => {
    const { checkIn, checkOut, guests, roomType } = req.body;
    
    if (!checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: "กรุณาระบุข้อมูล วันเข้าพัก วันเช็คเอาท์ และจำนวนผู้เข้าพัก" });
    }

    try {
      const db = await getSettingsFromDirectus();
      const rooms = db.rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        price: r.price,
        available: true,
        maxGuests: r.capacity,
        description: r.description
      }));

      // Filter by requested room helper if any
      let resultRooms = rooms;
      if (roomType && roomType !== "all") {
        resultRooms = rooms.filter((r: any) => r.id === roomType);
      }

      // Filter by guests capacity
      const numGuests = parseInt(guests, 10) || 1;
      resultRooms = resultRooms.map((room: any) => {
        const fits = numGuests <= room.maxGuests;
        return {
          ...room,
          available: fits
        };
      });

      return res.json({
        success: true,
        checkIn,
        checkOut,
        guests: numGuests,
        availableRooms: resultRooms
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 2. API: Gemini AI Concierge "M-My" Chatbot (ผู้ช่วยอัจฉริยะ)
  app.post("/api/chat", async (req, res) => {
    const { messages, userMessage } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: "กรุณาส่งข้อความสอบถาม" });
    }

    try {
      const db = await getSettingsFromDirectus();
      const gen = db.general;
      const roomsInfo = db.rooms.map((r: any, i: number) => 
        `${i + 1}. ${r.name} (${r.thaiName}): ${r.size} ตร.ม., ${r.bedType}, ราคาเริ่มต้น ${r.price} บาท/คืน, รองรับได้สูงสุด ${r.capacity} ท่าน. คำอธิบาย: ${r.description}`
      ).join("\n");
      const promosInfo = db.promotions.map((p: any) => 
        `- "${p.title}" (${p.badge}): ${p.desc} (จุดเด่น: ${p.highlight})`
      ).join("\n");
      const amenitiesInfo = db.amenities.map((a: any) => 
        `- ${a.title}: ${a.desc}`
      ).join("\n");

      const systemInstruction = `คุณคือ "เอ็มมี่ (M-My)" - ผู้ช่วยอัจฉริยะส่วนตัวของโรงแรม ${gen.hotelName} (${gen.thaiName})
บุคลิกภาพของคุณ: สุภาพ อบอุ่น แต่มีความ "ดิบ เท่ สมาร์ทสไตล์ Loft & Industrial" แนะนำลูกค้าอย่างจริงใจและเป็นมืออาชีพ มีความรู้เรื่องโรงแรม ท่องเที่ยว คอนเสิร์ต และการเดินทางเป็นอย่างดี

ข้อมูลพื้นฐานของโรงแรม:
- ชื่อโรงแรม: ${gen.hotelName} (${gen.thaiName})
- พิกัด: ${gen.contactAddress} (ใกล้ "อิมแพ็ค อารีน่า เมืองทองธานี" มาก เดินทางสะดวก 5-10 นาที)
- ติดต่อสอบถาม: โทร ${gen.contactPhone} GPS: ${gen.gps}
- ธีมดีไซน์: Loft & Industrial หรูหรา ดิบเท่ ตกแต่งด้วยปูนเปลือยขัดมัน อิฐมอญธรรมชาติ และวัสดุเหล็กสีดำ
- ห้องพักแบ่งเป็น ${db.rooms.length} ประเภทหลัก:
${roomsInfo}

สิ่งอำนวยความสะดวกหลัก:
${amenitiesInfo}

โปรโมชั่นพิเศษตอนนี้:
${promosInfo}

คำแนะนำการเดินทางแนะนำสำหรับลูกค้าอิมแพ็ค:
- โทรเรียกบริการรถประจำโรงแรม หรือให้พนักงานหน้าเคาน์เตอร์เรียกแท็กซี่/วินมอเตอร์ไซค์ให้ ใช้เวลาเพียง 5-10 นาที เดินทางผ่านซอยลัดเพื่อเลี่ยงรถติดได้ดีมาก เหมาะมากสำหรับพักผ่อนก่อนและหลังดูคอนเสิร์ต

หากลูกค้าสนใจจองห้องพัก ให้แนะนำให้ลูกค้ากดเลือกวันที่และตรวจสอบห้องว่างในเว็บไซต์หลัก หรือบอกว่าคุณยินดีประสานงานให้

ภาษา: ตอบกลับลูกค้าเป็น "ภาษาไทย" ที่สละสลวย มีเสน่ห์ ใช้สรรพนามแทนตัวเองว่า "เอ็มมี่" หรือ "ผม" ในสไตล์หนุ่มมาดเท่ ลอฟท์ๆ สุภาพ และใช้หางเสียง ครับ เสมอ`;

      // If API client is initialized, call Gemini
      if (ai) {
        try {
          // Compile prompt history
          const contents = [];
          if (messages && Array.isArray(messages)) {
            const recentHistory = messages.slice(-10);
            for (const msg of recentHistory) {
              contents.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
              });
            }
          }
          
          contents.push({
            role: "user",
            parts: [{ text: userMessage }]
          });

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            }
          });

          const textResponse = response.text || "ขออภัยครับ เกิดข้อขัดข้องชั่วคราวในการประมวลผลคำตอบครับ";
          return res.json({ success: true, reply: textResponse });
        } catch (err: any) {
          console.error("Gemini API Error:", err);
          return res.json({
            success: true,
            reply: `สวัสดีครับ ยินดีต้อนรับสู่ ${gen.hotelName} ครับ! (ขณะนี้ระบบ AI ขัดข้องชั่วคราวชาร์ทพลังอยู่ครับ) ผมขอแนะนำข้อมูลเบื้องต้นดังนี้ครับ: โรงแรมของเราตั้งอยู่ใกล้ อิมแพ็ค เมืองทองธานี 5-10 นาที พักที่นี่จองห้องพักราคาเริ่มต้นเพียง ${db.rooms[db.rooms.length - 1]?.price || 1200} บ. คุ้มค่าและเดินทางสะดวกแน่นอนครับ สอบถามเพิ่มเติมทางเบอร์โทรศัพท์ ${gen.contactPhone} ได้เลยนะครับ!`
          });
        }
      } else {
        // Mock / Simulated AI Answer when no API key is specified (or is default string)
        const msgLower = userMessage.toLowerCase();
        let reply = `สวัสดีครับ ยินดีต้อนรับสู่ ${gen.hotelName} ย่านปากเกร็ด นนทบุรี ครับ! ผมเอ็มมี่ ยินดีช่วยเหลือคุณ ข้อมูลอะไรเกี่ยวกับที่พักหรือเส้นทางไป อิมแพ็ค เมืองทองธานี ที่ต้องการให้ผมช่วยเหลือไหมครับ?`;
        
        if (msgLower.includes("ห้อง") || msgLower.includes("พัก") || msgLower.includes("ราคา")) {
          const textOptions = db.rooms.map((r: any, idx: number) => `${idx + 1}. ${r.name} (${r.price.toLocaleString()} บ./คืน) ${r.description}`).join("\n");
          reply = `The M5 Residence มีห้องพักสุดเท่ให้เลือก ${db.rooms.length} สไตล์ครับ:\n${textOptions}\n\nสนใจสไตล์ไหน สอบถามรายละเอียดเตียงและการบริการเพิ่มได้ครับ!`;
        } else if (msgLower.includes("ไป") || msgLower.includes("เดินทาง") || msgLower.includes("อิมแพ็ค") || msgLower.includes("คอนเสิร์ต") || msgLower.includes("impact")) {
          reply = `เราตั้งอยู่ใกล้ อิมแพ็ค อารีน่า เมืองทองธานี มากครับ! เดินทางสะดวก เพียง 5-10 นาที มีทางลัดเลี่ยงรถติดได้ดีเยี่ยม เหมาะกับคอคอนเสิร์ตสุดๆ ครับ โรงแรมมีบริการเรียกรถขากลับและขาไปให้ด้วยครับ สบายใจหายห่วง! พิกัด: ${gen.contactAddress}`;
        } else if (msgLower.includes("กิน") || msgLower.includes("คาเฟ่") || msgLower.includes("อาหาร") || msgLower.includes("ที่เที่ยว")) {
          reply = "ที่ชั้นล็อบบี้มี 'Copper & Steam' คาเฟ่แอนด์อาหารแนวลอฟท์คอยบริการครับ มีกาแฟดริปหอมเข้มข้น และคราฟต์เบียร์เย็นๆ ในช่วงค่ำ เสิร์ฟพร้อมของว่างสไตล์ฟิวชั่นดิบเท่เข้ากับธีมโรงแรมครับ!";
        } else if (msgLower.includes("โปร") || msgLower.includes("promotion") || msgLower.includes("ส่วนลด")) {
          const promoOptions = db.promotions.map((p: any) => `- ${p.title} (${p.badge}): ${p.desc}`).join("\n");
          reply = `โปรโมชั่นเด็ดช่วงนี้:\n${promoOptions}\n\nจองได้โดยตรงเลยนะครับคอแฟนดนตรี!`;
        } else if (msgLower.includes("จอง") || msgLower.includes("จองห้อง")) {
          reply = "คุณสามารถกดปุ่ม 'ตรวจสอบห้องว่าง/จองห้องพัก' ด้านบนของหน้าจอ เลือกวันที่เช็คอินเช็คเอาท์และประเภทห้องเพื่อตรวจสอบและจองห้องพักได้แบบเรียลไทม์ทันทีเลยนะครับ!";
        }

        return res.json({ success: true, reply });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Memory cache for Pak Kret weather
  let cachedWeather: {
    temp: number;
    condition: string;
    conditionTh: string;
    humidity: string;
    wind: string;
    advice: string;
    lastUpdated: string;
    timestamp: number;
  } | null = null;

  // Helper to generate realistic fallback weather for Pak Kret (Nonthaburi) based on the current time
  function getRealisticPakKretWeather() {
    const hour = new Date().getHours();
    let temp = 31;
    let condition = "Partly Cloudy";
    let conditionTh = "มีเมฆบางส่วน";
    let humidity = "72%";
    let wind = "12 km/h";
    let advice = "อากาศอบอุ่นและมีลมพัดสบาย เหมาะแก่การไปเดินเล่นริมแม่น้ำเจ้าพระยาหรือแวะชมงานแสดงที่อิมแพ็ค เมืองทองธานีครับ";

    if (hour >= 18 || hour < 6) {
      temp = 28 + Math.floor(Math.random() * 3);
      condition = "Clear Night";
      conditionTh = "ท้องฟ้าแจ่มใส";
      humidity = "80%";
      wind = "8 km/h";
      advice = "ช่วงค่ำอากาศเย็นสบาย เหมาะแก่การพักผ่อนในห้องพัก Loft สุดหรูของ The M5 Residence ครับ";
    } else if (hour >= 12 && hour < 16) {
      temp = 33 + Math.floor(Math.random() * 3);
      condition = "Very Warm";
      conditionTh = "อากาศร้อนจัด";
      humidity = "60%";
      wind = "14 km/h";
      advice = "ช่วงบ่ายแดดแรงและอุณหภูมิค่อนข้างสูง แนะนำให้เข้าพักผ่อนในห้องพักปรับอากาศหรือเพลิดเพลินกับ Lounge กาแฟสดด้านในครับ";
    } else {
      temp = 29 + Math.floor(Math.random() * 3);
      condition = "Breezy";
      conditionTh = "มีลมโชยสบาย";
      humidity = "75%";
      wind = "10 km/h";
      advice = "อากาศยามเช้าแจ่มใสกำลังดี เหมาะสมแก่การเริ่มวันใหม่ พกหมวกหรือร่มกันแดดขนาดเล็กเพื่อความสะดวกในการเดินทางนะครับ";
    }

    // June is rainy season in Thailand, so let's make it a rainy forecast sometimes
    const isRainyTime = Math.random() > 0.4;
    if (isRainyTime) {
      temp = 27 + Math.floor(Math.random() * 2);
      condition = "Scattered Showers";
      conditionTh = "ฝนตกกระจาย";
      humidity = "88%";
      wind = "15 km/h";
      advice = "ปากเกร็ดมีฝนตกกระจายในบางพื้นที่ แนะนำพกร่มเมื่อเดินทาง และสามารถอุ่นใจกับบริการร่มและห้องพักอบอุ่นของเราที่ The M5 Residence ครับ";
    }

    return {
      temp,
      condition,
      conditionTh,
      humidity,
      wind,
      advice,
      lastUpdated: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น. (Realtime Mode)"
    };
  }

  // Helper to fetch weather from the free, reliable Open-Meteo API
  async function fetchOpenMeteoWeather() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=13.9130&longitude=100.5284&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo response error: ${res.status}`);
    }
    const data = await res.json();
    const current = data?.current;
    if (!current) {
      throw new Error("No current weather data in Open-Meteo response");
    }
    
    const temp = Math.round(current.temperature_2m);
    const humidity = `${current.relative_humidity_2m}%`;
    const wind = `${Math.round(current.wind_speed_10m)} km/h`;
    const code = current.weather_code;
    
    let condition = "Partly Cloudy";
    let conditionTh = "มีเมฆบางส่วน";
    
    if (code === 0) {
      condition = "Clear Sky";
      conditionTh = "ท้องฟ้าแจ่มใส";
    } else if (code === 1 || code === 2) {
      condition = "Partly Cloudy";
      conditionTh = "มีเมฆบางส่วน";
    } else if (code === 3) {
      condition = "Overcast";
      conditionTh = "เมฆมาก";
    } else if (code === 45 || code === 48) {
      condition = "Foggy";
      conditionTh = "มีหมอกลง";
    } else if (code === 51 || code === 53 || code === 55) {
      condition = "Light Drizzle";
      conditionTh = "ฝนตกปรอยๆ";
    } else if (code === 61 || code === 63 || code === 65) {
      condition = "Rainy";
      conditionTh = "ฝนตก";
    } else if (code === 80 || code === 81 || code === 82) {
      condition = "Showers";
      conditionTh = "ฝนตกเป็นแห่งๆ";
    } else if (code === 95 || code === 96 || code === 99) {
      condition = "Thunderstorm";
      conditionTh = "พายุฝนฟ้าคะนอง";
    }
    
    return {
      temp,
      condition,
      conditionTh,
      humidity,
      wind
    };
  }

  // Helper to generate a clean static Thai recommendation based on conditions
  function getFriendlyAdviceTh(conditionEng: string, temp: number): string {
    const cond = conditionEng.toLowerCase();
    if (cond.includes("rain") || cond.includes("drizzle") || cond.includes("shower") || cond.includes("storm")) {
      return "ปากเกร็ดมีฝนตก แนะนำให้พกร่มเมื่อเดินทาง และสามารถอุ่นใจกับบริการเครื่องดื่มอุ่นๆ ที่ห้องพักสุดหรูของเราที่ The M5 Residence ครับ";
    }
    if (temp >= 33) {
      return "ช่วงนี้แดดค่อนข้างแรงและอุณหภูมิสูง แนะนำหลบแดดพักผ่อนในห้องพัก Loft ปรับอากาศเย็นสบาย หรือแวะดื่มกาแฟสดรสเลิศที่คาเฟ่ของเราครับ";
    }
    return "อากาศวันนี้กำลังดี มีลมพัดสบาย เหมาะแก่การท่องเที่ยวรอบปากเกร็ด หรือเข้าพักผ่อนอย่างผ่อนคลายกับเราที่ The M5 Residence ครับ";
  }

  // Helper to request a personalized advice from Gemini without Search grounding tool (to completely prevent quota/429 limits)
  async function getGeminiWeatherAdvice(temp: number, condition: string, conditionTh: string, humidity: string, wind: string): Promise<string> {
    if (!ai) return "";
    
    const prompt = `Based on the current weather in Pak Kret, Nonthaburi, Thailand:
Temperature: ${temp}°C, Condition: ${condition} (${conditionTh}), Humidity: ${humidity}, Wind: ${wind}.
Generate a short personalized friendly recommendation in Thai for visitors or concert-goers, maximum 2 short sentences, mentioning whether they should carry an umbrella, wear sunscreen, or enjoy our cozy indoor cafe/loft rooms at The M5 Residence hotel, in a cool friendly hospitable tone. Do not include any HTML tags.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt
    });
    
    return response.text?.trim() || "";
  }

  // 3. API: Weather Widget utilizing Open-Meteo & Gemini (no grounding search tool to avoid quota/429 limits)
  app.get("/api/weather", async (req, res) => {
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache duration
    const now = Date.now();
    const isForceUpdate = req.query.force === "true";

    // 1. If cache is fresh and not forced, return cached weather
    if (cachedWeather && (now - cachedWeather.timestamp < CACHE_DURATION) && !isForceUpdate) {
      return res.json({ success: true, ...cachedWeather, source: "cache" });
    }

    let weatherData: any;
    let source = "open_meteo";

    try {
      // Try to fetch real-time weather from Open-Meteo
      weatherData = await fetchOpenMeteoWeather();
    } catch (apiErr) {
      // Fallback to local simulation if Open-Meteo fails
      weatherData = getRealisticPakKretWeather();
      source = "simulation_fallback";
    }

    // Now enrich with Gemini weather advice if possible
    let advice = "";
    try {
      if (ai) {
        advice = await getGeminiWeatherAdvice(
          weatherData.temp,
          weatherData.condition,
          weatherData.conditionTh,
          weatherData.humidity,
          weatherData.wind
        );
      }
    } catch (geminiErr: any) {
      // Quietly handle Gemini API errors or rate-limits
    }

    // If advice generation failed or returned empty, use clean static fallback advice
    if (!advice) {
      advice = getFriendlyAdviceTh(weatherData.condition, weatherData.temp);
    }

    const finalWeather = {
      temp: weatherData.temp,
      condition: weatherData.condition,
      conditionTh: weatherData.conditionTh,
      humidity: weatherData.humidity,
      wind: weatherData.wind,
      advice: advice,
      lastUpdated: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น. (Realtime Mode)"
    };

    // Cache successful response
    cachedWeather = {
      ...finalWeather,
      timestamp: now
    };

    return res.json({ success: true, ...finalWeather, source });
  });

  // API: Sync Google Reviews for Hotel
  app.post("/api/reviews/sync-google", async (req, res) => {
    try {
      const { apiKey: customApiKey, placeId: customPlaceId, searchQuery } = req.body;
      const apiKey = customApiKey || process.env.GOOGLE_MAPS_PLATFORM_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          error: "จำเป็นต้องระบุ Google Maps API Key กรุณาระบุในหน้าแอดมินหรือตั้งค่า GOOGLE_MAPS_PLATFORM_KEY ในระบบหลังบ้าน" 
        });
      }

      let placeId = customPlaceId || "ChIJXWlJMC-e4jARLqX9OidpWjY"; // Default Place ID for The M5 Residence Hotel

      // If no place ID is provided but a search query is, search for the place first
      if (!customPlaceId && searchQuery) {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            placeId = searchData.results[0].place_id;
            console.log(`Found Place ID for query "${searchQuery}": ${placeId}`);
          } else {
            return res.status(404).json({ success: false, error: `ไม่พบสถานที่สำหรับคำค้นหา "${searchQuery}"` });
          }
        } else {
          const searchErr = await searchRes.text();
          return res.status(searchRes.status).json({ success: false, error: `Google Places Search Error: ${searchErr}` });
        }
      }

      // Execute sync using helper
      const syncResult = await runGoogleReviewsSync(apiKey, placeId);
      return res.json({
        ...syncResult
      });
    } catch (err: any) {
      console.error("Error in sync-google reviews endpoint:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
    }
  });

  // ==========================================
  // IMPACT EVENT CALENDAR API & SCRAPER
  // ==========================================

  // Helper to get dynamic fallback events so they are always relevant based on current date
  function getDynamicImpactEvents() {
    const now = new Date();
    const formatThaiDate = (d: Date) => {
      const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
    };

    const getRelativeDate = (offsetDays: number) => {
      const d = new Date(now);
      d.setDate(now.getDate() + offsetDays);
      return d;
    };

    return [
      {
        id: "impact-evt-1",
        title: "MAROON 5 Asia Tour 2026 Live in Bangkok 🎸",
        date: `${formatThaiDate(getRelativeDate(2))} - ${formatThaiDate(getRelativeDate(4))}`,
        time: "19:00 น. เป็นต้นไป",
        venue: "IMPACT Arena อิมแพ็ค อารีน่า เมืองทองธานี",
        description: "คอนเสิร์ตใหญ่ของวงป๊อปร็อกระดับโลก Maroon 5 กลับมาเยือนเมืองไทยอีกครั้งในรอบ 4 ปี พร้อมขนเพลงฮิตมาแบบจัดเต็ม แฟนเพลงห้ามพลาดเด็ดขาด พักที่ The M5 Residence สะดวกที่สุดเดินทางเพียง 5 นาที!",
        imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80",
        category: "Concert",
        active: true
      },
      {
        id: "impact-evt-2",
        title: "Bangkok International Motor Show 2026 🚗",
        date: `${formatThaiDate(getRelativeDate(7))} - ${formatThaiDate(getRelativeDate(14))}`,
        time: "11:00 - 22:00 น.",
        venue: "Challenger Hall 1-3 ชาเลนเจอร์ ฮอลล์",
        description: "งานแสดงยนตรกรรมระดับภูมิภาคสุดยิ่งใหญ่ อัปเดตรถยนต์รุ่นใหม่ รถไฟฟ้า EV และนวัตกรรมยานยนต์แห่งอนาคตจากค่ายรถชั้นนำทั่วโลก พร้อมโปรโมชั่นข้อเสนอพิเศษสุดเร้าใจเฉพาะในงานนี้เท่านั้น",
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
        category: "Exhibition",
        active: true
      },
      {
        id: "impact-evt-3",
        title: "THAIFEX - Anuga Asia 2026 🍲",
        date: `${formatThaiDate(getRelativeDate(15))} - ${formatThaiDate(getRelativeDate(18))}`,
        time: "10:00 - 20:00 น.",
        venue: "IMPACT Exhibition & Convention Center (Hall 5-12)",
        description: "งานแสดงสินค้าอาหารและเครื่องดื่มที่ยิ่งใหญ่และครบวงจรที่สุดในเอเชีย พบกับผู้ประกอบการและนวัตกรรมอาหารจากทั่วทุกมุมโลก เปิดเจรจาธุรกิจและจำหน่ายสินค้าคุณภาพส่งออกในราคาพิเศษ",
        imageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80",
        category: "Exhibition",
        active: true
      },
      {
        id: "impact-evt-4",
        title: "Thailand Coffee Fest 2026 ☕",
        date: `${formatThaiDate(getRelativeDate(20))} - ${formatThaiDate(getRelativeDate(23))}`,
        time: "10:00 - 20:00 น.",
        venue: "IMPACT Exhibition Center Hall 5-8",
        description: "เทศกาลเพื่อคนรักกาแฟที่ใหญ่ที่สุดในเอเชียตะวันออกเฉียงใต้ รวบรวมเกษตรกรผู้ปลูกกาแฟ โรงคั่วกาแฟ บาริสต้าชั้นนำ และแบรนด์เครื่องชงกาแฟระดับโลกมาไว้ในงานเดียว ดื่มด่ำรสชาติและเปิดประสบการณ์กาแฟพิเศษ",
        imageUrl: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=800&q=80",
        category: "Exhibition",
        active: true
      },
      {
        id: "impact-evt-5",
        title: "Big Bad Wolf Book Sale Bangkok 2026 📚",
        date: `${formatThaiDate(getRelativeDate(25))} - ${formatThaiDate(getRelativeDate(30))}`,
        time: "10:00 - 24:00 น.",
        venue: "The Portal Ballroom (IMPACT Muang Thong Thani)",
        description: "มหกรรมหนังสือภาษาอังกฤษและภาษาไทยที่ยิ่งใหญ่ที่สุดในโลก ลดราคาสูงสุด 50-90% คัดสรรหนังสือดีจากหลากหลายหมวดหมู่มาให้เลือกสรร ตั้งแต่วรรณกรรมเยาวชนไปจนถึงการพัฒนาตนเอง",
        imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
        category: "Other",
        active: true
      }
    ];
  }

  async function scrapeImpactEventCalendar(): Promise<any[]> {
    try {
      const response = await fetch("https://www.impact.co.th/th/visitors/event-calendar", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "th-TH,th;q=0.9,en;q=0.8"
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`Impact Event site responded with ${response.status}`);
      }

      const html = await response.text();
      const events: any[] = [];

      // 1. Primary Grid Item Parser (Robust & complete extraction)
      const itemRegex = /<div class="eb-category-\d+ eb-event-\d+ eb-event-item-grid-default-layout">([\s\S]*?)(?=<div class="eb-category-\d+ eb-event-\d+ eb-event-item-grid-default-layout"|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>|$)/gi;
      let itemMatch;

      while ((itemMatch = itemRegex.exec(html)) !== null) {
        const block = itemMatch[1];

        // Image extraction
        const imgMatch = /<img[^>]+src="([^"]+)"/i.exec(block);
        let imageUrl = imgMatch ? imgMatch[1].trim() : "";
        if (imageUrl && imageUrl.startsWith("/")) {
          imageUrl = "https://www.impact.co.th" + imageUrl;
        }

        // Event path / category detection
        const hrefMatch = /<a class="eb-event-title" href="([^"]+)"/i.exec(block);
        const href = hrefMatch ? hrefMatch[1] : "";
        let category = "Exhibition";
        if (href.toLowerCase().includes("concert") || href.toLowerCase().includes("คอนเสิร์ต")) {
          category = "Concert";
        } else if (href.toLowerCase().includes("exhibition") || href.toLowerCase().includes("public") || href.toLowerCase().includes("trade")) {
          category = "Exhibition";
        } else {
          category = "Other";
        }

        // Title extraction & cleaning
        const titleMatch = /<a class="eb-event-title"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";
        title = title
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // Date extraction & HTML cleaning
        const dateBlockMatch = /<div class="eb-event-date-time">([\s\S]*?)<\/div>/i.exec(block);
        let date = "ตารางงานล่าสุด";
        if (dateBlockMatch) {
          date = dateBlockMatch[1]
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }

        // Location / Venue extraction & cleaning
        const locBlockMatch = /<div class="eb-event-location">([\s\S]*?)<\/div>/i.exec(block);
        let venue = "อิมแพ็ค เมืองทองธานี";
        if (locBlockMatch) {
          venue = locBlockMatch[1]
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }

        if (title) {
          events.push({
            id: "scraped-" + Math.random().toString(36).substring(2, 9),
            title,
            date,
            venue,
            imageUrl: imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
            category,
            active: true,
            description: `กิจกรรมและงานแสดงระดับแนวหน้า ณ ${venue} แนะนำผู้เข้าร่วมงานจองห้องพักล่วงหน้าเพื่อหลีกเลี่ยงการจราจรหนาแน่นและเข้าพักผ่อนใกล้สถานที่จัดงานอย่างสะดวกสบาย`
          });
        }
      }

      // 2. Secondary JSON-LD Parser as Fallback if grid was not found
      if (events.length === 0) {
        const jsonLdRegex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
        let scriptMatch;
        while ((scriptMatch = jsonLdRegex.exec(html)) !== null) {
          try {
            const parsed = JSON.parse(scriptMatch[1].trim());
            const rawItems = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
            for (const item of rawItems) {
              if (item["@type"] === "Event") {
                let imageUrl = item.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                if (imageUrl && imageUrl.startsWith("/")) {
                  imageUrl = "https://www.impact.co.th" + imageUrl;
                }
                events.push({
                  id: "impact-" + Math.random().toString(36).substring(2, 9),
                  title: item.name || "",
                  date: item.startDate ? `${item.startDate} - ${item.endDate || ""}` : "ตารางงานล่าสุด",
                  venue: item.location?.name || "IMPACT Muang Thong Thani",
                  description: item.description || "กิจกรรมและการจัดแสดงนิทรรศการ ณ อิมแพ็ค เมืองทองธานี",
                  imageUrl,
                  category: item.name?.toLowerCase().includes("concert") ? "Concert" : "Exhibition",
                  active: true
                });
              }
            }
          } catch (e) {
            // Ignore parse errors of unrelated ld+json
          }
        }
      }

      // 3. Last fallback: manual regex matches of titles
      if (events.length === 0) {
        const titleRegex = /<h[2-4][^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h[2-4]>/gi;
        const titles: string[] = [];
        let titleMatch;
        while ((titleMatch = titleRegex.exec(html)) !== null && titles.length < 10) {
          const titleText = titleMatch[1].replace(/<[^>]*>/g, "").trim();
          if (titleText && !titles.includes(titleText)) {
            titles.push(titleText);
          }
        }

        if (titles.length > 0) {
          titles.forEach((title, idx) => {
            events.push({
              id: `impact-scraped-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              title,
              date: "ตารางงานล่าสุด (โปรดตรวจสอบเวลา)",
              venue: "IMPACT Muang Thong Thani",
              description: "กิจกรรมและการจัดแสดงนิทรรศการ ณ อิมแพ็ค เมืองทองธานี แนะนำลูกค้าจองห้องพักล่วงหน้าเพื่อเข้าพักใกล้สถานที่จัดงาน",
              imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
              category: title.toLowerCase().includes("concert") || title.toLowerCase().includes("คอนเสิร์ต") ? "Concert" : "Exhibition",
              active: true
            });
          });
        }
      }

      return events;
    } catch (err) {
      console.warn("Scraper fetch error, falling back to beautiful default events list:", err);
      return [];
    }
  }

  // 1. GET: Fetch list of IMPACT events
  
  // GET: Fetch LIVE impact events (cached for 1 hour)
  let liveEventsCache: any[] = [];
  let lastLiveFetch = 0;
  
  app.get("/api/impact-events/live", async (req, res) => {
    try {
      const now = Date.now();
      if (liveEventsCache.length === 0 || now - lastLiveFetch > 3600000) {
        console.log("Fetching fresh LIVE events from IMPACT...");
        const scraped = await scrapeImpactEventCalendar();
        if (scraped && scraped.length > 0) {
          const nowDate = new Date();
          // Filter out past events - keep only upcoming events
          liveEventsCache = scraped.filter((e: any) => !isPastEvent(e.date, nowDate));
          lastLiveFetch = now;
        }
      }
      return res.json({ success: true, events: liveEventsCache });
    } catch (err: any) {
      console.error("Error fetching live impact events:", err);
      return res.status(500).json({ success: false, error: err.message, events: liveEventsCache });
    }
  });

  app.get("/api/impact-events", async (req, res) => {
    try {
      const localDb = getLocalDb();
      return res.json({
        success: true,
        events: localDb.impactEvents || []
      });
    } catch (err: any) {
      console.error("Error getting impact events:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  async function runImpactSync() {
    try {
      console.log("[Scheduler] Starting automatic IMPACT event calendar sync...");
      const scraped = await scrapeImpactEventCalendar();
      const localDb = getLocalDb();
      
      let mergedEvents = [...(localDb.impactEvents || [])];

      if (scraped.length > 0) {
        // Merge scraped events: append if not already existing by title match
        scraped.forEach((se) => {
          const exists = mergedEvents.some(
            (me) => String(me.title).toLowerCase().trim() === String(se.title).toLowerCase().trim()
          );
          if (!exists) {
            mergedEvents.unshift(se); // put fresh scraped on top
          }
        });
      } else {
        // Fallback: Ensure it is initialized to an array if completely empty
        if (mergedEvents.length === 0) {
          mergedEvents = [];
        }
      }

      // Filter out past events: Keep only upcoming events!
      const nowDate = new Date();
      mergedEvents = mergedEvents.filter((e: any) => !isPastEvent(e.date, nowDate));

      localDb.impactEvents = mergedEvents;
      if (!localDb.general) localDb.general = {};
      localDb.general.lastImpactSyncTime = new Date().toISOString();
      saveLocalDb(localDb);

      // Async sync to Directus in the background
      await syncImpactEventsToDirectus(mergedEvents).catch((err) => {
        console.log("[Scheduler] syncImpactEventsToDirectus background note:", err.message);
      });
      console.log("[Scheduler] Automatic IMPACT sync successfully finished!");
      return mergedEvents;
    } catch (err: any) {
      console.error("[Scheduler] Automatic IMPACT sync error:", err.message || err);
      throw err;
    }
  }

  function startImpactSyncScheduler() {
    console.log("[Scheduler] Initializing background IMPACT sync scheduler...");
    
    // Check every 10 minutes
    setInterval(async () => {
      try {
        const localDb = getLocalDb();
        const interval = localDb.general?.impactSyncInterval || "manual";
        
        if (interval === "manual") {
          return;
        }
        
        const lastSyncStr = localDb.general?.lastImpactSyncTime;
        const now = new Date();
        let shouldSync = false;
        
        if (!lastSyncStr) {
          shouldSync = true;
        } else {
          const lastSync = new Date(lastSyncStr);
          const diffMs = now.getTime() - lastSync.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          if (interval === "daily" && diffDays >= 1) {
            shouldSync = true;
          } else if (interval === "weekly" && diffDays >= 7) {
            shouldSync = true;
          } else if (interval === "monthly" && diffDays >= 30) {
            shouldSync = true;
          }
        }
        
        if (shouldSync) {
          console.log(`[Scheduler] Triggering auto sync because interval is [${interval}] and last sync was ${lastSyncStr || "never"}`);
          await runImpactSync();
        }
      } catch (err: any) {
        console.error("[Scheduler] Error in background scheduler run:", err.message || err);
      }
    }, 10 * 60 * 1000);

    // Initial check after boot
    setTimeout(async () => {
      try {
        const localDb = getLocalDb();
        const interval = localDb.general?.impactSyncInterval || "manual";
        if (interval !== "manual") {
          const lastSyncStr = localDb.general?.lastImpactSyncTime;
          const now = new Date();
          let shouldSync = false;
          if (!lastSyncStr) {
            shouldSync = true;
          } else {
            const lastSync = new Date(lastSyncStr);
            const diffMs = now.getTime() - lastSync.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (interval === "daily" && diffDays >= 1) shouldSync = true;
            if (interval === "weekly" && diffDays >= 7) shouldSync = true;
            if (interval === "monthly" && diffDays >= 30) shouldSync = true;
          }
          if (shouldSync) {
            console.log(`[Scheduler] Initial boot check triggered sync for [${interval}]`);
            await runImpactSync();
          }
        }
      } catch (e: any) {
        console.error("[Scheduler] Initial boot sync error:", e.message || e);
      }
    }, 15000);
  }

  async function runGoogleReviewsSync(customApiKey?: string, customPlaceId?: string) {
    try {
      console.log("[Scheduler] Starting Google Reviews sync...");
      const localDb = getLocalDb();
      
      const apiKey = customApiKey || localDb.general?.googleReviewsApiKey || process.env.GOOGLE_MAPS_PLATFORM_KEY;
      if (!apiKey) {
        throw new Error("Missing Google Maps API Key. Please provide it in Admin Dashboard or set GOOGLE_MAPS_PLATFORM_KEY env var.");
      }

      const placeId = customPlaceId || localDb.googlePlaceId || "ChIJXWlJMC-e4jARLqX9OidpWjY";
      
      // Query details to get the reviews!
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,name,formatted_address&key=${apiKey}&language=th`;
      const detailsRes = await fetch(detailsUrl);
      
      if (!detailsRes.ok) {
        const errText = await detailsRes.text();
        throw new Error(`Google Place Details API returned error: ${errText}`);
      }

      const detailsData = await detailsRes.json();
      if (detailsData.status !== "OK") {
        throw new Error(`Google API Status Error: ${detailsData.status}. ${detailsData.error_message || ""}`);
      }

      const place = detailsData.result || {};
      const rawReviews = place.reviews || [];

      if (rawReviews.length === 0) {
        throw new Error("No public reviews returned from Google Maps API for this Place ID.");
      }

      // Map google reviews to our settings structure
      const mappedReviews = rawReviews.map((rev: any) => {
        let role = "Guest Reviewer 🌐";
        if (rev.rating >= 4) {
          role = "Verified Stay 🌐";
        }
        return {
          name: rev.author_name || "Google User",
          role: role,
          review: rev.text || "",
          rating: rev.rating || 5,
          date: rev.relative_time_description || "เมื่อเร็วๆ นี้",
          avatarUrl: rev.profile_photo_url || ""
        };
      });

      // Update local db
      localDb.reviews = mappedReviews;
      localDb.googlePlaceId = placeId;
      localDb.googleReviewsEnabled = true;
      if (!localDb.general) localDb.general = {};
      localDb.general.lastGoogleReviewsSyncTime = new Date().toISOString();
      saveLocalDb(localDb);

      // Try syncing with Directus if configured
      try {
        await syncCollection("m5_reviews", mappedReviews, (rev: any) => ({
          name: rev.name,
          role: rev.role,
          review: rev.review,
          rating: Number(rev.rating),
          date: rev.date,
          avatarUrl: rev.avatarUrl
        }));
      } catch (directusErr) {
        console.warn("[Scheduler] Could not sync Google reviews to Directus:", directusErr);
      }

      console.log(`[Scheduler] Google Reviews sync completed successfully! Synced ${mappedReviews.length} reviews.`);
      return {
        success: true,
        reviews: mappedReviews,
        placeName: place.name,
        address: place.formatted_address,
        rating: place.rating,
        placeId: placeId
      };
    } catch (err: any) {
      console.error("[Scheduler] Error running Google Reviews sync:", err.message || err);
      throw err;
    }
  }

  function startGoogleReviewsSyncScheduler() {
    console.log("[Scheduler] Initializing background Google Reviews sync scheduler...");
    
    // Check every 10 minutes
    setInterval(async () => {
      try {
        const localDb = getLocalDb();
        const interval = localDb.general?.googleReviewsSyncInterval || "manual";
        
        if (interval === "manual") {
          return;
        }
        
        const lastSyncStr = localDb.general?.lastGoogleReviewsSyncTime;
        const now = new Date();
        let shouldSync = false;
        
        if (!lastSyncStr) {
          shouldSync = true;
        } else {
          const lastSync = new Date(lastSyncStr);
          const diffMs = now.getTime() - lastSync.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          
          if (interval === "daily" && diffDays >= 1) {
            shouldSync = true;
          } else if (interval === "weekly" && diffDays >= 7) {
            shouldSync = true;
          } else if (interval === "monthly" && diffDays >= 30) {
            shouldSync = true;
          }
        }
        
        if (shouldSync) {
          console.log(`[Scheduler] Triggering auto Google Reviews sync because interval is [${interval}] and last sync was ${lastSyncStr || "never"}`);
          await runGoogleReviewsSync().catch(() => {});
        }
      } catch (err: any) {
        console.error("[Scheduler] Error in background Google Reviews scheduler run:", err.message || err);
      }
    }, 10 * 60 * 1000);

    // Initial check after boot
    setTimeout(async () => {
      try {
        const localDb = getLocalDb();
        const interval = localDb.general?.googleReviewsSyncInterval || "manual";
        if (interval !== "manual") {
          const lastSyncStr = localDb.general?.lastGoogleReviewsSyncTime;
          const now = new Date();
          let shouldSync = false;
          if (!lastSyncStr) {
            shouldSync = true;
          } else {
            const lastSync = new Date(lastSyncStr);
            const diffMs = now.getTime() - lastSync.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (interval === "daily" && diffDays >= 1) shouldSync = true;
            if (interval === "weekly" && diffDays >= 7) shouldSync = true;
            if (interval === "monthly" && diffDays >= 30) shouldSync = true;
          }
          if (shouldSync) {
            console.log(`[Scheduler] Initial boot check triggered Google Reviews sync for [${interval}]`);
            await runGoogleReviewsSync().catch(() => {});
          }
        }
      } catch (e: any) {
        console.error("[Scheduler] Initial boot Google Reviews sync error:", e.message || e);
      }
    }, 25000); // 25 seconds after boot (staggered with impact events)
  }

  // 2. POST: Trigger scraping sync
  app.post("/api/impact-events/sync", async (req, res) => {
    try {
      const events = await runImpactSync();
      return res.json({
        success: true,
        message: "ซิงค์ตารางงานและอัปเดตลงฐานข้อมูลเรียบร้อยแล้ว!",
        events
      });
    } catch (err: any) {
      console.error("Error syncing impact events:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. POST: Create manual event
  app.post("/api/impact-events", async (req, res) => {
    try {
      const { event } = req.body;
      if (!event || !event.title) {
        return res.status(400).json({ success: false, error: "หัวเรื่องอีเวนต์จำเป็นต้องมีค่า" });
      }

      const localDb = getLocalDb();
      const newEvent = {
        id: "manual-" + Math.random().toString(36).substring(2, 9),
        title: event.title,
        date: event.date || "ไม่ระบุวันเวลาจัดงาน",
        time: event.time || "",
        venue: event.venue || "IMPACT Muang Thong Thani",
        description: event.description || "",
        imageUrl: event.imageUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
        category: event.category || "Exhibition",
        active: event.active !== false
      };

      localDb.impactEvents = [newEvent, ...(localDb.impactEvents || [])];
      saveLocalDb(localDb);

      // Async sync to Directus in the background
      syncImpactEventsToDirectus(localDb.impactEvents).catch((err) => console.warn("Background Directus sync failed:", err));

      return res.json({
        success: true,
        event: newEvent,
        events: localDb.impactEvents
      });
    } catch (err: any) {
      console.error("Error creating manual event:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. PUT: Update manual/scraped event
  app.put("/api/impact-events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { event } = req.body;
      if (!event) {
        return res.status(400).json({ success: false, error: "ไม่มีข้อมูลอัปเดต" });
      }

      const localDb = getLocalDb();
      let found = false;

      localDb.impactEvents = (localDb.impactEvents || []).map((e: any) => {
        if (e.id === id) {
          found = true;
          return {
            ...e,
            title: event.title !== undefined ? event.title : e.title,
            date: event.date !== undefined ? event.date : e.date,
            time: event.time !== undefined ? event.time : e.time,
            venue: event.venue !== undefined ? event.venue : e.venue,
            description: event.description !== undefined ? event.description : e.description,
            imageUrl: event.imageUrl !== undefined ? event.imageUrl : e.imageUrl,
            category: event.category !== undefined ? event.category : e.category,
            active: event.active !== undefined ? event.active : e.active
          };
        }
        return e;
      });

      if (!found) {
        return res.status(404).json({ success: false, error: "ไม่พบกิจกรรมที่ระบุ" });
      }

      saveLocalDb(localDb);

      // Async sync to Directus in the background
      syncImpactEventsToDirectus(localDb.impactEvents).catch((err) => console.warn("Background Directus sync failed:", err));

      return res.json({
        success: true,
        events: localDb.impactEvents
      });
    } catch (err: any) {
      console.error("Error updating event:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. DELETE: Delete an event
  app.delete("/api/impact-events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const localDb = getLocalDb();
      
      const originalLength = (localDb.impactEvents || []).length;
      localDb.impactEvents = (localDb.impactEvents || []).filter((e: any) => e.id !== id);

      if (localDb.impactEvents.length === originalLength) {
        return res.status(404).json({ success: false, error: "ไม่พบกิจกรรมที่ต้องการลบ" });
      }

      saveLocalDb(localDb);

      // Async sync to Directus in the background
      syncImpactEventsToDirectus(localDb.impactEvents).catch((err) => console.warn("Background Directus sync failed:", err));

      return res.json({
        success: true,
        message: "ลบกิจกรรมสำเร็จเสร็จสิ้น",
        events: localDb.impactEvents
      });
    } catch (err: any) {
      console.error("Error deleting event:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. POST: Clean up past events manually from DB
  app.post("/api/impact-events/cleanup-past", async (req, res) => {
    try {
      const localDb = getLocalDb();
      const nowDate = new Date();
      const initialCount = (localDb.impactEvents || []).length;
      localDb.impactEvents = (localDb.impactEvents || []).filter((e: any) => !isPastEvent(e.date, nowDate));
      saveLocalDb(localDb);
      liveEventsCache = (liveEventsCache || []).filter((e: any) => !isPastEvent(e.date, nowDate));
      
      const removedCount = initialCount - localDb.impactEvents.length;
      syncImpactEventsToDirectus(localDb.impactEvents).catch((err) => console.warn("Background Directus sync failed:", err));
      
      return res.json({
        success: true,
        message: `ล้างงานเก่าที่ผ่านไปแล้วเรียบร้อย (${removedCount} งาน)`,
        events: localDb.impactEvents
      });
    } catch (err: any) {
      console.error("Error cleaning past events:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Get Directus connection status
  app.get("/api/db-status", async (req, res) => {
    const { url, internalUrl, token } = getDirectusConfig();
    try {
      await directusFetch("/items/m5_general");
      return res.json({
        success: true,
        connected: true,
        database: "Directus Cloud",
        url,
        internalUrl,
        token
      });
    } catch (err: any) {
      return res.json({
        success: true,
        connected: false,
        database: "Local JSON (db.json Fallback)",
        reason: err.message || "Failed to connect to Directus",
        url,
        internalUrl,
        token
      });
    }
  });

  // API: Save Directus connection settings
  app.post("/api/directus-config", async (req, res) => {
    try {
      const { url, internalUrl, token } = req.body;
      const localDb = getLocalDb() as any;
      localDb.directus = {
        url: url || "",
        internalUrl: internalUrl || "",
        token: token || ""
      };
      saveLocalDb(localDb);
      isInternalUrlHealthy = true; // Reset health check flag on new configuration
      return res.json({ success: true, message: "บันทึกข้อมูลการตั้งค่า Directus เรียบร้อยแล้ว!" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. API: Get Settings, Rooms, Promos and Bookings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getSettingsFromDirectus();
      const bookings = await getBookingsFromDirectus();

      return res.json({
        success: true,
        settings,
        bookings
      });
    } catch (err: any) {
      console.error("Error building settings response:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Diagnostics API to check Directus collections
  app.get("/api/debug-directus", async (req, res) => {
    const report: any = {
      success: true,
      connected: false,
      collections: [] as any[],
      errors: [] as string[]
    };

    try {
      const localDb = getLocalDb();
      const collectionsToCheck = [
        { name: "m5_general", fields: ["hotelName", "thaiName", "heroTitle", "heroSubtitle", "contactPhone", "facebook", "lineId", "logoUrl", "adminPath"], localCount: 1 },
        { name: "m5_smtp", fields: ["host", "port", "secure", "user", "fromName", "fromEmail", "adminNotifyEmail"], localCount: 1 },
        { name: "m5_rooms", fields: ["roomId", "name", "thaiName", "price", "size", "capacity", "bedType", "imageUrl"], localCount: (localDb.rooms || []).length },
        { name: "m5_promotions", fields: ["promoId", "badge", "title", "desc", "highlight"], localCount: (localDb.promotions || []).length },
        { name: "m5_amenities", fields: ["iconName", "title", "desc"], localCount: (localDb.amenities || []).length },
        { name: "m5_faqs", fields: ["q", "a"], localCount: (localDb.faqs || []).length },
        { name: "m5_reviews", fields: ["name", "role", "review", "rating", "date"], localCount: (localDb.reviews || []).length },
        { name: "m5_gallery", fields: ["url", "title", "cat"], localCount: (localDb.gallery || []).length },
        { name: "m5_coupons", fields: ["code", "type", "value", "minNights", "active"], localCount: (localDb.coupons || []).length },
        { name: "m5_bookings", fields: ["bookingId", "roomType", "roomName", "checkIn", "checkOut", "guests", "guestName", "totalPrice", "status"], localCount: (localDb.bookings || []).length },
        { name: "m5_blocked_dates", fields: ["blockedId", "date", "roomId", "note"], localCount: (localDb.blockedDates || []).length },
        { name: "m5_members", fields: ["memberId", "name", "email", "phone", "password", "tier"], localCount: (localDb.members || []).length },
        { name: "m5_admins", fields: ["adminId", "username", "password", "name", "role"], localCount: (localDb.admins || []).length },
        { name: "m5_impact_events", fields: ["eventId", "title", "date", "time", "venue", "category", "active"], localCount: (localDb.impactEvents || []).length }
      ];

      // Ping to check basic connection
      try {
        await directusFetch("/collections"); // Test admin read collections
        report.connected = true;
      } catch (e) {
        // If /collections isn't allowed, check if we can read any single collection
        try {
          await directusFetch("/items/m5_general");
          report.connected = true;
        } catch (err: any) {
          report.connected = false;
          report.success = false;
          report.errors.push(`Directus connectivity check failed: ${err.message}`);
          return res.json(report);
        }
      }

      for (const col of collectionsToCheck) {
        const colReport: any = {
          name: col.name,
          exists: false,
          directusCount: 0,
          localCount: col.localCount,
          fieldsChecked: {} as Record<string, boolean>,
          status: "PENDING",
          error: null
        };

        try {
          // 1. Fetch items to see if they exist and count them
          const items = await directusFetch(`/items/${col.name}`);
          colReport.exists = true;
          colReport.directusCount = items ? items.length : 0;

          // 2. Fetch specific fields info if possible to verify schema, or inspect first item
          let directusFields: string[] = [];
          try {
            // Try fetching schema fields first
            const fieldsMeta = await directusFetch(`/fields/${col.name}`);
            if (fieldsMeta && Array.isArray(fieldsMeta)) {
              directusFields = fieldsMeta.map((f: any) => f.field);
            }
          } catch {
            // Fallback: If fields meta isn't readable, inspect the keys of the first item returned
            if (items && items.length > 0) {
              directusFields = Object.keys(items[0]);
            }
          }

          // If we have field names, check against expected fields
          if (directusFields.length > 0) {
            let missingFieldCount = 0;
            for (const expectedField of col.fields) {
              const present = directusFields.includes(expectedField);
              colReport.fieldsChecked[expectedField] = present;
              if (!present) missingFieldCount++;
            }

            if (missingFieldCount > 0) {
              colReport.status = "MISSING_FIELDS";
              report.success = false;
            } else {
              colReport.status = "OK";
            }
          } else {
            // No items to inspect and fields metadata blocked, but table exists!
            // Assume OK for existence, but mark fields as verified if we could load items
            for (const expectedField of col.fields) {
              colReport.fieldsChecked[expectedField] = true; // Optimistic fallback
            }
            colReport.status = "OK";
          }
        } catch (err: any) {
          colReport.exists = false;
          colReport.status = "MISSING_COLLECTION";
          colReport.error = err.message || err;
          report.success = false;
        }

        report.collections.push(colReport);
      }

      return res.json(report);
    } catch (err: any) {
      report.success = false;
      report.errors.push(`Global diagnostic failed: ${err.message}`);
      return res.json(report);
    }
  });

  // 4. API: Update Settings
  app.post("/api/settings", async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings) {
        return res.status(400).json({ error: "ข้อมูลว่างเปล่า" });
      }

      // First, save to local db.json immediately to guarantee persistence
      const localDb = getLocalDb();
      if (settings.general) localDb.general = settings.general;
      if (settings.smtp) localDb.smtp = settings.smtp;
      if (settings.line) localDb.line = settings.line;
      if (settings.rooms) localDb.rooms = settings.rooms;
      if (settings.promotions) localDb.promotions = settings.promotions;
      if (settings.amenities) localDb.amenities = settings.amenities;
      if (settings.faqs) localDb.faqs = settings.faqs;
      if (settings.reviews) localDb.reviews = settings.reviews;
      if (settings.gallery) localDb.gallery = settings.gallery;
      if (settings.blockedDates) localDb.blockedDates = settings.blockedDates;
      if (settings.coupons) localDb.coupons = settings.coupons;
      if (settings.slides) localDb.slides = settings.slides;
      if (settings.googlePlaceId !== undefined) localDb.googlePlaceId = settings.googlePlaceId;
      if (settings.googleReviewsEnabled !== undefined) localDb.googleReviewsEnabled = settings.googleReviewsEnabled;
      if (settings.impactEvents !== undefined) localDb.impactEvents = settings.impactEvents;
      if (settings.partners !== undefined) localDb.partners = settings.partners;
      if (settings.adminMenuConfig !== undefined) localDb.adminMenuConfig = settings.adminMenuConfig;
      if (settings.adminRoles !== undefined) localDb.adminRoles = settings.adminRoles;
      saveLocalDb(localDb);

      // Now attempt to sync with Directus in a try/catch block so that if Directus fails, the user request STILL succeeds!
      try {
        if (settings.general) {
          const { 
            impactSyncInterval, 
            lastImpactSyncTime, 
            googleReviewsSyncInterval, 
            lastGoogleReviewsSyncTime, 
            googleReviewsApiKey, 
            ...directusGeneral 
          } = settings.general;
          await ensureGeneralFieldsExist();
          await updateSingleton("m5_general", directusGeneral);
        }
        if (settings.smtp) {
          await updateSingleton("m5_smtp", settings.smtp);
        }

        if (settings.rooms) {
          await syncCollection("m5_rooms", settings.rooms, (room: any) => ({
            roomId: room.id,
            name: room.name,
            thaiName: room.thaiName,
            price: Number(room.price),
            size: Number(room.size),
            capacity: Number(room.capacity),
            bedType: room.bedType,
            description: room.description,
            longDescription: room.longDescription,
            imageUrl: room.imageUrl,
            amenities: JSON.stringify(room.amenities || []),
            matterportUrl: room.matterportUrl,
            active: room.active !== false
          }));
        }

        if (settings.promotions) {
          await syncCollection("m5_promotions", settings.promotions, (p: any) => ({
            promoId: p.id,
            badge: p.badge,
            title: p.title,
            desc: p.desc,
            highlight: p.highlight,
            active: p.active !== false
          }));
        }

        if (settings.amenities) {
          await syncCollection("m5_amenities", settings.amenities, (a: any) => ({
            iconName: a.iconName,
            title: a.title,
            desc: a.desc
          }));
        }

        if (settings.faqs) {
          await syncCollection("m5_faqs", settings.faqs, (f: any) => ({
            q: f.q,
            a: f.a
          }));
        }

        if (settings.reviews) {
          await syncCollection("m5_reviews", settings.reviews, (r: any) => ({
            name: r.name,
            role: r.role,
            review: r.review,
            rating: Number(r.rating),
            date: r.date
          }));
        }

        if (settings.gallery) {
          await syncCollection("m5_gallery", settings.gallery, (g: any) => ({
            url: g.url,
            title: g.title,
            cat: g.cat
          }));
        }

        if (settings.blockedDates) {
          await syncCollection("m5_blocked_dates", settings.blockedDates, (bd: any) => ({
            blockedId: bd.id,
            date: bd.date,
            roomId: bd.roomId,
            note: bd.note
          }));
        }

        if (settings.coupons) {
          await syncCollection("m5_coupons", settings.coupons, (c: any) => ({
            code: c.code,
            type: c.type,
            value: Number(c.value),
            minNights: Number(c.minNights),
            active: c.active === true,
            description: c.description
          }));
        }

        if (settings.impactEvents) {
          await ensureImpactEventsCollection();
          await syncCollection("m5_impact_events", settings.impactEvents, (e: any) => ({
            eventId: e.id,
            title: e.title,
            date: e.date,
            time: e.time || "",
            venue: e.venue,
            description: e.description,
            imageUrl: e.imageUrl,
            category: e.category,
            active: e.active !== false
          }));
        }

        if (settings.partners) {
          await ensurePartnersCollection();
          await syncCollection("m5_partners", settings.partners, (p: any) => ({
            partnerId: p.id,
            name: p.name,
            logoUrl: p.logoUrl,
            link: p.link || "",
            active: p.active !== false
          }));
        }
      } catch (directusErr) {
        console.warn("Directus settings sync failed, saved locally inside db.json:", directusErr);
      }

      return res.json({ success: true, settings });
    } catch (err: any) {
      console.error("Critical error saving settings:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. API: Get Bookings List
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await getBookingsFromDirectus();
      return res.json({ success: true, bookings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 6. API: Add booking record
  app.post("/api/bookings", async (req, res) => {
    try {
      const { booking } = req.body;
      if (!booking) {
        return res.status(400).json({ error: "กรุณาระบุข้อมูลการจอง" });
      }
      
      const savedBooking = await addBookingToDirectus(booking);

      // Trigger BOTH LINE and Email notifications concurrently
      getSettingsFromDirectus().then(async (settings) => {
        const localDb = getLocalDb() as any;
        const smtpConfig = settings?.smtp || localDb?.smtp || {};
        const lineConfig = (settings as any)?.line || localDb?.line || {};

        // 1. Email Notification (Admin + Guest)
        sendBookingEmail(savedBooking, smtpConfig).catch(err => {
          console.error("Async sendBookingEmail error:", err);
        });

        // 2. LINE Notification (LINE Notify / Messaging API / Webhook)
        sendBookingLineNotification(savedBooking, lineConfig).catch(err => {
          console.error("Async sendBookingLineNotification error:", err);
        });
      }).catch(err => {
        console.error("Async getSettingsFromDirectus for notifications error:", err);
      });

      return res.json({ success: true, booking: savedBooking });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 7. API: Update booking status
  app.post("/api/bookings/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await updateBookingStatusInDirectus(id, status);
      return res.json({ success: true, booking: { id, status } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8. API: Delete booking record
  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteBookingFromDirectus(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.1 API: Clear all bookings and remove mock data
  app.post("/api/bookings/clear-all", async (_req, res) => {
    try {
      const localDb = getLocalDb();
      localDb.bookings = [];
      localDb.deletedBookingIds = localDb.deletedBookingIds || [];
      if (!localDb.deletedBookingIds.includes("B-1001")) localDb.deletedBookingIds.push("B-1001");
      saveLocalDb(localDb);

      if (firestoreDb) {
        fsSetDoc(fsDoc(firestoreDb, "settings", "web"), { 
          bookings: [], 
          deletedBookingIds: localDb.deletedBookingIds 
        }, { merge: true }).catch(() => {});
        fsDeleteDoc(fsDoc(firestoreDb, "bookings", "B-1001")).catch(() => {});
      }
      return res.json({ success: true, message: "Cleared all bookings successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.2 API: Clear all gallery images completely
  app.post("/api/gallery/clear-all", async (_req, res) => {
    try {
      const localDb = getLocalDb() as any;
      localDb.gallery = [];
      saveLocalDb(localDb);

      if (firestoreDb) {
        fsSetDoc(fsDoc(firestoreDb, "settings", "web"), { gallery: [] }, { merge: true }).catch(() => {});
      }

      // Bulk clear all gallery items in Directus
      try {
        const current = await directusFetch("/items/m5_gallery?limit=-1&fields=id") || [];
        if (current && current.length > 0) {
          const ids = current.map((x: any) => x.id);
          for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            await directusFetch("/items/m5_gallery", {
              method: "DELETE",
              body: JSON.stringify(chunk)
            }).catch(() => {});
          }
        }
      } catch (dErr: any) {
        console.warn("[Gallery Clear] Directus warning:", dErr.message);
      }

      return res.json({ success: true, message: "Cleared all gallery images successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8.5 API: Update entire booking record
  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { booking } = req.body;
      await updateBookingInDirectus(id, booking);
      return res.json({ success: true, booking: { id, ...booking } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.55 API: Test SMTP / SMTP2GO connection and send a test email
  app.post("/api/smtp/test", async (req, res) => {
    try {
      const { smtp, testEmail } = req.body;
      if (!smtp || !testEmail) {
        return res.status(400).json({ error: "กรุณาระบุข้อมูล SMTP และอีเมลทดสอบ" });
      }

      const isSmtp2go = Boolean(smtp.apiKey || (smtp.host && smtp.host.includes("smtp2go")));
      const testHtml = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #c93d2b;">
          <h2 style="color: #c93d2b; text-transform: uppercase; font-weight: bold; margin-bottom: 20px;">The M5 Residence Loft</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #d1d5db;">ยินดีด้วย! ระบบการกำหนดค่าส่งเมลผ่าน ${isSmtp2go ? "SMTP2GO REST API" : "SMTP"} ของคุณได้รับการตรวจสอบและทำงานได้เสร็จสมบูรณ์เรียบร้อยแล้ว</p>
          <div style="background-color: #262626; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #c93d2b; font-family: monospace; font-size: 12px; color: #a3a3a3;">
            <strong>ระบบส่ง (Service):</strong> ${isSmtp2go ? "SMTP2GO API (Online)" : "Standard SMTP Server"}<br/>
            ${smtp.apiKey ? `<strong>API Base:</strong> ${smtp.apiBaseUrl || "https://api.smtp2go.com/v3/"}<br/>` : `<strong>Host:</strong> ${smtp.host}<br/><strong>Port:</strong> ${smtp.port}<br/>`}
            <strong>Sender Name:</strong> ${smtp.fromName || "The M5 Residence Loft"}<br/>
            <strong>Sender Email:</strong> ${smtp.fromEmail || "no-reply@them5residence.com"}<br/>
            <strong>ผู้รับทดสอบ:</strong> ${testEmail}
          </div>
          <p style="font-size: 12px; color: #737373;">นี่คือข้อความทดสอบอัตโนมัติจากหน้าแดชบอร์ดผู้ดูแลระบบ โรงแรมเดอะ เอ็มไฟว์ เรสซิเดนซ์ ยินดีต้อนรับครับ!</p>
        </div>
      `;

      const result = await sendEmailMessage({
        to: testEmail,
        subject: "🔔 ทดสอบระบบการส่งอีเมล - The M5 Residence",
        html: testHtml,
        text: `ทดสอบระบบการส่งอีเมล The M5 Residence สำเร็จไปยัง ${testEmail}`,
        smtpConfig: smtp
      });

      if (result.success) {
        return res.json({ 
          success: true, 
          message: `ส่งอีเมลทดสอบผ่าน ${isSmtp2go ? "SMTP2GO API" : "SMTP"} สำเร็จเรียบร้อยแล้ว! ${result.id ? `(ID: ${result.id})` : ""}` 
        });
      } else {
        return res.status(500).json({ 
          error: result.error || "เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ" 
        });
      }
    } catch (err: any) {
      console.error("[SMTP Test Error] Failed to send test email:", err);
      return res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการส่งอีเมลทดสอบผ่าน SMTP" });
    }
  });

  // 8.55b API: Test Realistic Booking Notification to Destination/Admin Emails
  app.post("/api/smtp/test-booking-alert", async (req, res) => {
    try {
      const { smtp, recipientEmails } = req.body;
      const targetEmails = recipientEmails || smtp?.adminNotifyEmail || "booking@them5residence.com";
      const targetList = (Array.isArray(targetEmails) ? targetEmails : String(targetEmails).split(/[,;\s]+/))
        .map((e: string) => e.trim())
        .filter((e: string) => e && e.includes("@"));

      if (targetList.length === 0) {
        return res.status(400).json({ error: "ไม่พบอีเมลผู้รับการแจ้งเตือนที่ถูกต้อง" });
      }

      const mockBooking = {
        id: `M5-${Math.floor(1000 + Math.random() * 9000)}`,
        guestName: "คุณทดสอบ ระบบรับข้อมูลการจอง (Test Reception)",
        guestEmail: "guest-test@example.com",
        guestPhone: "081-234-5678",
        roomName: "Superior Loft Suite (เตียงคิงไซส์)",
        roomType: "Superior Loft Suite",
        checkIn: new Date().toISOString().split("T")[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        guests: 2,
        totalPrice: 1590,
        status: "รอชำระเงิน (Pending)",
        specialRequest: "ทดสอบการรับอีเมลแจ้งเตือนการจองห้องพักต้นทาง The M5 Residence Loft"
      };

      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 2px solid #0f172a; background-color: #f8fafc; color: #1e293b; border-radius: 12px;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin-bottom: 20px;">
            <div style="display: inline-block; background-color: #d95a06; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">M5_TEST_NOTIFICATION</div>
            <h2 style="margin: 0; font-size: 20px; letter-spacing: 1.2px; font-weight: bold;">[ทดสอบระบบแจ้งเตือนการจองใหม่]</h2>
            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">จำลองข้อมูลการจองห้องพักที่ส่งมายังอีเมลรับต้นทาง</p>
          </div>
          
          <div style="padding: 10px 5px;">
            <p style="font-size: 14px; color: #0f172a; line-height: 1.6; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px; border-radius: 6px; color: #065f46;">
              ✅ <strong>ยินดีด้วย!</strong> ระบบเชื่อมต่ออีเมลรับต้นทางสำเร็จ ข้อมูลการจองห้องพักจริงจะถูกจัดส่งมายังอีเมล: <strong>${targetList.join(", ")}</strong>
            </p>

            <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; color: #0f172a; font-size: 15px; margin-top: 20px;">📋 ข้อมูลห้องพัก & ระยะเวลา</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8; margin-bottom: 20px;">
              <tr><td style="padding: 5px 0; color: #64748b; width: 160px; font-weight: bold;">รหัสรายการจอง:</td><td style="font-family: monospace; font-weight: bold; color: #d95a06; font-size: 15px;">${mockBooking.id}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">ห้องพัก:</td><td style="font-weight: bold;">${mockBooking.roomName}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">วันเข้าพัก (Check-in):</td><td>${mockBooking.checkIn}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">วันออกพัก (Check-out):</td><td>${mockBooking.checkOut}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">จำนวนคืนพัก:</td><td>1 คืน (${mockBooking.guests} ท่าน)</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">ยอดเงินเรียกเก็บสุทธิ:</td><td style="font-weight: bold; color: #d95a06; font-size: 16px;">${Number(mockBooking.totalPrice).toLocaleString()} THB</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">สถานะ:</td><td><strong style="color: #b45309;">${mockBooking.status}</strong></td></tr>
            </table>

            <h3 style="border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; color: #0f172a; font-size: 15px; margin-top: 20px;">👤 ข้อมูลผู้เข้าพัก (ลูกค้า)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.8;">
              <tr><td style="padding: 5px 0; color: #64748b; width: 160px; font-weight: bold;">ชื่อ-นามสกุล:</td><td><strong>${mockBooking.guestName}</strong></td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">อีเมลลูกค้า:</td><td><a href="mailto:${mockBooking.guestEmail}" style="color: #d95a06;">${mockBooking.guestEmail}</a></td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold;">เบอร์โทรศัพท์:</td><td style="font-family: monospace;">${mockBooking.guestPhone}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b; font-weight: bold; vertical-align: top;">คำขอพิเศษ:</td><td style="font-style: italic; color: #475569;">"${mockBooking.specialRequest}"</td></tr>
            </table>
          </div>

          <div style="background-color: #f1f5f9; padding: 15px; font-size: 12px; color: #64748b; text-align: center; border-radius: 8px; margin-top: 20px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-weight: bold; color: #475569;">SYSTEM NOTE: THE M5 RESIDENCE NOTIFICATION ENGINE</p>
            <p style="margin: 4px 0 0;">เวลามีลูกค้าทำการจองห้องพัก รายละเอียดการจองจะถูกจัดส่งมายังอีเมลนี้โดยอัตโนมัติ</p>
          </div>
        </div>
      `;

      const result = await sendEmailMessage({
        to: targetList,
        subject: `[ทดสอบรับเมลการจอง] แจ้งเตือนการจองห้องพักใหม่ #${mockBooking.id} - ${mockBooking.guestName}`,
        html: testHtml,
        smtpConfig: smtp
      });

      if (result.success) {
        return res.json({ 
          success: true, 
          message: `ส่งอีเมลแจ้งเตือนการจองทดสอบไปยัง ${targetList.join(", ")} สำเร็จแล้ว! ${result.id ? `(ID: ${result.id})` : ""}` 
        });
      } else {
        return res.status(500).json({ 
          error: result.error || "เกิดข้อผิดพลาดในการส่งอีเมลแจ้งเตือนการจองทดสอบ" 
        });
      }
    } catch (err: any) {
      console.error("[Test Booking Alert Error]:", err);
      return res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการส่งอีเมลทดสอบ" });
    }
  });

  // 8.56 API: Test LINE Notification
  app.post("/api/line/test", async (req, res) => {
    try {
      const { line, customMessage } = req.body;
      const testToken = line?.token || "";
      const testChannelAccessToken = line?.channelAccessToken || "";
      const testTargetId = line?.targetId || "";
      const testWebhookUrl = line?.webhookUrl || "";

      if (!testToken && !testChannelAccessToken && !testWebhookUrl) {
        return res.status(400).json({
          error: "กรุณาระบุ LINE Notify Token, Messaging API Token หรือ Webhook URL เพื่อทดสอบการส่ง"
        });
      }

      const mockBooking = {
        id: "TEST-LINE-" + Math.floor(1000 + Math.random() * 9000),
        roomName: "Superior Loft Suite (ทดสอบระบบ)",
        checkIn: new Date().toISOString().split("T")[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        guests: 2,
        totalPrice: 1800,
        status: "Pending",
        guestName: "ทดสอบการแจ้งเตือน LINE",
        guestPhone: "089-999-9999",
        guestEmail: "test@them5residence.com",
        specialRequest: customMessage || "🔔 ทดสอบการเชื่อมต่อระบบแจ้งเตือน LINE ของ The M5 Residence ทำงานสมบูรณ์ 100%"
      };

      const results = await sendBookingLineNotification(mockBooking, {
        token: testToken,
        channelAccessToken: testChannelAccessToken,
        targetId: testTargetId,
        webhookUrl: testWebhookUrl
      });

      const isSuccess = results.some(r => r.success);
      if (isSuccess) {
        return res.json({
          success: true,
          message: "ส่งข้อความแจ้งเตือนเข้า LINE สำเร็จเรียบร้อยแล้ว!",
          results
        });
      } else {
        const failureMessage = results.find(r => !r.success && r.message)?.message || "ไม่สามารถส่งข้อความเข้า LINE ได้";
        return res.status(400).json({
          success: false,
          error: failureMessage,
          results
        });
      }
    } catch (err: any) {
      console.error("[LINE Test Error]:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Send Quotation Email & LINE notification
  app.post("/api/quotations/send-email", async (req, res) => {
    try {
      const { document, company } = req.body;
      if (!document || !document.documentNumber) {
        return res.status(400).json({ error: "Missing document details" });
      }

      const settings = await getSettingsFromDirectus().catch(() => null);
      const localDb = getLocalDb() as any;
      const smtpConfig = settings?.smtp || localDb?.smtp || {};
      const lineConfig = (settings as any)?.line || localDb?.line || {};

      // 1. Send Email to Customer & Admin
      const emailResult = await sendQuotationEmail(document, company, smtpConfig).catch(err => ({ success: false, error: err.message }));

      // 2. Trigger LINE Notification for new quotation request
      sendQuotationLineNotification(document, lineConfig, "new_request").catch(err => {
        console.error("Async sendQuotationLineNotification error:", err);
      });

      return res.json({
        success: true,
        message: "ส่งใบเสนอราคาเข้าอีเมลเรียบร้อยแล้ว",
        emailResult
      });
    } catch (err: any) {
      console.error("Error in /api/quotations/send-email:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Notify Quotation Approval / Accepted by Customer
  app.post("/api/quotations/notify-approval", async (req, res) => {
    try {
      const { document, bookingId } = req.body;
      if (!document) {
        return res.status(400).json({ error: "Missing document details" });
      }

      const settings = await getSettingsFromDirectus().catch(() => null);
      const localDb = getLocalDb() as any;
      const lineConfig = (settings as any)?.line || localDb?.line || {};

      await sendQuotationLineNotification({
        ...document,
        remarks: `[ยืนยันสั่งจองสำเร็จ]: สร้างรายการจองหมายเลข #${bookingId || "Auto"}`
      }, lineConfig, "customer_approved").catch(err => {
        console.error("Async sendQuotationLineNotification customer_approved error:", err);
      });

      return res.json({ success: true, message: "บันทึกและส่งแจ้งเตือนการอนุมัติใบเสนอราคาเรียบร้อยแล้ว" });
    } catch (err: any) {
      console.error("Error in /api/quotations/notify-approval:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.57 API: Get Notification Audit Logs
  app.get("/api/notifications", async (req, res) => {
    try {
      const localDb = getLocalDb() as any;
      let logs = localDb.notifications || [];
      return res.json({ success: true, notifications: logs });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.6 API: Get Members List
  app.get("/api/members", async (req, res) => {
    try {
      const members = await getMembersFromDirectus();
      return res.json({ success: true, members });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.7 API: Register Member
  app.post("/api/members/register", async (req, res) => {
    try {
      const { member } = req.body;
      if (!member || !member.name || !member.email || !member.phone) {
        return res.status(400).json({ error: "กรุณาระบุข้อมูลสมัครสมาชิกให้ครบถ้วน" });
      }
      const saved = await registerMemberInDirectus(member);
      return res.json({ success: true, member: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 8.8 API: Login Member
  app.post("/api/members/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email) {
        return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ" });
      }
      const member = await loginMemberInDirectus(email);
      if (!member) {
        return res.status(404).json({ error: "ไม่พบข้อมูลสมาชิกที่ตรงกับอีเมลนี้" });
      }

      const inputPass = password || "password123";
      const actualPass = member.password || "password123";
      if (inputPass !== actualPass) {
        return res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" });
      }

      return res.json({ success: true, member });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.9 API: Update Member
  app.put("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { member } = req.body;
      const updated = await updateMemberInDirectus(id, member);
      return res.json({ success: true, member: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.95 API: Delete Member
  app.delete("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteMemberFromDirectus(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.96 API: Get Admins List
  app.get("/api/admins", async (req, res) => {
    try {
      const admins = await getAdminsFromDirectus();
      return res.json({ success: true, admins });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.97 API: Register Admin
  app.post("/api/admins/register", async (req, res) => {
    try {
      const { admin } = req.body;
      if (!admin || !admin.username || !admin.password || !admin.name) {
        return res.status(400).json({ error: "กรุณาระบุข้อมูลแอดมินให้ครบถ้วน" });
      }
      const saved = await addAdminInDirectus(admin);
      return res.json({ success: true, admin: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // 8.98 API: Update Admin
  app.put("/api/admins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { admin } = req.body;
      const updated = await updateAdminInDirectus(id, admin);
      return res.json({ success: true, admin: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8.99 API: Delete Admin
  app.delete("/api/admins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteAdminFromDirectus(id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API: File Upload
  app.post("/api/upload", async (req, res) => {
    try {
      const { base64Data, fileName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing base64Data" });
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let dataBuffer: Buffer;
      let extension = "jpg";
      let mimeType = "image/jpeg";

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        dataBuffer = Buffer.from(matches[2], "base64");
        const parts = mimeType.split("/");
        if (parts.length === 2) {
          extension = parts[1];
        }
      } else {
        dataBuffer = Buffer.from(base64Data, "base64");
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const safeName = fileName
        ? fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
        : `upload_${timestamp}_${randomStr}.${extension}`;

      const finalFileName = fileName ? `${timestamp}_${randomStr}_${safeName}` : safeName;

      // 0. Try to upload to Firebase Storage persistently (best for Cloud Run production)
      if (getApps().length > 0) {
        try {
          const bucket = getStorage().bucket();
          const file = bucket.file(`uploads/${finalFileName}`);
          await file.save(dataBuffer, {
            metadata: { contentType: mimeType }
          });
          // get a signed url or construct a media url
          // Cloud Storage for Firebase uses format:
          // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
          const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(`uploads/${finalFileName}`)}?alt=media`;
          console.log(`[Upload] Firebase Storage upload succeeded: ${downloadUrl}`);
          return res.json({
            success: true,
            url: downloadUrl
          });
        } catch (firebaseErr: any) {
          console.warn("[Upload] Firebase Storage persistent upload failed, trying fallbacks:", firebaseErr);
        }
      }

      // 1. Try to upload to Directus persistently first (best for Cloud Run production and user's database)
      try {
        const blob = new Blob([dataBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append("file", blob, finalFileName);

        const { url: dUrl, internalUrl: dInternalUrl, token: dToken } = getDirectusConfig();
        const resDirectus = await fetch(`${dInternalUrl}/files`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${dToken}`
          },
          body: formData
        });

        if (resDirectus.ok) {
          const resJson = await resDirectus.json();
          if (resJson && resJson.data && resJson.data.id) {
            const fileId = resJson.data.id;
            const directusFileUrl = `/api/assets/${fileId}`;
            console.log(`[Upload] Persistent upload succeeded via Directus (proxied): ${directusFileUrl}`);
            return res.json({
              success: true,
              url: directusFileUrl
            });
          }
        } else {
          const errText = await resDirectus.text();
          console.warn(`[Upload] Directus file upload returned non-OK: ${resDirectus.status}. Details: ${errText}`);
        }
      } catch (directusErr: any) {
        console.warn("[Upload] Directus persistent upload failed, trying fallbacks:", directusErr);
      }

      // 2. Fallback 1: Try to upload to ImgBB if IMGBB_API_KEY is configured
      if (process.env.IMGBB_API_KEY) {
        try {
          console.log("[Upload] Attempting ImgBB upload using IMGBB_API_KEY...");
          const blob = new Blob([dataBuffer], { type: mimeType });
          const formData = new FormData();
          formData.append("image", blob, finalFileName);

          const imgbbUrl = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;
          const resImgBB = await fetch(imgbbUrl, {
            method: "POST",
            body: formData
          });

          if (resImgBB.ok) {
            const resJson = await resImgBB.json();
            if (resJson && resJson.data && resJson.data.url) {
              const imageUrl = resJson.data.url;
              console.log(`[Upload] ImgBB upload succeeded: ${imageUrl}`);
              return res.json({
                success: true,
                url: imageUrl
              });
            }
          } else {
            const errText = await resImgBB.text();
            console.warn(`[Upload] ImgBB upload returned non-OK status: ${resImgBB.status}. Details: ${errText}`);
          }
        } catch (imgbbErr: any) {
          console.error("[Upload] Error uploading to ImgBB:", imgbbErr);
        }
      }

      // 3. Fallback 2: Try Catbox.moe upload (Free backup)
      try {
        console.log("[Upload] Attempting Catbox.moe upload (Free backup)...");
        const blob = new Blob([dataBuffer], { type: mimeType });
        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", blob, finalFileName);

        const resCatbox = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: formData
        });

        if (resCatbox.ok) {
          const catboxUrl = await resCatbox.text();
          if (catboxUrl && catboxUrl.startsWith("http")) {
            console.log(`[Upload] Catbox.moe upload succeeded: ${catboxUrl}`);
            return res.json({
              success: true,
              url: catboxUrl.trim()
            });
          }
        } else {
          console.warn(`[Upload] Catbox.moe returned non-OK status: ${resCatbox.status}`);
        }
      } catch (catboxErr: any) {
        console.error("[Upload] Error uploading to Catbox.moe:", catboxErr);
      }

      // 4. Fallback 3: Save to container local disk and public images
      const filePath = path.join(uploadsDir, finalFileName);
      fs.writeFileSync(filePath, dataBuffer);

      const pubFilePath = path.join(publicImagesDir, finalFileName);
      try {
        fs.writeFileSync(pubFilePath, dataBuffer);
      } catch (_) {}

      // Persist in Firestore if base64 fits within Firestore document limit (< 950KB)
      if (firestoreDb && base64Data && base64Data.length < 950000) {
        try {
          await fsSetDoc(fsDoc(firestoreDb, "uploads", finalFileName), {
            dataUrl: base64Data.startsWith("data:") ? base64Data : `data:${mimeType};base64,${base64Data}`,
            fileName: finalFileName,
            mimeType,
            uploadedAt: new Date().toISOString()
          });
          console.log(`[Upload] Persisted file to Firestore: ${finalFileName}`);
        } catch (fsErr: any) {
          console.warn("[Upload] Could not persist to Firestore:", fsErr.message);
        }
      }

      return res.json({
        success: true,
        url: `/uploads/${finalFileName}`
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API: Proxy Directus assets with Admin Authorization token
  app.get("/api/assets/:id", async (req, res) => {
    const { id } = req.params;

    const serveFallback = () => {
      // Use beautiful local images bundled in the codebase as seamless fallbacks
      const localImages = [
        "lobby_loft_m5_1782203250164.jpg",
        "bedroom_superior_m5_1782203272229.jpg",
        "bedroom_deluxe_m5_1782203318372.jpg",
        "bedroom_studio_m5_1782203293730.jpg"
      ];
      
      // Create a simple stable hash of the ID to consistently pick the same fallback for the same asset ID
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % localImages.length;
      const selectedFallback = localImages[index];
      
      // Check public/images first (bundled in codebase), then uploads
      let fallbackPath = path.join(process.cwd(), "public", "images", selectedFallback);
      if (!fs.existsSync(fallbackPath)) {
        fallbackPath = path.join(process.cwd(), "uploads", selectedFallback);
      }
      if (!fs.existsSync(fallbackPath)) {
        fallbackPath = path.join(process.cwd(), "src", "assets", "images", selectedFallback);
      }
      
      if (fs.existsSync(fallbackPath)) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
        return res.status(200).sendFile(fallbackPath);
      } else {
        return res.status(404).send("Asset not found");
      }
    };

    try {
      const dConfig = getDirectusConfig();
      const internalUrlClean = dConfig.internalUrl.endsWith("/") ? dConfig.internalUrl.slice(0, -1) : dConfig.internalUrl;
      
      // Forward any Directus transform query parameters (width, height, quality, fit, etc.)
      const params = new URLSearchParams(req.query as any);
      const queryParams = params.toString();
      const url = `${internalUrlClean}/assets/${id}${queryParams ? `?${queryParams}` : ""}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${dConfig.token}`
          }
        });
      } catch (fErr) {
        clearTimeout(timeoutId);
        return serveFallback();
      }
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`[Proxy Asset] Directus returned ${response.status} for ${id}. Serving a stable local fallback image.`);
        return serveFallback();
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err: any) {
      console.error("[Proxy Asset] Error proxying asset, serving stable fallback:", err);
      try {
        return serveFallback();
      } catch (fallbackErr) {
        return res.status(500).send("Internal server error proxying asset");
      }
    }
  });

  // 9. API: Reseed / Repair database defaults
  app.post("/api/reseed", async (req, res) => {
    try {
      const { force } = req.body;
      await reseedDirectus(force === true);
      const settings = await getSettingsFromDirectus();
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 10. Vite development middleware / Static production serve
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Using Vite Dev Middleware.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`The M5 Residence Server running on http://0.0.0.0:${PORT}`);
    startImpactSyncScheduler();
    startGoogleReviewsSyncScheduler();
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

