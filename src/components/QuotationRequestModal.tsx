import React, { useState, useEffect } from "react";
import { 
  X, FileText, CheckCircle, Calendar, Building, Phone, Mail, 
  MapPin, Plus, Minus, Sparkles, Printer, Copy, Check, Clock, 
  ShieldAlert, ArrowRight, Bed, Coffee, Car, AlertCircle
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { BillingDocument, BillingItem, CustomerInfo, defaultCompanyProfile } from "../types/billing";
import { thaiBahtText, formatThaiDate } from "../utils/thaiBahtText";
import TaxInvoicePrintView from "./billing/TaxInvoicePrintView";

interface QuotationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRoomId?: string;
}

export default function QuotationRequestModal({ isOpen, onClose, defaultRoomId }: QuotationRequestModalProps) {
  const { settings, saveBillingDocument, companyProfile, showToast } = useSettings() as any;

  // Check if feature is enabled by admin
  const isEnabled = settings?.general?.quotationRequestEnabled !== false;
  const disabledMessage = settings?.general?.quotationDisabledMessage || 
    "ขออภัย ระบบขอใบเสนอราคาออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากท่านต้องการขอใบเสนอราคาด่วน สามารถติดต่อผ่าน Line หรือเบอร์โทรศัพท์ได้โดยตรงครับ";

  // Form States
  const [customerName, setCustomerName] = useState("");
  const [customerBranch, setCustomerBranch] = useState("สำนักงานใหญ่");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Dates
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });

  // Calculate nights
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const dIn = new Date(checkIn);
    const dOut = new Date(checkOut);
    const diff = Math.ceil((dOut.getTime() - dIn.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };
  const nights = calculateNights();

  // Room selections with quantities
  const roomsList = (settings?.rooms && settings.rooms.length > 0)
    ? settings.rooms.filter((r: any) => r.active !== false)
    : [
        { id: "superior", name: "Standard Room Twin Bedded Room", thaiName: "สแตนดาร์ด ทวินเบด (เตียงคู่)", price: 1390 },
        { id: "sup_queen_01", name: "Superior Loft Suite", thaiName: "ซูพีเรียร์ ลอฟท์ สวีท", price: 1800 },
        { id: "dlx_queen_01", name: "Deluxe Loft Suite", thaiName: "ดีลักซ์ ลอฟท์ สวีท", price: 2550 }
      ];

  const [roomQuantities, setRoomQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    roomsList.forEach((r: any) => {
      initial[r.id] = r.id === (defaultRoomId || roomsList[0]?.id) ? 1 : 0;
    });
    return initial;
  });

  // Extra add-ons
  const [includeBreakfast, setIncludeBreakfast] = useState(false);
  const [breakfastGuests, setBreakfastGuests] = useState(2);
  const [extraBeds, setExtraBeds] = useState(0);
  const [needImpactShuttle, setNeedImpactShuttle] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");

  // Submitting / Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdQuotation, setCreatedQuotation] = useState<BillingDocument | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copiedNo, setCopiedNo] = useState(false);

  // Financial calculations
  const calculateTotal = () => {
    let itemsTotal = 0;

    // Room charges
    roomsList.forEach((r: any) => {
      const qty = roomQuantities[r.id] || 0;
      if (qty > 0) {
        itemsTotal += qty * (r.price || 1390) * nights;
      }
    });

    // Extra bed (500/night)
    if (extraBeds > 0) {
      itemsTotal += extraBeds * 500 * nights;
    }

    // Breakfast (200/guest/night)
    if (includeBreakfast && breakfastGuests > 0) {
      itemsTotal += breakfastGuests * 200 * nights;
    }

    // By default, room rates are VAT Included (matching sample receipt: Total = gross, Net = Total / 1.07, VAT = 7%)
    const totalAmount = Math.max(0, itemsTotal);
    const netBeforeVat = Math.round((totalAmount / 1.07) * 100) / 100;
    const vatAmount = Math.round((totalAmount - netBeforeVat) * 100) / 100;

    return {
      totalAmount,
      netBeforeVat,
      vatAmount,
      nights
    };
  };

  const { totalAmount, netBeforeVat, vatAmount } = calculateTotal();
  const totalRoomsCount = Object.values(roomQuantities).reduce<number>((sum, q) => sum + Number(q), 0);

  const handleQuantityChange = (roomId: string, delta: number) => {
    setRoomQuantities(prev => {
      const current = prev[roomId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [roomId]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("กรุณาระบุชื่อผู้ติดต่อ หรือ ชื่อบริษัท/หน่วยงาน");
      return;
    }
    if (!phone.trim()) {
      alert("กรุณาระบุเบอร์โทรศัพท์ติดต่อกลับ");
      return;
    }
    if (totalRoomsCount === 0) {
      alert("กรุณาเลือกจำนวนห้องพักอย่างน้อย 1 ห้อง");
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const rand = Math.floor(100 + Math.random() * 900);
      const docNo = `QT-${now.getFullYear() + 543}-${mm}-${rand}`;

      // Build items array
      const items: BillingItem[] = [];

      roomsList.forEach((r: any) => {
        const qty = roomQuantities[r.id] || 0;
        if (qty > 0) {
          const roomTotal = qty * (r.price || 1390) * nights;
          items.push({
            id: `item_room_${r.id}_${Date.now()}`,
            description: `${r.thaiName || r.name} (จำนวน ${qty} ห้อง)`,
            subDescription: `(Check in ${formatThaiDate(checkIn, "short")} - Check Out ${formatThaiDate(checkOut, "short")} รวม ${nights} คืน)`,
            quantity: qty * nights,
            unitPrice: r.price || 1390,
            amount: roomTotal
          });
        }
      });

      if (extraBeds > 0) {
        items.push({
          id: `item_extra_bed_${Date.now()}`,
          description: `บริการเตียงเสริม (Extra Bed) จำนวน ${extraBeds} เตียง`,
          subDescription: `(รวม ${nights} คืน)`,
          quantity: extraBeds * nights,
          unitPrice: 500,
          amount: extraBeds * 500 * nights
        });
      }

      if (includeBreakfast && breakfastGuests > 0) {
        items.push({
          id: `item_bf_${Date.now()}`,
          description: `บริการอาหารเช้าบุฟเฟต์ (Breakfast Buffet) ${breakfastGuests} ท่าน`,
          subDescription: `(รวม ${nights} วัน)`,
          quantity: breakfastGuests * nights,
          unitPrice: 200,
          amount: breakfastGuests * 200 * nights
        });
      }

      if (needImpactShuttle) {
        items.push({
          id: `item_shuttle_${Date.now()}`,
          description: "บริการรถตู้รับ-ส่ง IMPACT เมืองทองธานี",
          subDescription: "(บริการอำนวยความสะดวกฟรีตามรอบเวลาที่กำหนด)",
          quantity: 1,
          unitPrice: 0,
          amount: 0
        });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const newQuotation: BillingDocument = {
        id: "doc_qt_web_" + Date.now(),
        documentNumber: docNo,
        type: "quotation",
        title: "ใบเสนอราคา",
        status: "sent",
        issueDate: now.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        checkIn,
        checkOut,
        company: companyProfile || defaultCompanyProfile,
        customer: {
          name: customerName.trim(),
          branch: customerBranch.trim() || "สำนักงานใหญ่",
          taxId: taxId.trim(),
          address: address.trim() || "ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120",
          phone: phone.trim(),
          email: email.trim()
        },
        items,
        vatType: "included",
        vatRate: 7,
        discount: 0,
        subtotal: totalAmount,
        netBeforeVat,
        vatAmount,
        totalAmount,
        netPayable: totalAmount,
        bahtText: thaiBahtText(totalAmount),
        payment: {
          method: "transfer",
          bankName: (companyProfile || defaultCompanyProfile).bankName || "ธนาคารกสิกรไทย (KBank)",
          paidAmount: totalAmount
        },
        remarks: `[คำขอจากหน้าเว็บไซต์] โทร: ${phone.trim()}${email ? ` | อีเมล: ${email.trim()}` : ""}${specialRequest ? ` | คำขอพิเศษ: ${specialRequest.trim()}` : ""}`,
        footerNote: "*ใบเสนอราคานี้มีผลบังคับใช้ 30 วันนับแต่วันที่ออกเอกสาร*",
        isWebRequest: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      if (saveBillingDocument) {
        await saveBillingDocument(newQuotation);
      }

      setCreatedQuotation(newQuotation);
      if (showToast) {
        showToast(`ส่งคำขอใบเสนอราคาเลขที่ ${docNo} สำเร็จ! เจ้าหน้าที่ได้รับข้อมูลแล้ว`, "success");
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#0f0f0f] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        
        {/* HEADER */}
        <div className="p-4 sm:px-6 bg-neutral-950 border-b border-neutral-850 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brick/15 text-brick-light border border-brick/30 rounded-xl shadow-inner">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                  ขอใบเสนอราคาห้องพัก (Request Quotation)
                </h3>
                <span className="text-[10px] font-mono font-bold text-brick bg-brick/10 border border-brick/30 px-2 py-0.5 rounded-full uppercase">
                  THE M5 RESIDENCE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                สำหรับบริษัท องค์กร หน่วยงานราชการ หรือหมู่คณะ พร้อมออกเอกสารทางการขนาด A4 ทันที
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* CASE: Feature Disabled by Admin in Backend */}
          {!isEnabled ? (
            <div className="p-8 text-center space-y-5 bg-neutral-950/70 border border-neutral-850 rounded-xl">
              <div className="w-16 h-16 bg-amber-950/30 text-amber-500 border border-amber-900/40 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <ShieldAlert className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-white font-sans">
                  ระบบขอใบเสนอราคาออนไลน์ปิดทำการชั่วคราว
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                  {disabledMessage}
                </p>
              </div>

              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono text-left">
                <div>
                  <span className="text-neutral-500 block text-[10px]">เบอร์โทรศัพท์ติดต่อ:</span>
                  <span className="text-white font-bold text-sm">{settings?.general?.contactPhone || "02-288 0965"}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">LINE ID:</span>
                  <span className="text-emerald-400 font-bold text-sm">{settings?.general?.lineId || "@m5residence"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          ) : createdQuotation ? (
            /* SUCCESS VIEW AFTER SUBMISSION */
            <div className="p-6 sm:p-8 text-center space-y-6 bg-neutral-950 border border-emerald-900/40 rounded-xl animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase block">
                  REQUEST SUBMITTED SUCCESSFULLY
                </span>
                <h4 className="text-xl font-bold text-white font-sans">
                  สร้างและส่งคำขอใบเสนอราคาเรียบร้อยแล้ว!
                </h4>
                <p className="text-xs text-neutral-300 font-light leading-relaxed">
                  ทางโรงแรม The M5 Residence ได้รับคำขอใบเสนอราคาของท่านเรียบร้อยแล้ว แอดมินสามารถตรวจสอบและประสานงานได้ทันที ท่านสามารถดูและพิมพ์เอกสารตัวจริงขนาด A4 หรือบันทึกเป็น PDF ได้จากปุ่มด้านล่างนี้
                </p>
              </div>

              {/* Quotation Details Card */}
              <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg mx-auto text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                  <span className="text-neutral-400">เลขที่ใบเสนอราคา:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold text-sm">{createdQuotation.documentNumber}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdQuotation.documentNumber);
                        setCopiedNo(true);
                        setTimeout(() => setCopiedNo(false), 2000);
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
                      title="คัดลอกเลขที่ใบเสนอราคา"
                    >
                      {copiedNo ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">ผู้ขอ / บริษัท:</span>
                  <span className="font-bold text-white">{createdQuotation.customer.name}</span>
                </div>

                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">กำหนดการเข้าพัก:</span>
                  <span>{formatThaiDate(checkIn, "short")} ถึง {formatThaiDate(checkOut, "short")} ({nights} คืน)</span>
                </div>

                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">ยอดรวมทั้งสิ้น (รวม VAT):</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {createdQuotation.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded-lg text-xs font-bold font-sans flex items-center space-x-2 shadow-lg shadow-brick/20 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Printer className="h-4 w-4" />
                  <span>ดูและสั่งพิมพ์ A4 / ดาวน์โหลด PDF</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          ) : (
            /* MAIN REQUEST FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SECTION 1: CONTACT & ORGANIZATION INFO */}
              <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-850 rounded-xl space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase border-b border-neutral-850 pb-2.5">
                  <Building className="h-4 w-4 text-brick" />
                  <span>1. ข้อมูลผู้ติดต่อ / บริษัท / หน่วยงาน (Contact & Organization Details)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-neutral-300 font-medium">ชื่อผู้ติดต่อ / บริษัท / หน่วยงาน*</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="เช่น สำนักงานคลังจังหวัดพิษณุโลก หรือ บริษัท เอ็มไฟว์ พรีเมียม จำกัด"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-sans focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">สาขา (Branch)</label>
                    <input
                      type="text"
                      value={customerBranch}
                      onChange={(e) => setCustomerBranch(e.target.value)}
                      placeholder="เช่น สำนักงานใหญ่ หรือ สาขาที่ 1"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-sans focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">เบอร์โทรศัพท์ติดต่อกลับ*</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678 หรือ 02-xxx-xxxx"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">อีเมลรับเอกสารใบเสนอราคา</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="เช่น finance@company.com"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-sans focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">เลขประจำตัวผู้เสียภาษี 13 หลัก (ถ้ามี)</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="เช่น 0994000477481"
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono focus:outline-none focus:border-brick"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-neutral-300 font-medium">ที่อยู่สำหรับออกเอกสาร (ที่อยู่ตาม ภ.พ.20)</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="ระบุที่อยู่ เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์..."
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-sans focus:outline-none focus:border-brick"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: STAY DATES & ROOM SELECTION */}
              <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-850 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                  <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase">
                    <Calendar className="h-4 w-4 text-brick" />
                    <span>2. กำหนดการเข้าพัก & เลือกประเภทห้องพัก (Stay Schedule & Rooms)</span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded font-bold">
                    รวม {nights} คืน
                  </span>
                </div>

                {/* Check In / Check Out dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">วันเช็คอิน (Check-in)*</label>
                    <input
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono cursor-pointer focus:outline-none focus:border-brick"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-neutral-300 font-medium">วันเช็คเอาท์ (Check-out)*</label>
                    <input
                      type="date"
                      required
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white font-mono cursor-pointer focus:outline-none focus:border-brick"
                    />
                  </div>
                </div>

                {/* Rooms selection list with counters */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs text-neutral-400 font-medium block">
                    เลือกจำนวนห้องพักที่ต้องการเสนอราคา (เลือกได้หลายแบบ):
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {roomsList.map((r: any) => {
                      const qty = roomQuantities[r.id] || 0;
                      return (
                        <div
                          key={r.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            qty > 0 
                              ? "bg-brick/10 border-brick/60 shadow-md" 
                              : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-xs text-white font-sans leading-tight">
                                {r.thaiName || r.name}
                              </div>
                              <div className="text-[10px] text-neutral-400 mt-0.5">
                                {r.name}
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {r.price?.toLocaleString()} ฿
                            </span>
                          </div>

                          {/* Counter buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                            <span className="text-[11px] text-neutral-400">จำนวนห้อง:</span>
                            <div className="flex items-center space-x-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(r.id, -1)}
                                disabled={qty === 0}
                                className="w-6 h-6 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-mono font-bold text-white">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(r.id, 1)}
                                className="w-6 h-6 rounded bg-brick hover:bg-brick-dark text-white flex items-center justify-center cursor-pointer transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* SECTION 3: ADD-ONS & EXTRA SERVICES */}
              <div className="p-4 sm:p-5 bg-neutral-950 border border-neutral-850 rounded-xl space-y-4">
                <div className="flex items-center space-x-2 text-white font-bold text-xs font-mono uppercase border-b border-neutral-850 pb-2.5">
                  <Sparkles className="h-4 w-4 text-brick" />
                  <span>3. บริการเสริม & ตัวเลือกเพิ่มเติม (Add-on Services)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Breakfast Option */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBreakfast}
                        onChange={(e) => setIncludeBreakfast(e.target.checked)}
                        className="accent-brick w-4 h-4 cursor-pointer"
                      />
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Coffee className="h-3.5 w-3.5 text-amber-400" />
                        <span>เพิ่มอาหารเช้าบุฟเฟต์พรีเมียม (200.- / ท่าน / วัน)</span>
                      </span>
                    </label>

                    {includeBreakfast && (
                      <div className="flex items-center space-x-2 pt-1 pl-6">
                        <span className="text-neutral-400 text-[11px]">จำนวนผู้รับประทาน:</span>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={breakfastGuests}
                          onChange={(e) => setBreakfastGuests(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-center text-white font-mono"
                        />
                        <span className="text-neutral-400 text-[11px]">ท่าน</span>
                      </div>
                    )}
                  </div>

                  {/* Extra Bed Option */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Bed className="h-3.5 w-3.5 text-brick-light" />
                        <span>เตียงเสริม Extra Bed (500.- / คืน)</span>
                      </span>
                      <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 rounded border border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setExtraBeds(Math.max(0, extraBeds - 1))}
                          className="w-5 h-5 rounded bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-white text-xs">{extraBeds}</span>
                        <button
                          type="button"
                          onClick={() => setExtraBeds(extraBeds + 1)}
                          className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-750 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 block leading-tight">
                      *เตียงเสริมคุณภาพพรีเมียมพร้อมชุดเครื่องนอนคอตตอนหนานุ่ม
                    </span>
                  </div>

                  {/* IMPACT Shuttle */}
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between sm:col-span-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needImpactShuttle}
                        onChange={(e) => setNeedImpactShuttle(e.target.checked)}
                        className="accent-brick w-4 h-4 cursor-pointer"
                      />
                      <span className="font-semibold text-white flex items-center space-x-1.5">
                        <Car className="h-3.5 w-3.5 text-blue-400" />
                        <span>ต้องการบริการรถตู้รับ-ส่ง IMPACT เมืองทองธานี (บริการฟรีตามรอบเวลา)</span>
                      </span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
                      FREE SERVICE
                    </span>
                  </div>
                </div>

                {/* Special Requests */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-neutral-300 font-medium text-xs">ข้อความเพิ่มเติมหรือความต้องการพิเศษ (Special Requests)</label>
                  <textarea
                    rows={2}
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    placeholder="เช่น ต้องการจัดห้องพักให้อยู่ชั้นเดียวกัน, ต้องการเอกสารใบเสนอราคาด่วนเพื่อเสนองบประมาณ, เช็คอินเป็นกลุ่มคณะ..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-brick font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* ESTIMATION SUMMARY BAR */}
              <div className="p-4 sm:p-5 bg-neutral-950 border-2 border-brick/40 rounded-xl space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-neutral-850">
                  <div>
                    <span className="text-xs text-neutral-400 font-sans block">สรุปการเลือก:</span>
                    <span className="text-xs font-bold text-white font-sans">
                      {totalRoomsCount} ห้อง x {nights} คืน
                      {extraBeds > 0 && ` + เตียงเสริม ${extraBeds} เตียง`}
                      {includeBreakfast && ` + อาหารเช้า ${breakfastGuests} ท่าน`}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase block">ยอดรวมโดยประมาณ (รวม VAT 7%):</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">
                      {totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} <span className="text-xs text-neutral-400">THB</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-400">
                  <span>ยอดก่อนภาษี: {netBeforeVat.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB</span>
                  <span>ภาษีมูลค่าเพิ่ม VAT 7%: {vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} THB</span>
                  <span className="text-white font-sans font-medium">({thaiBahtText(totalAmount)})</span>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-neutral-500 font-light hidden sm:block">
                  *ข้อมูลคำขอจะถูกบันทึกส่งตรงถึงทีมบริหาร The M5 Residence ทันที
                </div>

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || totalRoomsCount === 0}
                    className="px-7 py-2.5 bg-brick hover:bg-brick-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all shadow-lg shadow-brick/20 cursor-pointer flex items-center space-x-2 hover:scale-[1.02]"
                    style={{ backgroundImage: "linear-gradient(to right, #d95a06 0%, #b84100 100%)" }}
                  >
                    {isSubmitting ? (
                      <span>กำลังประมวลผลคำขอ...</span>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        <span>ยืนยันขอใบเสนอราคา (Submit Request)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* PRINT VIEW PREVIEW IF USER CLICKS VIEW QUOTATION */}
      {showPrintModal && createdQuotation && (
        <TaxInvoicePrintView
          document={createdQuotation}
          onClose={() => setShowPrintModal(false)}
          isModal={true}
        />
      )}

    </div>
  );
}
