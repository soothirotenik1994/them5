import React, { useRef, useState } from "react";
import { Images, Loader2, Check, UploadCloud } from "lucide-react";

interface MultiImageUploadButtonProps {
  onUploadsSuccess: (urls: string[], fileNames: string[]) => void;
  className?: string;
  label?: string;
}

export default function MultiImageUploadButton({
  onUploadsSuccess,
  className = "",
  label = "อัปโหลดทีละหลายรูปภาพ 📸"
}: MultiImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isSuccess, setIsSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fileInputRef.current?.click();
  };

  const uploadSingleFile = async (file: File): Promise<string> => {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป จำกัดไม่เกิน 15MB`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        if (!base64Data) {
          reject(new Error("ไม่สามารถอ่านข้อมูลรูปภาพได้"));
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
            resolve(data.url);
          } else {
            reject(new Error(data.error || "เกิดข้อผิดพลาดในการบันทึกไฟล์"));
          }
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("เกิดข้อผิดพลาดในการอ่านไฟล์"));
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setIsSuccess(false);
    setUploadProgress({ current: 0, total: files.length });

    const uploadedUrls: string[] = [];
    const uploadedNames: string[] = [];
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress({ current: i + 1, total: files.length });
      try {
        const url = await uploadSingleFile(file);
        uploadedUrls.push(url);
        uploadedNames.push(file.name);
      } catch (err: any) {
        console.error(`Error uploading ${file.name}:`, err);
        errorCount++;
        alert(`ไม่สามารถอัปโหลดรูปภาพ "${file.name}" ได้: ${err.message || "เกิดข้อขัดข้อง"}`);
      }
    }

    setIsUploading(false);
    if (uploadedUrls.length > 0) {
      onUploadsSuccess(uploadedUrls, uploadedNames);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      if (errorCount > 0) {
        alert(`อัปโหลดเสร็จสิ้นสำเร็จ ${uploadedUrls.length} รูป (ล้มเหลว ${errorCount} รูป)`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`inline-block ${className}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
      
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md transition-all border cursor-pointer select-none font-sans
          ${dragActive 
            ? "bg-brick-dark/30 border-brick text-white scale-105 shadow-lg shadow-brick/20" 
            : isUploading 
              ? "bg-neutral-800 border-neutral-700 text-neutral-400 cursor-not-allowed" 
              : isSuccess
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-brick-light text-neutral-300 hover:text-white"
          }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-brick" />
            <span>กำลังอัปโหลด ({uploadProgress.current}/{uploadProgress.total} รูป)...</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="h-4 w-4 text-emerald-400" />
            <span>อัปโหลดเรียบร้อย!</span>
          </>
        ) : dragActive ? (
          <>
            <UploadCloud className="h-4 w-4 text-brick animate-bounce" />
            <span>วางไฟล์ลงที่นี่เพื่ออัปโหลด</span>
          </>
        ) : (
          <>
            <Images className="h-4 w-4 text-brick-light shrink-0" />
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
