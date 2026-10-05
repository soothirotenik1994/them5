/**
 * Utility to convert numbers to Thai Baht text (เช่น 1,390.00 -> "หนึ่งพันสามร้อยเก้าสิบบาทถ้วน")
 * Conforms to the Royal Institute of Thailand standard for accounting and tax invoices.
 */

const THAI_NUMBERS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_DIGIT_UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

function convertGroup(numStr: string, isMillionsGroup = false): string {
  let result = "";
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const unitIndex = len - i - 1;

    if (digit === 0) continue;

    // Special cases for tens and ones
    if (unitIndex === 1 && digit === 1) {
      // 10 -> สิบ (not หนึ่งสิบ)
      result += "สิบ";
    } else if (unitIndex === 1 && digit === 2) {
      // 20 -> ยี่สิบ (not สองสิบ)
      result += "ยี่สิบ";
    } else if (unitIndex === 0 && digit === 1) {
      // 1 at the unit position:
      // If len === 1, e.g. 1 -> หนึ่ง, but in millions group like 1,000,001 -> หนึ่งล้านหนึ่ง or หนึ่งล้านเอ็ด
      if (len > 1 && parseInt(numStr.charAt(len - 2), 10) !== 0) {
        result += "เอ็ด";
      } else if (len > 1 && isMillionsGroup) {
        result += "เอ็ด";
      } else {
        result += len === 1 ? "หนึ่ง" : "เอ็ด";
      }
    } else {
      result += THAI_NUMBERS[digit] + THAI_DIGIT_UNITS[unitIndex];
    }
  }

  return result;
}

export function thaiBahtText(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return "ศูนย์บาทถ้วน";
  }

  const num = Math.round(Number(amount) * 100) / 100;
  if (num === 0) {
    return "ศูนย์บาทถ้วน";
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const [bahtPart, satangPart = "00"] = absNum.toFixed(2).split(".");
  const paddedSatang = satangPart.padEnd(2, "0").slice(0, 2);
  const satangVal = parseInt(paddedSatang, 10);

  let bahtText = "";

  // Split baht into 6-digit groups for millions
  const bahtGroups: string[] = [];
  let tempBaht = bahtPart;
  while (tempBaht.length > 6) {
    bahtGroups.unshift(tempBaht.slice(-6));
    tempBaht = tempBaht.slice(0, -6);
  }
  bahtGroups.unshift(tempBaht);

  for (let g = 0; g < bahtGroups.length; g++) {
    const groupStr = bahtGroups[g];
    const groupText = convertGroup(groupStr, g > 0);
    if (groupText) {
      bahtText += groupText;
      if (g < bahtGroups.length - 1) {
        bahtText += "ล้าน";
      }
    }
  }

  let result = (isNegative ? "ลบ" : "") + (bahtText ? bahtText + "บาท" : "");

  if (satangVal === 0) {
    result += "ถ้วน";
  } else {
    const satangText = convertGroup(paddedSatang);
    result += satangText + "สตางค์";
  }

  return result || "ศูนย์บาทถ้วน";
}

/**
 * Format date in Thai Buddhist Era (พ.ศ.) or Christian Era (ค.ศ.)
 * e.g., 2026-09-12 -> "12/09/2569" (matching image: 12/09/2569)
 */
export function formatThaiDate(dateStr?: string | Date, format: "short" | "full" | "be_short" = "be_short"): string {
  if (!dateStr) return "";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const beYear = d.getFullYear() + 543;
  const shortBeYear = String(beYear).slice(-2);

  if (format === "be_short") {
    // e.g. 12/09/2569
    return `${day}/${month}/${beYear}`;
  }

  if (format === "short") {
    // e.g. 12/09/69
    return `${day}/${month}/${shortBeYear}`;
  }

  // Full Thai month
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} พ.ศ. ${beYear}`;
}
