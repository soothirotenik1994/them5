import React, { useState, useEffect } from "react";
import { X, Calendar, DollarSign, ArrowRight, CheckCircle2, QrCode, CreditCard, ShieldAlert, Sparkles, Ticket } from "lucide-react";
import { BookingDetails } from "../types";
import { useSettings } from "../context/SettingsContext";

// @ts-ignore
import superiorImg from "../assets/images/bedroom_superior_m5_1782203272229.jpg";
// @ts-ignore
import studioImg from "../assets/images/bedroom_studio_m5_1782203293730.jpg";
// @ts-ignore
import deluxeImg from "../assets/images/bedroom_deluxe_m5_1782203318372.jpg";

interface BookingModalProps {
  initialRoomId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const imageMap: Record<string, string> = {
  superior: superiorImg,
  deluxe: deluxeImg,
  studio: studioImg
};

export default function BookingModal({ initialRoomId = "deluxe", isOpen, onClose }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [roomType, setRoomType] = useState(initialRoomId);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  
  // Guest details form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");

  const [bookingResult, setBookingResult] = useState<BookingDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");

  // Member states inside modal
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPass, setMemberPass] = useState("");
  const [isRegisteringMember, setIsRegisteringMember] = useState(false);
  const [newMemName, setNewMemName] = useState("");
  const [newMemPhone, setNewMemPhone] = useState("");
  const [newMemEmail, setNewMemEmail] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);

  const { 
    settings, 
    addBooking, 
    currentMember, 
    loginMember, 
    registerMember, 
    updateMemberOnServer, 
    logoutMember 
  } = useSettings();
  const rooms = settings.rooms;

  // Sync logged in member details
  useEffect(() => {
    if (currentMember) {
      setGuestName(currentMember.name);
      setGuestEmail(currentMember.email);
      setGuestPhone(currentMember.phone);
    }
  }, [currentMember]);

  // Sync initialRoomId if changed
  useEffect(() => {
    if (initialRoomId) {
      setRoomType(initialRoomId);
    }
  }, [initialRoomId]);

  // Set default dates on load
  useEffect(() => {
    const today = new Date();
    const tom = new Date(today);
    tom.setDate(today.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    setCheckIn(tom.toISOString().split("T")[0]);
    setCheckOut(dayAfter.toISOString().split("T")[0]);
  }, []);

  if (!isOpen) return null;

  const roomOptions = rooms.map(room => ({
    id: room.id,
    name: room.name,
    price: room.price,
    img: room.imageUrl || imageMap[room.id] || deluxeImg
  }));

  // Helper calculation logic
  const selectedRoom = roomOptions.find((r) => r.id === roomType) || roomOptions[1] || { id: "deluxe", name: "Deluxe Balcony Loft", price: 1500, img: deluxeImg };
  
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const date1 = new Date(checkIn);
    const date2 = new Date(checkOut);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const nights = calculateNights();
  const totalPrice = selectedRoom.price * nights;

  // Member pricing calculation
  let discountRate = 0;
  if (currentMember) {
    if (currentMember.tier === "Silver") discountRate = 0.05;
    else if (currentMember.tier === "Gold") discountRate = 0.10;
    else if (currentMember.tier === "Elite") discountRate = 0.15;
  }
  const discountAmount = totalPrice * discountRate;

  // Coupon pricing calculation
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percent") {
      couponDiscountAmount = totalPrice * (appliedCoupon.value / 100);
    } else {
      couponDiscountAmount = appliedCoupon.value;
    }
  }

  const finalPrice = Math.max(0, totalPrice - discountAmount - couponDiscountAmount);

  // Helper to check if date range contains blocked dates
  const getBlockedDateReason = () => {
    if (!checkIn || !checkOut || !settings.blockedDates) return null;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // Normalize to midnight
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (start >= end) return null;
    
    const current = new Date(start);
    while (current < end) {
      const dateString = current.toISOString().split("T")[0]; // YYYY-MM-DD
      const blockedRecord = settings.blockedDates.find(
        bd => bd.date === dateString && (bd.roomId === "all" || bd.roomId === roomType)
      );
      if (blockedRecord) {
        return blockedRecord;
      }
      current.setDate(current.getDate() + 1);
    }
    return null;
  };

  const blockedReason = getBlockedDateReason();

  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode) {
      setCouponError("กรุณากรอกรหัสคูปอง");
      return;
    }
    const cleanCode = couponCode.trim().toUpperCase();
    const coupon = settings.coupons?.find(
      c => c.code === cleanCode && c.active
    );
    if (!coupon) {
      setCouponError("รหัสส่วนลดไม่ถูกต้องหรือหมดอายุการใช้งาน");
      setAppliedCoupon(null);
      return;
    }
    if (nights < coupon.minNights) {
      setCouponError(`รหัสนี้ต้องการการเข้าพักขั้นต่ำอย่างน้อย ${coupon.minNights} คืน`);
      setAppliedCoupon(null);
      return;
    }
    
    setAppliedCoupon(coupon);
    setCouponError("");
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!checkIn || !checkOut) {
        alert("กรุณาเลือกวันเช็คอินและเช็คเอาท์");
        return;
      }
      if (blockedReason) {
        alert(`ขออภัยครับ วันที่คุณเลือกตรงกับวันปิดรับการจอง: "${blockedReason.date}" (${blockedReason.note}) กรุณาเลือกวันที่เช็คอินเช็คเอาท์ใหม่อีกครั้งครับ`);
        return;
      }
      setStep(2);
    }
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !guestPhone) {
      alert("กรุณากรอกข้อมูลหลักให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Build booking structure with member discount
      const guestBookingInfo = {
        roomType: roomType,
        roomName: selectedRoom.name,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: guests,
        guestName: guestName,
        guestEmail: guestEmail,
        guestPhone: guestPhone,
        totalPrice: finalPrice,
        specialRequest: specialRequest
      };

      // Add to database
      await addBooking({
        roomType: roomType,
        guestName: guestName,
        guestEmail: guestEmail,
        guestPhone: guestPhone,
        checkIn: checkIn,
        checkOut: checkOut,
        guests: guests,
        status: "Pending",
        totalPrice: finalPrice,
        specialRequest: specialRequest
      });

      // Update member points and booking count if booked as member
      if (currentMember) {
        const addedPoints = Math.floor(finalPrice / 100);
        await updateMemberOnServer(currentMember.id, {
          points: currentMember.points + addedPoints,
          joinedBookingsCount: currentMember.joinedBookingsCount + 1
        });
      }

      setBookingResult(guestBookingInfo);
      setStep(3);
    } catch (err) {
      alert("ไม่สามารถสร้างการจองได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-sans">
      <div className="bg-charcoal-medium border border-neutral-850 rounded-xl max-w-2xl w-full relative max-h-[92vh] overflow-y-auto shadow-2xl">
        
        {/* Screw pins for loft aesthetic */}
        <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-neutral-850"></div>

        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-brick rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 duration-200 cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          
          {/* Top Progress bar */}
          <div className="flex items-center space-x-2 border-b border-neutral-800 pb-5">
            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step === 1 ? "bg-brick text-white" : "bg-neutral-900 text-neutral-500"}`}>1</span>
              <span className={`text-xs ${step === 1 ? "text-white font-bold" : "text-neutral-500"}`}>รายละเอียดการพัก</span>
            </div>
            <ArrowRight className="h-3 w-3 text-neutral-400" />
            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step === 2 ? "bg-brick text-white" : "bg-neutral-900 text-neutral-500"}`}>2</span>
              <span className={`text-xs ${step === 2 ? "text-white font-bold" : "text-neutral-500"}`}>ข้อมูลผู้จอง</span>
            </div>
            <ArrowRight className="h-3 w-3 text-neutral-400" />
            <div className="flex items-center space-x-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${step === 3 ? "bg-emerald-500 text-white" : "bg-neutral-900 text-neutral-500"}`}>3</span>
              <span className={`text-xs ${step === 3 ? "text-emerald-500 font-bold" : "text-neutral-500"}`}>สำเร็จ</span>
            </div>
          </div>

          {/* STEP 1: Choose Rooms & Dates */}
          {step === 1 && (
            <div className="space-y-5">
              {settings.general?.bookingEnabled === false ? (
                <div className="p-6 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-4 text-center">
                  <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-amber-500 font-sans">
                      ระบบจองห้องพักออนไลน์ปิดปรับปรุงชั่วคราว
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                      {settings.general?.bookingDisabledMessage || "ขออภัย ระบบจองห้องพักออนไลน์ของทางโรงแรมปิดทำการชั่วคราวเพื่อปรับปรุงระบบ หากมีข้อสงสัยหรือต้องการจองด่วน สามารถติดต่อผ่าน Line ID หรือเบอร์โทรศัพท์ได้โดยตรง"}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-neutral-800/60 max-w-xs mx-auto grid grid-cols-1 gap-2 text-xs text-neutral-450 font-mono">
                    {settings.general?.contactPhone && (
                      <div className="flex justify-between">
                        <span>📞 เบอร์โทรศัพท์:</span>
                        <span className="text-white font-bold">{settings.general.contactPhone}</span>
                      </div>
                    )}
                    {settings.general?.lineId && (
                      <div className="flex justify-between">
                        <span>💬 Line ID:</span>
                        <span className="text-white font-bold">{settings.general.lineId}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white font-sans">// เลือกห้องพักและระบุวันที่เข้าพัก</h3>
                  
                  {/* Form elements */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">สไตล์ห้องพัก</label>
                      <select
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick select-arrow"
                      >
                        {roomOptions.map((opt) => (
                          <option key={opt.id} value={opt.id} className="bg-neutral-900 text-white">
                            {opt.name} ({opt.price.toLocaleString()} THB/คืน)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">จำนวนผู้เข้าพัก</label>
                      <select
                        value={guests}
                        onChange={(e) => setGuests(parseInt(e.target.value))}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick select-arrow"
                      >
                        <option value="1" className="bg-neutral-900 text-white">1 ท่าน</option>
                        <option value="2" className="bg-neutral-900 text-white">2 ท่าน</option>
                        <option value="3" className="bg-neutral-900 text-white">3 ท่าน (เฉพาะ Superior)</option>
                      </select>
                    </div>
     
                    <div>
                      <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">วันเช็คอิน</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">วันเช็คเอาท์</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick font-mono cursor-pointer"
                      />
                    </div>
                  </div>

              {blockedReason && (
                <div className="p-3 bg-red-950/25 border border-red-500/30 rounded text-xs text-red-400 flex items-start space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <div>
                    <span className="font-bold block">ขออภัยครับ วันที่คุณเลือกถูกปิดรับการจองชั่วคราว</span>
                    <span className="text-[11px] leading-relaxed block mt-0.5">
                      ในวันที่ <strong className="font-mono font-bold text-white">{blockedReason.date}</strong> ระบบทำการงดรับจองเนื่องจาก: <strong className="text-white">"{blockedReason.note}"</strong> กรุณาเลือกวันอื่นสำหรับการพักผ่อนของคุณครับ
                    </span>
                  </div>
                </div>
              )}

              {/* CLUB M5 MEMBER HUB COMPONENT */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                {currentMember ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-10 h-10 rounded-full bg-brick/15 border border-brick/30 flex items-center justify-center text-brick shrink-0">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] text-brick font-mono font-bold block uppercase tracking-wider">CLUB M5 MEMBER ACTIVATED</span>
                        <span className="text-xs font-bold text-white block">
                          สวัสดีคุณ {currentMember.name} 
                          <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            currentMember.tier === "Elite" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                            currentMember.tier === "Gold" ? "bg-yellow-600/20 text-yellow-500 border border-yellow-600/30" :
                            "bg-slate-400/20 text-slate-300 border border-slate-400/30"
                          }`}>
                            {currentMember.tier} Class
                          </span>
                        </span>
                        <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                          {currentMember.tier === "Elite" && "✨ สิทธิพิเศษได้รับ: ส่วนลด 15% คืนนี้ + ฟรีมินิบาร์ & ขนมขบเคี้ยว + ฟรีเลทเช็คเอาท์ + บริการรถรับส่ง อิมแพ็ค อารีน่า"}
                          {currentMember.tier === "Gold" && "✨ สิทธิพิเศษได้รับ: ส่วนลด 10% คืนนี้ + ฟรีเครื่องดื่มต้อนรับที่คราฟต์บาร์ + ฟรีเลทเช็คเอาท์ 14:00 น. และที่จอดใกล้ประตู"}
                          {currentMember.tier === "Silver" && "✨ สิทธิพิเศษได้รับ: ส่วนลด 5% คืนนี้ + ฟรีเครื่องดื่มต้อนรับที่คราฟต์บาร์ + ฟรีสปีด Wi-Fi ยกระดับความเร็วสูง"}
                        </p>
                        <span className="text-[9px] text-emerald-400 block font-mono mt-0.5">พ้อยท์สะสมปัจจุบัน: {currentMember.points} pts (จองคืนนี้รับเพิ่ม +{Math.floor(finalPrice / 100)} pts)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => logoutMember()}
                      className="text-xs text-neutral-400 hover:text-white underline cursor-pointer shrink-0 font-medium ml-2"
                    >
                      ออกระบบ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <Sparkles className="h-4.5 w-4.5 text-brick animate-pulse" />
                        <div>
                          <span className="text-xs font-bold text-white block">สิทธิพิเศษเฉพาะสมาชิกเดอะ เอ็มไฟว์ เรสซิเดนซ์</span>
                          <span className="text-[11px] text-neutral-400">
                            {settings.general?.allowRegistration !== false 
                              ? "สมัครสมาชิกฟรีทันที รับส่วนลดเพิ่มสูงสุด 15% พร้อมสะสมแต้มแลกฟรีคาเฟ่คราฟต์เบียร์" 
                              : "ลงชื่อเข้าใช้งานสมาชิก รับส่วนลดเพิ่มสูงสุด 15% พร้อมสะสมแต้มแลกฟรีคาเฟ่คราฟต์เบียร์"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMemberForm(!showMemberForm)}
                        className="px-3 py-1 bg-brick/10 hover:bg-brick/20 border border-brick/40 text-brick rounded text-xs transition-colors font-semibold cursor-pointer"
                      >
                        {showMemberForm ? "ปิดหน้าต่าง" : (settings.general?.allowRegistration !== false ? "สมัครฟรี / ลงชื่อเข้าใช้" : "ลงชื่อเข้าใช้สมาชิก")}
                      </button>
                    </div>

                    {showMemberForm && (
                      <div className="pt-3 border-t border-neutral-850 space-y-3 animate-fade-in text-xs">
                        <div className="flex items-center space-x-4 border-b border-neutral-850 pb-2">
                          <button
                            type="button"
                            onClick={() => setIsRegisteringMember(false)}
                            className={`pb-1 font-bold ${(!isRegisteringMember || settings.general?.allowRegistration === false) ? "text-brick border-b-2 border-brick" : "text-neutral-500 hover:text-neutral-300"}`}
                          >
                            เข้าสู่ระบบสมาชิก
                          </button>
                          {settings.general?.allowRegistration !== false && (
                            <button
                              type="button"
                              onClick={() => setIsRegisteringMember(true)}
                              className={`pb-1 font-bold ${isRegisteringMember ? "text-brick border-b-2 border-brick" : "text-neutral-500 hover:text-neutral-300"}`}
                            >
                              สมัครสมาชิกใหม่ (ฟรีค่าใช้จ่าย)
                            </button>
                          )}
                        </div>

                        {(!isRegisteringMember || settings.general?.allowRegistration === false) ? (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] text-neutral-400 block">อีเมลของสมาชิก</label>
                              <input
                                type="email"
                                placeholder="เช่น somchai@gmail.com"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-5 space-y-1">
                              <label className="text-[10px] text-neutral-400 block">รหัสผ่านของสมาชิก (ค่าเริ่มต้นคือ password123)</label>
                              <input
                                type="password"
                                placeholder="••••••••"
                                value={memberPass}
                                onChange={(e) => setMemberPass(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!memberEmail) {
                                    alert("กรุณาระบุอีเมล");
                                    return;
                                  }
                                  const success = await loginMember(memberEmail, memberPass || "password123");
                                  if (success) {
                                    setShowMemberForm(false);
                                  }
                                }}
                                className="w-full py-1.5 bg-brick text-white rounded text-xs font-bold hover:bg-brick-dark cursor-pointer text-center"
                              >
                                ยืนยัน
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 block">ชื่อสมาชิกจริง</label>
                                <input
                                  type="text"
                                  placeholder="สมชาย ใจบุญ"
                                  value={newMemName}
                                  onChange={(e) => setNewMemName(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 block">อีเมลติดต่อสมัคร</label>
                                <input
                                  type="email"
                                  placeholder="somchai@m5.com"
                                  value={newMemEmail}
                                  onChange={(e) => setNewMemEmail(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 block">เบอร์โทรศัพท์</label>
                                <input
                                  type="text"
                                  placeholder="089-XXXXXXX"
                                  value={newMemPhone}
                                  onChange={(e) => setNewMemPhone(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!newMemName || !newMemEmail || !newMemPhone) {
                                    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
                                    return;
                                  }
                                  const success = await registerMember({
                                    name: newMemName,
                                    email: newMemEmail,
                                    phone: newMemPhone,
                                    password: "password123",
                                    tier: "Silver"
                                  });
                                  if (success) {
                                    setShowMemberForm(false);
                                  }
                                }}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                              >
                                ยืนยันสมัครสมาชิกและรับส่วนลด 5% ทันที
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* DISCOUNT COUPON CODE COMPONENT */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ticket className="h-4.5 w-4.5 text-cyan-400" />
                    <span className="text-xs font-bold text-white">คุณมีรหัสคูปองส่วนลดหรือไม่? (Promo Code)</span>
                  </div>
                </div>

                {appliedCoupon ? (
                  <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded flex items-center justify-between animate-fade-in">
                    <div>
                      <span className="text-xs font-bold text-cyan-400 block uppercase">
                        เปิดใช้งานรหัส: {appliedCoupon.code}
                      </span>
                      <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                        {appliedCoupon.description} (ลดเพิ่มอีก {appliedCoupon.value.toLocaleString()} {appliedCoupon.type === "percent" ? "%" : "บาท"})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                      className="text-xs text-red-400 hover:text-red-500 underline font-semibold shrink-0 ml-2"
                    >
                      ยกเลิกคูปอง
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="ป้อนรหัสส่วนลด เช่น WELCOME10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 text-xs text-white rounded focus:outline-none uppercase font-bold font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-black font-bold text-xs rounded transition-colors"
                      >
                        นำไปใช้
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-[11px] text-red-400 font-medium pl-1">
                        ⚠️ {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Order total overview card */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-14 h-14 rounded overflow-hidden hidden sm:block bg-neutral-900">
                    <img 
                      src={selectedRoom.img} 
                      alt={selectedRoom.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.src = imageMap[selectedRoom.id] || deluxeImg;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-brick">STAY DETAILS</h4>
                    <span className="text-sm font-bold text-white block">{selectedRoom.name}</span>
                    <span className="text-xs text-neutral-300 font-mono">พักจำนวน {nights} คืน // {guests} ผู้เข้าพัก</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  {(discountRate > 0 || appliedCoupon) && (
                    <span className="text-[10px] text-neutral-500 line-through block font-bold">
                      {totalPrice.toLocaleString()} THB
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-450 block">รวมค่าบริการทั้งสิ้น</span>
                  <span className="text-lg font-bold text-white">
                    {finalPrice.toLocaleString()} THB
                  </span>
                  {discountRate > 0 && (
                    <span className="text-[10px] text-emerald-400 block font-semibold">
                      ส่วนลดสมาชิก: -{discountAmount.toLocaleString()} THB (-{discountRate * 100}%)
                    </span>
                  )}
                  {appliedCoupon && (
                    <span className="text-[10px] text-cyan-400 block font-semibold">
                      ส่วนลดคูปอง: -{couponDiscountAmount.toLocaleString()} THB {appliedCoupon.type === "percent" ? `(-${appliedCoupon.value}%)` : ""}
                    </span>
                  )}
                </div>
              </div>
 
              <div className="flex justify-end pt-4 border-t border-neutral-800">
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-brick hover:bg-brick-dark text-white rounded font-bold text-xs tracking-wider uppercase transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <span>กรอกข้อมูลผู้เข้าพัก</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

          {/* STEP 2: Input Guest Personal Info */}
          {step === 2 && (
            <form onSubmit={handleConfirmReservation} className="space-y-5">
              <h3 className="text-xl font-bold text-white font-sans">// ระบุข้อมูลติดต่อผู้จองห้องพัก</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">ชื่อ-นามสกุล ของผู้เข้าพัก (ภาษาไทย หรือ อังกฤษ)</label>
                  <input
                    type="text"
                    required
                    placeholder="ตัวอย่าง: สมชาย รักดี"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">อีเมลติดต่อ</label>
                    <input
                      type="email"
                      required
                      placeholder="ตัวอย่าง: name@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">เบอร์โทรศัพท์มือถือ</label>
                    <input
                      type="text"
                      required
                      placeholder="ตัวอย่าง: 081-XXXXXXX"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase text-neutral-400 font-semibold mb-1">คำขอพิเศษเพิ่มเติม (ถ้ามี) เช่น ขอเลทเช็คอิน / เตียงต่อเพิ่ม</label>
                  <textarea
                    rows={2}
                    placeholder="ระบุความประสงค์ของคุณเพิ่มเติมได้ที่นี่..."
                    value={specialRequest}
                    onChange={(e) => setSpecialRequest(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 text-white text-xs rounded focus:outline-none focus:border-brick font-light"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400 block font-light">ห้องที่เลือก: <strong className="text-white font-semibold">{selectedRoom.name}</strong></span>
                  <span className="text-neutral-400 block font-light mt-0.5">ระยะเวลา: <strong className="text-white font-semibold">{checkIn} ถึง {checkOut} ({nights} คืน)</strong></span>
                </div>
                <div className="text-right font-mono">
                  {discountRate > 0 && (
                    <span className="text-[10px] text-neutral-500 line-through block font-semibold">
                      {totalPrice.toLocaleString()} THB
                    </span>
                  )}
                  <span className="text-neutral-450 block">ยอดชำระเงินเรียบร้อย</span>
                  <span className="text-sm font-bold text-brick">{finalPrice.toLocaleString()} THB</span>
                </div>
              </div>

              {/* Submit button bar */}
              <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-neutral-800 bg-neutral-900 text-neutral-400 rounded hover:text-white hover:bg-neutral-800 font-medium text-xs uppercase cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded font-bold text-xs tracking-wider uppercase transition-all flex items-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>กำลังยืนยัน...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>ยืนยันการจองห้องพัก</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Complete Booking Screen & Mock Invoice */}
          {step === 3 && bookingResult && (
            <div className="space-y-6 text-center">
              
              {/* Success Signal Header */}
              <div className="space-y-2 flex flex-col items-center">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-500 animate-pulse">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest font-bold">RESERVATION_SECURED</span>
                <h3 className="text-2xl font-bold text-white font-sans">ส่งคำขอจองห้องพักสำเร็จเรียบร้อยแล้ว!</h3>
                <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
                  ระบบได้ส่งข้อมูลการจองไปยังอีเมลของคุณ <span className="font-medium text-white">{bookingResult.guestEmail}</span> แล้ว มาร์กวันที่รอพบความดิบเท่สไตล์ลอฟท์ได้ทันที
                </p>
              </div>

              {/* Invoice Layout styled exactly like a receipt */}
              <div className="p-5 bg-neutral-950 rounded-lg text-left border border-neutral-850 font-mono text-xs space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 px-3 bg-neutral-900 text-neutral-300 text-[9px] rounded-bl border-l border-b border-neutral-800">
                  CONFIRMED
                </div>

                <div className="border-b border-dashed border-neutral-800 pb-2">
                  <span className="text-brick font-bold uppercase block text-[9px]">The M5 Residence Studio Invoice</span>
                  <span className="text-white font-bold block text-sm mt-0.5">BOOKING REF: M5-2026-{(Math.random() * 100000).toFixed(0)}</span>
                </div>

                {/* Details list */}
                <div className="space-y-1.5 pt-1 text-neutral-300">
                  <div className="flex justify-between">
                    <span>ผู้เข้าพัก:</span>
                    <span className="text-white font-medium">{bookingResult.guestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ประเภทห้อง:</span>
                    <span className="text-white font-medium">{bookingResult.roomName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ช่วงวันเข้าพัก:</span>
                    <span className="text-white font-medium">{bookingResult.checkIn} ถึง {bookingResult.checkOut} ({nights} คืน)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>จำนวนท่าน:</span>
                    <span className="text-white font-medium">{bookingResult.guests} ท่าน</span>
                  </div>
                  <div className="flex justify-between">
                    <span>โทรศัพท์:</span>
                    <span className="text-white font-medium">{bookingResult.guestPhone}</span>
                  </div>
                  {discountRate > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold border-t border-dashed border-neutral-800 pt-1">
                      <span>ส่วนลด Club M5 ({discountRate * 100}%):</span>
                      <span>-{(totalPrice - finalPrice).toLocaleString()} THB</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-neutral-800 pt-3 flex justify-between items-baseline">
                  <span className="text-neutral-400 uppercase font-bold text-[10px]">ยอดชำระรวม (VAT 7% แล้ว)</span>
                  <span className="text-lg font-bold text-emerald-500">{bookingResult.totalPrice.toLocaleString()} THB</span>
                </div>
              </div>

              {/* Payment instruction & simulated checkout details */}
              <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-lg text-left grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center space-x-1 text-xs text-brick font-bold">
                    <QrCode className="h-4 w-4" />
                    <span>ชำระผ่านพร้อมเพย์ (PromptPay-QR)</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 font-light leading-relaxed">
                    คุณสามารถสแกน QR Code ตรงข้ามผ่านโมบายแบงค์กิ้งเพื่อชำระเงินแบบยืนยันห้องทันที หรือเลือกชำระเงินที่เคาน์เตอร์เช็คอินในวันเข้าจอดพักจริงได้ครับ
                  </p>
                  <div className="flex items-center space-x-1.5 text-[10px] text-neutral-400">
                    <CreditCard className="h-3 w-3" />
                    <span>รองรับบัตรเครดิต Visa/Mastercard ค่ำคืนเข้าเช็คอิน</span>
                  </div>
                </div>
                {/* QR Code Graphic element block */}
                <div className="md:col-span-4 flex justify-center">
                  <div className="p-1 px-1.5 bg-neutral-900 rounded border-2 border-neutral-800">
                    {/* Simulated standard QR pattern */}
                    <div className="w-24 h-24 bg-neutral-50 flex flex-col items-center justify-center text-black relative">
                      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/5"></div>
                      <div className="text-[9px] font-bold text-charcoal-deep text-center gap-1 flex flex-col justify-center items-center">
                        <span className="tracking-[0.2em] font-mono text-neutral-500 block">PROMPTPAY</span>
                        <div className="w-10 h-10 border-2 border-neutral-400 flex items-center justify-center text-xs">M5</div>
                        <span className="text-[7px]">SCAN TO PAY</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center pt-4 space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-neutral-900 border border-neutral-800 hover:border-brick text-xs text-neutral-300 hover:text-brick rounded transition-colors uppercase font-mono tracking-widest cursor-pointer"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
