import React, { useState } from "react";
import { 
  FileText, Plus, Search, Filter, Printer, Edit2, Trash2, Copy, 
  CheckCircle, ArrowRight, DollarSign, Clock, Building, Download, 
  RotateCcw, SlidersHorizontal, Eye, Tag, AlertCircle, RefreshCw, Layers, X,
  Globe, Phone, Mail, User, Settings2, Coffee, Bed, Mic, Car, Check, Save, ToggleLeft, ToggleRight, Sparkles
} from "lucide-react";
import { BillingDocument, DocumentType, DocumentStatus, CompanyProfile, defaultCompanyProfile } from "../../types/billing";
import { useSettings, BookingRecord, defaultQuotationAddOns, QuotationAddOnOption } from "../../context/SettingsContext";
import { formatThaiDate } from "../../utils/thaiBahtText";
import TaxInvoicePrintView from "./TaxInvoicePrintView";
import DocumentEditorModal from "./DocumentEditorModal";

interface BillingTabContentProps {
  currentAdminRole?: string;
  theme?: "light" | "dark";
  onOpenBookingTab?: () => void;
}

export default function BillingTabContent({ currentAdminRole = "Super Admin", theme = "light", onOpenBookingTab }: BillingTabContentProps) {
  const { 
    billingDocuments = [], 
    saveBillingDocument, 
    deleteBillingDocument, 
    companyProfile, 
    saveCompanyProfile,
    bookings = [],
    settings,
    updateSettings,
    addBooking,
    showToast
  } = useSettings() as any;

  // Quotation system status
  const isQuotationEnabled = settings?.general?.quotationRequestEnabled !== false;
  const [isTogglingQuotation, setIsTogglingQuotation] = useState(false);

  const handleToggleQuotationSystem = async () => {
    if (!updateSettings) return;
    setIsTogglingQuotation(true);
    const nextVal = !isQuotationEnabled;
    try {
      await updateSettings({
        ...settings,
        general: {
          ...settings.general,
          quotationRequestEnabled: nextVal
        }
      });
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: " + e.message);
    } finally {
      setIsTogglingQuotation(false);
    }
  };

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<BillingDocument | null>(null);
  const [editorInitialType, setEditorInitialType] = useState<DocumentType>("tax_invoice");
  const [selectedBookingForDoc, setSelectedBookingForDoc] = useState<BookingRecord | null>(null);

  const [previewDoc, setPreviewDoc] = useState<BillingDocument | null>(null);
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [companyEdit, setCompanyEdit] = useState<CompanyProfile>(() => {
    return companyProfile || defaultCompanyProfile;
  });

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Web requests list & stats
  const webRequests = billingDocuments.filter((d: BillingDocument) => d.isWebRequest);
  const webRequestsCount = webRequests.length;

  // Filter documents
  const filteredDocuments = billingDocuments.filter((doc: BillingDocument) => {
    // Type filter (all, tax_invoice, quotation, invoice, web_requests)
    if (typeFilter === "web_requests") {
      if (!doc.isWebRequest) return false;
    } else if (typeFilter !== "all" && doc.type !== typeFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchDocNo = doc.documentNumber?.toLowerCase().includes(q);
      const matchCustomer = doc.customer?.name?.toLowerCase().includes(q);
      const matchContact = doc.customer?.contactPerson?.toLowerCase().includes(q);
      const matchTaxId = doc.customer?.taxId?.includes(q);
      const matchPhone = doc.customer?.phone?.includes(q);
      const matchRoom = doc.roomNumber?.toLowerCase().includes(q);
      const matchItem = doc.items?.some(it => it.description.toLowerCase().includes(q));
      if (!matchDocNo && !matchCustomer && !matchContact && !matchTaxId && !matchPhone && !matchRoom && !matchItem) {
        return false;
      }
    }
    return true;
  });

  // Financial Stats
  const totalTaxInvoices = billingDocuments.filter((d: BillingDocument) => d.type === "tax_invoice");
  const totalTaxAmount = totalTaxInvoices.reduce((sum: number, d: BillingDocument) => sum + (d.totalAmount || 0), 0);
  
  const totalQuotations = billingDocuments.filter((d: BillingDocument) => d.type === "quotation");
  const totalQuotationAmount = totalQuotations.reduce((sum: number, d: BillingDocument) => sum + (d.totalAmount || 0), 0);

  const totalInvoices = billingDocuments.filter((d: BillingDocument) => d.type === "invoice");
  const pendingAmount = billingDocuments
    .filter((d: BillingDocument) => d.status !== "paid" && d.status !== "cancelled")
    .reduce((sum: number, d: BillingDocument) => sum + (d.totalAmount || 0), 0);

  // Quick Action: Convert Quotation to Tax Invoice in 1 click
  const handleConvertQuotationToTaxInvoice = async (quotation: BillingDocument) => {
    if (!confirm(`คุณต้องการแปลงใบเสนอราคา "${quotation.documentNumber}" เป็น "ใบกำกับภาษี/ใบเสร็จรับเงิน" หรือไม่?`)) {
      return;
    }
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(100 + Math.random() * 900);
    const newDocNumber = `0069-${mm}-${rand}`;

    const newTaxInvoice: BillingDocument = {
      ...quotation,
      id: "doc_" + Date.now(),
      type: "tax_invoice",
      documentNumber: newDocNumber,
      status: "paid",
      issueDate: now.toISOString().split("T")[0],
      remarks: `แปลงมาจากใบเสนอราคาเลขที่: ${quotation.documentNumber}`,
      footerNote: "*ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว*",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    if (saveBillingDocument) {
      await saveBillingDocument(newTaxInvoice);
      alert(`แปลงเป็นใบเสร็จรับเงิน/ใบกำกับภาษีเลขที่ "${newDocNumber}" เรียบร้อยแล้ว! ✨`);
    }
  };

  // Quick Action: Duplicate Document
  const handleDuplicateDocument = async (sourceDoc: BillingDocument) => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.floor(100 + Math.random() * 900);
    const prefix = sourceDoc.type === "tax_invoice" ? "0069" : (sourceDoc.type === "quotation" ? "QT" : "INV");
    const newDocNumber = `${prefix}-${mm}-${rand}`;

    const duplicated: BillingDocument = {
      ...sourceDoc,
      id: "doc_" + Date.now(),
      documentNumber: newDocNumber,
      status: "draft",
      issueDate: now.toISOString().split("T")[0],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    if (saveBillingDocument) {
      await saveBillingDocument(duplicated);
      alert(`ทำสำเนาเอกสารเลขที่ "${newDocNumber}" เรียบร้อยแล้ว!`);
    }
  };

  // Save company settings
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveCompanyProfile) {
      await saveCompanyProfile(companyEdit);
      setIsCompanySettingsOpen(false);
      alert("บันทึกข้อมูลบริษัทและหัวใบกำกับภาษีเรียบร้อยแล้ว! ✨");
    }
  };

  const handleAcceptQuotationInAdmin = async (doc: BillingDocument) => {
    try {
      const primaryItem = doc.items.find((it: any) => it.description.includes("ห้อง")) || doc.items[0];
      const roomTitle = primaryItem ? primaryItem.description : "Loft Suite";

      const bookingRecord = await addBooking({
        roomName: roomTitle,
        roomType: roomTitle,
        checkIn: doc.checkIn || new Date().toISOString().split("T")[0],
        checkOut: doc.checkOut || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        guests: 2,
        totalPrice: doc.totalAmount,
        guestName: `${doc.customer.name} (คุณ ${doc.customer.contactPerson || ""})`,
        guestEmail: doc.customer.email,
        guestPhone: doc.customer.phone,
        specialRequest: `[อนุมัติสั่งจองจากใบเสนอราคา #${doc.documentNumber}]`,
      });

      const assignedBookingId = bookingRecord?.id || "BK-" + Math.floor(1000 + Math.random() * 9000);

      const updatedDoc: BillingDocument = {
        ...doc,
        status: "approved",
        remarks: `${doc.remarks || ""} | ยืนยันการสั่งจองแล้ว รหัสการจอง #${assignedBookingId}`,
        updatedAt: new Date().toISOString()
      };

      if (saveBillingDocument) {
        await saveBillingDocument(updatedDoc);
      }
      setPreviewDoc(updatedDoc);

      fetch("/api/quotations/notify-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: updatedDoc, bookingId: assignedBookingId })
      }).catch(() => {});

      if (showToast) showToast(`อนุมัติใบเสนอราคาและสร้างการจอง #${assignedBookingId} เรียบร้อยแล้ว!`, "success");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการอนุมัติใบเสนอราคา: " + (err.message || ""));
    }
  };

  // Quotation Add-ons modal and inline editor state
  const [isAddOnsModalOpen, setIsAddOnsModalOpen] = useState(false);
  const [addOnsEditList, setAddOnsEditList] = useState<QuotationAddOnOption[]>(() => {
    if (settings?.general?.quotationAddOns && Array.isArray(settings.general.quotationAddOns) && settings.general.quotationAddOns.length > 0) {
      return JSON.parse(JSON.stringify(settings.general.quotationAddOns));
    }
    return JSON.parse(JSON.stringify(defaultQuotationAddOns));
  });
  const [isSavingAddOns, setIsSavingAddOns] = useState(false);
  const [hasUnsavedAddOnChanges, setHasUnsavedAddOnChanges] = useState(false);

  // New Add-on form state for modal
  const [newAddOnName, setNewAddOnName] = useState("");
  const [newAddOnUnit, setNewAddOnUnit] = useState("ท่าน");
  const [newAddOnPrice, setNewAddOnPrice] = useState(150);
  const [newAddOnDesc, setNewAddOnDesc] = useState("");

  // Sync addOnsEditList when settings change from Firestore
  React.useEffect(() => {
    if (settings?.general?.quotationAddOns && Array.isArray(settings.general.quotationAddOns) && settings.general.quotationAddOns.length > 0) {
      setAddOnsEditList(JSON.parse(JSON.stringify(settings.general.quotationAddOns)));
      setHasUnsavedAddOnChanges(false);
    }
  }, [settings?.general?.quotationAddOns]);

  const openAddOnsModal = () => {
    if (settings?.general?.quotationAddOns && Array.isArray(settings.general.quotationAddOns) && settings.general.quotationAddOns.length > 0) {
      setAddOnsEditList(JSON.parse(JSON.stringify(settings.general.quotationAddOns)));
    } else {
      setAddOnsEditList(JSON.parse(JSON.stringify(defaultQuotationAddOns)));
    }
    setIsAddOnsModalOpen(true);
  };

  // Immediate toggle and persist for smooth UX
  const handleQuickToggleAddOn = async (id: string) => {
    if (!updateSettings) return;
    const updated = addOnsEditList.map(item => item.id === id ? { ...item, enabled: item.enabled === false ? true : false } : item);
    setAddOnsEditList(updated);
    try {
      await updateSettings({
        ...settings,
        general: {
          ...settings.general,
          quotationAddOns: updated
        }
      });
      const target = updated.find(i => i.id === id);
      if (showToast) {
        showToast(`${target?.name || "ออฟชั่น"}: ${target?.enabled ? "เปิดใช้งานแล้ว ✓" : "ปิดใช้งานแล้ว ✕"}`, "info");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    }
  };

  const handleToggleAddOn = (id: string) => {
    setAddOnsEditList(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
    setHasUnsavedAddOnChanges(true);
  };

  const handleUpdateAddOnPrice = (id: string, price: number) => {
    setAddOnsEditList(prev => prev.map(item => item.id === id ? { ...item, price: Math.max(0, price) } : item));
    setHasUnsavedAddOnChanges(true);
  };

  const handleUpdateAddOnField = (id: string, field: "name" | "unit" | "description", value: string) => {
    setAddOnsEditList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    setHasUnsavedAddOnChanges(true);
  };

  const handleAddNewAddOn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddOnName.trim()) {
      alert("กรุณากรอกชื่อบริการเสริม");
      return;
    }
    const newId = "addon_" + Date.now().toString(36);
    const newOption: QuotationAddOnOption = {
      id: newId,
      name: newAddOnName.trim(),
      unit: newAddOnUnit.trim() || "รายการ",
      price: Math.max(0, Number(newAddOnPrice) || 0),
      enabled: true,
      description: newAddOnDesc.trim() || undefined
    };
    setAddOnsEditList(prev => [...prev, newOption]);
    setNewAddOnName("");
    setNewAddOnUnit("ท่าน");
    setNewAddOnPrice(150);
    setNewAddOnDesc("");
    setHasUnsavedAddOnChanges(true);
  };

  const handleDeleteAddOn = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบออฟชั่นนี้ออกจากระบบ?")) {
      setAddOnsEditList(prev => prev.filter(item => item.id !== id));
      setHasUnsavedAddOnChanges(true);
    }
  };

  const handleResetAddOnsToDefault = () => {
    if (confirm("คุณต้องการคืนค่าบริการเสริมกลับไปเป็นค่าเริ่มต้น 4 รายการดั้งเดิมใช่หรือไม่?")) {
      setAddOnsEditList(JSON.parse(JSON.stringify(defaultQuotationAddOns)));
      setHasUnsavedAddOnChanges(true);
    }
  };

  const handleSaveAddOnsSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!updateSettings) return;
    setIsSavingAddOns(true);
    try {
      await updateSettings({
        ...settings,
        general: {
          ...settings.general,
          quotationAddOns: addOnsEditList
        }
      });
      setHasUnsavedAddOnChanges(false);
      setIsAddOnsModalOpen(false);
      if (showToast) {
        showToast("บันทึกการเปิด-ปิดและราคาบริการเสริมในใบเสนอราคาเรียบร้อยแล้ว! ✨", "success");
      } else {
        alert("บันทึกบริการเสริมและราคาเรียบร้อยแล้ว!");
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setIsSavingAddOns(false);
    }
  };

  const getAddOnIcon = (id: string, name: string) => {
    const lower = (id + " " + name).toLowerCase();
    if (lower.includes("breakfast") || lower.includes("อาหารเช้า")) return <Coffee className="h-5 w-5 text-amber-400" />;
    if (lower.includes("bed") || lower.includes("เตียง")) return <Bed className="h-5 w-5 text-indigo-400" />;
    if (lower.includes("meeting") || lower.includes("ประชุม")) return <Mic className="h-5 w-5 text-purple-400" />;
    if (lower.includes("shuttle") || lower.includes("รถ") || lower.includes("van")) return <Car className="h-5 w-5 text-emerald-400" />;
    return <Sparkles className="h-5 w-5 text-cyan-400" />;
  };

  const currentAddOns: QuotationAddOnOption[] = (settings?.general?.quotationAddOns && Array.isArray(settings.general.quotationAddOns) && settings.general.quotationAddOns.length > 0)
    ? settings.general.quotationAddOns
    : defaultQuotationAddOns;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-white font-sans flex items-center space-x-2">
              <span className="p-1.5 bg-brick/20 border border-brick/40 rounded text-brick-light">
                <FileText className="h-5 w-5" />
              </span>
              <span>ระบบออกใบกำกับภาษีและใบเสนอราคา (Tax Invoices & Quotations)</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
              A4 READY
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-light mt-1">
            ออกใบเสร็จรับเงิน/ใบกำกับภาษี ใบเสนอราคา และใบแจ้งหนี้ พิมพ์ขนาด A4 สวยงามถูกต้องตามมาตรฐานสรรพากรไทย สำหรับ The M5 Residence
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quotation Add-ons & Price Control Button */}
          <button
            type="button"
            onClick={openAddOnsModal}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-amber-400 hover:text-amber-300 border border-amber-800/70 rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm hover:border-amber-600"
            title="เปิด-ปิด และแก้ไขราคาออฟชั่นบริการเสริมในใบเสนอราคา"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>ออฟชั่น & ราคา ({addOnsEditList.filter(a => a.enabled !== false).length}/{addOnsEditList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompanySettingsOpen(true)}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 rounded text-xs font-mono font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            title="ตั้งค่าข้อมูลบริษัท/ผู้เสียภาษี"
          >
            <Building className="h-4 w-4 text-neutral-400" />
            <span>ข้อมูลบริษัท (Company)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingDoc(null);
              setEditorInitialType("quotation");
              setSelectedBookingForDoc(null);
              setIsEditorOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/40"
          >
            <Plus className="h-4 w-4" />
            <span>+ ใบเสนอราคา (Quotation)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingDoc(null);
              setEditorInitialType("tax_invoice");
              setSelectedBookingForDoc(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-brick/20"
          >
            <Plus className="h-4 w-4" />
            <span>+ ออกใบกำกับภาษี / ใบเสร็จ</span>
          </button>
        </div>
      </div>

      {/* WEB QUOTATION REQUEST SYSTEM CONTROL BAR */}
      <div className="p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl border ${
            isQuotationEnabled 
              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800/60 shadow-inner" 
              : "bg-neutral-900 text-neutral-500 border-neutral-800"
          }`}>
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white font-sans">
                ระบบขอใบเสนอราคาออนไลน์หน้าแรก (Customer Online Quotation Request)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isQuotationEnabled 
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800"
              }`}>
                {isQuotationEnabled ? "● เปิดรับคำขอ (ONLINE)" : "○ ปิดรับคำขอชั่วคราว (OFFLINE)"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-light mt-0.5">
              {isQuotationEnabled 
                ? "ลูกค้าและองค์กรสามารถกรอกขอใบเสนอราคาได้เองผ่านหน้าแรกของเว็บไซต์ ข้อมูลจะส่งตรงเข้ามายังแท็บนี้ทันที" 
                : "ระบบปิดรับคำขอบนหน้าแรกชั่วคราว (เมื่อลูกค้ากดจะแสดงข้อความแจ้งเตือนพร้อมเบอร์โทร/LINE ติดต่อตรง)"}
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            disabled={isTogglingQuotation}
            onClick={handleToggleQuotationSystem}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md ${
              isQuotationEnabled 
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50" 
                : "bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700"
            }`}
          >
            <span>{isTogglingQuotation ? "กำลังบันทึก..." : (isQuotationEnabled ? "✓ เปิดใช้งานอยู่ (คลิกเพื่อปิด)" : "✕ ปิดอยู่ (คลิกเพื่อเปิด)")}</span>
          </button>
        </div>
      </div>

      {/* QUOTATION ADD-ON OPTIONS & PRICING MANAGEMENT PANEL */}
      <div className="p-4 sm:p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white font-sans">
                  จัดการออฟชั่น & ราคาบริการเสริมใบเสนอราคา (Quotation Options & Pricing)
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800/80">
                  {addOnsEditList.filter(a => a.enabled !== false).length} / {addOnsEditList.length} ออฟชั่นเปิดใช้งาน
                </span>
                {hasUnsavedAddOnChanges && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    ● มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                คลิกสลับเพื่อเปิด-ปิดออฟชั่น หรือพิมพ์แก้ไขราคาในช่องได้ทันที • ออฟชั่นที่ปิดการใช้งานจะไม่แสดงให้ลูกค้าเห็นในหน้าขอใบเสนอราคา
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
            {hasUnsavedAddOnChanges && (
              <button
                type="button"
                onClick={() => handleSaveAddOnsSettings()}
                disabled={isSavingAddOns}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer animate-pulse"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingAddOns ? "กำลังบันทึก..." : "💾 บันทึกราคาที่แก้ไข"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={openAddOnsModal}
              className="px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-750 rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="เปิดหน้าต่างแก้ไขข้อมูลละเอียดและเพิ่มบริการเสริมใหม่"
            >
              <Settings2 className="h-3.5 w-3.5 text-neutral-400" />
              <span>จัดการละเอียด / เพิ่มออฟชั่น</span>
            </button>

            <button
              type="button"
              onClick={handleResetAddOnsToDefault}
              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded text-xs font-mono transition-all cursor-pointer"
              title="คืนค่าเป็น 4 บริการเสริมมาตรฐานเริ่มต้น"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {addOnsEditList.map((item) => {
            const isEnabled = item.enabled !== false;
            return (
              <div 
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  isEnabled 
                    ? "bg-neutral-950/90 border-amber-900/40 shadow-sm" 
                    : "bg-neutral-950/40 border-neutral-850 opacity-60 hover:opacity-90"
                }`}
              >
                {/* Top: Icon + Name + Toggle */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className={`p-2 rounded-lg border ${
                        isEnabled 
                          ? "bg-amber-950/40 border-amber-800/50" 
                          : "bg-neutral-900 border-neutral-800 text-neutral-500"
                      }`}>
                        {getAddOnIcon(item.id, item.name)}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white font-sans leading-tight">
                          {item.name}
                        </h5>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          หน่วย: {item.unit || "รายการ"}
                        </span>
                      </div>
                    </div>

                    {/* Toggle Switch Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickToggleAddOn(item.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer outline-none ${
                        isEnabled ? "bg-emerald-600" : "bg-neutral-800"
                      }`}
                      title={isEnabled ? "คลิกเพื่อปิดใช้งานออฟชั่นนี้" : "คลิกเพื่อเปิดใช้งานออฟชั่นนี้"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          isEnabled ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-neutral-400 font-light mt-2 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Price Box & Quick Status */}
                <div className="pt-2 border-t border-neutral-850/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 font-mono">ราคาตั้งต้น:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-amber-400 font-mono">฿</span>
                      <input
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={(e) => handleUpdateAddOnPrice(item.id, Math.max(0, Number(e.target.value) || 0))}
                        className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-750 focus:border-amber-500 rounded text-xs font-mono font-bold text-white text-right outline-none"
                        title="พิมพ์แก้ไขราคา แล้วกดปุ่มบันทึกด้านบน"
                      />
                      <span className="text-[11px] text-neutral-400 font-mono">
                        / {item.unit || "รายการ"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={isEnabled ? "text-emerald-400 font-semibold" : "text-neutral-500"}>
                      {isEnabled ? "● เปิดแสดงหน้าเว็บ" : "○ ซ่อนจากหน้าเว็บ"}
                    </span>
                    <button
                      type="button"
                      onClick={openAddOnsModal}
                      className="text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      แก้ไขละเอียด
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* METRIC OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Tax Invoices Issued */}
        <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono text-neutral-400 uppercase block">ใบกำกับภาษี/ใบเสร็จ</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {totalTaxInvoices.length} <span className="text-xs font-normal text-neutral-500 font-sans">ฉบับ</span>
              </div>
            </div>
            <div className="p-2 bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between text-xs font-mono">
            <span className="text-neutral-400">มูลค่ารวม:</span>
            <span className="font-bold text-emerald-400">
              {totalTaxAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB
            </span>
          </div>
        </div>

        {/* Total Quotations */}
        <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono text-neutral-400 uppercase block">ใบเสนอราคา</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {totalQuotations.length} <span className="text-xs font-normal text-neutral-500 font-sans">ฉบับ</span>
              </div>
            </div>
            <div className="p-2 bg-amber-950/40 text-amber-400 border border-amber-900/50 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between text-xs font-mono">
            <span className="text-neutral-400">มูลค่าเสนอ:</span>
            <span className="font-bold text-amber-300">
              {totalQuotationAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB
            </span>
          </div>
        </div>

        {/* Web Requests Card */}
        <div 
          onClick={() => setTypeFilter(typeFilter === "web_requests" ? "all" : "web_requests")}
          className={`p-4 rounded-xl relative overflow-hidden cursor-pointer transition-all border ${
            typeFilter === "web_requests"
              ? "bg-cyan-950/30 border-cyan-500 shadow-lg shadow-cyan-950/50"
              : "bg-neutral-950 border-neutral-850 hover:border-cyan-800/60"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-mono text-cyan-400 uppercase block">คำขอจากหน้าเว็บ</span>
                <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-300 text-[9px] font-mono rounded font-bold">WEB</span>
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {webRequestsCount} <span className="text-xs font-normal text-neutral-500 font-sans">รายการ</span>
              </div>
            </div>
            <div className="p-2 bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 rounded-lg">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between text-xs font-mono">
            <span className="text-neutral-400">คลิกเพื่อ:</span>
            <span className="font-bold text-cyan-400">
              {typeFilter === "web_requests" ? "แสดงทั้งหมด" : "กรองดูคำขอ"}
            </span>
          </div>
        </div>

        {/* Total Invoices / Billing */}
        <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-mono text-neutral-400 uppercase block">ใบแจ้งหนี้/วางบิล</span>
              <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {totalInvoices.length} <span className="text-xs font-normal text-neutral-500 font-sans">ฉบับ</span>
              </div>
            </div>
            <div className="p-2 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between text-xs font-mono">
            <span className="text-neutral-400">รอชำระ:</span>
            <span className="font-bold text-blue-300">
              {pendingAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB
            </span>
          </div>
        </div>

        {/* Quick Hotel Link */}
        <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono text-neutral-400 uppercase block">ผู้ออกเอกสาร (Company)</span>
            <div className="text-xs font-bold text-white mt-1 leading-snug truncate">
              {companyProfile?.name || defaultCompanyProfile.name}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              เลข 13 หลัก: {companyProfile?.taxId || defaultCompanyProfile.taxId}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCompanySettingsOpen(true)}
            className="mt-3 text-[11px] text-brick-light hover:text-white font-mono flex items-center space-x-1 cursor-pointer"
          >
            <span>แก้ไขหัวบิล / ลายเซ็น</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-neutral-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามเลขที่เอกสาร, ชื่อลูกค้า/บริษัท, เลขประจำตัวผู้เสียภาษี หรือห้องพัก..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-brick font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                typeFilter === "all" ? "bg-brick text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("web_requests")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center space-x-1 ${
                typeFilter === "web_requests" ? "bg-cyan-600 text-white font-bold" : "text-cyan-400 hover:text-white"
              }`}
            >
              <Globe className="h-3 w-3" />
              <span>ขอจากหน้าเว็บ</span>
              {webRequestsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-cyan-950 text-cyan-300 text-[9px] rounded-full border border-cyan-800 font-mono font-bold">
                  {webRequestsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("tax_invoice")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                typeFilter === "tax_invoice" ? "bg-emerald-600 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบกำกับภาษี
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("quotation")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                typeFilter === "quotation" ? "bg-amber-600 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบเสนอราคา
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("invoice")}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                typeFilter === "invoice" ? "bg-blue-600 text-white font-bold" : "text-neutral-400 hover:text-white"
              }`}
            >
              ใบแจ้งหนี้
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-mono focus:outline-none cursor-pointer"
          >
            <option value="all">ทุกสถานะ (All Status)</option>
            <option value="draft">ฉบับร่าง (Draft)</option>
            <option value="sent">ส่งลูกค้าแล้ว (Sent)</option>
            <option value="paid">ชำระแล้ว (Paid)</option>
            <option value="cancelled">ยกเลิก (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* DOCUMENTS LIST TABLE */}
      <div className="bg-neutral-950 border border-neutral-850 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0e0e0e] text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-850">
              <tr>
                <th className="py-3.5 px-4">เลขที่เอกสาร</th>
                <th className="py-3.5 px-3">วันที่</th>
                <th className="py-3.5 px-3 text-center">ประเภท</th>
                <th className="py-3.5 px-4 font-sans">ชื่อลูกค้า / บริษัท (Tax ID)</th>
                <th className="py-3.5 px-4 font-sans">รายการห้องพัก</th>
                <th className="py-3.5 px-3 text-right">ยอดรวมสุทธิ</th>
                <th className="py-3.5 px-3 text-center">สถานะ</th>
                <th className="py-3.5 px-4 text-right">จัดการเอกสาร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 font-sans">
                    <FileText className="h-8 w-8 mx-auto text-neutral-700 mb-2" />
                    <div>ไม่พบรายการเอกสารตามเงื่อนไขที่เลือก</div>
                    <div className="text-[11px] text-neutral-600 mt-1">
                      ท่านสามารถกดปุ่ม <strong>"+ ออกใบกำกับภาษี"</strong> หรือ <strong>"+ ใบเสนอราคา"</strong> เพื่อสร้างเอกสารใหม่ได้ทันที
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc: BillingDocument) => (
                  <tr key={doc.id} className="hover:bg-neutral-900/50 transition-colors">
                    
                    {/* Document Number */}
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-brick-light hover:text-white underline font-mono text-left cursor-pointer flex items-center space-x-1"
                        title="คลิกเพื่อเปิดดูตัวอย่าง A4 สำหรับพิมพ์"
                      >
                        <FileText className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{doc.documentNumber}</span>
                      </button>
                      {doc.bookingId && (
                        <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
                          จอง: {doc.bookingId}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-neutral-300 whitespace-nowrap">
                      {formatThaiDate(doc.issueDate, "short")}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.type === "tax_invoice" 
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/80" 
                          : doc.type === "quotation"
                          ? "bg-amber-950/60 text-amber-400 border border-amber-800/80"
                          : "bg-blue-950/60 text-blue-400 border border-blue-800/80"
                      }`}>
                        {doc.type === "tax_invoice" ? "ใบกำกับภาษี" : (doc.type === "quotation" ? "ใบเสนอราคา" : "ใบแจ้งหนี้")}
                      </span>
                      {doc.isWebRequest && (
                        <div className="mt-1">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-800 inline-flex items-center space-x-1 shadow-sm">
                            <Globe className="h-2.5 w-2.5" />
                            <span>ขอผ่านหน้าเว็บ</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white text-xs">{doc.customer?.name || "-"}</div>
                      {doc.customer?.contactPerson && (
                        <div className="text-[11px] text-amber-300 font-sans mt-0.5 font-medium flex items-center space-x-1">
                          <User className="h-3 w-3 text-neutral-500 shrink-0" />
                          <span>ผู้ติดต่อ: {doc.customer.contactPerson}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex flex-wrap gap-x-2">
                        {doc.customer?.taxId && doc.customer.taxId !== "-" && <span>Tax ID: {doc.customer.taxId}</span>}
                        {doc.customer?.phone && (
                          <a href={`tel:${doc.customer.phone}`} className="text-neutral-300 hover:text-white underline">
                            📞 {doc.customer.phone}
                          </a>
                        )}
                        {doc.customer?.email && (
                          <a href={`mailto:${doc.customer.email}`} className="text-neutral-300 hover:text-white underline">
                            ✉️ {doc.customer.email}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Line Items Overview */}
                    <td className="py-3.5 px-4 font-sans text-neutral-300">
                      <div className="text-xs truncate max-w-[200px]" title={doc.items?.[0]?.description}>
                        {doc.items?.[0]?.description || "-"}
                      </div>
                      {doc.items && doc.items.length > 1 && (
                        <div className="text-[10px] text-neutral-500 font-mono">
                          + อีก {doc.items.length - 1} รายการ
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                      {doc.totalAmount?.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-neutral-500 ml-1">THB</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.status === "paid" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/60" :
                        doc.status === "sent" ? "bg-sky-950/40 text-sky-400 border border-sky-900/60" :
                        doc.status === "cancelled" ? "bg-red-950/40 text-red-400 border border-red-900/60" :
                        "bg-neutral-800 text-neutral-300 border border-neutral-700"
                      }`}>
                        {doc.status === "paid" ? "ชำระแล้ว" : (doc.status === "sent" ? "ส่งแล้ว" : (doc.status === "cancelled" ? "ยกเลิก" : "ฉบับร่าง"))}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      
                      {/* Print / View A4 */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 px-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/60 rounded text-[10px] font-sans font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        title="เปิดดูและพิมพ์ A4 (Print / PDF)"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>พิมพ์</span>
                      </button>

                      {/* Approve Quotation (If draft quotation or web request) */}
                      {doc.type === "quotation" && doc.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => handleAcceptQuotationInAdmin(doc)}
                          className="p-1.5 px-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-orange-500/80 rounded text-[10px] font-sans font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors shadow-sm animate-pulse"
                          title="อนุมัติและยืนยันออกใบเสนอราคา พร้อมสร้างการจอง"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>อนุมัติใบเสนอราคา</span>
                        </button>
                      )}

                      {/* Convert to Tax Invoice (If Quotation) */}
                      {doc.type === "quotation" && (
                        <button
                          type="button"
                          onClick={() => handleConvertQuotationToTaxInvoice(doc)}
                          className="p-1.5 px-2 bg-amber-950/40 hover:bg-amber-900/50 text-amber-400 border border-amber-900/60 rounded text-[10px] font-sans font-bold inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          title="แปลงใบเสนอราคานี้เป็นใบเสร็จรับเงิน/ใบกำกับภาษีทันที"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>ออกใบกำกับ</span>
                        </button>
                      )}

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateDocument(doc)}
                        className="p-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded text-[10px] font-sans inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        title="ทำซ้ำเอกสารนี้"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>ทำซ้ำ</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDoc(doc);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded text-[10px] font-sans inline-flex items-center space-x-1 cursor-pointer transition-colors"
                        title="แก้ไขรายละเอียดเอกสาร"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>แก้ไข</span>
                      </button>

                      {/* Delete */}
                      {deletingDocId === doc.id ? (
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={async () => {
                              if (deleteBillingDocument) {
                                await deleteBillingDocument(doc.id);
                              }
                              setDeletingDocId(null);
                            }}
                            className="p-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            ลบจริง
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingDocId(null)}
                            className="p-1 px-2 bg-neutral-800 text-neutral-300 rounded text-[10px] cursor-pointer"
                          >
                            ไม่ลบ
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingDocId(doc.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCUMENT EDITOR MODAL */}
      {isEditorOpen && (
        <DocumentEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDoc(null);
          }}
          onSave={async (savedDoc) => {
            if (saveBillingDocument) {
              const ok = await saveBillingDocument(savedDoc);
              if (ok) {
                alert(`บันทึกเอกสาร "${savedDoc.documentNumber}" เรียบร้อยแล้ว! ✨`);
                return true;
              }
            }
            return false;
          }}
          initialDocument={editingDoc}
          bookings={bookings}
          companyProfile={companyProfile || defaultCompanyProfile}
          initialBookingForPrefill={selectedBookingForDoc}
          initialType={editorInitialType}
        />
      )}

      {/* PRINT VIEW PREVIEW MODAL */}
      {previewDoc && (
        <TaxInvoicePrintView
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          isModal={true}
          onAcceptQuotation={handleAcceptQuotationInAdmin}
        />
      )}

      {/* COMPANY SETTINGS MODAL */}
      {isCompanySettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold text-sm font-sans">
                <Building className="h-5 w-5 text-brick" />
                <span>ตั้งค่าข้อมูลบริษัทผู้ออกเอกสาร (Company Billing Profile)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCompanySettingsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">ชื่อบริษัท EN (Company Name EN)</label>
                  <input
                    type="text"
                    required
                    value={companyEdit.name}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">ชื่อบริษัทภาษาไทย (Company Name TH)</label>
                  <input
                    type="text"
                    required
                    value={companyEdit.thaiName}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, thaiName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 font-mono">ที่อยู่จดทะเบียนตาม ภ.พ.20 (Registered Address)</label>
                <textarea
                  rows={2}
                  required
                  value={companyEdit.address}
                  onChange={(e) => setCompanyEdit({ ...companyEdit, address: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">เลขประจำตัวผู้เสียภาษี (Tax ID - 13 หลัก)</label>
                  <input
                    type="text"
                    required
                    value={companyEdit.taxId}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono focus:outline-none focus:border-brick"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">เบอร์โทรศัพท์ (Telephone)</label>
                  <input
                    type="text"
                    value={companyEdit.tel}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, tel: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">อีเมลติดต่อ (Email)</label>
                  <input
                    type="email"
                    value={companyEdit.email}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none focus:border-brick"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-850">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">ชื่อธนาคารสำหรับโอนเงิน (Bank Name)</label>
                  <input
                    type="text"
                    value={companyEdit.bankName || ""}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, bankName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">ชื่อบัญชีรับโอน (Bank Account Name)</label>
                  <input
                    type="text"
                    value={companyEdit.bankAccountName || ""}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, bankAccountName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">เลขที่บัญชี (Bank Account No.)</label>
                  <input
                    type="text"
                    value={companyEdit.bankAccountNumber || ""}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, bankAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-neutral-400 font-mono">ชื่อผู้ลงนาม/ผู้รับเงิน (Signature Title)</label>
                  <input
                    type="text"
                    value={companyEdit.signatureName || "ผู้รับเงิน"}
                    onChange={(e) => setCompanyEdit({ ...companyEdit, signatureName: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCompanySettingsOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded text-xs font-mono font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brick hover:bg-brick-dark text-white rounded text-xs font-mono font-bold cursor-pointer shadow-lg shadow-brick/20"
                >
                  บันทึกข้อมูลบริษัท
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* QUOTATION ADD-ON OPTIONS & PRICING MODAL */}
      {isAddOnsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white font-sans flex items-center space-x-2">
                    <span>ตั้งค่าออฟชั่น & ราคาบริการเสริมใบเสนอราคา</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                      QUOTATION ADD-ONS
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-light mt-0.5">
                    เปิด-ปิดการใช้งาน แก้ไขราคาต่อหน่วย หรือเพิ่มบริการเสริมใหม่ที่จะให้ลูกค้าเลือกในแบบฟอร์มขอใบเสนอราคา
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddOnsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-5">
              
              {/* Add New Add-on Option Form */}
              <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider">
                    + เพิ่มออฟชั่นบริการเสริมใหม่ (Add Custom Option)
                  </span>
                </div>

                <form onSubmit={handleAddNewAddOn} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-neutral-400 font-mono block">ชื่อบริการเสริม (Name)*</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ชุดคอฟฟี่เบรค (Coffee Break)"
                      value={newAddOnName}
                      onChange={(e) => setNewAddOnName(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-neutral-400 font-mono block">ราคา (THB)*</label>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="150"
                      value={newAddOnPrice}
                      onChange={(e) => setNewAddOnPrice(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-neutral-400 font-mono block">หน่วยนับ (Unit)*</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ท่าน, ชุด, คืน"
                      value={newAddOnUnit}
                      onChange={(e) => setNewAddOnUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-neutral-400 font-mono block">คำอธิบายย่อ (Description)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="เช่น พร้อมเบเกอรี่และผลไม้สด"
                        value={newAddOnDesc}
                        onChange={(e) => setNewAddOnDesc(e.target.value)}
                        className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-mono font-bold shrink-0 transition-all cursor-pointer shadow-md shadow-amber-950/40"
                      >
                        + เพิ่ม
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Existing Options List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                    รายการออฟชั่นทั้งหมด ({addOnsEditList.length} รายการ):
                  </span>
                  <span className="text-[11px] text-neutral-500 font-sans">
                    * สามารถคลิกสลับเปิด/ปิด และแก้ไขชื่อ ราคา หรือหน่วยนับได้โดยตรง
                  </span>
                </div>

                <div className="space-y-2.5">
                  {addOnsEditList.map((item, idx) => {
                    const isEnabled = item.enabled !== false;
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isEnabled
                            ? "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                            : "bg-neutral-950/50 border-neutral-850 opacity-60 hover:opacity-90"
                        }`}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                          
                          {/* Toggle + Icon + Index */}
                          <div className="lg:col-span-3 flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => handleToggleAddOn(item.id)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer outline-none ${
                                isEnabled ? "bg-emerald-600" : "bg-neutral-800"
                              }`}
                              title={isEnabled ? "เปิดใช้งาน (คลิกเพื่อปิด)" : "ปิดใช้งาน (คลิกเพื่อเปิด)"}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>

                            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                              {getAddOnIcon(item.id, item.name)}
                            </div>

                            <div>
                              <span className={`text-xs font-bold block ${isEnabled ? "text-emerald-400" : "text-neutral-500"}`}>
                                {isEnabled ? "เปิดใช้งาน (ON)" : "ปิดใช้งาน (OFF)"}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono">
                                ID: {item.id}
                              </span>
                            </div>
                          </div>

                          {/* Name Input */}
                          <div className="lg:col-span-4 space-y-1">
                            <label className="text-[10px] text-neutral-400 font-mono block">ชื่อบริการเสริม (TH/EN)</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateAddOnField(item.id, "name", e.target.value)}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                            />
                          </div>

                          {/* Price Input */}
                          <div className="lg:col-span-2 space-y-1">
                            <label className="text-[10px] text-neutral-400 font-mono block">ราคา (THB)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-amber-500 font-mono font-bold">฿</span>
                              <input
                                type="number"
                                min={0}
                                value={item.price}
                                onChange={(e) => handleUpdateAddOnPrice(item.id, Number(e.target.value) || 0)}
                                className="w-full pl-6 pr-2 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 text-right"
                              />
                            </div>
                          </div>

                          {/* Unit Input */}
                          <div className="lg:col-span-2 space-y-1">
                            <label className="text-[10px] text-neutral-400 font-mono block">หน่วยนับ (Unit)</label>
                            <input
                              type="text"
                              value={item.unit || ""}
                              placeholder="เช่น ท่าน"
                              onChange={(e) => handleUpdateAddOnField(item.id, "unit", e.target.value)}
                              className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Delete button */}
                          <div className="lg:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteAddOn(item.id)}
                              className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="ลบออฟชั่นนี้"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                        </div>

                        {/* Description field */}
                        <div className="mt-2 pt-2 border-t border-neutral-900 grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            value={item.description || ""}
                            placeholder="คำอธิบายเพิ่มเติมหรือเงื่อนไข (เช่น พร้อมอุปกรณ์เครื่องเสียง, The M5 Shuttle Van)..."
                            onChange={(e) => handleUpdateAddOnField(item.id, "description", e.target.value)}
                            className="w-full px-3 py-1 bg-neutral-900/60 border border-neutral-850 rounded text-[11px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={handleResetAddOnsToDefault}
                className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-xl text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>คืนค่าเริ่มต้น (Reset Default)</span>
              </button>

              <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsAddOnsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSavingAddOns}
                  onClick={() => handleSaveAddOnsSettings()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-mono font-bold cursor-pointer shadow-lg shadow-amber-950/40 transition-all flex items-center space-x-1.5"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingAddOns ? "กำลังบันทึก..." : "💾 บันทึกการเปลี่ยนแปลง"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
