import React, { useRef, useState, useContext } from "react";
import { Upload, Loader2, Check } from "lucide-react";

interface ImageUploadButtonProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
  label?: string;
}

export default function ImageUploadButton({
  onUploadSuccess,
  className = "",
  label = "อัปโหลดรูปภาพ 📤"
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("ขนาดไฟล์ใหญ่เกินไป จำกัดไม่เกิน 10MB ครับ");
      return;
    }

    setIsUploading(true);
    setIsSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        if (!base64Data) {
          setIsUploading(false);
          return;
        }

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              base64Data,
              fileName: file.name
            })
          });

          if (!res.ok) {
            throw new Error("เซิร์ฟเวอร์ตอบกลับด้วยรหัสข้อผิดพลาด");
          }

          const data = await res.json();
          if (data.success && data.url) {
            onUploadSuccess(data.url);
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);
          } else {
            throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกไฟล์");
          }
        } catch (uploadErr: any) {
          console.error("Upload error:", uploadErr);
          alert(`อัปโหลดรูปภาพไม่สำเร็จ: ${uploadErr.message || "กรุณาลองใหม่อีกครั้ง"}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File reading error:", err);
      alert("เกิดข้อขัดข้องในการอ่านไฟล์ภาพ");
      setIsUploading(false);
    }
  };

  return (
    <div className={`inline-block ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all border cursor-pointer select-none
          ${isUploading 
            ? "bg-neutral-800 border-neutral-700 text-neutral-400 cursor-not-allowed" 
            : isSuccess
              ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
              : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-brick text-neutral-300 hover:text-white"
          }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brick" />
            <span>กำลังอัปโหลด...</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>อัปโหลดสำเร็จ!</span>
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5 text-brick-light" />
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
