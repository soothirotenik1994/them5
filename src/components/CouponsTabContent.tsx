import React, { useState } from "react";
import { WebSettings, DiscountCoupon } from "../context/SettingsContext";
import { 
  Tag, Plus, Trash2, CheckCircle2, AlertCircle, 
  HelpCircle, Loader2, Info, ToggleLeft, ToggleRight,
  Ticket
} from "lucide-react";

interface CouponsTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
}

export default function CouponsTabContent({ settings, updateSettings }: CouponsTabContentProps) {
  const [codeInput, setCodeInput] = useState("");
  const [typeInput, setTypeInput] = useState<"percent" | "fixed">("percent");
  const [valueInput, setValueInput] = useState<number>(10);
  const [minNightsInput, setMinNightsInput] = useState<number>(1);
  const [descInput, setDescInput] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const couponList = settings.coupons || [];

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput) {
      alert("กรุณากรอกรหัสคูปอง");
      return;
    }

    const uppercaseCode = codeInput.trim().toUpperCase();

    // Check duplicate code
    const isDuplicate = couponList.some(c => c.code === uppercaseCode);
    if (isDuplicate) {
      setStatus("error");
      setStatusMsg(`รหัสส่วนลด ${uppercaseCode} นี้มีอยู่แล้วในระบบครับ`);
      return;
    }

    if (valueInput <= 0) {
      alert("มูลค่าส่วนลดต้องมากกว่า 0");
      return;
    }

    setActionLoading(true);
    setStatus("idle");

    try {
      const newCoupon: DiscountCoupon = {
        code: uppercaseCode,
        type: typeInput,
        value: Number(valueInput),
        minNights: Number(minNightsInput) || 1,
        active: true,
        description: descInput || `ส่วนลดมูลค่า ${valueInput} ${typeInput === "percent" ? "%" : "บาท"}`
      };

      const updatedSettings: WebSettings = {
        ...settings,
        coupons: [...couponList, newCoupon]
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setStatus("success");
        setStatusMsg(`เพิ่มคูปองส่วนลด ${uppercaseCode} สำเร็จเรียบร้อยแล้วครับ!`);
        // Clear inputs
        setCodeInput("");
        setDescInput("");
        setValueInput(typeInput === "percent" ? 10 : 100);
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setStatusMsg("ไม่สามารถส่งข้อมูลไปบันทึกบนเซิร์ฟเวอร์ได้");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("เกิดข้อผิดพลาดขณะส่งบันทึกข้อมูล");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (code: string) => {
    setActionLoading(true);
    setStatus("idle");

    try {
      const updatedCoupons = couponList.map((c) => {
        if (c.code === code) {
          return { ...c, active: !c.active };
        }
        return c;
      });

      const updatedSettings: WebSettings = {
        ...settings,
        coupons: updatedCoupons
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setStatus("success");
        setStatusMsg("อัปเดตสถานะการใช้งานคูปองส่วนลดเรียบร้อยแล้ว");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setStatusMsg("ไม่สามารถปรับปรุงข้อมูลบนเซิร์ฟเวอร์ได้");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("เกิดข้อผิดพลาดในการเปลี่ยนสถานะการใช้งาน");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    setActionLoading(true);
    setStatus("idle");

    try {
      const updatedSettings: WebSettings = {
        ...settings,
        coupons: couponList.filter((c) => c.code !== code)
      };

      const success = await updateSettings(updatedSettings);
      if (success) {
        setStatus("success");
        setStatusMsg("ลบรหัสส่วนลดเรียบร้อยแล้วครับ");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setStatusMsg("เกิดข้อผิดพลาดในการบันทึกข้อมูลการลบบนเซิร์ฟเวอร์");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMsg("เกิดข้อผิดพลาดขณะลบรายการส่วนลด");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-200">
      
      {/* Title */}
      <div className="border-b border-neutral-850 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Ticket className="h-5 w-5 text-cyan-400" />
          <span>ระบบจัดการส่วนลดและคูปอง (Discount Coupons Management)</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          สร้าง ปรับปรุงสถานะ หรือลบรหัสโปรโมโค้ดส่วนลด เพื่อให้ลูกค้านำไปกรอกและรับส่วนลดค่าห้องพักได้ทันทีในหน้าฟอร์มจองห้องพัก
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Add Coupon Form (5 columns) */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
          
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
            <Plus className="h-4 w-4 text-cyan-400" />
            <span>สร้างรหัสส่วนลดใหม่ (Create Discount Coupon)</span>
          </h3>

          <form onSubmit={handleAddCoupon} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">1. รหัสโค้ดส่วนลด (Coupon Code)</label>
              <input 
                type="text"
                required
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono uppercase font-bold"
                placeholder="เช่น LOFT10, SUPER500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-neutral-450 font-mono">2. รูปแบบส่วนลด</label>
                <select
                  value={typeInput}
                  onChange={(e) => {
                    const newType = e.target.value as "percent" | "fixed";
                    setTypeInput(newType);
                    setValueInput(newType === "percent" ? 10 : 100);
                  }}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="percent" className="bg-neutral-900">เปอร์เซ็นต์ (%)</option>
                  <option value="fixed" className="bg-neutral-900">จำนวนเงินคงที่ (บาท)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-450 font-mono">
                  3. มูลค่า ({typeInput === "percent" ? "%" : "บาท"})
                </label>
                <input 
                  type="number"
                  required
                  min={1}
                  value={valueInput}
                  onChange={(e) => setValueInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">4. เข้าพักขั้นต่ำ (จำนวนคืน / Nights Minimum)</label>
              <input 
                type="number"
                required
                min={1}
                value={minNightsInput}
                onChange={(e) => setMinNightsInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-450 font-mono">5. คำอธิบายแสดงเมื่อใช้งาน (Description)</label>
              <input 
                type="text"
                required
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="เช่น ส่วนลดฉลองเปิดสาขาใหม่สำหรับลูกค้าทุกคน"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer select-none disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>สร้างและเปิดใช้งานรหัสส่วนลด 🏷️</span>
                </>
              )}
            </button>

          </form>

          {status !== "idle" && (
            <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
              status === "success" 
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" 
                : "bg-red-950/20 border-red-500/30 text-red-450"
            }`}>
              <div className="flex items-start space-x-1.5">
                {status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span>{statusMsg}</span>
              </div>
            </div>
          )}

        </div>

        {/* Right List: Configured Coupons (7 columns) */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-850 rounded-xl p-5 shadow-xl space-y-4">
          
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2 border-b border-neutral-850 pb-2.5">
            <Tag className="h-4 w-4 text-cyan-400" />
            <span>รหัสคูปองส่วนลดที่มีอยู่ ({couponList.length} รายการ)</span>
          </h3>

          {couponList.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Info className="h-8 w-8 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-500">
                ไม่มีการตั้งค่าคูปองส่วนลดพิเศษใดๆ ในระบบขณะนี้ครับ
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {couponList.map((coupon) => (
                <div 
                  key={coupon.code}
                  className={`p-3 bg-neutral-900 border rounded-lg flex items-center justify-between transition-all ${
                    coupon.active ? "border-neutral-800 hover:border-cyan-950/50" : "border-neutral-900 opacity-60"
                  }`}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-cyan-900/40 text-cyan-400 border border-cyan-850 text-[11px] font-mono font-bold rounded uppercase">
                        🎟️ {coupon.code}
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ลด {coupon.value.toLocaleString()} {coupon.type === "percent" ? "%" : "THB"}
                      </span>
                    </div>
                    <p className="text-xs text-white font-sans pl-1 font-semibold">
                      {coupon.description}
                    </p>
                    <div className="text-[10px] text-neutral-500 font-mono pl-1">
                      เข้าพักขั้นต่ำ: {coupon.minNights} คืน
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Active/Inactive Toggle Button */}
                    <button
                      onClick={() => handleToggleActive(coupon.code)}
                      className="p-1 text-neutral-400 hover:text-white transition-all cursor-pointer"
                      title={coupon.active ? "กดเพื่อปิดใช้งานชั่วคราว" : "กดเพื่อเปิดใช้งาน"}
                    >
                      {coupon.active ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-neutral-500" />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteCoupon(coupon.code)}
                      className="p-2 text-neutral-400 hover:text-red-500 bg-neutral-950 border border-neutral-850 rounded-lg hover:bg-neutral-900 transition-all cursor-pointer"
                      title="ลบคูปองถาวร"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick info notes */}
          <div className="p-3.5 bg-neutral-900 border border-neutral-850 rounded-lg text-[10px] text-neutral-450 space-y-1.5 leading-relaxed">
            <h4 className="font-bold text-neutral-350 flex items-center space-x-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
              <span>รหัสทดสอบพิเศษ</span>
            </h4>
            <p>
              คุณสามารถลองนำรหัส <strong className="text-cyan-400 font-mono">WELCOME10</strong> (ลด 10%) หรือ <strong className="text-cyan-400 font-mono">LOFT100</strong> (ลด 100 บาท) ไปป้อนบนหน้าต่างขั้นตอนจองห้องพักของลูกค้าเพื่อจำลองการทำส่วนลดได้โดยอัตโนมัติ
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
