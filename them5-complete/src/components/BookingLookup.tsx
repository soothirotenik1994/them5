import PaymentForm from "./PaymentForm";
import React, { useState } from 'react';
import { ArrowLeft, Search, Calendar, CheckCircle2 } from 'lucide-react';

const labels: Record<string, string> = { Pending:'รอการตรวจสอบ', Paid:'ชำระเงินแล้ว', Confirmed:'ยืนยันแล้ว', 'Checked-In':'เข้าพักแล้ว', Completed:'เข้าพักเสร็จสิ้น', Cancelled:'ยกเลิกแล้ว' };
export default function BookingLookup() {
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setBooking(null);
    try {
      const response = await fetch('/api/bookings/lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,email}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBooking(data.booking);
    } catch (e: any) { setError(e.message || 'ไม่สามารถเชื่อมต่อได้'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-neutral-950 text-white px-5 py-12 font-sans">
    <div className="max-w-xl mx-auto">
      <a href="/" className="inline-flex gap-2 text-neutral-400 items-center mb-12"><ArrowLeft size={16}/>กลับหน้าโรงแรม</a>
      <p className="text-orange-500 text-xs tracking-[.3em] mb-4">THE M5 RESIDENCE</p>
      <h1 className="text-3xl font-bold mb-3">ตรวจสอบการจอง</h1>
      <p className="text-neutral-400 mb-8">กรอกเลขอ้างอิงและอีเมลที่ใช้จอง เพื่อตรวจสอบข้อมูลล่าสุด</p>
      <form onSubmit={submit} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 space-y-5">
        <label className="block text-sm">เลขอ้างอิงการจอง<input required value={id} onChange={e=>setId(e.target.value)} placeholder="M5-…" className="block w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 mt-2 uppercase"/></label>
        <label className="block text-sm">อีเมล<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="block w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-3 mt-2"/></label>
        <button disabled={busy} className="w-full rounded-lg bg-orange-700 hover:bg-orange-600 py-3 flex justify-center gap-2 disabled:opacity-50"><Search size={19}/>{busy?'กำลังค้นหา…':'ค้นหาการจอง'}</button>
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
      </form>
      {booking && <section className="mt-6 rounded-2xl border border-neutral-700 p-6 space-y-4" aria-live="polite">
        <div className="flex justify-between items-center"><span className="font-mono text-orange-400">{booking.id}</span><span className="text-sm flex gap-2"><CheckCircle2 size={16}/>{labels[booking.status] || booking.status}</span></div>
        <h2 className="text-xl font-semibold">{booking.roomName}</h2>
        <p className="text-neutral-300">{booking.guestName} · {booking.guests} ท่าน</p>
        <p className="flex items-center gap-2 text-sm"><Calendar size={16}/>{booking.checkIn} → {booking.checkOut}</p>
        <p className="text-2xl font-bold">฿{booking.totalPrice.toLocaleString('th-TH')}</p>
        <p className="text-xs text-neutral-400">หากต้องการเปลี่ยนแปลงหรือยกเลิก กรุณาติดต่อโรงแรมพร้อมเลขอ้างอิงนี้</p>
        {["Pending","Confirmed","Checked-In"].includes(booking.status) && <PaymentForm booking={booking} />}
        <button onClick={()=>window.print()} className="text-orange-400 text-sm underline">พิมพ์ข้อมูลการจอง</button>
      </section>}
    </div>
  </main>;
}
