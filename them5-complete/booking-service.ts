import { installNotifications } from "./notification-service.ts";
import { installInvoices } from "./invoice-service.ts";
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';

// One Node process owns the JSON store. Mutations are synchronous and atomic.
export function installBookingService(app: Express, sendEmail: (b: any, smtp: any) => Promise<any>) {
  const dbPath = path.resolve(process.env.DB_PATH || 'db.json');
  const read = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const save = (db: any) => {
    const tmp = dbPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, dbPath);
  };
  const hash = (password: string) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
  };
  const verify = (password: string, stored: string) => {
    if (!stored?.startsWith('scrypt:')) return false;
    const [, salt, digest] = stored.split(':');
    const actual = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(digest, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  };
  const safeUser = ({ password, ...user }: any) => user;
  const initial = read();
  for (const user of [...(initial.admins || []), ...(initial.members || [])]) {
    if (user.password && !user.password.startsWith('scrypt:')) user.password = hash(user.password);
  }
  save(initial);
  type Session = { id: string; kind: 'admin' | 'member'; expires: number };
  const sessions = new Map<string, Session>();
  const session = (req: Request, kind: 'admin' | 'member') => {
    const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`m5_${kind}=`))?.split('=')[1];
    const s = token ? sessions.get(token) : undefined;
    if (!s || s.kind !== kind || s.expires < Date.now()) return null;
    const db = read();
    return (kind === 'admin' ? db.admins : db.members)?.find((u: any) => u.id === s.id) || null;
  };
  const issue = (res: Response, user: any, kind: 'admin' | 'member') => {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { id: user.id, kind, expires: Date.now() + 8 * 3600000 });
    res.cookie(`m5_${kind}`, token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', maxAge: 8 * 3600000, path: '/' });
  };
  const fail = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
  const route = (fn: (req: Request, res: Response) => any) => (req: Request, res: Response, next: any) => {
    try { Promise.resolve(fn(req, res)).catch(next); } catch (e) { next(e); }
  };
  const admin = (req: Request) => session(req, 'admin') || fail('กรุณาเข้าสู่ระบบผู้ดูแล', 401);
  const chief = (req: Request) => { const a = admin(req); if (a.role !== 'Super Admin') fail('ต้องใช้สิทธิ์ Super Admin', 403); return a; };
  const statuses = ['Pending', 'Paid', 'Confirmed', 'Checked-In', 'Completed', 'Cancelled'];
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  function dates(b: any, allowPast = false) {
    for (const d of [b.checkIn, b.checkOut]) {
      if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) fail('วันที่ไม่ถูกต้อง');
    }
    const nights = (Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86400000;
    if (nights < 1 || nights > 365 || (!allowPast && b.checkIn < today())) fail('เลือกวันเข้าพักตั้งแต่วันนี้ และวันออกหลังวันเข้าพัก (สูงสุด 365 คืน)');
    if (!Number.isInteger(Number(b.guests)) || Number(b.guests) < 1) fail('จำนวนผู้เข้าพักไม่ถูกต้อง');
    return nights;
  }
  function remaining(db: any, room: any, b: any, except?: string) {
    let left = Number(room.inventory ?? 1);
    for (let ms = Date.parse(b.checkIn); ms < Date.parse(b.checkOut); ms += 86400000) {
      const d = new Date(ms).toISOString().slice(0, 10);
      if ((db.blockedDates || []).some((x: any) => x.date === d && (x.roomId === 'all' || x.roomId === room.id))) return 0;
      const used = (db.bookings || []).filter((x: any) => x.id !== except && x.roomType === room.id && !['Cancelled', 'Completed'].includes(x.status) && x.checkIn <= d && x.checkOut > d).length;
      left = Math.min(left, Number(room.inventory ?? 1) - used);
    }
    return left;
  }
  function quote(db: any, b: any, member: any, except?: string, allowPast = false) {
    const nights = dates(b, allowPast);
    if (db.general?.bookingEnabled === false && !allowPast) fail(db.general.bookingDisabledMessage || 'ขณะนี้ปิดรับจอง');
    const room = db.rooms.find((r: any) => r.id === b.roomType && r.active !== false);
    if (!room) fail('ไม่พบห้องพักที่เปิดรับจอง');
    if (Number(b.guests) > Number(room.capacity)) fail('จำนวนผู้เข้าพักเกินความจุห้อง');
    if (remaining(db, room, b, except) < 1) fail('ห้องพักเต็มหรือปิดรับจองในวันที่เลือก', 409);
    const base = Number(room.price) * nights;
    const discount = base * ({ Silver: .05, Gold: .1, Elite: .15 }[member?.tier as string] || 0);
    let couponDiscount = 0;
    if (b.couponCode) {
      const coupon = (db.coupons || []).find((c: any) => c.code === String(b.couponCode).trim().toUpperCase() && c.active);
      if (!coupon || nights < Number(coupon.minNights || 1)) fail('คูปองไม่ถูกต้องหรือจำนวนคืนไม่ถึงขั้นต่ำ');
      couponDiscount = coupon.type === 'percent' ? base * Number(coupon.value) / 100 : Number(coupon.value);
    }
    return { roomName: room.name, nights, totalPrice: Math.round(Math.max(0, base - discount - couponDiscount) * 100) / 100 };
  }
  function guest(b: any) {
    if (!String(b.guestName || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.guestEmail || '') || !/^[+\d ()-]{8,25}$/.test(b.guestPhone || '')) fail('กรุณากรอกชื่อ อีเมล และเบอร์โทรให้ถูกต้อง');
  }
  const settingsKeys = ['general','rooms','promotions','amenities','faqs','reviews','gallery','smtp','blockedDates','coupons','slides','googlePlaceId','googleReviewsEnabled','impactEvents'];
  function settings(db: any, privateView: boolean) {
    const result = Object.fromEntries(settingsKeys.map(k => [k, db[k]]));
    if (!privateView) {
      delete result.smtp;
      result.general = { ...result.general };
      delete result.general.googleReviewsApiKey;
    }
    return result;
  }
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'คำขอข้ามเว็บไซต์ไม่ได้รับอนุญาต' });
    }
    next();
  });
  const attempts = new Map<string, { count: number; until: number }>();
  app.post(['/api/auth/login','/api/members/login','/api/auth/setup','/api/bookings/lookup','/api/payments','/api/members/register','/api/bookings'], (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    let a = attempts.get(key);
    if (!a || a.until < Date.now()) { a = { count: 0, until: Date.now() + 600000 }; attempts.set(key, a); }
    if (++a.count > 20) return res.status(429).json({ error: 'ลองใหม่อีกครั้งใน 10 นาที' });
    next();
  });
  const notifications = installNotifications(app, { read, save, admin, route, fail });
  app.get('/api/health', (_req, res) => res.json({ success: true, storage: 'local-json', now: new Date().toISOString() }));
  app.get('/api/auth/session', (req, res) => res.json({ success: true, admin: session(req, 'admin') ? safeUser(session(req, 'admin')) : null, member: session(req, 'member') ? safeUser(session(req, 'member')) : null, setupRequired: !read().admins?.length }));
  app.post('/api/auth/setup', route((req, res) => {
    const db = read();
    if (db.admins?.length) fail('ตั้งค่าบัญชีผู้ดูแลแล้ว', 409);
    const { username, password, name } = req.body;
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username || '') || typeof password !== 'string' || password.length < 10) fail('ชื่อผู้ใช้ 3–40 ตัวอักษร และรหัสผ่านอย่างน้อย 10 ตัวอักษร');
    const user = { id: crypto.randomUUID(), username: username.toLowerCase(), password: hash(password), name: String(name || username), role: 'Super Admin' };
    db.admins = [user]; save(db); issue(res, user, 'admin');
    res.json({ success: true, admin: safeUser(user) });
  }));
  for (const kind of ['admin', 'member'] as const) {
    app.post(kind === 'admin' ? '/api/auth/login' : '/api/members/login', route((req, res) => {
      const db = read();
      const login = String(kind === 'admin' ? req.body.username || '' : req.body.email || '').trim().toLowerCase();
      const user = (kind === 'admin' ? db.admins : db.members)?.find((u: any) => String(kind === 'admin' ? u.username : u.email).toLowerCase() === login);
      if (!user || typeof req.body.password !== 'string' || !verify(req.body.password, user.password)) fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
      issue(res, user, kind); res.json({ success: true, [kind]: safeUser(user) });
    }));
    app.post(kind === 'admin' ? '/api/auth/logout' : '/api/members/logout', (req, res) => {
      const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith(`m5_${kind}=`))?.split('=')[1];
      if (token) sessions.delete(token);
      res.clearCookie(`m5_${kind}`, { path: '/' }); res.json({ success: true });
    });
  }
  app.get('/api/settings', (req, res) => {
    const db = read(), a = session(req, 'admin'), m = session(req, 'member');
    res.json({ success: true, settings: settings(db, !!a), bookings: a ? db.bookings : (db.bookings || []).filter((b: any) => m && b.memberId === m.id) });
  });
  app.post('/api/settings', route((req, res) => {
    admin(req); const db = read(), input = req.body.settings;
    if (!input || !Array.isArray(input.rooms)) fail('ข้อมูลการตั้งค่าไม่ถูกต้อง');
    const ids = new Set();
    for (const r of input.rooms) {
      if (!r.id || ids.has(r.id) || !r.name || !Number.isFinite(Number(r.price)) || Number(r.price) < 0 || !Number.isInteger(Number(r.capacity)) || Number(r.capacity) < 1 || !Number.isInteger(Number(r.inventory ?? 1)) || Number(r.inventory ?? 1) < 1) fail('ข้อมูลห้องพักหรือจำนวนห้องไม่ถูกต้อง');
      ids.add(r.id);
      for (const b of db.bookings || []) {
        if (b.roomType === r.id && !['Cancelled','Completed'].includes(b.status) && b.checkOut > today() && remaining({ ...db, blockedDates: [] }, r, b) < 0) fail('จำนวนห้องต่ำกว่ายอดจอง');
      }
    }
    for (const b of db.bookings || []) if (!['Cancelled','Completed'].includes(b.status) && b.checkOut > today() && !ids.has(b.roomType)) fail('ห้องนี้ยังมีรายการจอง กรุณาปิดรับจองแทนการลบ');
    for (const c of input.coupons || []) if (!['fixed','percent'].includes(c.type) || !Number.isFinite(Number(c.value)) || Number(c.value) < 0 || (c.type === 'percent' && Number(c.value) > 100)) fail('มูลค่าคูปองไม่ถูกต้อง');
    for (const k of settingsKeys) if (input[k] !== undefined) db[k] = input[k];
    save(db); res.json({ success: true });
  }));
  app.get('/api/db-status', (_req, res) => res.json({ success: true, connected: true, database: 'Local JSON — บันทึกในเครื่อง', reason: 'ข้อมูลบันทึกใน db.json; ใช้เซิร์ฟเวอร์หนึ่ง process' }));
  app.post('/api/rooms/check-availability', route((req, res) => {
    dates(req.body); const db = read();
    const availableRooms = db.rooms.filter((r: any) => r.active !== false && (!req.body.roomType || req.body.roomType === 'all' || req.body.roomType === r.id)).map((r: any) => ({ ...r, maxGuests: r.capacity, remaining: remaining(db, r, req.body), available: db.general?.bookingEnabled !== false && Number(req.body.guests) <= r.capacity && remaining(db, r, req.body) > 0 }));
    res.json({ success: true, ...req.body, availableRooms });
  }));
  app.get('/api/bookings', route((req, res) => { admin(req); res.json({ success: true, bookings: read().bookings || [] }); }));
  app.post('/api/bookings', route((req, res) => {
    const db = read(), b = req.body.booking;
    if (!b) fail('กรุณาระบุข้อมูลการจอง');
    const member = session(req, 'member'); guest(b);
    const priced = quote(db, b, member);
    const booking = { id: `M5-${crypto.randomBytes(6).toString('hex').toUpperCase()}`, roomType: b.roomType, roomName: priced.roomName, checkIn: b.checkIn, checkOut: b.checkOut, guests: Number(b.guests), guestName: b.guestName.trim(), guestEmail: b.guestEmail.trim().toLowerCase(), guestPhone: b.guestPhone, specialRequest: String(b.specialRequest || '').slice(0, 2000), couponCode: b.couponCode || '', totalPrice: priced.totalPrice, status: 'Pending', createdAt: new Date().toISOString(), memberId: member?.id || null };
    db.bookings = [booking, ...(db.bookings || [])]; notifications.enqueue(db, "booking", booking); save(db);
    void notifications.flush().catch(console.error);
    res.status(201).json({ success: true, booking });
  }));
  app.post('/api/bookings/lookup', route((req, res) => {
    const b = (read().bookings || []).find((b: any) => b.id === String(req.body.id || '').trim().toUpperCase() && b.guestEmail === String(req.body.email || '').trim().toLowerCase());
    if (!b) fail('ไม่พบรายการจอง กรุณาตรวจสอบเลขการจองและอีเมล', 404);
    const { guestPhone, specialRequest, memberId, ...publicBooking } = b;
    res.json({ success: true, booking: publicBooking });
  }));
  app.post('/api/bookings/:id/status', route((req, res) => {
    admin(req); const db = read(), b = db.bookings.find((b: any) => b.id === req.params.id);
    if (!b) fail('ไม่พบรายการจอง', 404);
    const status = req.body.status;
    if (!statuses.includes(status)) fail('สถานะไม่ถูกต้อง');
    if (!['Cancelled','Completed'].includes(status)) quote(db, b, db.members?.find((m: any) => m.id === b.memberId), b.id, true);
    if (status === 'Completed' && !b.pointsAwarded && b.memberId) {
      const member = db.members.find((m: any) => m.id === b.memberId);
      if (member) { member.points = Number(member.points || 0) + Math.floor(b.totalPrice / 100); member.joinedBookingsCount = Number(member.joinedBookingsCount || 0) + 1; b.pointsAwarded = true; }
    }
    b.status = status; save(db); res.json({ success: true, booking: b });
  }));
  app.put('/api/bookings/:id', route((req, res) => {
    admin(req); const db = read(), b = db.bookings.find((b: any) => b.id === req.params.id);
    if (!b) fail('ไม่พบรายการจอง', 404);
    const updates = Object.fromEntries(['roomType','checkIn','checkOut','guests','guestName','guestEmail','guestPhone','specialRequest'].filter(k => req.body.booking?.[k] !== undefined).map(k => [k, req.body.booking[k]]));
    const next = { ...b, ...updates }; guest(next);
    const priced = quote(db, next, db.members?.find((m: any) => m.id === b.memberId), b.id, true);
    Object.assign(b, updates, { totalPrice: priced.totalPrice, roomName: priced.roomName }); save(db); res.json({ success: true, booking: b });
  }));
  app.delete('/api/bookings/:id', route((req, res) => { admin(req); const db = read(); if (!db.bookings.some((b: any) => b.id === req.params.id)) fail('ไม่พบรายการจอง', 404); db.bookings = db.bookings.filter((b: any) => b.id !== req.params.id); save(db); res.json({ success: true }); }));
  app.get('/api/members', (req, res) => { const db = read(), a = session(req, 'admin'), m = session(req, 'member'); res.json({ success: true, members: (a ? db.members || [] : m ? [m] : []).map(safeUser) }); });
  app.post('/api/members/register', route((req, res) => {
    const db = read(), m = req.body.member || {}, a = session(req, 'admin');
    if (!a && db.general?.allowRegistration === false) fail('ปิดรับสมัครสมาชิก');
    guest({ guestName: m.name, guestEmail: m.email, guestPhone: m.phone });
    if (typeof m.password !== 'string' || m.password.length < 8) fail('รหัสผ่านสมาชิกอย่างน้อย 8 ตัวอักษร');
    const email = m.email.trim().toLowerCase();
    if ((db.members || []).some((u: any) => u.email.toLowerCase() === email)) fail('อีเมลนี้มีบัญชีแล้ว', 409);
    const user = { id: crypto.randomUUID(), name: m.name.trim(), email, phone: m.phone, password: hash(m.password), tier: 'Silver', points: 0, joinedBookingsCount: 0, createdAt: new Date().toISOString() };
    db.members = [...(db.members || []), user]; save(db); if (!a) issue(res, user, 'member'); res.status(201).json({ success: true, member: safeUser(user) });
  }));
  app.put('/api/members/:id', route((req, res) => {
    const a = session(req, 'admin'), m = session(req, 'member');
    if (!a && m?.id !== req.params.id) fail('ไม่มีสิทธิ์แก้ไขสมาชิก', 403);
    const db = read(), user = db.members.find((u: any) => u.id === req.params.id), input = req.body.member || {};
    if (!user) fail('ไม่พบสมาชิก', 404);
    const next = { ...user, ...Object.fromEntries(['name','email','phone', ...(a ? ['tier','points','joinedBookingsCount'] : [])].filter(k => input[k] !== undefined).map(k => [k,input[k]])) };
    guest({ guestName: next.name, guestEmail: next.email, guestPhone: next.phone }); next.email = next.email.trim().toLowerCase();
    if (db.members.some((u: any) => u.id !== user.id && u.email.toLowerCase() === next.email)) fail('อีเมลนี้ถูกใช้แล้ว', 409);
    if (input.password) { if (input.password.length < 8) fail('รหัสผ่านอย่างน้อย 8 ตัวอักษร'); next.password = hash(input.password); }
    if (!['Silver','Gold','Elite'].includes(next.tier) || !Number.isFinite(Number(next.points)) || Number(next.points) < 0) fail('ข้อมูลสมาชิกไม่ถูกต้อง');
    Object.assign(user, next); save(db); res.json({ success: true, member: safeUser(user) });
  }));
  app.delete('/api/members/:id', route((req, res) => { admin(req); const db = read(); db.members = db.members.filter((u: any) => u.id !== req.params.id); save(db); res.json({ success: true }); }));
  app.get('/api/admins', route((req, res) => { admin(req); res.json({ success: true, admins: read().admins.map(safeUser) }); }));
  app.post('/api/admins/register', route((req, res) => {
    chief(req); const db = read(), a = req.body.admin || {};
    if (!/^[\w.-]{3,40}$/.test(a.username || '') || typeof a.password !== 'string' || a.password.length < 10) fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (รหัสผ่านอย่างน้อย 10 ตัวอักษร)');
    if (db.admins.some((u: any) => u.username.toLowerCase() === a.username.toLowerCase())) fail('ชื่อผู้ใช้ซ้ำ',409);
    const user = { id: crypto.randomUUID(), username: a.username.toLowerCase(), name: a.name || a.username, role: a.role === 'Super Admin' ? 'Super Admin' : 'General Admin', password: hash(a.password) };
    db.admins.push(user); save(db); res.json({ success: true, admin: safeUser(user) });
  }));
  app.put('/api/admins/:id', route((req, res) => {
    chief(req); const db = read(), u = db.admins.find((u: any) => u.id === req.params.id), a = req.body.admin || {};
    if (!u) fail('ไม่พบบัญชี',404);
    if (a.username && (!/^[\w.-]{3,40}$/.test(a.username) || db.admins.some((v: any) => v.id !== u.id && v.username.toLowerCase() === a.username.toLowerCase()))) fail('ชื่อผู้ใช้ไม่ถูกต้องหรือซ้ำ');
    if (u.role === 'Super Admin' && a.role && a.role !== 'Super Admin' && db.admins.filter((v: any) => v.role === 'Super Admin').length === 1) fail('ต้องเหลือ Super Admin อย่างน้อยหนึ่งบัญชี');
    if (a.password) { if (a.password.length < 10) fail('รหัสผ่านอย่างน้อย 10 ตัวอักษร'); u.password = hash(a.password); }
    for (const k of ['username','name','role']) if (a[k]) u[k] = a[k]; save(db); res.json({ success: true, admin: safeUser(u) });
  }));
  app.delete('/api/admins/:id', route((req, res) => { const a = chief(req); if (a.id === req.params.id) fail('ไม่สามารถลบบัญชีที่กำลังใช้งาน'); const db = read(); db.admins = db.admins.filter((u: any) => u.id !== req.params.id); save(db); res.json({ success: true }); }));
  app.post(['/api/directus-config','/api/reseed'], route((_req, _res) => fail('รุ่นนี้ใช้ฐานข้อมูลในเครื่อง; สำรอง db.json และ uploads ก่อนเปลี่ยนระบบจัดเก็บ', 409)));
  app.post('/api/upload', route((req, res) => {
    admin(req);
    const match = String(req.body.base64Data || '').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) fail('รองรับเฉพาะภาพ JPG, PNG หรือ WebP');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) fail('รูปภาพต้องไม่เกิน 5 MB');
    const valid = match[1] === 'jpeg' ? buffer.subarray(0,3).equals(Buffer.from([255,216,255])) : match[1] === 'png' ? buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : buffer.subarray(0,4).toString() === 'RIFF' && buffer.subarray(8,12).toString() === 'WEBP';
    if (!valid) fail('เนื้อหาไฟล์ไม่ตรงกับชนิดรูปภาพ');
    const dir = path.resolve('uploads'); fs.mkdirSync(dir, { recursive: true });
    const name = `${crypto.randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
    fs.writeFileSync(path.join(dir, name), buffer);
    res.json({ success: true, url: `/uploads/${name}` });
  }));
  app.get('/api/backup', route((req, res) => { chief(req); res.attachment(`m5-backup-${today()}.json`).json(read()); }));
  installInvoices(app, { read, save, admin, route, fail });
  // Optional integrations below this middleware retain their existing implementation.
  app.use('/api', (req, res, next) => {
    const publicRead = req.method === 'GET' && (['/weather','/impact-events'].includes(req.path) || req.path.startsWith('/assets/'));
    if (publicRead || (req.method === 'POST' && req.path === '/chat')) return next();
    if (!session(req, 'admin')) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแล' });
    next();
  });
}
