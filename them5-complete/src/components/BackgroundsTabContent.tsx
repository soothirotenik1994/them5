import React, { useState } from "react";
import { WebSettings } from "../context/SettingsContext";
import { Wallpaper, Images, Link, Sparkles, RefreshCw, Eye, Check, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import ImageUploadButton from "./ImageUploadButton";

interface BackgroundsTabContentProps {
  settings: WebSettings;
  updateSettings: (newSettings: WebSettings) => Promise<boolean>;
}

// High-quality industrial and loft aesthetic image presets from Unsplash (dark themed/industrial)
const PRESETS = {
  heroBg: [
    {
      name: "แผ่นคอนกรีตดิบขัดมัน (Raw Concrete)",
      url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=1200&auto=format&fit=crop",
      preview: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=150&auto=format&fit=crop"
    },
    {
      name: "ผนังอิฐมอญสีส้มโบราณ (Classic Red Brick)",
      url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop",
      preview: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=150&auto=format&fit=crop"
    },
    {
      name: "เหล็กดำสนิมอินดัสเทรียล (Industrial Dark Metal)",
      url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1200&auto=format&fit=crop",
      preview: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=150&auto=format&fit=crop"
    },
    {
      name: "ปูนสลัดลอฟท์โมเดิร์น (Modern Grunge Concrete)",
      url: "https://images.unsplash.com/photo-1531685250784-7569952593d2?q=80&w=1200&auto=format&fit=crop",
      preview: "https://images.unsplash.com/photo-1531685250784-7569952593d2?q=80&w=150&auto=format&fit=crop"
    }
  ],
  covers: [
    {
      name: "ล็อบบี้รับรองสไตล์ลอฟท์ (Default Luxury Lobby)",
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200&auto=format&fit=crop",
    },
    {
      name: "ห้องเตียงเดี่ยวสไตล์อินดัสเทรียล (Industrial Bed)",
      url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=1200&auto=format&fit=crop",
    },
    {
      name: "ระเบียงไม้ชมวิวยามค่ำคืน (Loft Balcony Dark)",
      url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1200&auto=format&fit=crop",
    }
  ]
};

export default function BackgroundsTabContent({ settings, updateSettings }: BackgroundsTabContentProps) {
  const [bgForm, setBgForm] = useState({
    heroCardImg: settings.general.heroCardImg || "",
    heroBgImg: settings.general.heroBgImg || "",
  });

  const [slides, setSlides] = useState<{ url: string; label: string; desc: string; }[]>(() => {
    if (settings.slides && settings.slides.length > 0) {
      return [...settings.slides];
    }
    return [
      { url: settings.general.coverImg1 || "", label: "LOBBY RECEPTION", desc: "โชว์เนื้อไม้สักป่าประกอบโครงเหล็กท่อดำสไตล์อินดัสเทรียลลอฟท์" },
      { url: settings.general.coverImg2 || "", label: "SUPERIOR ROOM", desc: "ห้องนอนแต่งขอบปูนเปลือยขัดมันพร้อมเฟอร์นิเจอร์สั่งตัดพิเศษ" },
      { url: settings.general.coverImg3 || "", label: "DELUXE ROOM", desc: "สเปซส่วนตัวกว้างขวางโอบรับแสงแดดยามเช้าผ่านกระจกบานใหญ่" }
    ];
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: "heroCardImg" | "heroBgImg", value: string) => {
    setBgForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSlide = () => {
    setSlides(prev => [
      ...prev,
      { url: "", label: "สไลด์ใหม่ (NEW SLIDE)", desc: "คำอธิบายรายละเอียดสำหรับสไลด์ใหม่สไตล์ลอฟท์" }
    ]);
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= 1) {
      return;
    }
    setSlides(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSlideChange = (index: number, key: "url" | "label" | "desc", value: string) => {
    setSlides(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    
    setSlides(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const updatedSettings: WebSettings = {
      ...settings,
      general: {
        ...settings.general,
        coverImg1: slides[0]?.url || "",
        coverImg2: slides[1]?.url || "",
        coverImg3: slides[2]?.url || "",
        heroCardImg: bgForm.heroCardImg,
        heroBgImg: bgForm.heroBgImg,
      },
      slides: slides
    };

    const success = await updateSettings(updatedSettings);
    setIsSaving(false);
    
    if (success) {
      alert("บันทึกการตั้งค่ารูปภาพพื้นหลังทั้งหมดสำเร็จเรียบร้อยแล้ว! 🎨✨");
    } else {
      alert("เกิดข้อขัดข้องในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleReset = () => {
    setBgForm({
      heroCardImg: "",
      heroBgImg: "",
    });
    setSlides([
      { url: "", label: "LOBBY RECEPTION", desc: "โชว์เนื้อไม้สักป่าประกอบโครงเหล็กท่อดำสไตล์อินดัสเทรียลลอฟท์" },
      { url: "", label: "SUPERIOR ROOM", desc: "ห้องนอนแต่งขอบปูนเปลือยขัดมันพร้อมเฟอร์นิเจอร์สั่งตัดพิเศษ" },
      { url: "", label: "DELUXE ROOM", desc: "สเปซส่วนตัวกว้างขวางโอบรับแสงแดดยามเช้าผ่านกระจกบานใหญ่" }
    ]);
  };

  const applyPreset = (field: "heroCardImg" | "heroBgImg", url: string) => {
    handleInputChange(field, url);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div>
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Wallpaper className="h-5 w-5 text-brick" />
          <span>ระบบจัดการพื้นหลังและสื่อนำเสนอ (Background Manager)</span>
        </h3>
        <p className="text-xs text-neutral-450 font-light mt-1">
          ปรับแต่งสไตล์ความเท่แบบอินดัสเทรียลลอฟท์ของคุณ โดยอัปเดต URL รูปภาพพื้นหลังและการเปลี่ยนสไลด์โชว์หลักของเว็บไซต์
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: LEFT SIDE COVER CINEMATIC SLIDESHOW */}
        <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-900 pb-3">
            <Images className="h-4 w-4 text-brick" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              1. ระบบจัดการสไลด์โชว์ฝั่งซ้าย (Left Cinematic Slideshow Manager)
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            คุณสามารถเพิ่ม ลบ จัดเรียงสไลด์ภาพ และแก้ไขหัวข้อสไลด์ได้ตามต้องการ ระบบจะสลับเปลี่ยนภาพทางด้านซ้ายของหน้าเว็บโดยอัตโนมัติ
          </p>

          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <div 
                key={idx} 
                className="bg-neutral-900/40 border border-neutral-850 rounded-lg p-4 space-y-3 relative transition-all duration-300 hover:border-neutral-700"
              >
                {/* Header of the slide control */}
                <div className="flex justify-between items-center pb-2 border-b border-neutral-850/50">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] bg-brick/10 border border-brick/30 text-brick px-1.5 py-0.5 rounded font-bold">สไลด์ที่ {idx + 1}</span>
                    <span className="text-xs text-neutral-600">|</span>
                    <span className="text-xs font-semibold text-neutral-300 truncate max-w-[150px] sm:max-w-[250px]">
                      {slide.label || "ไม่มีหัวข้อ"}
                    </span>
                  </div>
                  
                  {/* Reordering and deleting buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSlide(idx, "up")}
                      className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800 rounded transition-colors"
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={() => handleMoveSlide(idx, "down")}
                      className="p-1 text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800 rounded transition-colors"
                      title="เลื่อนลง"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(idx)}
                      className="p-1 text-neutral-400 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors ml-1"
                      title="ลบสไลด์"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body of the slide control */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Text Fields */}
                  <div className="md:col-span-2 space-y-3">
                    {/* Slide Title */}
                    <div>
                      <label className="block text-[10px] text-neutral-455 font-medium mb-1">
                        หัวข้อสไลด์ (Heading / Title) <span className="text-brick font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={slide.label}
                        onChange={(e) => handleSlideChange(idx, "label", e.target.value)}
                        placeholder="เช่น LOBBY RECEPTION, SUPERIOR ROOM"
                        className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-medium"
                      />
                    </div>

                    {/* Slide Description */}
                    <div>
                      <label className="block text-[10px] text-neutral-455 font-medium mb-1">
                        คำบรรยายภาพย่อย (Description)
                      </label>
                      <textarea
                        value={slide.desc}
                        onChange={(e) => handleSlideChange(idx, "desc", e.target.value)}
                        placeholder="คำบรรยายสไลด์ที่จะแสดงที่ขอบมุมล่างซ้าย..."
                        rows={2}
                        className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick resize-none font-light"
                      />
                    </div>
                  </div>

                  {/* Image Field and Preview */}
                  <div className="space-y-2 flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] text-neutral-455 font-medium mb-1">
                        รูปภาพสไลด์ (Image URL)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={slide.url}
                          onChange={(e) => handleSlideChange(idx, "url", e.target.value)}
                          placeholder="อัปโหลด หรือใส่ URL..."
                          className="flex-1 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-[11px] text-white focus:outline-none focus:border-brick font-mono"
                        />
                        <ImageUploadButton
                          onUploadSuccess={(url) => handleSlideChange(idx, "url", url)}
                          label="อัปโหลด 📤"
                        />
                      </div>
                    </div>

                    {/* Thumbnail preview */}
                    <div className="h-16 bg-neutral-950 rounded border border-neutral-800 overflow-hidden flex items-center justify-center relative mt-1">
                      {slide.url ? (
                        <img src={slide.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <span className="text-[9px] text-neutral-600 font-mono block">DEFAULT IMAGE FALLBACK</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Slide button */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={handleAddSlide}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-750 hover:border-neutral-500 text-neutral-300 hover:text-white rounded text-xs font-semibold transition-all flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4 text-brick" />
              <span>เพิ่มสไลด์ภาพใหม่ (+ Add Slide)</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: HERO RIGHT-SIDE SPOTLIGHT IMAGE */}
        <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-900 pb-3">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              2. รูปภาพกล่องแนะนำด้านขวา (Right Spotlight Card Image)
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            ตั้งค่ารูปภาพหลักที่แสดงอยู่ในกรอบดีไซน์สุดหรูทางด้านขวาของหน้าแรก (หากปล่อยว่าง ระบบจะดึงภาพรีเซปชั่นไม้สักดำลอฟท์ดั้งเดิม)
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={bgForm.heroCardImg}
                  onChange={(e) => handleInputChange("heroCardImg", e.target.value)}
                  placeholder="https://images.unsplash.com/... (Spotlight image)"
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono"
                />
                <ImageUploadButton
                  onUploadSuccess={(url) => handleInputChange("heroCardImg", url)}
                  label="อัปโหลดรูปกล่องแนะนำ 📤"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div className="md:col-span-3">
                <span className="text-[11px] text-neutral-500 font-mono block mb-1.5">// แนะนำภาพสไตล์ลอฟท์สวยๆ:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.covers.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset("heroCardImg", p.url)}
                      className="px-2.5 py-1 bg-neutral-900 hover:bg-cyan-950 border border-neutral-800 rounded text-[10px] text-neutral-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-28 bg-neutral-900 rounded border border-neutral-800 overflow-hidden flex items-center justify-center relative">
                {bgForm.heroCardImg ? (
                  <img src={bgForm.heroCardImg} alt="Card Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-neutral-600 font-mono">DEFAULT LOBBY CARD</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: HERO OUTER CONTAINER BACKGROUND IMAGE */}
        <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-neutral-900 pb-3">
            <Wallpaper className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              3. รูปพื้นหลังกรอบคอนเทนเนอร์ Hero (Hero Container Background Image)
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            ปรับเปลี่ยนรูปภาพพื้นหลังสุดอลังการที่จะแสดงเป็นฉากหลังแบบโปร่งแสง (Vignette Soft Gradient) ภายใต้ตัวอักษร "นิยามใหม่ของการพักผ่อน"
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={bgForm.heroBgImg}
                  onChange={(e) => handleInputChange("heroBgImg", e.target.value)}
                  placeholder="https://images.unsplash.com/... (Hero background pattern)"
                  className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-xs text-white focus:outline-none focus:border-brick font-mono"
                />
                <ImageUploadButton
                  onUploadSuccess={(url) => handleInputChange("heroBgImg", url)}
                  label="อัปโหลดรูปพื้นหลัง 📤"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] text-neutral-500 font-mono block">// เลือกจากชุดพรีเซ็ทอิฐและคอนกรีตลอฟท์เกรดดีไซเนอร์ (Premium Loft Presets):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESETS.heroBg.map((p, idx) => {
                  const isSelected = bgForm.heroBgImg === p.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset("heroBgImg", p.url)}
                      className={`p-1.5 rounded border text-left flex flex-col space-y-1 transition-all ${isSelected ? "bg-emerald-950/25 border-emerald-500" : "bg-neutral-900 border-neutral-800 hover:border-neutral-650"}`}
                    >
                      <div className="h-14 w-full bg-neutral-950 rounded overflow-hidden relative">
                        <img src={p.preview} alt={p.name} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 text-black">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-300 font-medium truncate w-full block">
                        {p.name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-32 bg-neutral-900 rounded border border-neutral-800 overflow-hidden flex items-center justify-center relative">
              {bgForm.heroBgImg ? (
                <>
                  <img src={bgForm.heroBgImg} alt="Hero Background Preview" className="absolute inset-0 w-full h-full object-cover opacity-35 brightness-[0.4]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85"></div>
                  <div className="relative z-10 p-4 text-center">
                    <span className="font-mono text-[9px] text-brick block tracking-widest">THE M5 RESIDENCE</span>
                    <h4 className="text-sm font-bold text-white mt-1">นิยามใหม่ของการพักผ่อน</h4>
                    <p className="text-[10px] text-neutral-300 font-light mt-1">ตัวอย่างการแสดงผลบนพื้นหลังแบบกึ่งโปร่งแสง</p>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <span className="text-[10px] text-neutral-600 font-mono block">DEFAULT DARK BACKGROUND (SOLID CHARCOAL + SPOTLIGHTS)</span>
                  <span className="text-[9px] text-neutral-500 block mt-1">ไม่มีรูปภาพพื้นหลัง ตั้งค่าด้านบนเพื่อดูสตรีมภาพจำลอง</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BUTTON ACTIONS */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-neutral-900 hover:bg-red-950/30 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-400 rounded text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>คืนค่าเริ่มต้นระบบ</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-brick hover:bg-brick-dark text-white font-bold text-xs rounded transition-all shadow-lg hover:shadow-brick/20 disabled:opacity-50"
          >
            {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลพื้นหลังทั้งหมด 💾"}
          </button>
        </div>
      </form>
    </div>
  );
}
