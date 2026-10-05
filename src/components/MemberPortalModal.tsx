import React, { useState, useEffect } from "react";
import { 
  X, Sparkles, User, Lock, Mail, Phone, Eye, EyeOff, 
  ArrowRight, ShieldCheck, Award, LogOut, CheckCircle2, 
  CalendarDays, CreditCard, ChevronRight, Gift, Car, Coffee, 
  Clock, Landmark, AlertCircle, Info, BedDouble
} from "lucide-react";
import { Member, BookingRecord } from "../types";

interface MemberPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  currentMember: Member | null;
  bookings: BookingRecord[];
  loginMember: (email: string, password?: string) => Promise<Member | null>;
  registerMember: (memberData: Omit<Member, "id" | "points" | "joinedBookingsCount" | "createdAt">) => Promise<Member | null>;
  logoutMember: () => void;
  updateMemberOnServer: (id: string, updatedFields: Partial<Member>) => Promise<boolean>;
  onBookNowClick?: () => void;
  initialAuthMode?: "login" | "register";
  initialTab?: "card" | "bookings" | "profile";
}

export default function MemberPortalModal({
  isOpen,
  onClose,
  settings,
  currentMember,
  bookings,
  loginMember,
  registerMember,
  logoutMember,
  updateMemberOnServer,
  onBookNowClick,
  initialAuthMode = "login",
  initialTab = "card"
}: MemberPortalModalProps) {
  // Mode for guest: login vs register
  const [authMode, setAuthMode] = useState<"login" | "register">(initialAuthMode);
  
  // Member view tab
  const [memberTab, setMemberTab] = useState<"card" | "bookings" | "profile">(initialTab);

  useEffect(() => {
    if (initialAuthMode) setAuthMode(initialAuthMode);
  }, [initialAuthMode, isOpen]);

  useEffect(() => {
    if (initialTab) setMemberTab(initialTab);
  }, [initialTab, isOpen]);
  
  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register inputs
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // Profile editing
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  // Interactive tier preview on left pane when not logged in
  const [previewTier, setPreviewTier] = useState<"Silver" | "Gold" | "Elite">("Silver");

  // Sync current member details to edit form
  useEffect(() => {
    if (currentMember) {
      setEditName(currentMember.name || "");
      setEditPhone(currentMember.phone || "");
      setEditEmail(currentMember.email || "");
      setEditPassword(currentMember.password || "");
      setProfileSuccessMsg("");
      setProfileErrorMsg("");
    }
  }, [currentMember]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const cleanEmail = loginEmail.trim();
    if (!cleanEmail || !loginPassword) {
      setLoginError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }
    setLoginLoading(true);
    try {
      const member = await loginMember(cleanEmail, loginPassword);
      if (member) {
        setLoginEmail("");
        setLoginPassword("");
        setMemberTab("card");
      } else {
        setLoginError("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setLoginError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setRegError("กรุณากรอกข้อมูลส่วนตัวให้ครบทุกช่อง");
      return;
    }
    setRegLoading(true);
    try {
      const newMember = await registerMember({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPassword,
        tier: "Silver"
      });
      if (newMember) {
        setRegName("");
        setRegEmail("");
        setRegPhone("");
        setRegPassword("");
        setMemberTab("card");
      } else {
        setRegError("ไม่สามารถสมัครสมาชิกได้ อีเมลอาจมีในระบบแล้ว");
      }
    } catch (err: any) {
      setRegError(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;
    setProfileSuccessMsg("");
    setProfileErrorMsg("");
    if (!editName.trim() || !editEmail.trim() || !editPhone.trim()) {
      setProfileErrorMsg("กรุณากรอกชื่อ เบอร์โทร และอีเมลให้ครบถ้วน");
      return;
    }
    setProfileSaving(true);
    try {
      const ok = await updateMemberOnServer(currentMember.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        password: editPassword || currentMember.password
      });
      if (ok) {
        setProfileSuccessMsg("บันทึกการเปลี่ยนแปลงข้อมูลของคุณเรียบร้อยแล้ว");
        setTimeout(() => setProfileSuccessMsg(""), 4000);
      } else {
        setProfileErrorMsg("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setProfileErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setProfileSaving(false);
    }
  };

  // Filter member's bookings
  const myBookings = currentMember
    ? bookings.filter(b => b.guestEmail?.toLowerCase() === currentMember.email?.toLowerCase())
    : [];

  const allowRegistration = settings?.general?.allowRegistration !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md transition-all duration-300">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Card */}
      <div 
        className={`relative z-10 w-full ${currentMember ? "max-w-2xl" : "max-w-md"} bg-[#121316] text-neutral-100 rounded-2xl border border-neutral-800/90 shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Warm Glow Accent Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#cb5a1a] to-transparent z-20" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-neutral-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#cb5a1a]/15 border border-[#cb5a1a]/30 flex items-center justify-center text-[#e8732a] shrink-0 shadow-inner">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#cb5a1a] uppercase block">
                THE M5 RESIDENCE
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentMember 
                  ? `ยินดีต้อนรับ, ${currentMember.name}` 
                  : authMode === "login" 
                    ? "เข้าสู่ระบบสมาชิก" 
                    : "สมัครสมาชิกใหม่"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Login / Register / Member Dashboard */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* ========================================================= */}
          {/* LOGGED IN MEMBER VIEW                                     */}
          {/* ========================================================= */}
          {currentMember ? (
            <div className="flex-1 flex flex-col">
              {/* Member Navigation Tabs */}
              <div className="px-6 border-b border-neutral-800/80 bg-neutral-950/40 flex items-center space-x-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setMemberTab("card")}
                  className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                    memberTab === "card"
                      ? "border-[#cb5a1a] text-white"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 text-[#cb5a1a]" />
                  <span>บัตรและคะแนน</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberTab("bookings")}
                  className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                    memberTab === "bookings"
                      ? "border-[#cb5a1a] text-white"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5 text-[#cb5a1a]" />
                  <span>ประวัติการจอง</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded font-mono">
                    {myBookings.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMemberTab("profile")}
                  className={`py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
                    memberTab === "profile"
                      ? "border-[#cb5a1a] text-white"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <User className="h-3.5 w-3.5 text-[#cb5a1a]" />
                  <span>ข้อมูลส่วนตัว</span>
                </button>
              </div>

              {/* Tab 1: Member Card & Progression */}
              {memberTab === "card" && (
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Points & Tier Progression Box */}
                  <div className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-neutral-400 block text-[11px]">ระดับสมาชิกปัจจุบัน</span>
                        <strong className="text-base text-white font-mono font-bold tracking-tight">
                          {currentMember.tier} Class
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-400 block text-[11px]">คะแนนสะสมคงเหลือ</span>
                        <strong className="text-base text-amber-400 font-mono font-bold">
                          {currentMember.points || 0} PTS
                        </strong>
                      </div>
                    </div>

                    {/* Progress Bar towards Next Tier */}
                    {(() => {
                      let nextGoal = 250;
                      let nextTierName = "Gold";
                      if (currentMember.tier === "Gold") {
                        nextGoal = 1000;
                        nextTierName = "Elite";
                      } else if (currentMember.tier === "Elite") {
                        return (
                          <div className="pt-1 flex items-center space-x-2 text-xs text-amber-400 font-medium">
                            <Award className="h-4 w-4 shrink-0" />
                            <span>คุณอยู่ในระดับสูงสุด Elite Class สิทธิประโยชน์เหนือระดับครบถ้วน</span>
                          </div>
                        );
                      }

                      const currentPts = currentMember.points || 0;
                      const progressPct = Math.min(100, Math.round((currentPts / nextGoal) * 100));
                      const remaining = Math.max(0, nextGoal - currentPts);

                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                            <div 
                              className="h-full bg-gradient-to-r from-[#cb5a1a] to-amber-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                            <span>{currentPts} / {nextGoal} PTS ({progressPct}%)</span>
                            <span>สะสมอีก {remaining} PTS เพื่อเลื่อนเป็น {nextTierName}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Active Perks Summary */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                      สิทธิพิเศษที่คุณได้รับตอนนี้
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 flex items-start space-x-3">
                        <div className="p-1.5 rounded bg-[#cb5a1a]/10 text-[#cb5a1a] shrink-0">
                          <Gift className="h-4 w-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-semibold text-white block">ส่วนลดจองพัก</strong>
                          <span className="text-[11px] text-neutral-400">
                            {currentMember.tier === "Elite" ? "รับส่วนลด 15% ทุกห้อง" : currentMember.tier === "Gold" ? "รับส่วนลด 10% ทุกห้อง" : "รับส่วนลด 5% ทุกห้อง"}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800 flex items-start space-x-3">
                        <div className="p-1.5 rounded bg-[#cb5a1a]/10 text-[#cb5a1a] shrink-0">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <strong className="text-xs font-semibold text-white block">เวลาเช็คเอาท์</strong>
                          <span className="text-[11px] text-neutral-400">
                            {currentMember.tier === "Elite" ? "Late Check-out ถึง 15:00 น." : currentMember.tier === "Gold" ? "Late Check-out ถึง 14:00 น." : "เวลามาตรฐาน 12:00 น."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Book Room with Discount */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onBookNowClick) {
                          onBookNowClick();
                        }
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#d95a06] to-[#b84100] hover:from-[#e86610] hover:to-[#c64800] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-black/40 transition-all cursor-pointer"
                    >
                      <BedDouble className="h-4 w-4" />
                      <span>จองห้องพักในราคาสมาชิกทันที</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Reservation History */}
              {memberTab === "bookings" && (
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-xs font-mono font-bold text-neutral-300 uppercase">
                      ประวัติการจองห้องพักของคุณ
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      อีเมล: {currentMember.email}
                    </span>
                  </div>

                  {myBookings.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-neutral-300">ยังไม่มีประวัติการจอง</h4>
                        <p className="text-xs text-neutral-500">จองห้องพักคืนนี้เพื่อรับสิทธิประโยชน์และสะสมคะแนน</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onBookNowClick) onBookNowClick();
                        }}
                        className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                      >
                        ดูห้องพักว่างและจองทันที
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myBookings.map((b) => (
                        <div 
                          key={b.id}
                          className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white">
                                {b.roomName || (b.roomType === "superior" ? "STANDARD TWIN BED ROOM" : b.roomType === "sup_queen_01" ? "Superior Room" : "Deluxe Room")}
                              </span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                b.status === "Confirmed" || b.status === "Paid"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : b.status === "Pending"
                                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                                    : "bg-neutral-800 text-neutral-400"
                              }`}>
                                {b.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-neutral-400 font-mono">
                              <CalendarDays className="h-3 w-3 text-neutral-500" />
                              <span>{b.checkIn} ถึง {b.checkOut}</span>
                              <span>·</span>
                              <span>{b.guests || 2} ท่าน</span>
                            </div>
                            {b.specialRequest && (
                              <p className="text-[10px] text-neutral-400 italic">
                                คำขอ: {b.specialRequest}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-neutral-500 font-mono block">ราคารวมสุทธิ</span>
                            <span className="text-sm font-bold font-mono text-white">
                              {(b.totalPrice || 0).toLocaleString()} THB
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Profile Settings */}
              {memberTab === "profile" && (
                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-xs flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-medium text-neutral-400 uppercase">
                        ชื่อ-นามสกุล (Full Name)
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-medium text-neutral-400 uppercase">
                        เบอร์โทรศัพท์ (Phone Number)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type="tel"
                          required
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-medium text-neutral-400 uppercase">
                        อีเมลผู้ใช้งาน (Email Address)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-medium text-neutral-400 uppercase">
                        รหัสผ่าน (Password)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type={showEditPassword ? "text" : "password"}
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="ตั้งรหัสผ่านใหม่ (หากต้องการเปลี่ยน)"
                          className="w-full pl-9 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="w-full py-2.5 bg-[#cb5a1a] hover:bg-[#b84100] disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        {profileSaving ? "กำลังบันทึกข้อมูล..." : "บันทึกการเปลี่ยนแปลง"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bottom Footer with Logout */}
              <div className="p-4 px-6 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-neutral-500 font-mono">
                  MEMBER ID: {currentMember.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logoutMember();
                    setMemberTab("card");
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded hover:bg-red-950/30 border border-transparent hover:border-red-900/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>ลงชื่อออกจากระบบ</span>
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* GUEST VIEW: TABS & LOGIN / REGISTER FORMS                 */
            /* ========================================================= */
            <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div>
                {/* Segmented Tab Pill Selector */}
                <div className="p-1 bg-neutral-950 rounded-xl border border-neutral-800 grid grid-cols-2 gap-1 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setLoginError("");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      authMode === "login"
                        ? "bg-[#cb5a1a] text-white shadow-md shadow-[#cb5a1a]/20"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>ลงชื่อเข้าใช้งาน</span>
                  </button>

                  {allowRegistration && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setRegError("");
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        authMode === "register"
                          ? "bg-[#cb5a1a] text-white shadow-md shadow-[#cb5a1a]/20"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>สมัครสมาชิกใหม่ (ฟรี)</span>
                    </button>
                  )}
                </div>

                {/* ---------------- LOGIN FORM ---------------- */}
                {authMode === "login" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-medium text-neutral-300 uppercase tracking-wide block">
                        อีเมลผู้ใช้งาน (Email Address)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="yourname@example.com"
                          className="w-full pl-10 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-mono font-medium text-neutral-300 uppercase tracking-wide block">
                          รหัสผ่าน (Password)
                        </label>
                        <span className="text-[10px] text-neutral-500">
                          ลืมรหัสผ่าน? แจ้งทาง LINE ได้ตลอด 24 ชม.
                        </span>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a] focus:ring-1 focus:ring-[#cb5a1a] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#d95a06] to-[#b84100] hover:from-[#e86610] hover:to-[#c64800] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-[#cb5a1a]/20 transition-all cursor-pointer"
                      >
                        {loginLoading ? (
                          <span>กำลังตรวจสอบข้อมูล...</span>
                        ) : (
                          <>
                            <span>ลงชื่อเข้าใช้ทันที</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Member Quick Fill Tip */}
                    <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>ยังไม่มีบัญชีสมาชิก?</span>
                      {allowRegistration && (
                        <button
                          type="button"
                          onClick={() => setAuthMode("register")}
                          className="text-[#cb5a1a] hover:underline font-semibold cursor-pointer"
                        >
                          สมัครสมาชิกฟรี (รับส่วนลด 5%)
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* ---------------- REGISTER FORM ---------------- */}
                {authMode === "register" && allowRegistration && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {regError && (
                      <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                        <span>{regError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-medium text-neutral-300 uppercase block">
                          ชื่อ-นามสกุล (Full Name)
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="คุณ สมชาย มุ่งมั่น"
                            className="w-full pl-8 pr-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-medium text-neutral-300 uppercase block">
                          เบอร์โทรศัพท์ (Phone Number)
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                          <input
                            type="tel"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="0812345678"
                            className="w-full pl-8 pr-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-medium text-neutral-300 uppercase block">
                        อีเมลผู้ใช้งาน (Email Address)
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="somchai@example.com"
                          className="w-full pl-8 pr-2.5 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-medium text-neutral-300 uppercase block">
                        รหัสผ่านเข้าใช้งาน (Password)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                        <input
                          type={showRegPassword ? "text" : "password"}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="กำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร"
                          className="w-full pl-8 pr-9 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#cb5a1a]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                        >
                          {showRegPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                      >
                        {regLoading ? (
                          <span>กำลังสร้างบัญชีสมาชิก...</span>
                        ) : (
                          <>
                            <span>ยืนยันสมัครสมาชิก (รับส่วนลด 5% คืนนี้)</span>
                            <CheckCircle2 className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-1 text-center">
                      <span className="text-[11px] text-neutral-400">
                        มีบัญชีอยู่แล้ว?{" "}
                        <button
                          type="button"
                          onClick={() => setAuthMode("login")}
                          className="text-[#cb5a1a] hover:underline font-semibold cursor-pointer"
                        >
                          ลงชื่อเข้าใช้งาน
                        </button>
                      </span>
                    </div>
                  </form>
                )}
              </div>

              {/* Bottom Guarantee Badge */}
              <div className="pt-4 border-t border-neutral-850 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#cb5a1a]" />
                  <span>ข้อมูลปลอดภัยตามมาตรฐานสากล</span>
                </span>
                <span>THE M5 RESIDENCE</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
