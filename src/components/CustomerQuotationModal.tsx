import React, { useState, useMemo } from "react";
import { 
  X, FileText, CheckCircle, Calculator, Phone, Mail, Building, 
  User, Calendar, Clock, Sparkles, AlertCircle, ArrowRight, Printer,
  Bed, Coffee, Check, ShieldCheck, ChevronRight, Download, Send, CheckCircle2
} from "lucide-react";
import { useSettings, defaultQuotationAddOns, QuotationAddOnOption } from "../context/SettingsContext";
import { BillingDocument, BillingItem, defaultCompanyProfile } from "../types/billing";
import { thaiBahtText, formatThaiDate } from "../utils/thaiBahtText";
import { addNotificationToFirestore } from "../firebase";
import TaxInvoicePrintView from "./billing/TaxInvoicePrintView";

interface CustomerQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerQuotationModal({ isOpen, onClose }: CustomerQuotationModalProps) {
  const { settings, companyProfile, saveBillingDocument, addBooking, showToast } = useSettings() as any;
  const gen = settings.general || {};
  const isEnabled = gen.quotationRequestEnabled !== false;

  // Dynamic Add-ons Configuration from admin settings
  const addOnsConfig: QuotationAddOnOption[] = useMemo(() => {
    if (gen.quotationAddOns && Array.isArray(gen.quotationAddOns) && gen.quotationAddOns.length > 0) {
      return gen.quotationAddOns;
    }
    return defaultQuotationAddOns;
  }, [gen.quotationAddOns]);

  const breakfastConfig = useMemo(() => addOnsConfig.find(a => a.id === "breakfast") || defaultQuotationAddOns[0], [addOnsConfig]);
  const extraBedConfig = useMemo(() => addOnsConfig.find(a => a.id === "extra_bed") || defaultQuotationAddOns[1], [addOnsConfig]);
  const meetingRoomConfig = useMemo(() => addOnsConfig.find(a => a.id === "meeting_room") || defaultQuotationAddOns[2], [addOnsConfig]);
  const shuttleConfig = useMemo(() => addOnsConfig.find(a => a.id === "shuttle") || defaultQuotationAddOns[3], [addOnsConfig]);

  const breakfastPrice = Number(breakfastConfig?.price ?? 150);
  const extraBedPrice = Number(extraBedConfig?.price ?? 400);
  const meetingHourPrice = Number(meetingRoomConfig?.price ?? 500);
  const shuttlePrice = Number(shuttleConfig?.price ?? 300);

  // Custom add-on options configured by admin
  const customAddOns = useMemo(() => {
    return addOnsConfig.filter(a => !["breakfast", "extra_bed", "meeting_room", "shuttle"].includes(a.id) && a.enabled !== false);
  }, [addOnsConfig]);

  // Additional states for Email, Download, and Accept Booking
  const [emailSentSuccess, setEmailSentSuccess] = useState<boolean | null>(null);
  const [isAcceptingBooking, setIsAcceptingBooking] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Selected Dates
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);
  const dayAfterTomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);

  const [checkIn, setCheckIn] = useState(tomorrowStr);
  const [checkOut, setCheckOut] = useState(dayAfterTomorrowStr);

  // Customer & Company Info Form State
  const [customerName, setCustomerName] = useState("");
  const [branch, setBranch] = useState("สำนักงานใหญ่");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [remarks, setRemarks] = useState("");

  // Room selections: map of roomId -> count
  const roomsList = useMemo(() => {
    return (settings.rooms || []).filter((r: any) => r.active !== false);
  }, [settings.rooms]);

  // Initial rooms count: 1 of first room
  const [roomQuantities, setRoomQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (roomsList.length > 0) {
      initial[roomsList[0].id] = 1;
    }
    return initial;
  });

  const [guestsCount, setGuestsCount] = useState(2);

  // Add-ons Selection State
  const [includeBreakfast, setIncludeBreakfast] = useState(true);
  const [breakfastCount, setBreakfastCount] = useState(2);

  const [includeExtraBed, setIncludeExtraBed] = useState(false);
  const [extraBedCount, setExtraBedCount] = useState(1);

  const [includeMeetingRoom, setIncludeMeetingRoom] = useState(false);
  const [meetingHours, setMeetingHours] = useState(4);

  const [includeShuttle, setIncludeShuttle] = useState(false);

  // Custom Add-ons Selection State (dynamic options from admin)
  const [customAddOnSelections, setCustomAddOnSelections] = useState<Record<string, { selected: boolean; count: number }>>({});

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDoc, setSubmittedDoc] = useState<BillingDocument | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [checkIn, checkOut]);

  // Handle room quantity change
  const handleRoomCountChange = (roomId: string, count: number) => {
    setRoomQuantities(prev => ({
      ...prev,
      [roomId]: Math.max(0, count)
    }));
  };

  // Compile billing items and calculations
  const { lineItems, totalAmount, netBeforeVat, vatAmount } = useMemo(() => {
    const items: BillingItem[] = [];
    let subtotal = 0;

    // Room items
    roomsList.forEach((room: any) => {
      const qty = roomQuantities[room.id] || 0;
      if (qty > 0) {
        const itemQty = qty * nights;
        const unitPrice = room.price || 1200;
        const amount = itemQty * unitPrice;
        subtotal += amount;

        items.push({
          id: "item_" + room.id,
          description: `${room.thaiName || room.name} (${qty} ห้อง x ${nights} คืน)`,
          subDescription: `Check in: ${formatThaiDate(checkIn)} - Check out: ${formatThaiDate(checkOut)}`,
          quantity: itemQty,
          unitPrice: unitPrice,
          amount: amount
        });
      }
    });

    // Add-on: Breakfast
    if (breakfastConfig.enabled !== false && includeBreakfast && breakfastCount > 0) {
      const bQty = breakfastCount * nights;
      const bAmount = bQty * breakfastPrice;
      subtotal += bAmount;
      items.push({
        id: "item_breakfast",
        description: `${breakfastConfig.name || "บุฟเฟต์อาหารเช้า (Breakfast)"} (${breakfastCount} ${breakfastConfig.unit || "ท่าน"} x ${nights} วัน)`,
        subDescription: breakfastConfig.description || "The M5 Loft Cafe & Dining",
        quantity: bQty,
        unitPrice: breakfastPrice,
        amount: bAmount
      });
    }

    // Add-on: Extra Bed
    if (extraBedConfig.enabled !== false && includeExtraBed && extraBedCount > 0) {
      const ebQty = extraBedCount * nights;
      const ebAmount = ebQty * extraBedPrice;
      subtotal += ebAmount;
      items.push({
        id: "item_extra_bed",
        description: `${extraBedConfig.name || "เตียงเสริม (Extra Bed)"} (${extraBedCount} ${extraBedConfig.unit || "เตียง"} x ${nights} คืน)`,
        subDescription: extraBedConfig.description || "รวมเครื่องนอนครบชุด",
        quantity: ebQty,
        unitPrice: extraBedPrice,
        amount: ebAmount
      });
    }

    // Add-on: Meeting Room
    if (meetingRoomConfig.enabled !== false && includeMeetingRoom && meetingHours > 0) {
      const mAmount = meetingHours * meetingHourPrice;
      subtotal += mAmount;
      items.push({
        id: "item_meeting",
        description: `${meetingRoomConfig.name || "ห้องประชุมสัมมนา (Meeting Room)"} (${meetingHours} ${meetingRoomConfig.unit || "ชั่วโมง"})`,
        subDescription: meetingRoomConfig.description || "พร้อมระบบจอภาพ และเครื่องเสียงคุณภาพ",
        quantity: meetingHours,
        unitPrice: meetingHourPrice,
        amount: mAmount
      });
    }

    // Add-on: Shuttle
    if (shuttleConfig.enabled !== false && includeShuttle) {
      subtotal += shuttlePrice;
      items.push({
        id: "item_shuttle",
        description: `${shuttleConfig.name || "รถตู้รับ-ส่ง อิมแพ็ค / สนามบิน"} (1 ${shuttleConfig.unit || "เที่ยว"})`,
        subDescription: shuttleConfig.description || "The M5 Shuttle Van",
        quantity: 1,
        unitPrice: shuttlePrice,
        amount: shuttlePrice
      });
    }

    // Custom Add-ons added by Admin
    customAddOns.forEach((c) => {
      const sel = customAddOnSelections[c.id];
      if (sel?.selected && sel.count > 0) {
        const cPrice = Number(c.price || 0);
        const cAmount = sel.count * cPrice;
        subtotal += cAmount;
        items.push({
          id: "item_" + c.id,
          description: `${c.name} (${sel.count} ${c.unit || "รายการ"})`,
          subDescription: c.description || "บริการเสริม The M5 Residence",
          quantity: sel.count,
          unitPrice: cPrice,
          amount: cAmount
        });
      }
    });

    // VAT 7% Included calculation:
    // Total = subtotal
    // Net Before VAT = Total / 1.07
    // VAT Amount = Total - Net Before VAT
    const calculatedTotal = subtotal;
    const calculatedNet = calculatedTotal / 1.07;
    const calculatedVat = calculatedTotal - calculatedNet;

    return {
      lineItems: items,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      netBeforeVat: Math.round(calculatedNet * 100) / 100,
      vatAmount: Math.round(calculatedVat * 100) / 100
    };
  }, [
    roomsList, roomQuantities, nights, checkIn, checkOut,
    includeBreakfast, breakfastCount, breakfastPrice,
    includeExtraBed, extraBedCount, extraBedPrice,
    includeMeetingRoom, meetingHours, meetingHourPrice,
    includeShuttle, shuttlePrice,
    customAddOns, customAddOnSelections
  ]);

  const totalRoomsCount = useMemo(() => {
    return Object.values(roomQuantities).reduce<number>((a, b) => a + Number(b), 0);
  }, [roomQuantities]);

  if (!isOpen) return null;

  // Render Disabled View if turned off by admin
  if (!isEnabled) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="bg-[#121212] border border-amber-900/40 rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500">
            <AlertCircle className="h-8 w-8 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 font-sans">
            ระบบขอใบเสนอราคาออนไลน์ปิดทำการชั่วคราว
          </h3>
          
          <p className="text-sm text-neutral-300 mb-6 leading-relaxed font-sans px-2">
            {gen.quotationDisabledMessage || "ขออภัย ระบบขอใบเสนอราคาออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากท่านต้องการขอใบเสนอราคาด่วน สามารถติดต่อผ่าน Line หรือเบอร์โทรศัพท์ได้โดยตรงครับ"}
          </p>

          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3 mb-6 text-left text-xs font-sans">
            <span className="text-neutral-400 font-mono block uppercase">// ช่องทางติดต่อทีมงานโดยตรง</span>
            {gen.contactPhone && (
              <a
                href={`tel:${gen.contactPhone}`}
                className="flex items-center space-x-3 text-white hover:text-brick transition-colors"
              >
                <div className="p-2 bg-neutral-850 rounded text-emerald-400">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">เบอร์โทรศัพท์ติดต่อด่วน</span>
                  <span className="font-bold font-mono text-sm">{gen.contactPhone}</span>
                </div>
              </a>
            )}

            {(gen.lineLink || gen.lineId) && (
              <a
                href={gen.lineLink || `https://line.me/R/ti/p/${gen.lineId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-3 text-white hover:text-emerald-400 transition-colors"
              >
                <div className="p-2 bg-emerald-950/40 rounded text-emerald-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block">LINE Official Account</span>
                  <span className="font-bold font-mono text-sm">{gen.lineId || "@m5residence"}</span>
                </div>
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    );
  }

  // Handle Form Submission
  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("กรุณาระบุชื่อหน่วยงาน บริษัท หรือชื่อผู้ขอใบเสนอราคา");
      return;
    }
    if (!contactPerson.trim()) {
      alert("กรุณาระบุชื่อผู้ติดต่อ");
      return;
    }
    if (!phone.trim()) {
      alert("กรุณาระบุเบอร์โทรศัพท์ติดต่อ");
      return;
    }
    if (!email.trim()) {
      alert("กรุณาระบุอีเมลสำหรับรับเอกสารใบเสนอราคา");
      return;
    }
    if (totalRoomsCount === 0) {
      alert("กรุณาเลือกจำนวนห้องพักอย่างน้อย 1 ห้อง");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const thaiYear = now.getFullYear() + 543;
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const rand = Math.floor(100 + Math.random() * 900);
      const docNumber = `QT-${thaiYear}-${mm}-${rand}`;

      // Due date = 30 days from now
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + 30);
      const dueDateStr = dueDateObj.toISOString().split("T")[0];

      const profile = companyProfile || defaultCompanyProfile;

      const newQuotation: BillingDocument = {
        id: "doc_" + Date.now(),
        documentNumber: docNumber,
        type: "quotation",
        title: "ใบเสนอราคา (QUOTATION)",
        status: "draft",
        issueDate: todayStr,
        dueDate: dueDateStr,
        checkIn: checkIn,
        checkOut: checkOut,
        company: profile,
        customer: {
          name: customerName.trim(),
          branch: branch.trim() || "สำนักงานใหญ่",
          address: address.trim() || "ที่อยู่ตามที่ลูกค้าระบุ",
          taxId: taxId.trim() || "-",
          phone: phone.trim(),
          email: email.trim(),
          contactPerson: contactPerson.trim()
        },
        items: lineItems,
        vatType: "included",
        vatRate: 7,
        discount: 0,
        subtotal: totalAmount,
        netBeforeVat: netBeforeVat,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
        netPayable: totalAmount,
        bahtText: thaiBahtText(totalAmount),
        payment: {
          method: "transfer",
          bankName: profile.bankName,
          notes: "เงื่อนไขการชำระเงิน: ตามตกลงในใบเสนอราคา หรือชำระเมื่อยืนยันการจอง"
        },
        remarks: remarks.trim() ? `[คำขอออนไลน์]: ${remarks.trim()}` : "[คำขอใบเสนอราคาผ่านหน้าเว็บไซต์]",
        footerNote: "*ใบเสนอราคานี้มีผลบังคับใช้ 30 วันนับจากวันที่ออกเอกสาร (ห้องพักขึ้นอยู่กับความพร้อมขณะยืนยัน)*",
        isWebRequest: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      // Save document to Firestore & Local Storage
      if (saveBillingDocument) {
        await saveBillingDocument(newQuotation);
      }

      // Add Notification for admin
      try {
        await addNotificationToFirestore({
          id: "notif_" + Date.now(),
          bookingId: docNumber,
          channel: "both",
          recipient: `${contactPerson} (${customerName}) <${email}>`,
          status: "sent",
          message: `🌐 คำขอใบเสนอราคาใหม่จากหน้าเว็บ: ${customerName} (ผู้ติดต่อ: ${contactPerson} โทร: ${phone}) เลขที่ ${docNumber} ยอดประมาณการ: ${totalAmount.toLocaleString()} บาท`,
          createdAt: now.toISOString()
        });
      } catch (err) {
        console.warn("Could not log notification for quotation", err);
      }

      // Send instant Quotation Email to customer and admin
      try {
        const emailResp = await fetch("/api/quotations/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document: newQuotation, company: profile })
        });
        if (emailResp.ok) {
          setEmailSentSuccess(true);
        } else {
          setEmailSentSuccess(false);
        }
      } catch (emErr) {
        console.warn("Could not dispatch quotation email automatically:", emErr);
        setEmailSentSuccess(false);
      }

      setSubmittedDoc(newQuotation);
    } catch (err: any) {
      console.error("Error submitting quotation:", err);
      alert("เกิดข้อผิดพลาดในการส่งคำขอใบเสนอราคา: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend email handler
  const handleResendEmail = async () => {
    if (!submittedDoc) return;
    setIsResendingEmail(true);
    try {
      const profile = companyProfile || defaultCompanyProfile;
      const res = await fetch("/api/quotations/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: submittedDoc, company: profile })
      });
      if (res.ok) {
        setEmailSentSuccess(true);
        if (showToast) showToast("ส่งใบเสนอราคาเข้าอีเมลเรียบร้อยแล้ว!", "success");
      } else {
        alert("ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาตรวจสอบการตั้งค่า SMTP");
      }
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการส่งอีเมล: " + (e.message || ""));
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Handle Accept Quotation & Convert to Booking
  const handleAcceptQuotationAndBook = async () => {
    if (!submittedDoc) return;
    setIsAcceptingBooking(true);
    try {
      const primaryItem = submittedDoc.items.find((it: any) => it.description.includes("ห้อง")) || submittedDoc.items[0];
      const roomTitle = primaryItem ? primaryItem.description : "Loft Suite";
      const totalGuests = Math.max(1, totalRoomsCount * 2);

      const bookingRecord = await addBooking({
        roomName: roomTitle,
        roomType: roomTitle,
        checkIn: submittedDoc.checkIn,
        checkOut: submittedDoc.checkOut,
        guests: totalGuests,
        totalPrice: submittedDoc.totalAmount,
        guestName: `${submittedDoc.customer.name} (คุณ ${submittedDoc.customer.contactPerson})`,
        guestEmail: submittedDoc.customer.email,
        guestPhone: submittedDoc.customer.phone,
        specialRequest: `[อนุมัติสั่งจองจากใบเสนอราคา #${submittedDoc.documentNumber}] ผู้ติดต่อ: ${submittedDoc.customer.contactPerson} (${submittedDoc.customer.phone})`,
      });

      const assignedBookingId = bookingRecord?.id || "BK-" + Math.floor(1000 + Math.random() * 9000);

      // Update Quotation Document status to 'approved'
      const updatedQuotation: BillingDocument = {
        ...submittedDoc,
        status: "approved",
        remarks: `${submittedDoc.remarks} | อนุมัติสั่งจองสำเร็จ รหัสการจอง #${assignedBookingId}`,
        updatedAt: new Date().toISOString()
      };

      if (saveBillingDocument) {
        await saveBillingDocument(updatedQuotation);
      }
      setSubmittedDoc(updatedQuotation);
      setConfirmedBookingId(assignedBookingId);
      setShowAcceptConfirmModal(false);

      // Notify server / LINE about the quotation approval
      fetch("/api/quotations/notify-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: updatedQuotation, bookingId: assignedBookingId })
      }).catch(() => {});

      if (showToast) {
        showToast(`ยืนยันการจองห้องพักสำเร็จ! หมายเลข #${assignedBookingId}`, "success");
      }
    } catch (err: any) {
      console.error("Error accepting quotation and booking:", err);
      alert("เกิดข้อผิดพลาดในการยืนยันการสั่งจอง: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsAcceptingBooking(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
        <div className="bg-[#0f0f0f] border border-neutral-800 rounded-2xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* MODAL HEADER */}
          <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80 sticky top-0 z-20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                    ขอใบเสนอราคาออนไลน์ (Online Quotation)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
                    CORPORATE & GROUP
                  </span>
                </div>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  The M5 Residence • บริการออกใบเสนอราคาสำหรับองค์กร หน่วยงานราชการ กรุ๊ปสัมมนา และการพักระยะยาว
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* MODAL BODY */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
            
            {submittedDoc ? (
              /* SUCCESS STATE */
              <div className="py-4 space-y-5 text-center animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-950/50 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
                  <CheckCircle className="h-9 w-9" />
                </div>

                <div>
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                    QUOTATION REQUEST SUBMITTED
                  </span>
                  <h4 className="text-2xl font-bold text-white mt-1 font-sans">
                    ส่งคำขอใบเสนอราคาเรียบร้อยแล้ว!
                  </h4>
                  <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                    ระบบได้บันทึกคำขอเข้าสู่ระบบของโรงแรม และจัดทำเอกสารใบเสนอราคาทางการเรียบร้อยแล้ว
                  </p>
                </div>

                {/* Instant Email Status Pill */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-sans bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 max-w-lg mx-auto shadow-sm">
                  <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-left">
                    ส่งสำเนาใบเสนอราคาไปยังอีเมล: <strong className="text-white font-mono">{submittedDoc.customer.email}</strong> เรียบร้อยแล้ว
                  </span>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResendingEmail}
                    className="ml-2 text-[11px] underline text-amber-400 hover:text-amber-300 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isResendingEmail ? "กำลังส่ง..." : "(ส่งซ้ำ)"}
                  </button>
                </div>

                {/* If Booking is Confirmed */}
                {confirmedBookingId ? (
                  <div className="max-w-lg mx-auto p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-left space-y-2.5 font-sans shadow-xl">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <h5 className="font-bold text-sm text-white">ยืนยันการสั่งจองห้องพักสำเร็จแล้ว!</h5>
                    </div>
                    <p className="text-xs text-neutral-300">
                      ระบบได้ทำการบันทึกข้อมูลการจองและล็อกห้องพักให้คุณเรียบร้อยแล้ว
                    </p>
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between font-mono text-xs">
                      <span className="text-neutral-400">หมายเลขการจอง (Booking ID):</span>
                      <span className="font-bold text-amber-400 text-sm">#{confirmedBookingId}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      *พนักงานต้อนรับได้รับแจ้งเตือนแล้ว และจะติดต่อกลับตามเบอร์ {submittedDoc.customer.phone} เพื่ออำนวยความสะดวกในการจัดเตรียมห้องพักและใบกำกับภาษีเต็มรูป
                    </p>
                  </div>
                ) : (
                  /* Prominent CTA: Accept Quotation & Book Now */
                  <div className="max-w-lg mx-auto p-4 bg-gradient-to-r from-amber-950/40 via-neutral-950 to-amber-950/40 border border-amber-500/40 rounded-xl text-center space-y-2.5 shadow-xl">
                    <p className="text-xs font-semibold text-amber-300 font-sans">
                      ต้องการยืนยันและล็อกห้องพักตามใบเสนอราคานี้ทันที?
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAcceptConfirmModal(true)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2 mx-auto shadow-lg shadow-amber-900/40 transition-all cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>ยืนยันสั่งจองห้องพักตามใบเสนอราคานี้ (Accept & Book)</span>
                    </button>
                    <p className="text-[10px] text-neutral-400">
                      *คลิกเพื่อแปลงใบเสนอราคาเป็นรายการจองห้องพักในระบบทันที ไม่ต้องกรอกข้อมูลใหม่
                    </p>
                  </div>
                )}

                {/* Summary Card */}
                <div className="max-w-lg mx-auto p-4 bg-neutral-950 border border-neutral-850 rounded-xl text-left space-y-3 font-sans">
                  <div className="flex justify-between items-center border-b border-neutral-850 pb-2.5">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase font-mono">เลขที่เอกสารอ้างอิง</span>
                      <span className="text-base font-bold font-mono text-amber-400">{submittedDoc.documentNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block uppercase font-mono">วันที่ออกเอกสาร</span>
                      <span className="text-xs text-neutral-300 font-mono">{formatThaiDate(submittedDoc.issueDate)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">ชื่อหน่วยงาน / ลูกค้า:</span>
                      <span className="font-semibold text-white">{submittedDoc.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">ผู้ติดต่อ:</span>
                      <span className="font-semibold text-white">{submittedDoc.customer.contactPerson} ({submittedDoc.customer.phone})</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">ช่วงเวลาเข้าพัก:</span>
                      <span className="text-neutral-300">{formatThaiDate(submittedDoc.checkIn)} - {formatThaiDate(submittedDoc.checkOut)} ({nights} คืน)</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">ประมาณการยอดรวม (รวม VAT):</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">{submittedDoc.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-900 text-[11px] text-neutral-400 italic">
                    "{submittedDoc.bahtText}"
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowPrintPreview(true)}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-700 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
                  >
                    <Printer className="h-4 w-4 text-amber-400" />
                    <span>ดูเอกสาร / สั่งพิมพ์ A4 (Preview)</span>
                  </button>

                  <button
                    onClick={() => setShowPrintPreview(true)}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-700 rounded-lg text-xs font-mono font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-md"
                    title="เปิดเพื่อดาวน์โหลดเป็นไฟล์ PDF ทันที"
                  >
                    <Download className="h-4 w-4 text-emerald-400" />
                    <span>ดาวน์โหลด PDF</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-brick/20"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            ) : (
              /* FORM STATE */
              <form onSubmit={handleSubmitQuotation} className="space-y-6">
                
                {/* SECTION 1: CUSTOMER & ORGANIZATION INFO */}
                <div className="p-4 sm:p-5 bg-neutral-950/80 border border-neutral-850 rounded-xl space-y-4">
                  <div className="flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                    <Building className="h-4 w-4 text-brick" />
                    <h4 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wide">
                      1. ข้อมูลองค์กร / หน่วยงาน และผู้ติดต่อ (Customer & Company Details)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        ชื่อหน่วยงาน / บริษัท / ชื่อบุคคล <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น สำนักงานเทศบาลนครนนทบุรี / บริษัท โลจิสติกส์ จำกัด"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        สาขา (Branch)
                      </label>
                      <input
                        type="text"
                        placeholder="สำนักงานใหญ่ หรือ สาขาที่..."
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        เลขประจำตัวผู้เสียภาษี (Tax ID 13 หลัก)
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        placeholder="เช่น 0105559123456"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        ชื่อ-นามสกุล ผู้ติดต่อ <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น คุณสมชาย จัดการงาน"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        เบอร์โทรศัพท์ติดต่อ <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="เช่น 089-123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        อีเมลรับเอกสารใบเสนอราคา <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="contact@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">
                        ที่อยู่สำหรับการออกเอกสารภาษี
                      </label>
                      <input
                        type="text"
                        placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: STAY DATES & ROOM REQUIREMENTS */}
                <div className="p-4 sm:p-5 bg-neutral-950/80 border border-neutral-850 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <h4 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wide">
                        2. วันที่เข้าพัก และเลือกสไตล์ห้องพัก (Stay Dates & Rooms)
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40">
                      {nights} คืน
                    </span>
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">วันที่เช็คอิน (Check-in)</label>
                      <input
                        type="date"
                        required
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-brick font-mono cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">วันที่เช็คเอาท์ (Check-out)</label>
                      <input
                        type="date"
                        required
                        min={checkIn}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-brick font-mono cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400 font-mono block">จำนวนผู้เข้าพักรวม (ท่าน)</label>
                      <input
                        type="number"
                        min={1}
                        value={guestsCount}
                        onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs sm:text-sm text-white focus:outline-none focus:border-brick font-mono"
                      />
                    </div>
                  </div>

                  {/* Room Selection Cards */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs text-neutral-400 font-mono block">
                      เลือกจำนวนห้องพักแต่ละแบบ (ระบุจำนวนห้อง):
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {roomsList.map((room: any) => {
                        const count = roomQuantities[room.id] || 0;
                        return (
                          <div 
                            key={room.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                              count > 0 
                                ? "bg-amber-950/20 border-amber-600/50 text-white shadow-inner" 
                                : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <span className="text-xs font-bold font-sans text-white block">
                                {room.thaiName || room.name}
                              </span>
                              <span className="text-[11px] text-neutral-400 font-mono block">
                                ฿{Number(room.price || 0).toLocaleString()} / คืน • เตียง: {room.bedType || "1 King"}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRoomCountChange(room.id, count - 1)}
                                className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-amber-400 text-sm">
                                {count}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRoomCountChange(room.id, count + 1)}
                                className="w-7 h-7 rounded bg-brick hover:bg-brick-dark text-white font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: ADD-ONS & CORPORATE SERVICES */}
                <div className="p-4 sm:p-5 bg-neutral-950/80 border border-neutral-850 rounded-xl space-y-4">
                  <div className="flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
                    <Coffee className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wide">
                      3. บริการเสริมและสิ่งอำนวยความสะดวก (Optional Add-ons)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Breakfast */}
                    {breakfastConfig.enabled !== false && (
                      <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeBreakfast}
                              onChange={(e) => setIncludeBreakfast(e.target.checked)}
                              className="rounded bg-neutral-950 border-neutral-700 text-brick focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-white">{breakfastConfig.name || "บุฟเฟต์อาหารเช้า (Breakfast)"}</span>
                          </label>
                          <span className="text-[11px] font-mono text-amber-400 font-semibold">
                            {breakfastPrice.toLocaleString()} บาท / {breakfastConfig.unit || "ท่าน"}
                          </span>
                        </div>
                        {includeBreakfast && (
                          <div className="flex items-center space-x-2 pl-6">
                            <span className="text-[11px] text-neutral-400">จำนวน:</span>
                            <input
                              type="number"
                              min={1}
                              value={breakfastCount}
                              onChange={(e) => setBreakfastCount(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white text-center"
                            />
                            <span className="text-[11px] text-neutral-400">{breakfastConfig.unit || "ท่าน"} ({nights} วัน)</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Extra Bed */}
                    {extraBedConfig.enabled !== false && (
                      <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeExtraBed}
                              onChange={(e) => setIncludeExtraBed(e.target.checked)}
                              className="rounded bg-neutral-950 border-neutral-700 text-brick focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-white">{extraBedConfig.name || "เตียงเสริม (Extra Bed)"}</span>
                          </label>
                          <span className="text-[11px] font-mono text-amber-400 font-semibold">
                            {extraBedPrice.toLocaleString()} บาท / {extraBedConfig.unit || "คืน"}
                          </span>
                        </div>
                        {includeExtraBed && (
                          <div className="flex items-center space-x-2 pl-6">
                            <span className="text-[11px] text-neutral-400">จำนวน:</span>
                            <input
                              type="number"
                              min={1}
                              value={extraBedCount}
                              onChange={(e) => setExtraBedCount(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white text-center"
                            />
                            <span className="text-[11px] text-neutral-400">{extraBedConfig.unit || "เตียง"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Meeting Room */}
                    {meetingRoomConfig.enabled !== false && (
                      <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeMeetingRoom}
                              onChange={(e) => setIncludeMeetingRoom(e.target.checked)}
                              className="rounded bg-neutral-950 border-neutral-700 text-brick focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-white">{meetingRoomConfig.name || "ห้องประชุมสัมมนา (Meeting Room)"}</span>
                          </label>
                          <span className="text-[11px] font-mono text-amber-400 font-semibold">
                            {meetingHourPrice.toLocaleString()} บาท / {meetingRoomConfig.unit || "ชม."}
                          </span>
                        </div>
                        {includeMeetingRoom && (
                          <div className="flex items-center space-x-2 pl-6">
                            <span className="text-[11px] text-neutral-400">ชั่วโมงใช้งาน:</span>
                            <input
                              type="number"
                              min={1}
                              value={meetingHours}
                              onChange={(e) => setMeetingHours(parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white text-center"
                            />
                            <span className="text-[11px] text-neutral-400">{meetingRoomConfig.unit || "ชั่วโมง"}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Shuttle Van */}
                    {shuttleConfig.enabled !== false && (
                      <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeShuttle}
                            onChange={(e) => setIncludeShuttle(e.target.checked)}
                            className="rounded bg-neutral-950 border-neutral-700 text-brick focus:ring-0 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-white">{shuttleConfig.name || "รถตู้รับ-ส่ง อิมแพ็ค / สนามบิน"}</span>
                        </label>
                        <span className="text-[11px] font-mono text-amber-400 font-semibold">
                          {shuttlePrice.toLocaleString()} บาท / {shuttleConfig.unit || "เที่ยว"}
                        </span>
                      </div>
                    )}

                    {/* Custom Add-ons configured by Admin */}
                    {customAddOns.map((item) => {
                      const sel = customAddOnSelections[item.id] || { selected: false, count: 1 };
                      const price = Number(item.price || 0);
                      return (
                        <div key={item.id} className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sel.selected}
                                onChange={(e) => setCustomAddOnSelections(prev => ({
                                  ...prev,
                                  [item.id]: { selected: e.target.checked, count: prev[item.id]?.count || 1 }
                                }))}
                                className="rounded bg-neutral-950 border-neutral-700 text-brick focus:ring-0 cursor-pointer"
                              />
                              <span className="text-xs font-semibold text-white">{item.name}</span>
                            </label>
                            <span className="text-[11px] font-mono text-amber-400 font-semibold">
                              {price.toLocaleString()} บาท / {item.unit || "รายการ"}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[10px] text-neutral-400 font-light pl-6">
                              {item.description}
                            </p>
                          )}
                          {sel.selected && (
                            <div className="flex items-center space-x-2 pl-6 pt-1">
                              <span className="text-[11px] text-neutral-400">จำนวน:</span>
                              <input
                                type="number"
                                min={1}
                                value={sel.count}
                                onChange={(e) => setCustomAddOnSelections(prev => ({
                                  ...prev,
                                  [item.id]: { selected: true, count: Math.max(1, parseInt(e.target.value) || 1) }
                                }))}
                                className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs font-mono text-white text-center"
                              />
                              <span className="text-[11px] text-neutral-400">{item.unit || "รายการ"}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Empty state if all add-ons are disabled */}
                  {breakfastConfig.enabled === false && 
                   extraBedConfig.enabled === false && 
                   meetingRoomConfig.enabled === false && 
                   shuttleConfig.enabled === false && 
                   customAddOns.length === 0 && (
                    <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400 font-sans">
                      ขณะนี้ไม่มีบริการเสริมแบบเลือกได้เปิดใช้งาน หากมีคำขอพิเศษสามารถระบุด้านล่างได้โดยตรงครับ
                    </div>
                  )}

                  {/* Special Remarks */}
                  <div className="space-y-1 pt-1">
                    <label className="text-xs text-neutral-400 font-mono block">
                      ความต้องการเพิ่มเติม / เงื่อนไขเฉพาะ (Special Requests)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="เช่น ต้องการระบุหัก ณ ที่จ่าย 1% หรือ 3%, ต้องการใบเสร็จแยกห้อง, เงื่อนไขวางบิลของราชการ หรือขอเข้าพักก่อนเวลา..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-brick font-sans"
                    />
                  </div>
                </div>

                {/* SECTION 4: LIVE PRICE CALCULATION SUMMARY */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-neutral-950 to-neutral-900 border border-amber-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Calculator className="h-4 w-4" />
                      <h4 className="text-xs sm:text-sm font-bold font-mono uppercase tracking-wide">
                        สรุปประมาณการราคาเบื้องต้น (Estimated Quotation Breakdown)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      รวม {totalRoomsCount} ห้อง ({nights} คืน)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-sans">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-neutral-300">
                        <span className="truncate max-w-[70%]">
                          {idx + 1}. {item.description}
                        </span>
                        <span className="font-mono text-neutral-200">
                          {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-neutral-400 block">ภาษีมูลค่าเพิ่ม (VAT 7% รวมแล้ว):</span>
                      <span className="text-xs font-mono text-neutral-300">{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-400 block font-mono">ประมาณการยอดรวมสุทธิ (TOTAL AMOUNT):</span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                        ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="text-center pt-1 text-[11px] font-sans text-amber-300/80 italic bg-amber-950/20 py-1.5 px-3 rounded border border-amber-900/30">
                    ({thaiBahtText(totalAmount)})
                  </div>
                </div>

                {/* MODAL FOOTER ACTIONS */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-neutral-500 font-sans text-center sm:text-left">
                    * เมื่อกดส่งคำขอ เจ้าหน้าที่จะได้รับข้อมูลทันที และจัดส่งเอกสารใบเสนอราคาฉบับจริงให้ท่าน
                  </span>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                    >
                      ยกเลิก
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || totalRoomsCount === 0}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-brick hover:bg-brick-dark disabled:opacity-50 text-white rounded-lg text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-brick/20"
                    >
                      {isSubmitting ? (
                        <span>กำลังส่งคำขอ...</span>
                      ) : (
                        <>
                          <span>ส่งคำขอใบเสนอราคา</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>

      {/* CONFIRMATION POPUP FOR ACCEPTING QUOTATION */}
      {showAcceptConfirmModal && submittedDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141414] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-left font-sans">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <Check className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">ยืนยันการสั่งจองห้องพัก</h4>
                <p className="text-xs text-neutral-400">อ้างอิงใบเสนอราคาเลขที่ #{submittedDoc.documentNumber}</p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">ลูกค้า / หน่วยงาน:</span>
                <span className="font-semibold text-white">{submittedDoc.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">ผู้ติดต่อ:</span>
                <span className="text-neutral-200">{submittedDoc.customer.contactPerson} ({submittedDoc.customer.phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">วันที่เข้าพัก:</span>
                <span className="text-amber-300 font-mono">{formatThaiDate(submittedDoc.checkIn)} - {formatThaiDate(submittedDoc.checkOut)} ({nights} คืน)</span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2">
                <span className="text-neutral-400">ยอดรวมสุทธิทั้งสิ้น:</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">฿{submittedDoc.totalAmount.toLocaleString()} บาท</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              เมื่อกดยืนยัน ระบบจะสร้างรายการจองห้องพักใหม่ในระบบทันที และแจ้งเตือนไปยังแผนกต้อนรับของโรงแรมเพื่อทำการล็อกห้องพักให้คุณ
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAcceptConfirmModal(false)}
                disabled={isAcceptingBooking}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAcceptQuotationAndBook}
                disabled={isAcceptingBooking}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isAcceptingBooking ? (
                  <span>กำลังบันทึกการจอง...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>ยืนยันการจองทันที</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && submittedDoc && (
        <TaxInvoicePrintView
          document={submittedDoc}
          onClose={() => setShowPrintPreview(false)}
          onAcceptQuotation={handleAcceptQuotationAndBook}
        />
      )}
    </>
  );
}
