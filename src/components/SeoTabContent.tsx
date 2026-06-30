import React, { useState } from "react";
import { WebSettings } from "../context/SettingsContext";
import { Sparkles, Globe, Key, Search, FileText, CheckCircle, ExternalLink, HelpCircle, Save } from "lucide-react";

interface SeoTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
}

export default function SeoTabContent({ settings, updateSettings }: SeoTabContentProps) {
  const gen = settings.general;

  const [seoForm, setSeoForm] = useState({
    seoTitle: gen.seoTitle || "",
    seoDescription: gen.seoDescription || "",
    seoKeywords: gen.seoKeywords || "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof typeof seoForm, value: string) => {
    setSeoForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedSettings: WebSettings = {
      ...settings,
      general: {
        ...settings.general,
        seoTitle: seoForm.seoTitle,
        seoDescription: seoForm.seoDescription,
        seoKeywords: seoForm.seoKeywords,
      }
    };

    const success = await updateSettings(updatedSettings);
    setIsSaving(false);

    if (success) {
      alert("💾 บันทึกการตั้งค่า SEO & คีย์เวิร์ด และปรับหัวเว็บเข้าสู่ระบบ Google สำเร็จเรียบร้อยแล้ว!");
    } else {
      alert("เกิดข้อขัดข้อง กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleResetDefaults = () => {
    if (confirm("คุณแน่ใจว่าต้องการรีเซ็ต SEO กลับเป็นค่าเริ่มต้นแนะนำจากระบบใช่หรือไม่?")) {
      setSeoForm({
        seoTitle: "The M5 Residence | ที่พักสไตล์ลอฟท์ ปากเกร็ด นนทบุรี ใกล้อิมแพ็ค อารีน่า",
        seoDescription: "เดอะ เอ็มไฟว์ เรสซิเดนซ์ (The M5 Residence) นิยามใหม่ของการพักผ่อนสไตล์อินดัสเทรียลลอฟท์ ปากเกร็ด นนทบุรี เลียบคลองประปา ใกล้ป๊อปปูล่าคาร์ดอน และเมืองทองธานี ห้องพักหรูราคาประหยัด",
        seoKeywords: "The M5 Residence, เดอะ เอ็มไฟว์ เรสซิเดนซ์, ที่พักปากเกร็ด, โรงแรมปากเกร็ด, ที่พักใกล้อิมแพ็ค, ที่พักใกล้เมืองทอง, โรงแรมสไตล์ลอฟท์, โรงแรมนนทบุรี, จองห้องพักนนทบุรี"
      });
    }
  };

  // Google Search Preview values
  const previewTitle = seoForm.seoTitle || "The M5 Residence | เดอะ เอ็มไฟว์ เรสซิเดนซ์";
  const previewDesc = seoForm.seoDescription || "ดื่มด่ำกับดีไซน์ปูนเปลือยขัดมัน อิฐมอญธรรมชาติ และงานไม้โครงเหล็กดำสุดเท่...";

  return (
    <div className="space-y-6 animate-fadeIn text-left text-sm md:text-base leading-relaxed">
      {/* Header */}
      <div className="border-b border-neutral-850 pb-4">
        <h3 className="text-xl md:text-2xl font-bold text-white flex items-center space-x-2">
          <Globe className="h-6 w-6 text-amber-400 animate-pulse" />
          <span>ระบบจัดการ SEO & Google Search Keywords (เครื่องมือช่วยดันเว็บติดหน้าแรก)</span>
        </h3>
        <p className="text-xs md:text-sm text-neutral-450 font-light mt-1">
          ปรับแต่งคำค้นหา (Keywords), คำอธิบายหน้าเว็บ (Meta Description) และหัวข้อเว็บ (Title Tag) เพื่อให้หุ่นยนต์ของ Google สามารถจัดอันดับความเกี่ยวข้องของเว็บคุณในหน้าแรกได้ง่ายขึ้น!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 md:p-6 space-y-5 shadow-xl">
            <h4 className="text-base font-bold text-white border-b border-neutral-900 pb-2.5 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-brick" />
              <span>แก้ไข Meta Tags หลักของหน้าเว็บ</span>
            </h4>

            {/* Title Tag */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs md:text-sm font-semibold text-neutral-300 flex items-center space-x-1.5">
                  <Search className="h-4 w-4 text-amber-500" />
                  <span>1. หัวเรื่องเว็บไซต์ (SEO Title Tag) <span className="text-red-500">*</span></span>
                </label>
                <span className={`text-[10px] font-mono ${seoForm.seoTitle.length > 60 ? "text-amber-500" : "text-neutral-500"}`}>
                  {seoForm.seoTitle.length} / 60 ตัวอักษร (แนะนำ)
                </span>
              </div>
              <input
                type="text"
                required
                value={seoForm.seoTitle}
                onChange={(e) => handleInputChange("seoTitle", e.target.value)}
                placeholder="ระบุหัวเรื่อง เช่น The M5 Residence | ที่พักสไตล์ลอฟท์ ปากเกร็ด นนทบุรี ใกล้อิมแพ็ค"
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-brick"
              />
              <p className="text-[11px] text-neutral-500">
                💡 หัวเรื่องที่จะโชว์บนแท็บเบราว์เซอร์ และเป็นหัวข้อสีน้ำเงินเมื่อแสดงผลบนหน้าการค้นหาของ Google
              </p>
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs md:text-sm font-semibold text-neutral-300 flex items-center space-x-1.5">
                  <FileText className="h-4 w-4 text-cyan-500" />
                  <span>2. คำอธิบายภาพรวมเว็บไซต์ (Meta Description Tag) <span className="text-red-500">*</span></span>
                </label>
                <span className={`text-[10px] font-mono ${seoForm.seoDescription.length > 160 ? "text-amber-500" : "text-neutral-500"}`}>
                  {seoForm.seoDescription.length} / 160 ตัวอักษร (แนะนำ)
                </span>
              </div>
              <textarea
                rows={3}
                required
                value={seoForm.seoDescription}
                onChange={(e) => handleInputChange("seoDescription", e.target.value)}
                placeholder="ระบุคำอธิบายย่อๆ เกี่ยวกับจุดเด่น สิ่งอำนวยความสะดวก และทำเลที่ตั้งของรีสอร์ท..."
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-brick leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500">
                💡 ข้อความอธิบายความยาว 2-3 บรรทัดใต้หัวข้อที่จะช่วยเชิญชวนให้ลูกค้าตัดสินใจคลิกเข้ามาจากหน้าแรกของ Google
              </p>
            </div>

            {/* Meta Keywords */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs md:text-sm font-semibold text-neutral-300 flex items-center space-x-1.5">
                  <Key className="h-4 w-4 text-emerald-500" />
                  <span>3. คีย์เวิร์ดคำค้นหาหลัก (Google SEO Keywords)</span>
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">คั่นด้วยเครื่องหมายจุลภาค ( , )</span>
              </div>
              <input
                type="text"
                value={seoForm.seoKeywords}
                onChange={(e) => handleInputChange("seoKeywords", e.target.value)}
                placeholder="เช่น ที่พักปากเกร็ด, โรงแรมเมืองทอง, ใกล้อิมแพ็ค, m5 residence"
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-brick font-mono"
              />
              <p className="text-[11px] text-neutral-500">
                💡 ระบุคำหลักๆ ที่คาดว่ากลุ่มเป้าหมาย (เช่น แฟนคลับคอนเสิร์ต, แขกมางานจัดแสดงสินค้า) จะใช้พิมพ์ค้นหาบน Google Search
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-900">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[11px] font-semibold text-neutral-400 hover:text-white rounded transition-colors"
              >
                คืนค่าเริ่มต้นที่ระบบแนะนำ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-brick hover:bg-brick-dark text-white font-bold text-xs md:text-sm rounded transition-all shadow-md flex items-center space-x-1.5"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "กำลังบันทึก..." : "อัปเดตและบันทึก SEO 💾"}</span>
              </button>
            </div>
          </form>

          {/* GOOGLE PREVIEW SIMULATOR */}
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-5 md:p-6 space-y-4">
            <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
              <Search className="h-4 w-4 text-neutral-400" />
              <span>ตัวอย่างการแสดงผลบน GOOGLE SEARCH (GOOGLE MOCK preview)</span>
            </h4>
            
            <div className="bg-white rounded-lg p-4 font-sans text-left shadow-inner select-none">
              {/* URL bar */}
              <div className="flex items-center space-x-1 text-xs text-[#202124]">
                <div className="bg-[#f1f3f4] h-6 w-6 rounded-full flex items-center justify-center font-bold text-neutral-600 mr-1 text-[10px]">M5</div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight text-neutral-850">The M5 Residence</span>
                  <span className="text-[10px] text-[#202124] leading-none">https://the-m5-residence.com</span>
                </div>
              </div>

              {/* Title Link */}
              <h5 className="text-[#1a0dab] hover:underline text-lg md:text-xl font-medium cursor-pointer leading-normal mt-1.5">
                {previewTitle}
              </h5>

              {/* Snippet snippet */}
              <p className="text-[#4d5156] text-xs md:text-sm leading-relaxed mt-1 font-light">
                <span className="text-[#70757a] mr-1">24 มิ.ย. 2026 — </span>
                {previewDesc}
              </p>
            </div>
            <p className="text-[11px] text-neutral-400 font-light">
              * ข้อมูลข้างต้นเป็นตัวอย่างการแสดงผลเสมือนจริงบนผลลัพธ์ของ Google Search หน้าแรก! การตั้งคำค้นหาและหัวเว็บที่เจาะจงจะช่วยกระตุ้นยอดขาย (Click-Through Rate) ได้สูงสุดถึง 85%
            </p>
          </div>
        </div>

        {/* Right SEO Guide Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111] border border-neutral-850 rounded-xl p-5 md:p-6 space-y-5">
            <h4 className="text-base font-bold text-amber-400 flex items-center space-x-2 border-b border-neutral-900 pb-2.5">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span>คู่มือดันเว็บติดหน้าแรก Google (SEO Checklist)</span>
            </h4>

            <div className="space-y-4 text-xs md:text-sm">
              {/* Step 1 */}
              <div className="flex items-start space-x-3">
                <div className="bg-emerald-950 text-emerald-400 rounded-full p-1 border border-emerald-800 shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs md:text-sm">ขั้นตอนที่ 1: ตั้งค่าข้อมูล Meta Tags (ทำแล้ว)</h5>
                  <p className="text-xs text-neutral-400 mt-1">
                    กรอกข้อมูลคำค้นหา หัวเรื่อง และคำบรรยายเว็บไซต์ทางด้านซ้ายเพื่อเป็นแนวทางดัชนีให้กับบอท Google คลานมาเก็บข้อมูล
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-3">
                <div className="bg-neutral-900 text-amber-500 rounded-full p-1 border border-neutral-800 shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs md:text-sm">ขั้นตอนที่ 2: ลงทะเบียนใน Google Search Console</h5>
                  <p className="text-xs text-neutral-400 mt-1">
                    เข้าไปที่ <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-brick-light underline inline-flex items-center">Google Search Console <ExternalLink className="h-3 w-3 ml-0.5 inline" /></a> แล้วทำการ "เพิ่มพร็อพเพอร์ตี้เว็บไซต์" ของคุณเพื่อแจ้งยืนยันสิทธิ์กับกูเกิลโดยตรง
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-3">
                <div className="bg-neutral-900 text-amber-500 rounded-full p-1 border border-neutral-800 shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs md:text-sm">ขั้นตอนที่ 3: ลงทะเบียน Google Business Profile</h5>
                  <p className="text-xs text-neutral-450 mt-1">
                    ปักหมุดแผนที่บน Google Maps พร้อมอัปโหลดรูปภาพห้องพัก และลิงก์มายังเว็บไซต์จองห้องพักของคุณเพื่อให้ติดผลการค้นหาแบบแผนที่ร้านค้าในพื้นที่ (Local SEO)
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-3">
                <div className="bg-neutral-900 text-amber-500 rounded-full p-1 border border-neutral-800 shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-xs md:text-sm">ขั้นตอนที่ 4: เผยแพร่ลิงก์และแชร์ลงโซเชียลมีเดีย</h5>
                  <p className="text-xs text-neutral-450 mt-1">
                    แชร์ลิงก์เว็บของคุณลงบนเพจ Facebook, Line, และแพลตฟอร์มต่างๆ ทราฟฟิกจริงและการส่งต่อลิงก์ (Backlinks) เป็นหัวใจสำคัญที่กูเกิลให้คะแนนเป็นอันดับแรกๆ
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-900 space-y-2.5">
              <h5 className="text-xs font-mono font-bold text-white uppercase flex items-center space-x-1">
                <HelpCircle className="h-4 w-4 text-cyan-400" />
                <span>คำศัพท์น่ารู้เบื้องต้น</span>
              </h5>
              <div className="space-y-1.5 text-xs text-neutral-400 leading-normal">
                <p>
                  <strong>1. Search Keywords:</strong> คำที่ผู้คนจะพิมพ์ลงบน Google เช่น "ที่พักปากเกร็ด" หรือ "โรงแรมใกล้เมืองทอง"
                </p>
                <p>
                  <strong>2. Organic Search:</strong> ยอดคนเข้าชมหน้าเว็บจริงตามธรรมชาติโดยที่คุณไม่ต้องเสียค่าใช้จ่ายหรือยิงแอดรายเดือนแต่อย่างใด
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
