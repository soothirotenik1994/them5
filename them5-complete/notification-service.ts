import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { Express } from 'express';

const defaults = { emailEnabled:false,lineEnabled:false,bookingEnabled:true,paymentEnabled:true,customerEmail:false,emailRecipients:'',lineToken:'',lineSecret:'',lineRecipient:'',siteUrl:'' };
export function installNotifications(app:Express, deps:{read:()=>any;save:(db:any)=>void;admin:(req:any)=>any;route:(fn:any)=>any;fail:(message:string,status?:number)=>never}, delivery?: (job:any,db:any)=>Promise<void>) {
  const {read,save,admin,route,fail}=deps;
  const config=(db:any)=>({...defaults,...db.notifications});
  const slipsDir=path.join(path.dirname(path.resolve(process.env.DB_PATH||'db.json')),'private-slips');
  let running=false;
  async function send(job:any,db:any) {
    if(delivery)return delivery(job,db);
    const n=config(db);
    if(job.channel==='line') {
      if(!n.lineToken || !job.recipient)throw new Error('ยังไม่ได้ตั้งค่า LINE Channel access token หรือผู้รับ');
      const response=await fetch('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:`Bearer ${n.lineToken}`,'Content-Type':'application/json','X-Line-Retry-Key':job.id},body:JSON.stringify({to:job.recipient,messages:[{type:'text',text:job.text.slice(0,4900)}]}),signal:AbortSignal.timeout(15000)});
      if(!response.ok && !(response.status===409 && response.headers.get('x-line-accepted-request-id')))throw new Error(`LINE ส่งไม่สำเร็จ (HTTP ${response.status}) กรุณาตรวจสอบ Token, ผู้รับ และโควตา`);
    } else {
      const smtp=db.smtp||{};
      if(!smtp.host||!smtp.user||!smtp.pass)throw new Error('ยังไม่ได้ตั้งค่า SMTP ให้ครบ');
      const transport=nodemailer.createTransport({host:smtp.host,port:Number(smtp.port)||587,secure:smtp.secure===true,auth:{user:smtp.user,pass:smtp.pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
      try { await transport.sendMail({from:{name:smtp.fromName||'The M5 Residence',address:smtp.fromEmail||smtp.user},to:job.recipient,subject:job.subject,text:job.text,messageId:`<${job.id}@m5-residence.local>`}); }
      finally {transport.close();}
    }
  }
  function enqueue(db:any,event:'booking'|'payment',booking:any,payment?:any) {
    const n=config(db);
    if(!(event==='booking'?n.bookingEnabled:n.paymentEnabled))return;
    const subject=event==='booking'?'มีรายการจองห้องพักใหม่':'ลูกค้าแจ้งโอนเงิน — รอตรวจสอบ';
    const text=[subject,`เลขการจอง: ${booking.id}`,`ลูกค้า: ${booking.guestName}`,`ห้อง: ${booking.roomName}`,`เข้าพัก: ${booking.checkIn} ถึง ${booking.checkOut}`,`ยอดจอง: ${Number(booking.totalPrice).toFixed(2)} บาท`,...(payment?[`ยอดแจ้งโอน: ${payment.amount.toFixed(2)} บาท`,`วันที่โอน: ${payment.transferredAt}`,`ผู้โอน: ${payment.payerName}`]:[]),n.siteUrl?`ตรวจสอบในหลังบ้าน: ${n.siteUrl.replace(/\/$/,'')}/admin`:'กรุณาเปิดหลังบ้านเพื่อตรวจสอบ'].join('\n');
    const targets:any[]=[];
    if(n.emailEnabled)for(const recipient of String(n.emailRecipients).split(/[;,\n]/).map(s=>s.trim()).filter(Boolean))targets.push({channel:'email',recipient});
    if(n.lineEnabled && n.lineRecipient)targets.push({channel:'line',recipient:n.lineRecipient});
    if(n.emailEnabled&&n.customerEmail)targets.push({channel:'email',recipient:booking.guestEmail});
    db.notificationJobs=db.notificationJobs||[];
    for(const target of targets)db.notificationJobs.push({id:crypto.randomUUID(),event,bookingId:booking.id,paymentId:payment?.id,...target,subject,text,status:'pending',attempts:0,createdAt:new Date().toISOString(),nextAttempt:Date.now()});
  }
  async function flush() {
    if(running)return;running=true;
    try {
      const jobs=(read().notificationJobs||[]).filter((j:any)=>j.status==='pending'&&j.nextAttempt<=Date.now());
      for(const job of jobs) {
        let db=read(),current=db.notificationJobs.find((j:any)=>j.id===job.id);if(!current||current.status!=='pending')continue;
        current.status='sending';current.attempts++;save(db);
        let error='';try{await send(job,db);}catch(e:any){error=e.message||'ส่งไม่สำเร็จ';}
        db=read();current=db.notificationJobs.find((j:any)=>j.id===job.id);
        current.status=error?(current.attempts<3?'pending':'failed'):'sent';current.error=error;current.updatedAt=new Date().toISOString();current.nextAttempt=Date.now()+current.attempts*60000;save(db);
      }
    } finally {running=false;}
  }
  const initial=read();let changed=false;for(const j of initial.notificationJobs||[])if(j.status==='sending'){j.status='pending';changed=true;}if(changed)save(initial);
  const timer=setInterval(()=>{void flush().catch(console.error);},30000);timer.unref();
  app.get('/api/notifications/settings',route((req:any,res:any)=>{admin(req);const db=read(),n=config(db);res.json({success:true,settings:{...n,lineToken:'',lineSecret:'',hasLineToken:!!n.lineToken,hasLineSecret:!!n.lineSecret},smtp:{...db.smtp,pass:'',hasPassword:!!db.smtp?.pass},recipients:db.lineRecipients||[],paymentSettings:db.paymentSettings||{bankName:'',accountName:'',accountNumber:'',qrUrl:'',instructions:''}});}));
  app.put('/api/notifications/settings',route((req:any,res:any)=>{
    admin(req);const db=read(),n={...config(db)},input=req.body.settings||{};
    for(const key of Object.keys(defaults))if(input[key]!==undefined){if(['lineToken','lineSecret'].includes(key)&&!input[key])continue;(n as any)[key]=typeof(defaults as any)[key]==='boolean'?input[key]===true:String(input[key]).trim();}
    if(n.emailEnabled&&(!n.emailRecipients||n.emailRecipients.split(/[;,\n]/).map((s:string)=>s.trim()).filter(Boolean).some((s:string)=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))))fail('กรุณาระบุอีเมลผู้รับให้ถูกต้อง');
    if(n.lineEnabled&&(!n.lineToken||! /^[UCR][a-f0-9]{32}$/i.test(n.lineRecipient)))fail('กรุณาระบุ Channel access token และ userId/groupId/roomId ให้ถูกต้อง');
    if(n.siteUrl&&!/^https?:\/\/[^\s]+$/.test(n.siteUrl))fail('URL เว็บไซต์ไม่ถูกต้อง');
    db.notifications=n;
    if(req.body.smtp){const input=req.body.smtp;db.smtp={...db.smtp,...Object.fromEntries(['host','port','secure','user','fromName','fromEmail','adminNotifyEmail'].filter(k=>input[k]!==undefined).map(k=>[k,input[k]]))};if(input.pass)db.smtp.pass=input.pass;}
    if(req.body.paymentSettings)db.paymentSettings=Object.fromEntries(['bankName','accountName','accountNumber','qrUrl','instructions'].map(k=>[k,String(req.body.paymentSettings[k]||'').slice(0,1500)]));
    save(db);res.json({success:true});
  }));
  app.get('/api/notifications/logs',route((req:any,res:any)=>{admin(req);res.json({success:true,jobs:(read().notificationJobs||[]).slice(-150).reverse()});}));
  app.post('/api/notifications/test',route(async(req:any,res:any)=>{
    admin(req);const db=read(),n=config(db),channel=req.body.channel;
    if(!['email','line'].includes(channel))fail('เลือกช่องทางให้ถูกต้อง');
    const recipient=channel==='line'?n.lineRecipient:n.emailRecipients.split(/[;,\n]/).map((s:string)=>s.trim()).find(Boolean);
    if(!recipient)fail('บันทึกผู้รับก่อนทดสอบ');
    const job={id:crypto.randomUUID(),event:'test',channel,recipient,subject:'ทดสอบแจ้งเตือน The M5 Residence',text:'ทดสอบระบบแจ้งเตือน The M5 Residence สำเร็จ',status:'pending',attempts:0,createdAt:new Date().toISOString(),nextAttempt:Date.now()};
    db.notificationJobs=[...(db.notificationJobs||[]),job];save(db);await flush();
    const result=read().notificationJobs.find((j:any)=>j.id===job.id);res.json({success:true,job:result});
  }));
  app.post('/api/notifications/:id/retry',route((req:any,res:any)=>{admin(req);const db=read(),job=(db.notificationJobs||[]).find((j:any)=>j.id===req.params.id);if(!job)fail('ไม่พบรายการ',404);if(job.status==='sent'||job.status==='sending')fail('รายการนี้ส่งแล้วหรือกำลังส่ง',409);Object.assign(job,{status:'pending',nextAttempt:Date.now(),attempts:0});save(db);void flush().catch(console.error);res.json({success:true});}));
  app.post('/api/line/webhook',route((req:any,res:any)=>{
    const db=read(),secret=config(db).lineSecret;if(!secret)fail('ยังไม่ได้ตั้งค่า Webhook',503);
    const digest=crypto.createHmac('sha256',secret).update(req.rawBody||'').digest();const signature=Buffer.from(String(req.headers['x-line-signature']||''),'base64');
    if(signature.length!==digest.length||!crypto.timingSafeEqual(signature,digest))fail('Invalid signature',401);
    db.lineRecipients=db.lineRecipients||[];
    for(const event of req.body.events||[]){const source=event.source||{};const id=source.groupId||source.roomId||source.userId;if(id&&!db.lineRecipients.some((r:any)=>r.id===id))db.lineRecipients.push({id,type:source.type,seenAt:new Date().toISOString()});}
    db.lineRecipients=db.lineRecipients.slice(-30);save(db);res.json({success:true});
  }));
  app.get('/api/payment-settings',(_req,res)=>res.json({success:true,settings:read().paymentSettings||{}}));
  app.post('/api/payments',route((req:any,res:any)=>{
    const db=read(),input=req.body,b=(db.bookings||[]).find((b:any)=>b.id===String(input.bookingId||'').trim().toUpperCase()&&b.guestEmail===String(input.email||'').trim().toLowerCase());
    if(!b)fail('เลขการจองหรืออีเมลไม่ถูกต้อง',404);
    if(['Cancelled','Completed','Paid'].includes(b.status))fail('สถานะการจองนี้ไม่รับแจ้งโอนแล้ว');
    if((db.payments||[]).some((p:any)=>p.bookingId===b.id&&p.status==='pending'))fail('มีสลิปรอตรวจสอบแล้ว กรุณารอเจ้าหน้าที่',409);
    const amount=Number(input.amount);if(!Number.isFinite(amount)||amount<=0||amount>b.totalPrice)fail('ยอดโอนไม่ถูกต้อง');
    if(!input.payerName||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.transferredAt||'')||!Number.isFinite(Date.parse(input.transferredAt+'+07:00'))||Date.parse(input.transferredAt+'+07:00')>Date.now()+300000)fail('ระบุชื่อผู้โอนและวันเวลาโอนให้ถูกต้อง');
    const match=String(input.slip||'').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match)fail('แนบสลิปเป็นภาพ JPG, PNG หรือ WebP');
    const buffer=Buffer.from(match[2],'base64');if(buffer.length>5*1024*1024)fail('สลิปต้องไม่เกิน 5 MB');
    const valid=match[1]==='jpeg'?buffer.subarray(0,3).equals(Buffer.from([255,216,255])):match[1]==='png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';if(!valid)fail('ไฟล์สลิปไม่ถูกต้อง');
    const id=crypto.randomUUID(),fileName=id+'.'+(match[1]==='jpeg'?'jpg':match[1]);
    fs.mkdirSync(slipsDir,{recursive:true});fs.writeFileSync(path.join(slipsDir,fileName),buffer);
    const payment={id,bookingId:b.id,guestName:b.guestName,amount:Math.round(amount*100)/100,payerName:String(input.payerName).slice(0,200),transferredAt:input.transferredAt,fileName,status:'pending',createdAt:new Date().toISOString()};
    db.payments=[payment,...(db.payments||[])];enqueue(db,'payment',b,payment);save(db);void flush().catch(console.error);
    res.status(201).json({success:true,payment:{id,status:'pending'},message:'รับข้อมูลแจ้งโอนแล้ว รอเจ้าหน้าที่ตรวจสอบ'});
  }));
  app.get('/api/payments',route((req:any,res:any)=>{admin(req);res.json({success:true,payments:read().payments||[]});}));
  app.get('/api/payments/:id/slip',route((req:any,res:any)=>{admin(req);const payment=(read().payments||[]).find((p:any)=>p.id===req.params.id);if(!payment)fail('ไม่พบสลิป',404);res.setHeader('Cache-Control','no-store');res.sendFile(path.join(slipsDir,path.basename(payment.fileName)));}));
  app.post('/api/payments/:id/review',route((req:any,res:any)=>{
    const user=admin(req),db=read(),p=(db.payments||[]).find((p:any)=>p.id===req.params.id);if(!p)fail('ไม่พบรายการ',404);if(p.status!=='pending')fail('ตรวจสอบรายการนี้แล้ว',409);
    if(!['approved','rejected'].includes(req.body.status))fail('สถานะไม่ถูกต้อง');
    const b=db.bookings.find((b:any)=>b.id===p.bookingId);if(!b||b.status==='Cancelled')fail('รายการจองถูกยกเลิกหรือไม่พบ');
    Object.assign(p,{status:req.body.status,note:String(req.body.note||'').slice(0,1000),reviewedBy:user.id,reviewedAt:new Date().toISOString()});
    const paid=db.payments.filter((p:any)=>p.bookingId===b.id&&p.status==='approved').reduce((s:number,p:any)=>s+p.amount,0);if(paid>=b.totalPrice)b.status='Paid';
    save(db);res.json({success:true,payment:p,booking:b});
  }));
  return {enqueue,flush,stop:()=>clearInterval(timer)};
}
