import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installNotifications} from '../notification-service.ts';

test('Email/LINE outbox, retry, payment review and webhook signatures',async()=>{
  let db:any={smtp:{},notifications:{emailEnabled:true,emailRecipients:'owner@example.com',lineEnabled:true,lineToken:'test-token',lineSecret:'test-secret',lineRecipient:'U'+'a'.repeat(32)},bookings:[{id:'M5-TEST',guestName:'Guest',guestEmail:'guest@example.com',roomName:'Twin',totalPrice:1390,status:'Pending',checkIn:'2026-10-10',checkOut:'2026-10-11'}]};
  const read=()=>structuredClone(db),save=(value:any)=>{db=structuredClone(value);};
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'m5-notify-'));const old=process.env.DB_PATH;process.env.DB_PATH=path.join(dir,'db.json');
  const app=express();app.use(express.json({verify:(req:any,_res,buf)=>{req.rawBody=buf;}}));
  const sent:any[]=[];let simulateFailure=true;
  const service=installNotifications(app,{read,save,admin:req=>{if(req.headers.authorization!=='test')throw Object.assign(new Error('Unauthorized'),{status:401});return {id:'admin'};},fail:(message,status=400)=>{throw Object.assign(new Error(message),{status});},route:fn=>(req,res,next)=>{try{Promise.resolve(fn(req,res)).catch(next);}catch(e){next(e);}}},async job=>{if(simulateFailure&&job.channel==='line')throw Error('Mock outage');sent.push(job);});
  app.use((e:any,_req:any,res:any,_next:any)=>res.status(e.status||500).json({error:e.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base=`http://127.0.0.1:${(server.address() as any).port}`;
  async function call(url:string,method='GET',body?:any,auth=true){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(auth?{authorization:'test'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
  try{
    const next=read();service.enqueue(next,'booking',next.bookings[0]);save(next);await service.flush();
    assert.equal(sent.length,1);assert.equal(db.notificationJobs[0].status,'sent');assert.equal(db.notificationJobs[1].status,'pending');
    simulateFailure=false;db.notificationJobs[1].nextAttempt=0;await service.flush();assert.equal(sent.length,2);assert.equal(db.notificationJobs[1].attempts,2);
    const settings=(await call('/api/notifications/settings')).data;assert.equal(settings.settings.lineToken,'');assert.equal(settings.settings.hasLineToken,true);
    assert.equal((await call('/api/notifications/settings','GET',undefined,false)).status,401);
    const payload={bookingId:'M5-TEST',email:'guest@example.com',amount:1390,payerName:'Guest',transferredAt:'2026-09-01T12:00',slip:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII='};
    assert.equal((await call('/api/payments','POST',{...payload,email:'wrong@example.com'},false)).status,404);
    const payment=await call('/api/payments','POST',payload,false);assert.equal(payment.status,201);assert.equal(db.bookings[0].status,'Pending');
    assert.equal((await call('/api/payments','POST',payload,false)).status,409);
    assert.equal((await fetch(base+'/api/payments/'+payment.data.payment.id+'/slip')).status,401);
    assert.equal((await call('/api/payments/'+payment.data.payment.id+'/review','POST',{status:'approved'})).status,200);assert.equal(db.bookings[0].status,'Paid');
    assert.equal((await call('/api/payments/'+payment.data.payment.id+'/review','POST',{status:'approved'})).status,409);
    const events=JSON.stringify({events:[{source:{type:'group',groupId:'C'+'b'.repeat(32)}}]});
    let response=await fetch(base+'/api/line/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:events});assert.equal(response.status,401);
    const signature=crypto.createHmac('sha256','test-secret').update(events).digest('base64');
    response=await fetch(base+'/api/line/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-line-signature':signature},body:events});assert.equal(response.status,200);assert.equal(db.lineRecipients[0].id,'C'+'b'.repeat(32));
    await service.flush();
  }finally{service.stop();await new Promise<void>(r=>server.close(()=>r()));if(old===undefined)delete process.env.DB_PATH;else process.env.DB_PATH=old;fs.rmSync(dir,{recursive:true,force:true});}
});
