import React, { useState, useEffect } from "react";
import { 
  X, Plus, Trash2, Save, FileText, CheckCircle, Calculator, Eye, 
  RotateCcw, Sparkles, Building, User, Calendar, CreditCard, ChevronDown, 
  FileCheck, ArrowRight, Clock, HelpCircle, Layers
} from "lucide-react";
import { 
  BillingDocument, BillingItem, CustomerInfo, PaymentInfo, 
  DocumentType, DocumentStatus, VatType, CompanyProfile, defaultCompanyProfile 
} from "../../types/billing";
import { BookingRecord } from "../../context/SettingsContext";
import { thaiBahtText, formatThaiDate } from "../../utils/thaiBahtText";
import TaxInvoicePrintView from "./TaxInvoicePrintView";

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: BillingDocument) => Promise<boolean>;
  initialDocument?: BillingDocument | null;
  bookings: BookingRecord[];
  companyProfile?: CompanyProfile;
  initialBookingForPrefill?: BookingRecord | null;
  initialType?: DocumentType;
}

export default function DocumentEditorModal({
  isOpen,
  onClose,
  onSave,
  initialDocument,
  bookings,
  companyProfile,
  initialBookingForPrefill,
  initialType = "tax_invoice"
}: DocumentEditorModalProps) {
  if (!isOpen) return null;

  // View state: 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor");

  const company = companyProfile || defaultCompanyProfile;

  // Document Basic Info
  const [type, setType] = useState<DocumentType>(initialDocument?.type || initialType);
  const [status, setStatus] = useState<DocumentStatus>(initialDocument?.status || "draft");
  const [docNumber, setDocNumber] = useState<string>(() => {
    if (initialDocument?.documentNumber) return initialDocument.documentNumber;
    const now = new Date();
    const beYear = now.getFullYear() + 543;
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(100 + Math.random() * 900);
    const prefix = initialType === "tax_invoice" ? "0069" : (initialType === "quotation" ? "QT" : "INV");
    return `${prefix}-${mm}-${rand}`;
  });

  const [issueDate, setIssueDate] = useState<string>(() => {
    return initialDocument?.issueDate || new Date().toISOString().split("T")[0];
  });

  const [dueDate, setDueDate] = useState<string>(() => {
    if (initialDocument?.dueDate) return initialDocument.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [bookingId, setBookingId] = useState<string>(initialDocument?.bookingId || initialBookingForPrefill?.id || "");
  const [roomNumber, setRoomNumber] = useState<string>(initialDocument?.roomNumber || "ห้อง 308");
  const [checkIn, setCheckIn] = useState<string>(initialDocument?.checkIn || initialBookingForPrefill?.checkIn || "");
  const [checkOut, setCheckOut] = useState<string>(initialDocument?.checkOut || initialBookingForPrefill?.checkOut || "");

  // Customer State
  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    if (initialDocument?.customer) return initialDocument.customer;
    if (initialBookingForPrefill) {
      return {
        name: initialBookingForPrefill.guestName || "",
        branch: "สำนักงานใหญ่",
        address: "ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120",
        taxId: "",
        phone: initialBookingForPrefill.guestPhone || "",
        email: initialBookingForPrefill.guestEmail || ""
      };
    }
    // Default sample matching user's image
    return {
      name: "สำนักงานคลังจังหวัดพิษณุโลก",
      branch: "สำนักงานใหญ่",
      address: "ซ.ศาลากลางจังหวัดพิษณุโลก อ.วังจันทน์ ต.ในเมือง อ.เมืองพิษณุโลก จ.พิษณุโลก 65000",
      taxId: "0994000477481",
      phone: "055-258-000",
      email: "finance_pl@cgd.go.th"
    };
  });

  // Line items state
  const [items, setItems] = useState<BillingItem[]>(() => {
    if (initialDocument?.items && initialDocument.items.length > 0) {
      return initialDocument.items;
    }
    if (initialBookingForPrefill) {
      return [
        {
          id: "item_1",
          description: `${initialBookingForPrefill.roomName} (${roomNumber || "ห้อง 308"})`,
          subDescription: `(Check in ${formatThaiDate(initialBookingForPrefill.checkIn, "short")} - Check Out ${formatThaiDate(initialBookingForPrefill.checkOut, "short")})`,
          quantity: 1,
          unitPrice: initialBookingForPrefill.totalPrice || 1390,
          amount: initialBookingForPrefill.totalPrice || 1390
        }
      ];
    }
    // Default matching user sample image
    return [
      {
        id: "item_1",
        description: "Standard Room Twin Bedded Room (ห้อง 308)",
        subDescription: "(Check in 11/09/69 - Check Out 12/09/69)",
        quantity: 1,
        unitPrice: 1390,
        amount: 1390
      }
    ];
  });

  // Calculation parameters
  const [vatType, setVatType] = useState<VatType>(initialDocument?.vatType || "included");
  const [vatRate, setVatRate] = useState<number>(initialDocument?.vatRate !== undefined ? initialDocument.vatRate : 7);
  const [discount, setDiscount] = useState<number>(initialDocument?.discount || 0);
  const [applyWithholdingTax, setApplyWithholdingTax] = useState<boolean>(
    Boolean(initialDocument?.withholdingTaxPercent && initialDocument.withholdingTaxPercent > 0)
  );
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(initialDocument?.withholdingTaxPercent || 3);

  // Payment state
  const [payment, setPayment] = useState<PaymentInfo>(() => {
    return initialDocument?.payment || {
      method: "transfer",
      bankName: "ธนาคารกสิกรไทย (KBank)",
      chequeNumber: "",
      branch: "",
      chequeDate: "",
      paidAmount: 1390,
      paidAt: new Date().toISOString().split("T")[0]
    };
  });

  const [remarks, setRemarks] = useState<string>(initialDocument?.remarks || "");
  const [footerNote, setFooterNote] = useState<string>(
    initialDocument?.footerNote || "*ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว*"
  );

  // Computed Financials
  const grossItemsTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const afterDiscount = Math.max(0, grossItemsTotal - (Number(discount) || 0));

  let totalAmount = 0;
  let netBeforeVat = 0;
  let vatAmount = 0;

  if (vatType === "included") {
    // VAT Included: Total is the gross price; Net before VAT = Total / 1.07; VAT = Total - Net before VAT
    totalAmount = afterDiscount;
    netBeforeVat = Math.round((totalAmount / (1 + vatRate / 100)) * 100) / 100;
    vatAmount = Math.round((totalAmount - netBeforeVat) * 100) / 100;
  } else if (vatType === "excluded") {
    // VAT Excluded: Net before VAT is gross price; VAT = Net * 7%; Total = Net + VAT
    netBeforeVat = afterDiscount;
    vatAmount = Math.round((netBeforeVat * (vatRate / 100)) * 100) / 100;
    totalAmount = Math.round((netBeforeVat + vatAmount) * 100) / 100;
  } else {
    // Exempt / No VAT
    netBeforeVat = afterDiscount;
    vatAmount = 0;
    totalAmount = afterDiscount;
  }

  const withholdingTaxAmount = applyWithholdingTax
    ? Math.round((netBeforeVat * (withholdingTaxPercent / 100)) * 100) / 100
    : 0;

  const netPayable = Math.round((totalAmount - withholdingTaxAmount) * 100) / 100;
  const currentBahtText = thaiBahtText(totalAmount);

  // Sync paidAmount with totalAmount when total changes and method is cash or transfer
  useEffect(() => {
    if (payment.paidAmount === undefined || payment.paidAmount === 0 || payment.paidAmount === totalAmount) {
      setPayment(prev => ({ ...prev, paidAmount: totalAmount }));
    }
  }, [totalAmount]);

  // Handle Document Type Switching: Adjust number prefix and footer note
  const handleTypeChange = (newType: DocumentType) => {
    setType(newType);
    if (!initialDocument) {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const rand = Math.floor(100 + Math.random() * 900);
      const prefix = newType === "tax_invoice" ? "0069" : (newType === "quotation" ? "QT" : "INV");
      setDocNumber(`${prefix}-${mm}-${rand}`);
    }
    if (newType === "quotation") {
      setFooterNote("*ใบเสนอราคานี้มีผลบังคับใช้ 30 วันนับแต่วันที่ออกเอกสาร*");
    } else if (newType === "invoice") {
      setFooterNote("*กรุณาชำระเงินตามกำหนดเวลาที่ระบุในเอกสาร*");
    } else {
      setFooterNote("*ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว*");
    }
  };

  // Line item handlers
  const handleItemChange = (index: number, field: keyof BillingItem, val: any) => {
    const nextItems = [...items];
    const item = { ...nextItems[index], [field]: val };
    
    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? Number(val) : item.quantity;
      const price = field === "unitPrice" ? Number(val) : item.unitPrice;
      item.amount = Math.round((qty * price) * 100) / 100;
    }
    nextItems[index] = item;
    setItems(nextItems);
  };

  const handleAddItem = (preset?: { desc: string; price: number }) => {
    const newItem: BillingItem = {
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      description: preset?.desc || "ค่าบริการห้องพัก",
      subDescription: "",
      quantity: 1,
      unitPrice: preset?.price || 1000,
      amount: preset?.price || 1000
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("เอกสารต้องมีรายการสินค้า/บริการอย่างน้อย 1 รายการ");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Prefill from selected booking
  const handleSelectBookingToImport = (bId: string) => {
    const found = bookings.find(b => b.id === bId);
    if (!found) return;
    setBookingId(found.id);
    setCheckIn(found.checkIn);
    setCheckOut(found.checkOut);
    setCustomer(prev => ({
      ...prev,
      name: found.guestName || prev.name,
      phone: found.guestPhone || prev.phone,
      email: found.guestEmail || prev.email
    }));
    setItems([
      {
        id: "item_" + Date.now(),
        description: `${found.roomName} (${roomNumber || "ห้อง 308"})`,
        subDescription: `(Check in ${formatThaiDate(found.checkIn, "short")} - Check Out ${formatThaiDate(found.checkOut, "short")})`,
        quantity: 1,
        unitPrice: found.totalPrice,
        amount: found.totalPrice
      }
    ]);
  };

  // Build the complete BillingDocument object
  const currentDoc: BillingDocument = {
    id: initialDocument?.id || "doc_" + Date.now(),
    documentNumber: docNumber.trim(),
    type,
    status,
    issueDate,
    dueDate: (type === "quotation" || type === "invoice") ? dueDate : undefined,
    bookingId: bookingId || undefined,
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    roomNumber: roomNumber || undefined,
    company,
    customer,
    items,
    vatType,
    vatRate,
    discount,
    subtotal: afterDiscount,
    netBeforeVat,
    vatAmount,
    totalAmount,
    withholdingTaxPercent: applyWithholdingTax ? withholdingTaxPercent : undefined,
    withholdingTaxAmount: applyWithholdingTax ? withholdingTaxAmount : undefined,
    netPayable,
    bahtText: currentBahtText,
    payment,
    remarks,
    footerNote,
    createdAt: initialDocument?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleSave = async () => {
    if (!docNumber.trim()) {
      alert("กรุณาระบุเลขที่เอกสาร (Document Number)");
      return;
    }
    if (!customer.name.trim()) {
      alert("กรุณาระบุชื่อลูกค้า / ชื่อบริษัท / หน่วยงาน");
      return;
    }
    if (items.length === 0) {
      alert("กรุณาเพิ่มรายการสินค้า/บริการอย่างน้อย 1 รายการ");
      return;
    }

    const success = await onSave(currentDoc);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brick/10 border border-brick/30 text-brick-light rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  {initialDocument ? "แก้ไขเอกสาร" : "สร้างเอกสารการเงินใหม่"}
                </h3>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
                  {docNumber}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                ระบบจัดการใบเสร็จรับเงิน/ใบกำกับภาษี และใบเสนอราคา The M5 Residence
              </p>
            </div>
          </div>

          {/* Switch View Mode & Close */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "editor" ? "preview" : "editor")}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                viewMode === "preview"
                  ? "bg-brick text-white border-brick shadow-md"
                  : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-750"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>{viewMode === "preview" ? "กลับไปหน้าฟอร์มแก้ไข" : "ดูตัวอย่าง A4 (Live Preview)"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-900/90 space-y-6">
          
          {viewMode === "preview" ? (
            /* LIVE A4 PRINT PREVIEW */
            <div className="py-2">
              <TaxInvoicePrintView document={currentDoc} isModal={false} />
            </div>
          ) : (
            /* EDITOR FORM */
            <div className="space-y-6">
              
              {/* TOP STRIP: DOCUMENT TYPE & BOOKING IMPORT */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  
                  {/* Document Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-neutral-300 uppercase block">
                      ประเภทเอกสาร (Document Type)*
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => handleTypeChange("tax_invoice")}
                        className={`py-1.5 px-2 rounded transition-all text-center cursor-pointer ${
                          type === "tax_invoice" ? "bg-emerald-600 text-white shadow font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        ใบกำกับภาษี
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange("quotation")}
                        className={`py-1.5 px-2 rounded transition-all text-center cursor-pointer ${
                          type === "quotation" ? "bg-amber-600 text-white shadow font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        ใบเสนอราคา
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange("invoice")}
                        className={`py-1.5 px-2 rounded transition-all text-center cursor-pointer ${
                          type === "invoice" ? "bg-blue-600 text-white shadow font-bold" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        ใบแจ้งหนี้
                      </button>
                    </div>
                  </div>

                  {/* Document Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-neutral-300 uppercase block">
                      เลขที่เอกสาร (Document NO.)*
                    </label>
                    <input
                      type="text"
                      required
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="เช่น 0069-09-053 หรือ TAX-2569-09-001"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white font-mono font-bold focus:outline-none focus:border-brick"
                    />
                  </div>

                  {/* Import from Booking Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>ดึงข้อมูลจากรายการจอง (Import Booking)</span>
                    </label>
                    <select
                      value={bookingId}
                      onChange={(e) => handleSelectBookingToImport(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-emerald-900/50 rounded text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- เลือกรายการจองห้องพักเพื่อกรอกอัตโนมัติ --</option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          [{b.id}] {b.guestName} ({b.roomName}) - {b.totalPrice.toLocaleString()} THB
                        </option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Dates & Status Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-neutral-900 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono">วันที่เอกสาร (Issue Date)</label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none focus:border-brick"
                    />
                  </div>

                  {(type === "quotation" || type === "invoice") && (
                    <div className="space-y-1">
                      <label className="text-neutral-400 font-mono">วันครบกำหนด (Due Date)</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none focus:border-brick"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono">หมายเลขห้องพัก (Room No.)</label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="เช่น ห้อง 308"
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono">สถานะเอกสาร (Status)</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono uppercase focus:outline-none"
                    >
                      <option value="draft">ฉบับร่าง (Draft)</option>
                      <option value="sent">ส่งลูกค้าแล้ว (Sent)</option>
                      <option value="paid">ชำระเงินเรียบร้อย (Paid)</option>
                      <option value="cancelled">ยกเลิกเอกสาร (Cancelled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CUSTOMER INFORMATION CARD */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase">
                    <Building className="h-4 w-4 text-brick" />
                    <span>ข้อมูลลูกค้า / บริษัท / หน่วยงาน (Customer & Company Information)</span>
                  </div>

                  {/* Preset quick fill buttons */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-neutral-500 font-mono">ตัวอย่าง:</span>
                    <button
                      type="button"
                      onClick={() => setCustomer({
                        name: "สำนักงานคลังจังหวัดพิษณุโลก",
                        branch: "สำนักงานใหญ่",
                        address: "ซ.ศาลากลางจังหวัดพิษณุโลก อ.วังจันทน์ ต.ในเมือง อ.เมืองพิษณุโลก จ.พิษณุโลก 65000",
                        taxId: "0994000477481",
                        phone: "055-258-000",
                        email: "finance_pl@cgd.go.th"
                      })}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] rounded border border-neutral-800 cursor-pointer"
                    >
                      คลังจังหวัดพิษณุโลก (ตามรูป)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomer({
                        name: "บริษัท ตัวอย่าง จำกัด",
                        branch: "สำนักงานใหญ่",
                        address: "123/45 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210",
                        taxId: "0105560123456",
                        phone: "02-123-4567",
                        email: "contact@example.co.th"
                      })}
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] rounded border border-neutral-800 cursor-pointer"
                    >
                      บริษัทเอกชน
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-neutral-400 font-mono">ชื่อลูกค้า / บริษัท / หน่วยงาน (Company Name)*</label>
                    <input
                      type="text"
                      required
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="เช่น สำนักงานคลังจังหวัดพิษณุโลก หรือ บริษัท เอ็นเตอร์เทนเมนท์ จำกัด"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-white font-bold focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-400 font-mono">สาขา (Branch)</label>
                    <input
                      type="text"
                      value={customer.branch || ""}
                      onChange={(e) => setCustomer({ ...customer, branch: e.target.value })}
                      placeholder="เช่น สำนักงานใหญ่ หรือ สาขาที่ 00001"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-neutral-400 font-mono">ที่อยู่ (Customer Address)</label>
                    <textarea
                      rows={2}
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      placeholder="ที่อยู่ตาม ภ.พ.20 หรือที่อยู่จัดส่งเอกสาร..."
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick leading-relaxed"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-neutral-400 font-mono">เลขประจำตัวผู้เสียภาษี (Tax ID - 13 หลัก)</label>
                      <input
                        type="text"
                        value={customer.taxId}
                        onChange={(e) => setCustomer({ ...customer, taxId: e.target.value })}
                        placeholder="เช่น 0994000477481"
                        className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none focus:border-brick"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-neutral-400 font-mono">เบอร์โทร</label>
                        <input
                          type="text"
                          value={customer.phone || ""}
                          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          placeholder="081-xxxxxxx"
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-neutral-400 font-mono">อีเมล</label>
                        <input
                          type="email"
                          value={customer.email || ""}
                          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                          placeholder="email@domain.com"
                          className="w-full px-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LINE ITEMS TABLE */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-900 pb-3">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1.5">
                      <Layers className="h-4 w-4 text-brick" />
                      <span>รายการสินค้าและบริการ (Item Descriptions)</span>
                    </h4>
                    <p className="text-[10px] text-neutral-400">ระบุรายละเอียดห้องพัก วันที่เข้าพัก และยอดเงินที่เรียกเก็บ</p>
                  </div>

                  {/* Quick Add Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 font-mono">เพิ่มด่วน:</span>
                    <button
                      type="button"
                      onClick={() => handleAddItem({ desc: `Standard Room Twin Bedded Room (${roomNumber || "ห้อง 308"})`, price: 1390 })}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] font-mono rounded border border-neutral-800 cursor-pointer"
                    >
                      + Standard Twin (1,390.-)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem({ desc: "Superior Loft Suite", price: 1800 })}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] font-mono rounded border border-neutral-800 cursor-pointer"
                    >
                      + Superior (1,800.-)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem({ desc: "Deluxe Loft Suite", price: 2550 })}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] font-mono rounded border border-neutral-800 cursor-pointer"
                    >
                      + Deluxe (2,550.-)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddItem({ desc: "เตียงเสริม (Extra Bed)", price: 500 })}
                      className="px-2 py-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-[10px] font-mono rounded border border-neutral-800 cursor-pointer"
                    >
                      + Extra Bed (500.-)
                    </button>
                  </div>
                </div>

                {/* Items List Form */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className="p-3 bg-neutral-900/80 border border-neutral-800/80 rounded-lg flex flex-col md:flex-row gap-3 items-start md:items-center"
                    >
                      <div className="font-mono text-xs text-neutral-400 font-bold shrink-0 w-8 text-center pt-1 md:pt-0">
                        #{idx + 1}
                      </div>

                      {/* Description & SubDescription */}
                      <div className="flex-1 space-y-1.5 w-full">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="ชื่อรายการ เช่น Standard Room Twin Bedded Room (ห้อง 308)"
                          className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-bold focus:outline-none focus:border-brick"
                        />
                        <input
                          type="text"
                          value={item.subDescription || ""}
                          onChange={(e) => handleItemChange(idx, "subDescription", e.target.value)}
                          placeholder="คำอธิบายเสริมสีแดง เช่น (Check in 11/09/69 - Check Out 12/09/69)"
                          className="w-full px-3 py-1 bg-neutral-950 border border-neutral-850 rounded text-[11px] text-red-400 font-mono focus:outline-none placeholder-neutral-600"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-24 shrink-0">
                        <label className="text-[10px] text-neutral-400 font-mono block mb-0.5">จำนวน</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-center text-white font-mono focus:outline-none"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="w-32 shrink-0">
                        <label className="text-[10px] text-neutral-400 font-mono block mb-0.5">ราคา/หน่วย</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-right text-white font-mono focus:outline-none"
                        />
                      </div>

                      {/* Total Amount */}
                      <div className="w-32 shrink-0 text-right pr-2">
                        <label className="text-[10px] text-neutral-400 font-mono block mb-0.5">จำนวนเงิน (THB)</label>
                        <div className="text-sm font-mono font-bold text-emerald-400 pt-1">
                          {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Delete item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer mt-1 md:mt-4 shrink-0"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-start pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-brick-light text-xs font-mono font-semibold rounded border border-neutral-800 flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ เพิ่มรายการใหม่ (Add Custom Item)</span>
                  </button>
                </div>
              </div>

              {/* FINANCIAL CALCULATIONS & PAYMENT DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* PAYMENT METHOD OPTIONS */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase border-b border-neutral-900 pb-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <span>วิธีการรับชำระเงิน (Payment Terms)</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-neutral-400 font-mono block mb-1.5">รูปแบบการชำระเงิน</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: "transfer", label: "เงินโอน" },
                          { id: "cash", label: "เงินสด" },
                          { id: "cheque", label: "เช็ค" },
                          { id: "credit_card", label: "บัตรเครดิต" }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPayment({ ...payment, method: m.id as any })}
                            className={`py-1.5 text-center rounded transition-all cursor-pointer font-semibold ${
                              payment.method === m.id
                                ? "bg-emerald-600 text-white font-bold shadow"
                                : "bg-neutral-900 text-neutral-400 hover:text-white"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bank / Transfer Details */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-neutral-400 font-mono">ธนาคาร (Bank)</label>
                        <input
                          type="text"
                          value={payment.bankName || ""}
                          onChange={(e) => setPayment({ ...payment, bankName: e.target.value })}
                          placeholder="เช่น ธนาคารกสิกรไทย"
                          className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-neutral-400 font-mono">สาขา (Branch)</label>
                        <input
                          type="text"
                          value={payment.branch || ""}
                          onChange={(e) => setPayment({ ...payment, branch: e.target.value })}
                          placeholder="เช่น ปากเกร็ด นนทบุรี"
                          className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {payment.method === "cheque" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-neutral-400 font-mono">เลขที่เช็ค (Cheque NO.)</label>
                          <input
                            type="text"
                            value={payment.chequeNumber || ""}
                            onChange={(e) => setPayment({ ...payment, chequeNumber: e.target.value })}
                            placeholder="เช่น 1234567"
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-neutral-400 font-mono">ลงวันที่ (Cheque Date)</label>
                          <input
                            type="date"
                            value={payment.chequeDate || ""}
                            onChange={(e) => setPayment({ ...payment, chequeDate: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-neutral-400 font-mono">หมายเหตุท้ายเอกสาร (Footer Note)</label>
                      <input
                        type="text"
                        value={footerNote}
                        onChange={(e) => setFooterNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-[11px] text-neutral-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* VAT & FINANCIAL SUMMARY */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-4">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase border-b border-neutral-900 pb-2">
                    <Calculator className="h-4 w-4 text-amber-400" />
                    <span>การคำนวณภาษีและยอดสุทธิ (Tax & Calculations)</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* VAT Configuration Mode */}
                    <div>
                      <label className="text-neutral-400 font-mono block mb-1.5">รูปแบบภาษีมูลค่าเพิ่ม (VAT Mode)</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "included", label: "รวม VAT 7% ในราคา (แบบในรูป)", desc: "ถอดภาษีจากยอดรวม" },
                          { id: "excluded", label: "แยกคิด VAT 7%", desc: "บวกเพิ่ม 7% จากยอด" },
                          { id: "exempt", label: "ยกเว้น VAT 0%", desc: "ไม่มีภาษีมูลค่าเพิ่ม" }
                        ].map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVatType(v.id as any)}
                            className={`p-2 text-left rounded transition-all cursor-pointer border ${
                              vatType === v.id
                                ? "bg-brick/10 border-brick text-brick-light font-bold"
                                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                            }`}
                          >
                            <span className="block text-[11px] leading-tight">{v.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discount & Withholding Tax Toggles */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-neutral-400 font-mono">ส่วนลดพิเศษ (บาท)</label>
                        <input
                          type="number"
                          min={0}
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-white font-mono focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-neutral-400 font-mono">หัก ณ ที่จ่าย (WHT)</label>
                          <input
                            type="checkbox"
                            checked={applyWithholdingTax}
                            onChange={(e) => setApplyWithholdingTax(e.target.checked)}
                            className="accent-brick"
                          />
                        </div>
                        {applyWithholdingTax ? (
                          <div className="flex space-x-1">
                            {[1, 3].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setWithholdingTaxPercent(pct)}
                                className={`flex-1 py-1 rounded text-center font-mono font-bold cursor-pointer ${
                                  withholdingTaxPercent === pct ? "bg-amber-600 text-white" : "bg-neutral-900 text-neutral-400"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-neutral-600 italic py-1">ไม่หักภาษี ณ ที่จ่าย</div>
                        )}
                      </div>
                    </div>

                    {/* Summary Calculation Box */}
                    <div className="p-3 bg-neutral-900 rounded-lg space-y-1.5 border border-neutral-800 font-mono text-xs">
                      <div className="flex justify-between text-neutral-300">
                        <span>ยอดก่อนภาษีมูลค่าเพิ่ม (Net before VAT):</span>
                        <span>{netBeforeVat.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</span>
                      </div>
                      <div className="flex justify-between text-neutral-300">
                        <span>ภาษีมูลค่าเพิ่ม VAT ({vatRate}%):</span>
                        <span>{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</span>
                      </div>
                      {withholdingTaxAmount > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>หักภาษี ณ ที่จ่าย ({withholdingTaxPercent}%):</span>
                          <span>- {withholdingTaxAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
                        <span className="text-emerald-400">รวมเงินที่ชำระ (Total Net):</span>
                        <span className="text-emerald-400">{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</span>
                      </div>
                      <div className="text-[11px] font-sans font-medium text-neutral-400 text-right pt-0.5">
                        ตัวอักษร: <span className="text-white font-semibold">({currentBahtText})</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-400 font-mono hidden sm:block">
            {viewMode === "preview" ? "👁️ กำลังดูตัวอย่าง A4 สำหรับพิมพ์" : "📝 กำลังกรอกข้อมูลแบบฟอร์มเอกสาร"}
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded text-xs font-mono uppercase font-bold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === "editor" ? "preview" : "editor")}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded text-xs font-mono uppercase font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Eye className="h-4 w-4" />
              <span>{viewMode === "preview" ? "กลับไปแก้ไข" : "ดูตัวอย่าง (Preview)"}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-mono uppercase font-bold shadow-lg shadow-brick/20 transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกเอกสาร (Save Document)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
