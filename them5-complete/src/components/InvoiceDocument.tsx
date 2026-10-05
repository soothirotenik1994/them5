import React, { useEffect, useState } from 'react';
import './invoice.css';
const money = (v: number) => Number(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const date = (v:string) => v ? `${v.slice(8,10)}/${v.slice(5,7)}/${Number(v.slice(0,4))+543}` : '';
export function InvoicePaper({ invoice: i, draft=false }: {invoice:any;draft?:boolean}) {
  const issuer=i.issuer, p=i.payment;
  return <article className="invoice-paper">
    {(draft || i.status==='void') && <div className="invoice-watermark">{draft?'ตัวอย่าง / ยังไม่ออกเอกสาร':'ยกเลิก'}</div>}
    <header className="invoice-heading">
      <div className="invoice-company">
        {issuer.logoUrl ? <img src={issuer.logoUrl} alt="โลโก้บริษัท"/> : <div className="invoice-logo"><span>The</span><strong>M5</strong></div>}
        <div><strong>{issuer.companyNameEn}</strong><br/><strong>{issuer.companyNameTh} ({issuer.branch})</strong></div>
      </div>
      <div className="invoice-contact"><strong>{issuer.address}</strong><br/><strong>TEL. {issuer.phone}</strong><br/><strong>E-Mail : {issuer.email}</strong><br/><strong>เลขประจำตัวผู้เสียภาษี&nbsp; {issuer.taxId}</strong></div>
      <h1>ใบเสร็จรับเงิน/ใบกำกับภาษี</h1>
    </header>
    <table className="invoice-table">
      <colgroup><col style={{width:'17.5%'}}/><col style={{width:'50%'}}/><col style={{width:'10.5%'}}/><col style={{width:'11.25%'}}/><col style={{width:'10.75%'}}/></colgroup>
      <tbody>
        <tr className="invoice-buyer"><td colSpan={2}>
          <div><b>ชื่อลูกค้า/Company:</b><span>{i.buyer.name}</span></div>
          <div><b>ที่อยู่/Address:</b><span className="invoice-address">{i.buyer.address}<br/>{i.buyer.branch ? `(${i.buyer.branch})`:''}</span></div>
          <div className="invoice-buyer-tax"><b>เลขประจำตัวผู้เสียภาษี :</b><span>{i.buyer.taxId}</span><b>โทร.</b><span>{i.buyer.phone}</span></div>
        </td><td colSpan={3} className="invoice-number"><strong>เลขที่{ i.number }</strong><strong>วันที่/Date&nbsp; {date(i.date)}</strong></td></tr>
        <tr className="invoice-columns"><th>ลำดับที่<br/>Item</th><th>รายการ<br/>Description</th><th>จำนวน<br/>Quantity</th><th>ราคา/หน่วย<br/>Unit Price</th><th>จำนวนเงิน<br/>Amount</th></tr>
        {i.items.map((item:any,index:number)=><tr className="invoice-item" key={index}><td>{index+1}</td><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.quantity*item.unitPrice)}</td></tr>)}
        <tr className="invoice-stay"><td></td><td>(Check in {date(i.checkIn)}–Check Out {date(i.checkOut)})</td><td></td><td></td><td></td></tr>
        <tr><td colSpan={2} rowSpan={3} className="invoice-payment">
          <div><b>รายการรับชำระเงิน</b><span>{p.method==='cash'?'✓':'□'} เงินสด</span><span>{p.method==='transfer'?'✓':'□'} เงินโอน</span><span>{p.method==='cheque'?'✓':'□'} เช็ค</span><span>{p.method==='card'?'✓':'□'} บัตร</span></div>
          <div><b>ธนาคาร/Bank</b><span>{p.bank}</span><b>เลขที่/Chq</b><span>{p.chequeNo}</span></div>
          <div><b>สาขา/Branch</b><span>{p.branch}</span><b>ลว./Date</b><span>{date(p.date)}</span></div>
          <div><b>จำนวนเงิน/Amount</b><span>{money(i.total)}</span></div>
        </td><th colSpan={2}>รวมเงินทั้งรวม<br/><small>Net Amount include VAT</small></th><td className="invoice-total">{money(i.total)}</td></tr>
        <tr><th colSpan={2}>ยอดก่อนภาษีมูลค่าเพิ่ม<br/><small>Net Amount before VAT</small></th><td className="invoice-total">{money(i.beforeVat)}</td></tr>
        <tr><th colSpan={2}>ภาษีมูลค่าเพิ่ม<br/><small>VAT {issuer.vatRate}%</small></th><td className="invoice-total">{money(i.vat)}</td></tr>
      </tbody>
    </table>
    <div className="invoice-words"><b>ตัวอักษร</b><strong>{i.amountText}</strong></div>
    <table className="invoice-signatures"><tbody><tr><td><b>ลงนามลูกค้า</b><div className="signature-space"></div><span>วันที่.................................</span></td><td><b>ในนาม{issuer.companyNameTh}</b><div className="signature-space">{i.receiver}</div><span>ผู้รับเงิน</span></td></tr></tbody></table>
    <p className="invoice-footnote">{issuer.footer}</p>
    {i.status==='void' && <p className="invoice-footnote">เหตุผลยกเลิก: {i.voidReason}</p>}
  </article>;
}
export default function InvoiceDocument({id}:{id:string}) {
  const [invoice,setInvoice]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{fetch(`/api/invoices/${encodeURIComponent(id)}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setInvoice(d.invoice);document.title=d.invoice.number+' - ใบกำกับภาษี';}).catch(e=>setError(e.message));},[id]);
  return <div className="invoice-view"><div className="invoice-toolbar"><a href="/admin">← กลับหลังบ้าน</a><span>{invoice?.number || 'ใบกำกับภาษี'}</span><button onClick={()=>window.print()} disabled={!invoice}>พิมพ์ / บันทึก PDF</button></div>{error?<p className="invoice-error">{error} <a href="/admin">เข้าสู่ระบบหลังบ้าน</a></p>:invoice?<InvoicePaper invoice={invoice}/>:<p>กำลังโหลดเอกสาร…</p>}</div>;
}
