import React, { useState, useMemo, useRef } from "react";
import { 
  FileText, Plus, Search, Filter, Printer, Download, Trash2, Edit2, 
  CheckCircle, Clock, AlertTriangle, XCircle, ArrowRightLeft, Copy, 
  ExternalLink, Building2, User, CreditCard, DollarSign, Calendar, RefreshCw
} from "lucide-react";
import { InvoiceRecord, InvoiceDocType, InvoiceStatus, VatCalculationType, InvoiceItem, BookingRecord } from "../types";
import { thaiBahtText } from "../utils/thaiBahtText";
import { GeneralSettings } from "../context/SettingsContext";

interface InvoicesTabContentProps {
  invoices: InvoiceRecord[];
  bookings: BookingRecord[];
  generalSettings: GeneralSettings;
  onSaveInvoice: (invoice: InvoiceRecord) => Promise<boolean>;
  onDeleteInvoice: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  prefilledBookingId?: string | null;
  onClearPrefilledBooking?: () => void;
}

export default function InvoicesTabContent({
  invoices,
  bookings,
  generalSettings,
  onSaveInvoice,
  onDeleteInvoice,
  onRefresh,
  prefilledBookingId,
  onClearPrefilledBooking
}: InvoicesTabContentProps) {
  // Filters & Search
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [previewCopyType, setPreviewCopyType] = useState<"original" | "copy">("original");

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDocType, setFormDocType] = useState<InvoiceDocType>("tax_invoice");
  const [formDocNumber, setFormDocNumber] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [formStatus, setFormStatus] = useState<InvoiceStatus>("paid");
  const [formBookingId, setFormBookingId] = useState("");

  // Customer State
  const [customerName, setCustomerName] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [customerBranch, setCustomerBranch] = useState("สำนักงานใหญ่");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Company State (From settings with fallback)
  const gen = (generalSettings || {}) as any;
  const companyName = gen.companyLegalName || "บริษัท เดอะ เอ็มไฟว์ เรสซิเดนซ์ จำกัด";
  const companyTaxId = gen.companyTaxId || "0125561031626";
  const companyBranch = gen.companyBranch || "สำนักงานใหญ่ (Head Office)";
  const companyAddress = gen.contactAddress || "ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอร์";
  const companyPhone = gen.contactPhone || "086-379-6761";
  const companyEmail = gen.lineId ? `${gen.lineId.replace('@', '')}@them5residence.com` : "info@them5residence.com";

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "item-1",
      description: "ค่าบริการห้องพัก Superior Room (1 คืน)",
      quantity: 1,
      unitPrice: 1800,
      discount: 0,
      amount: 1800
    }
  ]);

  // Tax and Financial calculation state
  const [vatType, setVatType] = useState<VatCalculationType>("include");
  const [withholdingTaxRate, setWithholdingTaxRate] = useState<number>(0);
  const [bankName, setBankName] = useState(gen.bankName || "ธนาคารกสิกรไทย (KBANK)");
  const [bankAccountName, setBankAccountName] = useState(gen.bankAccountName || "บริษัท เดอะ เอ็มไฟว์ เรสซิเดนซ์ จำกัด");
  const [bankAccountNumber, setBankAccountNumber] = useState(gen.bankAccountNumber || "012-3-45678-9");
  const [promptPayId, setPromptPayId] = useState(gen.promptPayId || companyTaxId);
  const [paymentMethod, setPaymentMethod] = useState("โอนเงินผ่านธนาคาร (Bank Transfer)");
  const [remarks, setRemarks] = useState("ขอบพระคุณที่ใช้บริการ เดอะ เอ็มไฟว์ เรสซิเดนซ์ (ปากเกร็ด นนทบุรี)");
  const [authorizedSigner, setAuthorizedSigner] = useState("ผู้มีอำนาจลงนาม");
  const [collectorName, setCollectorName] = useState("เจ้าหน้าที่รับเงิน");

  // Generate next document number helper
  const generateDocNumber = (type: InvoiceDocType) => {
    const today = new Date();
    const yearMonth = today.toISOString().slice(0, 7).replace("-", ""); // e.g. 202609
    let prefix = "TAX";
    if (type === "quotation") prefix = "QT";
    else if (type === "invoice") prefix = "INV";
    else if (type === "receipt") prefix = "RCP";

    // Count existing with this prefix for this month
    const existing = invoices.filter(inv => inv.docNumber && inv.docNumber.startsWith(`${prefix}-${yearMonth}`));
    const nextSeq = String(existing.length + 1).padStart(3, "0");
    return `${prefix}-${yearMonth}-${nextSeq}`;
  };

  // Open creation modal with prefill
  const handleOpenCreate = (type: InvoiceDocType = "tax_invoice", booking?: BookingRecord) => {
    setEditingId(null);
    setFormDocType(type);
    setFormDocNumber(generateDocNumber(type));
    setFormDate(new Date().toISOString().split("T")[0]);
    const due = new Date();
    due.setDate(due.getDate() + (type === "quotation" ? 15 : 7));
    setFormDueDate(due.toISOString().split("T")[0]);
    setFormStatus(type === "tax_invoice" || type === "receipt" ? "paid" : "pending");
    setVatType("include");
    setWithholdingTaxRate(0);

    if (booking) {
      setFormBookingId(booking.id);
      setCustomerName(booking.guestName || "");
      setCustomerPhone(booking.guestPhone || "");
      setCustomerEmail(booking.guestEmail || "");
      setCustomerAddress("ไม่ระบุที่อยู่จัดส่ง");
      setCustomerTaxId("");
      setCustomerBranch("สำนักงานใหญ่");

      const stayDays = calculateNights(booking.checkIn, booking.checkOut);
      const total = Number(booking.totalPrice) || 1800;
      const unitPrice = stayDays > 0 ? Math.round(total / stayDays) : total;

      setItems([
        {
          id: "item-bk-1",
          description: `ค่าบริการห้องพัก ${booking.roomName || booking.roomType} (${booking.checkIn} ถึง ${booking.checkOut})`,
          quantity: stayDays > 0 ? stayDays : 1,
          unitPrice: unitPrice,
          discount: 0,
          amount: total
        }
      ]);
      setRemarks(`อ้างอิงการจองเลขที่ #${booking.id} (${booking.roomName || booking.roomType})`);
    } else {
      setFormBookingId("");
      setCustomerName("");
      setCustomerTaxId("");
      setCustomerBranch("สำนักงานใหญ่");
      setCustomerAddress("");
      setCustomerPhone("");
      setCustomerEmail("");
      setItems([
        {
          id: "item-1",
          description: "ค่าบริการห้องพัก Superior Loft Room",
          quantity: 1,
          unitPrice: 1800,
          discount: 0,
          amount: 1800
        }
      ]);
      setRemarks("ขอบพระคุณที่ใช้บริการ เดอะ เอ็มไฟว์ เรสซิเดนซ์");
    }

    setIsFormOpen(true);
  };

  // Helper to calculate nights between check-in and check-out
  function calculateNights(checkIn?: string, checkOut?: string): number {
    if (!checkIn || !checkOut) return 1;
    try {
      const inDate = new Date(checkIn);
      const outDate = new Date(checkOut);
      const diffTime = Math.abs(outDate.getTime() - inDate.getTime());
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 1;
    } catch (_) {
      return 1;
    }
  }

  // Handle auto-open if prefilledBookingId is provided
  React.useEffect(() => {
    if (prefilledBookingId) {
      const found = bookings.find(b => b.id === prefilledBookingId);
      if (found) {
        handleOpenCreate("tax_invoice", found);
      }
      if (onClearPrefilledBooking) {
        onClearPrefilledBooking();
      }
    }
  }, [prefilledBookingId]);

  // Handle Open Edit
  const handleOpenEdit = (inv: InvoiceRecord) => {
    setEditingId(inv.id);
    setFormDocType(inv.docType);
    setFormDocNumber(inv.docNumber);
    setFormDate(inv.date);
    setFormDueDate(inv.dueDate || inv.date);
    setFormStatus(inv.status);
    setFormBookingId(inv.bookingId || "");
    setCustomerName(inv.customerName);
    setCustomerTaxId(inv.customerTaxId || "");
    setCustomerBranch(inv.customerBranch || "สำนักงานใหญ่");
    setCustomerAddress(inv.customerAddress);
    setCustomerPhone(inv.customerPhone || "");
    setCustomerEmail(inv.customerEmail || "");
    setItems(inv.items && inv.items.length > 0 ? inv.items : [
      { id: "1", description: "ค่าบริการห้องพัก", quantity: 1, unitPrice: inv.subtotal, discount: 0, amount: inv.subtotal }
    ]);
    setVatType(inv.vatType || "include");
    setWithholdingTaxRate(inv.withholdingTaxRate || 0);
    setBankName(inv.bankName || gen.bankName || "ธนาคารกสิกรไทย (KBANK)");
    setBankAccountName(inv.bankAccountName || gen.bankAccountName || "บริษัท เดอะ เอ็มไฟว์ เรสซิเดนซ์ จำกัด");
    setBankAccountNumber(inv.bankAccountNumber || gen.bankAccountNumber || "012-3-45678-9");
    setPromptPayId(inv.promptPayId || gen.promptPayId || companyTaxId);
    setPaymentMethod(inv.paymentMethod || "โอนเงินผ่านธนาคาร");
    setRemarks(inv.remarks || "");
    setAuthorizedSigner(inv.authorizedSigner || "ผู้มีอำนาจลงนาม");
    setCollectorName(inv.collectorName || "เจ้าหน้าที่รับเงิน");

    setIsFormOpen(true);
  };

  // Calculations
  const calculatedTotals = useMemo(() => {
    const rawSubtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const rawDiscount = items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const afterDiscount = Math.max(0, rawSubtotal - rawDiscount);

    let subtotal = afterDiscount;
    let vatAmount = 0;
    let grandTotal = afterDiscount;

    if (vatType === "exclude") {
      // Exclude VAT: subtotal is pre-tax, add 7%
      subtotal = afterDiscount;
      vatAmount = Number((subtotal * 0.07).toFixed(2));
      grandTotal = Number((subtotal + vatAmount).toFixed(2));
    } else if (vatType === "include") {
      // Include VAT: afterDiscount already has 7% VAT included
      grandTotal = afterDiscount;
      subtotal = Number((grandTotal / 1.07).toFixed(2));
      vatAmount = Number((grandTotal - subtotal).toFixed(2));
    } else {
      // Exempt
      subtotal = afterDiscount;
      vatAmount = 0;
      grandTotal = afterDiscount;
    }

    let withholdingTaxAmount = 0;
    if (withholdingTaxRate > 0) {
      withholdingTaxAmount = Number((subtotal * (withholdingTaxRate / 100)).toFixed(2));
      grandTotal = Number((grandTotal - withholdingTaxAmount).toFixed(2));
    }

    const thaiText = thaiBahtText(grandTotal);

    return {
      subtotal,
      rawDiscount,
      afterDiscount,
      vatAmount,
      withholdingTaxAmount,
      grandTotal,
      thaiText
    };
  }, [items, vatType, withholdingTaxRate]);

  // Update item field
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const copy = [...items];
    const item = { ...copy[index], [field]: value };
    
    // Auto calculate amount
    const qty = Number(field === "quantity" ? value : item.quantity) || 0;
    const price = Number(field === "unitPrice" ? value : item.unitPrice) || 0;
    const disc = Number(field === "discount" ? value : item.discount) || 0;
    item.amount = Math.max(0, (qty * price) - disc);

    copy[index] = item;
    setItems(copy);
  };

  // Add Item
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        description: "บริการเพิ่มเติม / บริการเสริม",
        quantity: 1,
        unitPrice: 500,
        discount: 0,
        amount: 500
      }
    ]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("ต้องมีรายการสินค้าหรือบริการอย่างน้อย 1 รายการ");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Save Document
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท");
      return;
    }
    if (!formDocNumber.trim()) {
      alert("กรุณาระบุเลขที่เอกสาร");
      return;
    }

    const docId = editingId || `inv-${Date.now()}`;
    const invoiceRecord: InvoiceRecord = {
      id: docId,
      docNumber: formDocNumber.trim(),
      docType: formDocType,
      date: formDate,
      dueDate: formDueDate,
      status: formStatus,
      bookingId: formBookingId || undefined,

      companyName,
      companyTaxId,
      companyBranch,
      companyAddress,
      companyPhone,
      companyEmail,

      customerName: customerName.trim(),
      customerTaxId: customerTaxId.trim() || undefined,
      customerBranch: customerBranch.trim() || "สำนักงานใหญ่",
      customerAddress: customerAddress.trim() || "ไม่ระบุที่อยู่จัดส่ง",
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,

      items,
      subtotal: calculatedTotals.subtotal,
      discountTotal: calculatedTotals.rawDiscount,
      afterDiscount: calculatedTotals.afterDiscount,
      vatType,
      vatRate: 7,
      vatAmount: calculatedTotals.vatAmount,
      withholdingTaxRate,
      withholdingTaxAmount: calculatedTotals.withholdingTaxAmount,
      grandTotal: calculatedTotals.grandTotal,
      bahtText: calculatedTotals.thaiText,

      bankName,
      bankAccountName,
      bankAccountNumber,
      promptPayId,
      paymentMethod,
      remarks,
      authorizedSigner,
      collectorName,
      createdAt: editingId ? (invoices.find(i => i.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = await onSaveInvoice(invoiceRecord);
    if (success) {
      setIsFormOpen(false);
      // Auto open preview for inspection
      setPreviewInvoice(invoiceRecord);
      setIsPreviewOpen(true);
    }
  };

  // Delete Document
  const handleDelete = async (id: string, docNum: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารเลขที่ ${docNum}? การลบจะมีผลทันทีและไม่สามารถกู้คืนได้`)) {
      await onDeleteInvoice(id);
    }
  };

  // Convert Document Type
  const handleConvertDocType = async (inv: InvoiceRecord, targetType: InvoiceDocType) => {
    const newDocNumber = generateDocNumber(targetType);
    const converted: InvoiceRecord = {
      ...inv,
      id: `inv-${Date.now()}`,
      docNumber: newDocNumber,
      docType: targetType,
      status: targetType === "tax_invoice" || targetType === "receipt" ? "paid" : "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await onSaveInvoice(converted);
    setPreviewInvoice(converted);
    setIsPreviewOpen(true);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (selectedType !== "all" && inv.docType !== selectedType) return false;
      if (selectedStatus !== "all" && inv.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (inv.docNumber || "").toLowerCase().includes(q);
        const matchesCust = (inv.customerName || "").toLowerCase().includes(q);
        const matchesTax = (inv.customerTaxId || "").toLowerCase().includes(q);
        const matchesBk = (inv.bookingId || "").toLowerCase().includes(q);
        const matchesPhone = (inv.customerPhone || "").toLowerCase().includes(q);
        if (!matchesNum && !matchesCust && !matchesTax && !matchesBk && !matchesPhone) return false;
      }
      return true;
    });
  }, [invoices, selectedType, selectedStatus, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalRev = invoices
      .filter(i => i.status === "paid" && (i.docType === "tax_invoice" || i.docType === "receipt"))
      .reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const taxCount = invoices.filter(i => i.docType === "tax_invoice").length;
    const qtCount = invoices.filter(i => i.docType === "quotation").length;
    const pendingTotal = invoices
      .filter(i => i.status === "pending")
      .reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);

    return { totalRev, taxCount, qtCount, pendingTotal };
  }, [invoices]);

  const getDocTypeBadge = (type: InvoiceDocType) => {
    switch (type) {
      case "tax_invoice":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">ใบกำกับภาษี/ใบเสร็จ</span>;
      case "quotation":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60">ใบเสนอราคา</span>;
      case "invoice":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-700/60">ใบแจ้งหนี้</span>;
      case "receipt":
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-950/80 text-purple-300 border border-purple-700/60">ใบเสร็จรับเงิน</span>;
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle className="w-3 h-3" /> ชำระแล้ว</span>;
      case "pending":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"><Clock className="w-3 h-3" /> รอดำเนินการ</span>;
      case "draft":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-neutral-600/20 text-neutral-400 border border-neutral-600/30">ฉบับร่าง</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30"><XCircle className="w-3 h-3" /> ยกเลิก</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet injection for clean paper view */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-paper, #printable-invoice-paper * {
            visibility: visible;
          }
          #printable-invoice-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            font-size: 12px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30 border border-neutral-800 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <FileText className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-wide">
              ระบบออกใบกำกับภาษี & ใบเสนอราคา (Tax Invoice & Quotation)
            </h2>
          </div>
          <p className="text-xs text-neutral-400">
            สร้างใบเสร็จรับเงิน/ใบกำกับภาษี, ใบเสนอราคา, ใบแจ้งหนี้ ถูกต้องตามแบบประมวลรัษฎากร พร้อมคำนวณ VAT 7% และพิมพ์ออกเป็นเอกสารกระดาษหรือ PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              setIsRefreshing(true);
              await onRefresh();
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={() => handleOpenCreate("quotation")}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded-lg text-xs font-bold transition shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>สร้างใบเสนอราคา</span>
          </button>

          <button
            onClick={() => handleOpenCreate("tax_invoice")}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer hover:shadow-amber-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ออกใบกำกับภาษี / ใบเสร็จ</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-semibold">ยอดขายออกใบเสร็จแล้ว</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            ฿{stats.totalRev.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">ยอดชำระสำเร็จสุทธิ</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-semibold">ใบกำกับภาษีที่ออก</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {stats.taxCount} <span className="text-xs font-normal text-neutral-400">ฉบับ</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">ถูกต้องตามประมวลรัษฎากร</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-semibold">ใบเสนอราคา</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400 font-mono">
            {stats.qtCount} <span className="text-xs font-normal text-neutral-400">ฉบับ</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">สำหรับลูกค้าองค์กร/กรุ๊ป</div>
        </div>

        <div className="p-4 bg-neutral-900/90 border border-neutral-800 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs font-semibold">รอดำเนินการ/ค้างชำระ</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            ฿{stats.pendingTotal.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">รอการชำระเงินหรือรออนุมัติ</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Doc Type Selector */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer transition ${
                selectedType === "all" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ทั้งหมด ({invoices.length})
            </button>
            <button
              onClick={() => setSelectedType("tax_invoice")}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer transition ${
                selectedType === "tax_invoice" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบกำกับภาษี
            </button>
            <button
              onClick={() => setSelectedType("quotation")}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer transition ${
                selectedType === "quotation" ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบเสนอราคา
            </button>
            <button
              onClick={() => setSelectedType("invoice")}
              className={`px-3 py-1 text-xs font-medium rounded cursor-pointer transition ${
                selectedType === "invoice" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบแจ้งหนี้
            </button>
          </div>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">ทุกสถานะ (All Status)</option>
            <option value="paid">ชำระแล้ว (Paid)</option>
            <option value="pending">รอดำเนินการ (Pending)</option>
            <option value="draft">ฉบับร่าง (Draft)</option>
            <option value="cancelled">ยกเลิก (Cancelled)</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเลขที่, ชื่อลูกค้า, เลขประจำตัวผู้เสียภาษี..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-500">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">ยังไม่มีเอกสารในหมวดหมู่นี้</p>
            <p className="text-xs text-neutral-500 mt-1">
              กดปุ่ม "ออกใบกำกับภาษี / ใบเสร็จ" หรือ "สร้างใบเสนอราคา" เพื่อเริ่มสร้างเอกสารฉบับแรก
            </p>
            <button
              onClick={() => handleOpenCreate("tax_invoice")}
              className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>สร้างเอกสารแรกเดี๋ยวนี้</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">เลขที่เอกสาร</th>
                  <th className="py-3 px-3">ประเภท</th>
                  <th className="py-3 px-3">วันที่ / ครบกำหนด</th>
                  <th className="py-3 px-4">ลูกค้า / ผู้รับบริการ</th>
                  <th className="py-3 px-4 text-right">ยอดสุทธิ (บาท)</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{inv.docNumber}</span>
                      </div>
                      {inv.bookingId && (
                        <div className="text-[10px] text-cyan-400/80 font-sans font-normal mt-0.5">
                          อ้างอิงการจอง: #{inv.bookingId}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {getDocTypeBadge(inv.docType)}
                    </td>
                    <td className="py-3.5 px-3 text-neutral-300">
                      <div>{inv.date}</div>
                      {inv.dueDate && (
                        <div className="text-[10px] text-neutral-500">ครบ: {inv.dueDate}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{inv.customerName}</div>
                      {inv.customerTaxId && (
                        <div className="text-[10px] text-neutral-400 font-mono">
                          Tax ID: {inv.customerTaxId} ({inv.customerBranch || "สนง.ใหญ่"})
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ฿{Number(inv.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <div className="text-[10px] font-normal text-neutral-400">
                        {inv.vatType === "exempt" ? "ยกเว้น VAT" : `VAT: ฿${(inv.vatAmount || 0).toLocaleString()}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setPreviewInvoice(inv);
                            setIsPreviewOpen(true);
                          }}
                          title="ดูและพิมพ์เอกสาร (Print)"
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(inv)}
                          title="แก้ไขข้อมูล (Edit)"
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        {inv.docType === "quotation" && (
                          <button
                            onClick={() => handleConvertDocType(inv, "tax_invoice")}
                            title="แปลงเป็นใบกำกับภาษี (Convert to Tax Invoice)"
                            className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded transition cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(inv.id, inv.docNumber)}
                          title="ลบเอกสาร (Delete)"
                          className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-400 hover:text-white rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT INVOICE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? "แก้ไขเอกสาร" : "ออกเอกสารภาษี / ใบเสนอราคาใหม่"}
                  </h3>
                  <p className="text-xs text-neutral-400">กรอกข้อมูลให้ครบถ้วนเพื่อสร้างเอกสารที่ถูกต้องตามกฎหมาย</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Document Meta */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. ข้อมูลหัวเอกสาร (Document Header)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">ประเภทเอกสาร *</label>
                    <select
                      value={formDocType}
                      onChange={(e) => {
                        const newType = e.target.value as InvoiceDocType;
                        setFormDocType(newType);
                        if (!editingId) {
                          setFormDocNumber(generateDocNumber(newType));
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="tax_invoice">ใบกำกับภาษี / ใบเสร็จรับเงิน</option>
                      <option value="quotation">ใบเสนอราคา (Quotation)</option>
                      <option value="invoice">ใบแจ้งหนี้ (Invoice)</option>
                      <option value="receipt">ใบเสร็จรับเงิน (Receipt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">เลขที่เอกสาร *</label>
                    <input
                      type="text"
                      value={formDocNumber}
                      onChange={(e) => setFormDocNumber(e.target.value)}
                      required
                      placeholder="TAX-202609-001"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">วันที่ออกเอกสาร *</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      required
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">วันครบกำหนดชำระ</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">
                      ดึงข้อมูลจากการจองห้องพัก (Quick Auto-fill)
                    </label>
                    <select
                      value={formBookingId}
                      onChange={(e) => {
                        const bId = e.target.value;
                        setFormBookingId(bId);
                        const b = bookings.find(item => item.id === bId);
                        if (b) {
                          setCustomerName(b.guestName || "");
                          setCustomerPhone(b.guestPhone || "");
                          setCustomerEmail(b.guestEmail || "");
                          const nights = calculateNights(b.checkIn, b.checkOut);
                          const total = Number(b.totalPrice) || 1800;
                          const rate = nights > 0 ? Math.round(total / nights) : total;
                          setItems([
                            {
                              id: `item-${Date.now()}`,
                              description: `ค่าบริการห้องพัก ${b.roomName || b.roomType} (${b.checkIn} ถึง ${b.checkOut})`,
                              quantity: nights,
                              unitPrice: rate,
                              discount: 0,
                              amount: total
                            }
                          ]);
                          setRemarks(`อ้างอิงการจองเลขที่ #${b.id} (${b.roomName || b.roomType})`);
                        }
                      }}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- ไม่เชื่อมโยงกับการจอง (กำหนดเอง) --</option>
                      {bookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.id} - คุณ {b.guestName} ({b.roomName || b.roomType}) ฿{b.totalPrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">สถานะเอกสาร</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as InvoiceStatus)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="paid">ชำระแล้ว (Paid)</option>
                      <option value="pending">รอดำเนินการ (Pending)</option>
                      <option value="draft">ฉบับร่าง (Draft)</option>
                      <option value="cancelled">ยกเลิก (Cancelled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Customer Info */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. ข้อมูลลูกค้า / ผู้รับบริการ (Customer / Billed To)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">
                      ชื่อลูกค้า หรือ ชื่อบริษัท/นิติบุคคล *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="เช่น คุณสมชาย ใจดี หรือ บริษัท ตัวอย่าง จำกัด"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">
                      เลขประจำตัวผู้เสียภาษี (13 หลัก)
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      value={customerTaxId}
                      onChange={(e) => setCustomerTaxId(e.target.value.replace(/\D/g, ""))}
                      placeholder="01055xxxxxxxx"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">สาขา</label>
                    <input
                      type="text"
                      value={customerBranch}
                      onChange={(e) => setCustomerBranch(e.target.value)}
                      placeholder="สำนักงานใหญ่ หรือ สาขาที่ 00001"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="081-xxxxxxx"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">อีเมล</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 font-semibold mb-1">ที่อยู่ลูกค้า / บริษัท *</label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    required
                    placeholder="เลขที่, อาคาร, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                    className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Section 3: Items Table */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    3. รายการสินค้าและบริการ (Items & Charges)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
                      <div className="col-span-1 text-center font-mono text-neutral-500 font-bold">
                        #{idx + 1}
                      </div>

                      <div className="col-span-5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="คำอธิบายรายการ เช่น ค่าห้องพัก Superior"
                          required
                          className="w-full bg-neutral-950 border border-neutral-750 text-white rounded px-2.5 py-1.5 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                            required
                            className="w-full bg-neutral-950 border border-neutral-750 text-white text-center rounded px-2 py-1.5 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                          required
                          placeholder="ราคา/หน่วย"
                          className="w-full bg-neutral-950 border border-neutral-750 text-white text-right rounded px-2 py-1.5 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-right font-mono font-bold text-amber-400">
                        ฿{item.amount.toLocaleString()}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                          title="ลบแถวนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Calculation & Taxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    4. การตั้งค่าภาษี (Tax & Withholding)
                  </h4>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">การคำนวณภาษีมูลค่าเพิ่ม (VAT 7%)</label>
                    <select
                      value={vatType}
                      onChange={(e) => setVatType(e.target.value as VatCalculationType)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="include">รวมใน (Include VAT 7%) - ราคาสินค้ารวม VAT แล้ว</option>
                      <option value="exclude">แยกนอก (Exclude VAT 7%) - เพิ่ม VAT 7% จากยอดเงิน</option>
                      <option value="exempt">ยกเว้นภาษี (Exempt VAT 0%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">ภาษีหัก ณ ที่จ่าย (Withholding Tax - WHT)</label>
                    <select
                      value={withholdingTaxRate}
                      onChange={(e) => setWithholdingTaxRate(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value={0}>ไม่มีการหัก ณ ที่จ่าย (0%)</option>
                      <option value={1}>หัก ณ ที่จ่าย 1% (ค่าขนส่ง/บริการ)</option>
                      <option value={2}>หัก ณ ที่จ่าย 2% (ค่าโฆษณา)</option>
                      <option value={3}>หัก ณ ที่จ่าย 3% (ค่าบริการทั่วไป / นิติบุคคล)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 font-semibold mb-1">วิธีชำระเงิน</label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="โอนเงินผ่านธนาคาร, เงินสด, บัตรเครดิต"
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded-lg px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="p-4 bg-gradient-to-br from-neutral-950 to-neutral-900 border border-amber-900/30 rounded-xl space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                    สรุปยอดเงิน (Financial Summary)
                  </h4>

                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>มูลค่าสินค้า/บริการ (Subtotal):</span>
                    <span className="font-mono text-white">฿{calculatedTotals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {calculatedTotals.rawDiscount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>หักส่วนลด (Discount):</span>
                      <span className="font-mono">-฿{calculatedTotals.rawDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                    <span className="font-mono text-white">฿{calculatedTotals.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {withholdingTaxRate > 0 && (
                    <div className="flex justify-between text-xs text-rose-400">
                      <span>หักภาษี ณ ที่จ่าย ({withholdingTaxRate}%):</span>
                      <span className="font-mono">-฿{calculatedTotals.withholdingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">จำนวนเงินรวมทั้งสิ้น (Grand Total):</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">
                      ฿{calculatedTotals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2 bg-neutral-900/80 rounded border border-neutral-800 text-[11px] text-amber-300 font-semibold text-center">
                    ({calculatedTotals.thaiText})
                  </div>
                </div>
              </div>

              {/* Section 5: Remarks & Bank Info */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  5. ข้อมูลธนาคารและหมายเหตุ (Bank Details & Remarks)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">ธนาคาร</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">ชื่อบัญชี</label>
                    <input
                      type="text"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">เลขที่บัญชี</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-750 text-white rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">หมายเหตุ / เงื่อนไข</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="เช่น ชำระเงินภายใน 7 วัน, ห้องพักรวมอาหารเช้า"
                    className="w-full bg-neutral-900 border border-neutral-750 text-white rounded px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md cursor-pointer hover:shadow-amber-500/20"
                >
                  {editingId ? "บันทึกการแก้ไข" : "บันทึกและสร้างเอกสาร"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT & PREVIEW A4 MODAL */}
      {isPreviewOpen && previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
            {/* Modal Top Control Bar (Not printed) */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-amber-400">
                  {previewInvoice.docNumber}
                </span>
                <div className="flex items-center bg-neutral-900 p-0.5 rounded border border-neutral-800 text-xs">
                  <button
                    onClick={() => setPreviewCopyType("original")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      previewCopyType === "original" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-neutral-400"
                    }`}
                  >
                    ต้นฉบับ (Original)
                  </button>
                  <button
                    onClick={() => setPreviewCopyType("copy")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition ${
                      previewCopyType === "copy" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-neutral-400"
                    }`}
                  >
                    สำเนา (Copy)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร / บันทึก PDF (Print)</span>
                </button>

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* A4 PRINTABLE PAPER SHEET */}
            <div className="p-4 sm:p-8 bg-neutral-950/60 overflow-y-auto max-h-[82vh]">
              <div
                id="printable-invoice-paper"
                className="bg-white text-neutral-900 p-8 sm:p-10 rounded-lg shadow-xl mx-auto max-w-[800px] border border-neutral-200 text-xs font-sans leading-normal"
              >
                {/* Header: Company & Doc Title */}
                <div className="border-b-2 border-neutral-800 pb-5 mb-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 max-w-[60%]">
                      <div className="text-xl font-bold tracking-tight text-neutral-900">
                        {previewInvoice.companyName}
                      </div>
                      <div className="text-[11px] text-neutral-700">
                        THE M5 RESIDENCE (MUANG THONG THANI - PAK KRET)
                      </div>
                      <div className="text-[11px] text-neutral-600 leading-relaxed mt-1">
                        {previewInvoice.companyAddress}
                      </div>
                      <div className="text-[11px] text-neutral-700 font-mono">
                        โทรศัพท์: {previewInvoice.companyPhone} | อีเมล: {previewInvoice.companyEmail}
                      </div>
                      <div className="text-[11px] font-bold text-neutral-800 pt-1">
                        เลขประจำตัวผู้เสียภาษีอากร: <span className="font-mono">{previewInvoice.companyTaxId}</span> ({previewInvoice.companyBranch})
                      </div>
                    </div>

                    {/* Right Doc Title Box */}
                    <div className="text-right space-y-1">
                      <div className="inline-block bg-neutral-900 text-white px-3 py-1 text-sm font-bold tracking-wider uppercase rounded">
                        {previewInvoice.docType === "tax_invoice" && "ใบเสร็จรับเงิน / ใบกำกับภาษี"}
                        {previewInvoice.docType === "quotation" && "ใบเสนอราคา"}
                        {previewInvoice.docType === "invoice" && "ใบแจ้งหนี้"}
                        {previewInvoice.docType === "receipt" && "ใบเสร็จรับเงิน"}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                        {previewInvoice.docType === "tax_invoice" && "RECEIPT / TAX INVOICE"}
                        {previewInvoice.docType === "quotation" && "QUOTATION"}
                        {previewInvoice.docType === "invoice" && "INVOICE"}
                        {previewInvoice.docType === "receipt" && "RECEIPT"}
                      </div>
                      <div className="text-[11px] font-bold text-amber-700 uppercase">
                        [{previewCopyType === "original" ? "ต้นฉบับ / ORIGINAL" : "สำเนา / COPY"}]
                      </div>

                      <div className="pt-3 space-y-1 font-mono text-[11px]">
                        <div><span className="font-sans font-bold text-neutral-700">เลขที่:</span> {previewInvoice.docNumber}</div>
                        <div><span className="font-sans font-bold text-neutral-700">วันที่:</span> {previewInvoice.date}</div>
                        {previewInvoice.dueDate && (
                          <div><span className="font-sans font-bold text-neutral-700">ครบกำหนด:</span> {previewInvoice.dueDate}</div>
                        )}
                        {previewInvoice.bookingId && (
                          <div className="text-cyan-800"><span className="font-sans font-bold text-neutral-700">อ้างอิง:</span> #{previewInvoice.bookingId}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information Box */}
                <div className="border border-neutral-300 rounded p-3 mb-5 bg-neutral-50/60">
                  <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    ข้อมูลผู้ซื้อ / ผู้รับบริการ (CUSTOMER / BILLED TO)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-neutral-900">{previewInvoice.customerName}</div>
                      <div className="text-[11px] text-neutral-700">{previewInvoice.customerAddress}</div>
                      {previewInvoice.customerPhone && (
                        <div className="text-[11px] text-neutral-700">โทรศัพท์: {previewInvoice.customerPhone}</div>
                      )}
                    </div>

                    <div className="space-y-0.5 text-right font-mono text-[11px]">
                      {previewInvoice.customerTaxId && (
                        <div>
                          <span className="font-sans font-bold text-neutral-800">เลขประจำตัวผู้เสียภาษี:</span> {previewInvoice.customerTaxId}
                        </div>
                      )}
                      <div>
                        <span className="font-sans font-bold text-neutral-800">สาขา:</span> {previewInvoice.customerBranch || "สำนักงานใหญ่"}
                      </div>
                      {previewInvoice.paymentMethod && (
                        <div>
                          <span className="font-sans font-bold text-neutral-800">วิธีชำระเงิน:</span> {previewInvoice.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse border border-neutral-300 mb-5">
                  <thead>
                    <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-800 text-[11px] font-bold text-center">
                      <th className="border-r border-neutral-300 py-2 px-2 w-12">ลำดับ<br/><span className="text-[9px] font-normal text-neutral-500">NO.</span></th>
                      <th className="border-r border-neutral-300 py-2 px-3 text-left">รายการ / รายละเอียด<br/><span className="text-[9px] font-normal text-neutral-500">DESCRIPTION</span></th>
                      <th className="border-r border-neutral-300 py-2 px-2 w-16">จำนวน<br/><span className="text-[9px] font-normal text-neutral-500">QTY</span></th>
                      <th className="border-r border-neutral-300 py-2 px-3 text-right w-24">ราคา/หน่วย<br/><span className="text-[9px] font-normal text-neutral-500">UNIT PRICE</span></th>
                      <th className="border-r border-neutral-300 py-2 px-2 text-right w-20">ส่วนลด<br/><span className="text-[9px] font-normal text-neutral-500">DISC.</span></th>
                      <th className="py-2 px-3 text-right w-28">จำนวนเงิน<br/><span className="text-[9px] font-normal text-neutral-500">AMOUNT</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-[11px]">
                    {previewInvoice.items.map((item, idx) => (
                      <tr key={item.id} className="min-h-[32px]">
                        <td className="border-r border-neutral-300 py-2 px-2 text-center font-mono text-neutral-600">{idx + 1}</td>
                        <td className="border-r border-neutral-300 py-2 px-3 text-neutral-900 font-medium">{item.description}</td>
                        <td className="border-r border-neutral-300 py-2 px-2 text-center font-mono">{item.quantity}</td>
                        <td className="border-r border-neutral-300 py-2 px-3 text-right font-mono">{Number(item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="border-r border-neutral-300 py-2 px-2 text-right font-mono text-neutral-600">{item.discount > 0 ? Number(item.discount).toLocaleString() : "-"}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Empty spacing rows to simulate standard formal receipt length */}
                    {previewInvoice.items.length < 3 && Array.from({ length: 3 - previewInvoice.items.length }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-6">
                        <td className="border-r border-neutral-300"></td>
                        <td className="border-r border-neutral-300"></td>
                        <td className="border-r border-neutral-300"></td>
                        <td className="border-r border-neutral-300"></td>
                        <td className="border-r border-neutral-300"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculation Bottom Section */}
                <div className="grid grid-cols-12 border border-neutral-300 rounded mb-6 overflow-hidden">
                  <div className="col-span-7 p-3 bg-neutral-50 flex flex-col justify-between border-r border-neutral-300">
                    <div>
                      <div className="text-[10px] font-bold text-neutral-500 uppercase mb-1">
                        จำนวนเงินตัวอักษร (AMOUNT IN WORDS)
                      </div>
                      <div className="text-xs font-bold text-neutral-900 bg-white p-2 rounded border border-neutral-200">
                        {previewInvoice.bahtText}
                      </div>
                    </div>

                    {previewInvoice.remarks && (
                      <div className="mt-3 text-[10px] text-neutral-600">
                        <span className="font-bold">หมายเหตุ / Note:</span> {previewInvoice.remarks}
                      </div>
                    )}
                  </div>

                  <div className="col-span-5 p-3 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="font-sans text-neutral-700">รวมเป็นเงิน (Subtotal):</span>
                      <span>฿{Number(previewInvoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {previewInvoice.discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span className="font-sans">หักส่วนลด (Discount):</span>
                        <span>-฿{Number(previewInvoice.discountTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="font-sans text-neutral-700">ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                      <span>฿{Number(previewInvoice.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {(previewInvoice.withholdingTaxAmount || 0) > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span className="font-sans">หักภาษี ณ ที่จ่าย ({previewInvoice.withholdingTaxRate}%):</span>
                        <span>-฿{Number(previewInvoice.withholdingTaxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-neutral-300 flex justify-between font-bold text-sm text-neutral-950">
                      <span className="font-sans">ยอดรวมทั้งสิ้น (TOTAL):</span>
                      <span>฿{Number(previewInvoice.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Account Info & Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-neutral-200">
                  <div className="border border-neutral-200 rounded p-2.5 bg-neutral-50 text-[10px] space-y-0.5">
                    <div className="font-bold text-neutral-800">ช่องทางการชำระเงิน (PAYMENT DETAILS)</div>
                    <div>ธนาคาร: {previewInvoice.bankName || "ธนาคารกสิกรไทย (KBANK)"}</div>
                    <div>ชื่อบัญชี: {previewInvoice.bankAccountName || previewInvoice.companyName}</div>
                    <div className="font-mono font-bold">เลขที่บัญชี: {previewInvoice.bankAccountNumber || "012-3-45678-9"}</div>
                    {previewInvoice.promptPayId && (
                      <div className="font-mono">PromptPay ID: {previewInvoice.promptPayId}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="flex flex-col justify-end">
                      <div className="border-b border-dotted border-neutral-400 mb-1 h-10"></div>
                      <div className="text-[10px] font-bold text-neutral-800">{previewInvoice.collectorName || "ผู้รับเงิน / Collector"}</div>
                      <div className="text-[9px] text-neutral-500">วันที่: ......./......./...........</div>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="border-b border-dotted border-neutral-400 mb-1 h-10"></div>
                      <div className="text-[10px] font-bold text-neutral-800">{previewInvoice.authorizedSigner || "ผู้มีอำนาจลงนาม / Authorized Signature"}</div>
                      <div className="text-[9px] text-neutral-500">วันที่: ......./......./...........</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Note */}
                <div className="mt-8 text-center text-[9px] text-neutral-400">
                  เอกสารนี้ออกโดยระบบอัตโนมัติของ The M5 Residence | กรุณาเก็บเอกสารนี้ไว้เพื่อเป็นหลักฐาน
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
