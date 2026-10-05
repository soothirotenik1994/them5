import React, { useRef, useState } from "react";
import { Printer, Download, Copy, Check, X, Eye, FileText, ArrowLeft } from "lucide-react";
import { BillingDocument } from "../../types/billing";
import { formatThaiDate } from "../../utils/thaiBahtText";

interface TaxInvoicePrintViewProps {
  document: BillingDocument;
  onClose?: () => void;
  isModal?: boolean;
  onAcceptQuotation?: (doc: BillingDocument) => void;
}

export default function TaxInvoicePrintView({ document: doc, onClose, isModal = false, onAcceptQuotation }: TaxInvoicePrintViewProps) {
  const [copyType, setCopyType] = useState<"original" | "copy">("original");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${doc.documentNumber || "Document"}_${copyType === "original" ? "Original" : "Copy"}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(printRef.current).save();
    } catch (err) {
      console.error("PDF download failed, falling back to print:", err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Determine title text
  const getDocumentTitle = () => {
    if (doc.title) return doc.title;
    switch (doc.type) {
      case "tax_invoice":
        return "ใบเสร็จรับเงิน/ใบกำกับภาษี";
      case "quotation":
        return "ใบเสนอราคา";
      case "invoice":
        return "ใบแจ้งหนี้ / ใบวางบิล";
      default:
        return "ใบเสร็จรับเงิน/ใบกำกับภาษี";
    }
  };

  const getDocumentTitleEn = () => {
    switch (doc.type) {
      case "tax_invoice":
        return "RECEIPT / TAX INVOICE";
      case "quotation":
        return "QUOTATION";
      case "invoice":
        return "INVOICE / BILLING NOTE";
      default:
        return "RECEIPT / TAX INVOICE";
    }
  };

  // Ensure minimum 4 rows in table for paper aesthetics
  const minimumRows = Math.max(4, doc.items.length);
  const emptyRowsCount = Math.max(0, 4 - doc.items.length);

  return (
    <div className={`print-container ${isModal ? "fixed inset-0 z-50 overflow-y-auto bg-black/80 flex flex-col items-center p-2 sm:p-6" : ""}`}>
      
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .a4-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        .a4-page {
          width: 210mm;
          min-height: 290mm;
          background: #ffffff;
          color: #000000;
          font-family: "Sarabun", "TH Sarabun New", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.35;
        }

        .receipt-table, .receipt-table th, .receipt-table td {
          border: 1px solid #000000;
          border-collapse: collapse;
        }
      `}</style>

      {/* Screen Toolbar (Hidden on Print) */}
      <div className="no-print w-full max-w-[210mm] mb-4 bg-neutral-900 border border-neutral-800 text-white rounded-lg p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
              title="กลับ"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white font-mono">{doc.documentNumber}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                doc.type === "tax_invoice" ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800" :
                doc.type === "quotation" ? "bg-amber-950/60 text-amber-400 border border-amber-800" :
                "bg-blue-950/60 text-blue-400 border border-blue-800"
              }`}>
                {getDocumentTitle()}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              ลูกค้า: {doc.customer.name || "ไม่ระบุ"} | ยอดชำระ: {doc.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Original / Copy */}
          <div className="bg-neutral-950 border border-neutral-800 p-0.5 rounded flex text-xs font-mono">
            <button
              type="button"
              onClick={() => setCopyType("original")}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                copyType === "original" ? "bg-brick text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ต้นฉบับ (Original)
            </button>
            <button
              type="button"
              onClick={() => setCopyType("copy")}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                copyType === "copy" ? "bg-neutral-800 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              สำเนา (Copy)
            </button>
          </div>

          {/* Direct Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold rounded flex items-center space-x-1.5 transition-all border border-neutral-700 cursor-pointer disabled:opacity-50 shadow-md"
            title="ดาวน์โหลดไฟล์ .pdf ลงเครื่องโดยตรง"
          >
            <Download className={`h-4 w-4 text-amber-400 ${isDownloadingPdf ? "animate-bounce" : ""}`} />
            <span>{isDownloadingPdf ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-650 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
            title="สั่งพิมพ์ผ่านเบราว์เซอร์หรือบันทึกเป็น PDF"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ A4 (Print)</span>
          </button>

          {/* Accept Quotation & Book CTA */}
          {doc.type === "quotation" && onAcceptQuotation && doc.status !== "approved" && (
            <button
              onClick={() => onAcceptQuotation(doc)}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white text-xs font-bold rounded flex items-center space-x-1.5 transition-all shadow-lg shadow-amber-950/60 cursor-pointer"
              title="ลูกค้ายืนยันตกลงสั่งจองตามใบเสนอราคานี้"
            >
              <Check className="h-4 w-4 text-white" />
              <span>ยืนยันสั่งจอง (Accept & Book)</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* The Printable A4 Page (Exact Replica of image.png) */}
      <div 
        ref={printRef}
        className="a4-page p-8 sm:p-10 shadow-2xl relative text-[13px] leading-relaxed mx-auto border border-neutral-300"
      >
        
        {/* TOP HEADER SECTION */}
        <div className="flex justify-between items-start border-b-0 pb-3 mb-1">
          
          {/* Left: Logo & Company Information */}
          <div className="flex items-start space-x-3.5 max-w-[65%]">
            {/* The M5 Logo Keyhole Box */}
            <div className="shrink-0 flex flex-col items-center">
              {doc.company.logoUrl ? (
                <img src={doc.company.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
              ) : (
                <div className="border border-neutral-700 bg-white p-1 rounded flex flex-col items-center justify-center w-14">
                  {/* Keyhole SVG Icon */}
                  <svg className="w-5 h-5 text-neutral-800 mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M10 10 L8 20 L16 20 L14 10 Z" />
                  </svg>
                  {/* The M5 Logo Box */}
                  <div className="bg-[#b43e10] text-white text-[9px] font-black px-1 py-0.2 rounded font-sans tracking-tight text-center leading-tight">
                    The<br />M5
                  </div>
                </div>
              )}
            </div>

            {/* Company Text */}
            <div className="text-[12px] text-neutral-900 leading-[1.35]">
              <div className="font-bold text-[13.5px] uppercase tracking-wide text-black font-sans">
                {doc.company.name || "THE FELIX PROPERTY CO.,LTD."}
              </div>
              <div className="font-bold text-[13px] text-black">
                {doc.company.thaiName || "บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด (สำนักงานใหญ่)"}
              </div>
              <div className="text-neutral-800 text-[11.5px] mt-0.5">
                {doc.company.address || "37/93 หมู่ที่ 1 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120"}
              </div>
              <div className="text-neutral-800 text-[11.5px]">
                TEL. {doc.company.tel || "02-288 0965 / มือถือ 099-617-8695"}
              </div>
              <div className="text-neutral-800 text-[11.5px]">
                E-Mail : <span className="font-sans">{doc.company.email || "Them5residence@gmail.com"}</span>
              </div>
              <div className="text-neutral-900 text-[11.5px] font-semibold mt-0.5">
                เลขประจำตัวผู้เสียภาษี <span className="font-mono text-[12px]">{doc.company.taxId || "0125561031626"}</span>
              </div>
            </div>
          </div>

          {/* Right: Document Title & Copy Watermark */}
          <div className="text-right">
            <h1 className="text-[17px] font-bold text-black tracking-tight leading-tight">
              {getDocumentTitle()}
            </h1>
            <div className="text-[11px] font-sans font-semibold text-neutral-600 tracking-wider">
              {getDocumentTitleEn()}
            </div>
            <div className="mt-1 inline-block border border-neutral-400 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-700 uppercase rounded">
              {copyType === "original" ? "ต้นฉบับ / ORIGINAL" : "สำเนา / COPY"}
            </div>
          </div>
        </div>

        {/* CUSTOMER & DOCUMENT META BOXES (2 COLUMNS WITH EXACT BORDER BOXES) */}
        <div className="grid grid-cols-12 border border-black text-[12px] mb-3">
          
          {/* Customer Box (8 cols) */}
          <div className="col-span-8 p-2.5 border-r border-black space-y-1">
            <div className="flex items-start">
              <span className="font-bold text-black shrink-0 w-32">ชื่อลูกค้า /Company:</span>
              <span className="font-semibold text-black flex-1">{doc.customer.name || "-"}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold text-black shrink-0 w-32">ที่อยู่ /Address:</span>
              <span className="text-neutral-900 flex-1 leading-snug">{doc.customer.address || "-"}</span>
            </div>
            <div className="flex items-center pt-1">
              <span className="font-bold text-black shrink-0 w-32">เลขประจำตัวผู้เสียภาษี:</span>
              <span className="font-mono font-medium text-black mr-6">{doc.customer.taxId || "-"}</span>
              <span className="font-bold text-black mr-2">โทร.</span>
              <span className="font-mono text-black">{doc.customer.phone || "-"}</span>
            </div>
            {doc.customer.branch && (
              <div className="flex items-center text-[11px] text-neutral-700">
                <span className="font-bold shrink-0 w-32">สาขา:</span>
                <span>{doc.customer.branch}</span>
              </div>
            )}
          </div>

          {/* Document Meta Box (4 cols) */}
          <div className="col-span-4 p-2.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-black">เลขที่ /NO.</span>
                <span className="font-mono font-bold text-[13px] text-black">{doc.documentNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-black">วันที่ /Date</span>
                <span className="font-mono font-semibold text-black">
                  {formatThaiDate(doc.issueDate, "be_short")}
                </span>
              </div>
              {doc.dueDate && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-neutral-800">วันครบกำหนด:</span>
                  <span className="font-mono text-neutral-800">{formatThaiDate(doc.dueDate, "be_short")}</span>
                </div>
              )}
              {doc.bookingId && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-neutral-800">รหัสจอง /Ref:</span>
                  <span className="font-mono text-neutral-800">{doc.bookingId}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ITEMS TABLE (EXACT BLACK BORDER GRID) */}
        <table className="receipt-table w-full text-[12px] text-left mb-0">
          <thead>
            <tr className="bg-neutral-50 text-center font-bold text-black">
              <th className="py-1.5 px-2 w-[12%] text-center">
                ลำดับที่<br /><span className="text-[10px] font-sans font-normal">Item</span>
              </th>
              <th className="py-1.5 px-3 w-[50%] text-center">
                รายการ<br /><span className="text-[10px] font-sans font-normal">Description</span>
              </th>
              <th className="py-1.5 px-2 w-[12%] text-center">
                จำนวน<br /><span className="text-[10px] font-sans font-normal">Quantity</span>
              </th>
              <th className="py-1.5 px-2 w-[13%] text-center">
                ราคา/หน่วย<br /><span className="text-[10px] font-sans font-normal">Unit Price</span>
              </th>
              <th className="py-1.5 px-2 w-[13%] text-center">
                จำนวนเงิน<br /><span className="text-[10px] font-sans font-normal">Amount</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={item.id || idx} className="align-top">
                <td className="py-2.5 px-2 text-center font-mono text-black">
                  {idx + 1}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-black">{item.description}</div>
                  {item.subDescription && (
                    <div className="text-[11px] text-red-600 font-sans mt-0.5 leading-tight">
                      {item.subDescription}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-2 text-center font-mono text-black">
                  {item.quantity}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-black">
                  {item.unitPrice.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-2 text-right font-mono font-semibold text-black">
                  {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}

            {/* Empty padding rows to preserve standard paper layout height */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty_${i}`}>
                <td className="py-4 text-center">&nbsp;</td>
                <td className="py-4">&nbsp;</td>
                <td className="py-4 text-center">&nbsp;</td>
                <td className="py-4 text-right">&nbsp;</td>
                <td className="py-4 text-right">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* BOTTOM SECTION: PAYMENT INFO (LEFT) & TOTAL CALCULATIONS (RIGHT) */}
        <div className="grid grid-cols-12 border-x border-b border-black text-[11.5px]">
          
          {/* Bottom Left: Payment Method Details (7 cols) */}
          <div className="col-span-7 p-2.5 border-r border-black flex flex-col justify-between">
            <div className="space-y-2">
              <div className="font-bold text-black flex items-center space-x-6 text-[12px]">
                <span>รายการรับชำระเงิน</span>
                
                {/* Method Checkboxes */}
                <label className="inline-flex items-center space-x-1 cursor-default">
                  <input
                    type="checkbox"
                    checked={doc.payment.method === "cash"}
                    readOnly
                    className="accent-black w-3.5 h-3.5"
                  />
                  <span>เงินสด</span>
                </label>
                
                <label className="inline-flex items-center space-x-1 cursor-default">
                  <input
                    type="checkbox"
                    checked={doc.payment.method === "transfer"}
                    readOnly
                    className="accent-black w-3.5 h-3.5"
                  />
                  <span>เงินโอน</span>
                </label>

                <label className="inline-flex items-center space-x-1 cursor-default">
                  <input
                    type="checkbox"
                    checked={doc.payment.method === "cheque"}
                    readOnly
                    className="accent-black w-3.5 h-3.5"
                  />
                  <span>เช็ค</span>
                </label>
              </div>

              {/* Bank Transfer / Cheque Info Table */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1">
                <div className="flex">
                  <span className="font-bold text-black shrink-0 w-20">ธนาคาร/Bank:</span>
                  <span className="text-neutral-900 truncate">
                    {doc.payment.bankName || (doc.payment.method === "transfer" ? (doc.company.bankName || "-") : "-")}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-bold text-black shrink-0 w-20">เลขที่/Chq:</span>
                  <span className="font-mono text-neutral-900">{doc.payment.chequeNumber || "-"}</span>
                </div>
                <div className="flex">
                  <span className="font-bold text-black shrink-0 w-20">สาขา/Branch:</span>
                  <span className="text-neutral-900">{doc.payment.branch || "-"}</span>
                </div>
                <div className="flex">
                  <span className="font-bold text-black shrink-0 w-20">ลง/Date:</span>
                  <span className="font-mono text-neutral-900">
                    {doc.payment.chequeDate ? formatThaiDate(doc.payment.chequeDate, "be_short") : (doc.payment.paidAt ? formatThaiDate(doc.payment.paidAt, "be_short") : "-")}
                  </span>
                </div>
                <div className="flex col-span-2 pt-0.5">
                  <span className="font-bold text-black shrink-0 w-24">จำนวนเงิน/Amount:</span>
                  <span className="font-mono font-semibold text-black">
                    {(doc.payment.paidAmount || doc.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              </div>
            </div>

            {doc.remarks && (
              <div className="mt-2 text-[10px] text-neutral-600 italic">
                หมายเหตุ: {doc.remarks}
              </div>
            )}
          </div>

          {/* Bottom Right: Financial Calculations (5 cols) */}
          <div className="col-span-5 text-[11.5px] divide-y divide-black">
            
            {/* Net Amount include VAT (รวมเงินที่ชำระ) */}
            <div className="flex justify-between items-center p-2 font-bold text-black">
              <div className="leading-tight">
                รวมเงินที่ชำระ<br />
                <span className="text-[10px] font-sans font-normal text-neutral-700">Net Amount include VAT</span>
              </div>
              <div className="font-mono text-[13.5px] font-bold">
                {doc.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Net Amount before VAT (ยอดก่อนภาษีมูลค่าเพิ่ม) */}
            <div className="flex justify-between items-center p-2 text-black">
              <div className="leading-tight font-semibold">
                ยอดก่อนภาษีมูลค่าเพิ่ม<br />
                <span className="text-[10px] font-sans font-normal text-neutral-700">Net Amount before VAT</span>
              </div>
              <div className="font-mono font-medium">
                {doc.netBeforeVat.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* VAT 7% (ภาษีมูลค่าเพิ่ม) */}
            <div className="flex justify-between items-center p-2 text-black">
              <div className="leading-tight font-semibold">
                ภาษีมูลค่าเพิ่ม<br />
                <span className="text-[10px] font-sans font-normal text-neutral-700">VAT {doc.vatRate}%</span>
              </div>
              <div className="font-mono font-medium">
                {doc.vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Withholding Tax (if applicable) */}
            {doc.withholdingTaxAmount ? (
              <div className="flex justify-between items-center p-2 text-neutral-800 bg-neutral-50 text-[11px]">
                <div className="leading-tight font-semibold">
                  หักภาษี ณ ที่จ่าย ({doc.withholdingTaxPercent}%)<br />
                  <span className="text-[9.5px] font-sans font-normal">Withholding Tax</span>
                </div>
                <div className="font-mono font-medium">
                  - {doc.withholdingTaxAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ) : null}

          </div>

        </div>

        {/* THAI BAHT TEXT ROW */}
        <div className="border-x border-b border-black p-2 flex items-center bg-white text-[12.5px]">
          <span className="font-bold text-black shrink-0 w-28 text-center">ตัวอักษร</span>
          <span className="font-bold text-black flex-1 text-center font-sans tracking-wide">
            {doc.bahtText || "หนึ่งพันสามร้อยเก้าสิบบาทถ้วน"}
          </span>
        </div>

        {/* SIGNATURE SECTION (EXACT BOXES LIKE SAMPLE) */}
        <div className="grid grid-cols-2 border-x border-b border-black text-[12px] min-h-[120px]">
          
          {/* Customer Signature Box */}
          <div className="p-3 border-r border-black flex flex-col justify-between">
            <div className="text-center font-bold text-black">
              ลงนามลูกค้า
            </div>
            
            <div className="mt-8 text-center text-neutral-700 text-[11.5px]">
              วันที่ ................................................................
            </div>
            
            <div className="text-[9.5px] text-neutral-600 text-center italic mt-1 leading-tight">
              {doc.footerNote || "*ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว*"}
            </div>
          </div>

          {/* Company / Receiver Signature Box */}
          <div className="p-3 flex flex-col justify-between">
            <div className="text-center font-bold text-black">
              ในนาม {doc.company.name ? `บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด` : doc.company.thaiName}
            </div>

            <div className="mt-8 text-center">
              <div className="w-48 mx-auto border-b border-dotted border-black mb-1"></div>
              <div className="text-[11.5px] font-bold text-black">
                {doc.company.signatureName || "ผู้รับเงิน"}
              </div>
              <div className="text-[10px] text-neutral-600 font-sans">
                {doc.company.signatureRole || "Authorized Signature"}
              </div>
            </div>

            <div className="text-[9.5px] text-neutral-500 text-center">
              {doc.type === "quotation" ? "*ใบเสนอราคานี้มีผลบังคับใช้ 30 วันนับแต่วันที่ออก*" : ""}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
