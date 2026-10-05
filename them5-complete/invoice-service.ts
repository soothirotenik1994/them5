import { invoiceTotals } from "./invoice-math.ts";
import crypto from 'node:crypto';
import type { Express } from 'express';

export const defaultInvoiceSettings = {
  companyNameEn: 'THE FELIX PROPERTY CO.,LTD.',
  companyNameTh: 'บริษัท เดอะเฟลิกซ์ พร็อพเพอร์ตี้ จำกัด',
  branch: 'สำนักงานใหญ่',
  address: '37/93 หมู่ที่ 1 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120',
  phone: '02-288 0965 / มือถือ 099-617-8695',
  email: 'Them5residence@gmail.com',
  taxId: '0125561031626',
  vatRate: 7,
  prefix: 'NO.',
  logoUrl: '',
  footer: '*ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้รับชำระเงินเรียบร้อยแล้ว*',
};

export function installInvoices(app: Express, deps: { read: () => any; save: (db:any) => void; admin: (req:any) => any; route: (fn:any) => any; fail: (msg:string,status?:number) => never }) {
  const { read, save, admin, route, fail } = deps;
  const clean = (v:any, max=300) => String(v || '').trim().slice(0,max);
  app.get('/api/invoices/settings', route((req:any,res:any) => { admin(req); res.json({success:true,settings:{...defaultInvoiceSettings,...read().invoiceSettings}}); }));
  app.put('/api/invoices/settings', route((req:any,res:any) => {
    admin(req); const db=read(), input=req.body.settings || {};
    const settings:any = { ...defaultInvoiceSettings, ...db.invoiceSettings };
    for (const key of Object.keys(defaultInvoiceSettings)) if (input[key] !== undefined) settings[key] = key === 'vatRate' ? Number(input[key]) : clean(input[key],1000);
    if (!settings.companyNameTh || !settings.address || !/^\d{13}$/.test(settings.taxId) || !Number.isFinite(settings.vatRate) || settings.vatRate < 0 || settings.vatRate > 100 || !settings.prefix) fail('กรุณากรอกชื่อบริษัท ที่อยู่ เลขผู้เสียภาษี 13 หลัก และอัตราภาษีให้ถูกต้อง');
    db.invoiceSettings=settings;save(db);res.json({success:true,settings});
  }));
  app.get('/api/invoices', route((req:any,res:any)=>{admin(req);res.json({success:true,invoices:read().invoices || []});}));
  app.get('/api/invoices/:id', route((req:any,res:any)=>{admin(req);const invoice=(read().invoices || []).find((i:any)=>i.id===req.params.id);if(!invoice)fail('ไม่พบเอกสาร',404);res.json({success:true,invoice});}));
  app.post('/api/invoices', route((req:any,res:any)=>{
    const user=admin(req),db=read(),input=req.body;
    const booking=(db.bookings || []).find((b:any)=>b.id===input.bookingId);
    if(!booking)fail('ไม่พบรายการจอง',404);
    if(!['Paid','Checked-In','Completed'].includes(booking.status))fail('กรุณาตรวจสอบการรับชำระและตั้งสถานะ Paid ก่อนออกใบเสร็จ');
    const existing=(db.invoices || []).find((i:any)=>i.bookingId===booking.id && i.status!=='void');
    if(existing)fail(`รายการจองนี้ออกเอกสารแล้ว: ${existing.number}`,409);
    const buyer={name:clean(input.buyer?.name),address:clean(input.buyer?.address,1000),taxId:clean(input.buyer?.taxId),branch:clean(input.buyer?.branch || 'สำนักงานใหญ่'),phone:clean(input.buyer?.phone)};
    if(!buyer.name || !buyer.address || !/^\d{13}$/.test(buyer.taxId))fail('กรอกชื่อ ที่อยู่ และเลขผู้เสียภาษีลูกค้า 13 หลักให้ครบ');
    const date=clean(input.date);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail('วันที่เอกสารไม่ถูกต้อง');
    if(!Array.isArray(input.items)||input.items.length<1||input.items.length>8)fail('ระบุรายการ 1–8 รายการ');
    const items=input.items.map((i:any)=>({description:clean(i.description,240),quantity:Number(i.quantity),unitPrice:Math.round(Number(i.unitPrice)*100)/100}));
    if(items.some((i:any)=>!i.description||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>999||!Number.isFinite(i.unitPrice)||i.unitPrice<0||i.unitPrice>10000000))fail('รายละเอียด จำนวน หรือราคาต่อหน่วยไม่ถูกต้อง');
    const issuer={...defaultInvoiceSettings,...db.invoiceSettings};
    const totals=invoiceTotals(items,Number(issuer.vatRate));
    if(Math.round(totals.total*100)!==Math.round(booking.totalPrice*100))fail('ยอดรวมใบเสร็จต้องตรงกับยอดการจองที่รับชำระ');
    const period=String((Number(date.slice(0,4))+543)%100).padStart(4,'0')+'-'+date.slice(5,7);
    db.invoiceSequence=db.invoiceSequence||{};
    const sequence=Number(db.invoiceSequence[period]||0)+1;
    const number=issuer.prefix+period+'-'+String(sequence).padStart(3,'0');
    const payment={method:clean(input.payment?.method || 'cash'),bank:clean(input.payment?.bank),branch:clean(input.payment?.branch),chequeNo:clean(input.payment?.chequeNo),date:clean(input.payment?.date)};
    if(!['cash','transfer','cheque','card'].includes(payment.method))fail('วิธีชำระเงินไม่ถูกต้อง');
    const invoice={id:crypto.randomUUID(),number,date,bookingId:booking.id,checkIn:booking.checkIn,checkOut:booking.checkOut,issuer,buyer,items,...totals,payment,receiver:clean(input.receiver || user.name),status:'issued',createdAt:new Date().toISOString(),createdBy:user.id};
    db.invoiceSequence[period]=sequence;db.invoices=[invoice,...(db.invoices||[])];save(db);
    res.status(201).json({success:true,invoice});
  }));
  app.post('/api/invoices/:id/void',route((req:any,res:any)=>{
    const user=admin(req),db=read(),invoice=(db.invoices||[]).find((i:any)=>i.id===req.params.id);
    if(!invoice)fail('ไม่พบเอกสาร',404);
    if(invoice.status==='void')fail('เอกสารถูกยกเลิกแล้ว',409);
    const reason=clean(req.body.reason);if(!reason)fail('กรุณาระบุเหตุผลยกเลิก');
    Object.assign(invoice,{status:'void',voidReason:reason,voidAt:new Date().toISOString(),voidBy:user.id});save(db);res.json({success:true,invoice});
  }));
}
