import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { installBookingService } from '../booking-service.ts';
import { invoiceTotals, thaiBaht } from '../invoice-math.ts';

test('booking lifecycle, authorization, inventory and durable storage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'm5-test-'));
  const old = process.env.DB_PATH;
  process.env.DB_PATH = path.join(dir, 'db.json');
  fs.writeFileSync(process.env.DB_PATH, JSON.stringify({ general:{bookingEnabled:true}, rooms:[{id:'twin',name:'Twin',price:1000,capacity:2,inventory:1,active:true}], admins:[],members:[],bookings:[],coupons:[{code:'SAVE10',type:'percent',value:10,minNights:1,active:true}],blockedDates:[] }));
  const app = express(); app.use(express.json()); installBookingService(app, async()=>false);
  app.use((err:any,_req:any,res:any,_next:any)=>res.status(err.status||500).json({error:err.message}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  let cookie = '';
  async function call(url:string, method='GET', data?:any, authenticated=false) {
    const response = await fetch(base+url, {method,headers:{'Content-Type':'application/json', ...(authenticated ? {cookie} : {})},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    assert.equal((await call('/api/bookings')).status,401);
    const setup=await call('/api/auth/setup','POST',{username:'manager',password:'Secure-test-2026'});
    assert.equal(setup.status,200); cookie=setup.cookie!;
    assert.equal(setup.data.admin.password,undefined);
    assert.equal((await call('/api/auth/setup','POST',{username:'second',password:'Secure-test-2026'})).status,409);
    assert.equal((await call('/api/auth/login','POST',{username:'admin',password:'admin123'})).status,401);
    const start = new Date(); start.setUTCDate(start.getUTCDate()+30);
    const finish = new Date(start); finish.setUTCDate(finish.getUTCDate()+2);
    const booking={roomType:'twin',checkIn:start.toISOString().slice(0,10),checkOut:finish.toISOString().slice(0,10),guests:2,guestName:'Test Guest',guestEmail:'guest@example.com',guestPhone:'0812345678',totalPrice:1,couponCode:'SAVE10'};
    assert.equal((await call('/api/bookings','POST',{booking:{...booking,checkOut:booking.checkIn}})).status,400);
    assert.equal((await call('/api/bookings','POST',{booking:{...booking,guests:3}})).status,400);
    const results=await Promise.all([call('/api/bookings','POST',{booking}),call('/api/bookings','POST',{booking})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
    const saved=results.find(r=>r.status===201)!.data.booking;
    assert.equal(saved.totalPrice,1800); assert.equal(saved.status,'Pending');
    const availability=await call('/api/rooms/check-availability','POST',booking);
    assert.equal(availability.data.availableRooms[0].available,false);
    const publicData=await call('/api/settings');
    assert.deepEqual(publicData.data.bookings,[]); assert.equal(publicData.data.settings.smtp,undefined);
    assert.equal((await call('/api/bookings/lookup','POST',{id:saved.id,email:'wrong@example.com'})).status,404);
    assert.equal((await call('/api/bookings/lookup','POST',{id:saved.id,email:booking.guestEmail})).data.booking.id,saved.id);
    assert.equal((await call(`/api/bookings/${saved.id}/status`,'POST',{status:'Paid'})).status,401);
    assert.equal((await call(`/api/bookings/${saved.id}/status`,'POST',{status:'Invalid'},true)).status,400);
    assert.equal((await call(`/api/bookings/${saved.id}/status`,'POST',{status:'Cancelled'},true)).status,200);
    assert.equal((await call('/api/rooms/check-availability','POST',booking)).data.availableRooms[0].available,true);
    const second=(await call('/api/bookings','POST',{booking})).data.booking;
    const invoiceInput={bookingId:second.id,date:booking.checkIn,buyer:{name:'บริษัททดสอบ',address:'กรุงเทพมหานคร',taxId:'0123456789012',branch:'สำนักงานใหญ่'},items:[{description:'Twin Room',quantity:1,unitPrice:1800}],payment:{method:'transfer'}};
    assert.equal((await call('/api/invoices','POST',invoiceInput,true)).status,400);
    await call(`/api/bookings/${second.id}/status`,'POST',{status:'Paid'},true);
    const invoice=(await call('/api/invoices','POST',invoiceInput,true)).data.invoice;
    assert.equal(invoice.total,1800); assert.equal(invoice.beforeVat+invoice.vat,1800);
    assert.equal((await call('/api/invoices','POST',invoiceInput,true)).status,409);
    assert.equal((await call('/api/invoices/'+invoice.id)).status,401);
    const issuer=(await call('/api/invoices/settings','GET',undefined,true)).data.settings;
    await call('/api/invoices/settings','PUT',{settings:{...issuer,companyNameTh:'บริษัทใหม่'}},true);
    assert.equal((await call('/api/invoices/'+invoice.id,'GET',undefined,true)).data.invoice.issuer.companyNameTh,issuer.companyNameTh);
    await call('/api/invoices/'+invoice.id+'/void','POST',{reason:'แก้ข้อมูลลูกค้า'},true);
    const replacement=(await call('/api/invoices','POST',invoiceInput,true)).data.invoice;
    assert.notEqual(replacement.number,invoice.number);
    await call(`/api/bookings/${second.id}/status`,'POST',{status:'Cancelled'},true);
    const registration=await call('/api/members/register','POST',{member:{name:'Member',email:'member@example.com',phone:'0891234567',password:'member-safe-123',tier:'Elite',points:999}});
    assert.equal(registration.status,201); assert.equal(registration.data.member.tier,'Silver'); assert.equal(registration.data.member.points,0); assert.equal(registration.data.member.password,undefined);
    assert.equal((await call('/api/members/login','POST',{email:'member@example.com',password:'wrong'})).status,401);
    assert.equal((await call('/api/members/login','POST',{email:'member@example.com',password:'member-safe-123'})).status,200);
    assert.equal((await call(`/api/members/${registration.data.member.id}`,'PUT',{member:{points:123}})).status,403);
    const db=JSON.parse(fs.readFileSync(process.env.DB_PATH!,'utf8'));
    assert.equal(db.bookings[0].status,'Cancelled'); assert.ok(db.admins[0].password.startsWith('scrypt:')); assert.ok(db.members[0].password.startsWith('scrypt:'));
    const settings=(await call('/api/settings','GET',undefined,true)).data.settings;
    settings.blockedDates=[{date:booking.checkIn,roomId:'all',note:'maintenance'}];
    assert.equal((await call('/api/settings','POST',{settings},true)).status,200);
    assert.equal((await call('/api/bookings','POST',{booking})).status,409);
    assert.equal((await call('/api/upload','POST',{base64Data:'data:text/html;base64,PHNjcmlwdD4='},true)).status,400);
    await call('/api/auth/logout','POST',{},true);
    assert.equal((await call('/api/admins','GET',undefined,true)).status,401);
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    if (old === undefined) delete process.env.DB_PATH; else process.env.DB_PATH=old;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('inclusive VAT and Thai amount wording match supplied example',()=>{
  assert.deepEqual(invoiceTotals([{quantity:1,unitPrice:1390}],7),{total:1390,beforeVat:1299.07,vat:90.93,amountText:'หนึ่งพันสามร้อยเก้าสิบบาทถ้วน'});
  assert.equal(thaiBaht(21.25),'ยี่สิบเอ็ดบาทยี่สิบห้าสตางค์');
  assert.equal(thaiBaht(101),'หนึ่งร้อยเอ็ดบาทถ้วน');
  assert.equal(thaiBaht(0),'ศูนย์บาทถ้วน');
});
