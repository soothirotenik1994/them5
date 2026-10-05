export type DocumentType = "tax_invoice" | "quotation" | "invoice";

export type DocumentStatus = "draft" | "sent" | "paid" | "cancelled" | "approved";

export type VatType = "included" | "excluded" | "exempt";

export interface BillingItem {
  id: string;
  description: string; // e.g. "Standard Room Twin Bedded Room (ห้อง 308)"
  subDescription?: string; // e.g. "(Check in 11/09/69 - Check Out 12/09/69)"
  quantity: number;
  unitPrice: number;
  amount: number; // quantity * unitPrice
}

export interface CustomerInfo {
  name: string; // e.g. "สำนักงานคลังจังหวัดพิษณุโลก"
  branch?: string; // e.g. "สำนักงานใหญ่" หรือ "สาขาที่..."
  address: string; // e.g. "ซ.ศาลากลางจังหวัดพิษณุโลก อ.วังจันทน์ ต.ในเมือง อ.เมืองพิษณุโลก จ.พิษณุโลก 65000"
  taxId: string; // e.g. "0994000477481"
  phone?: string;
  email?: string;
  contactPerson?: string;
}

export interface CompanyProfile {
  name: string; // "THE FELIX PROPERTY CO.,LTD."
  thaiName: string; // "บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด (สำนักงานใหญ่)"
  branch: string; // "สำนักงานใหญ่"
  address: string; // "37/93 หมู่ที่ 1 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120"
  tel: string; // "02-288 0965 / มือถือ 099-617-8695"
  email: string; // "Them5residence@gmail.com"
  taxId: string; // "0125561031626"
  logoUrl?: string;
  signatureName?: string; // "ผู้รับเงิน"
  signatureRole?: string; // "Authorized Signature"
  bankName?: string; // "ธนาคารกสิกรไทย"
  bankAccountName?: string; // "บจก. เดอะ เฟลิกซ์ พร็อพเพอร์ตี้"
  bankAccountNumber?: string; // "xxx-x-xxxxx-x"
  promptPay?: string;
}

export interface PaymentInfo {
  method: "cash" | "transfer" | "cheque" | "credit_card";
  bankName?: string;
  chequeNumber?: string;
  branch?: string;
  chequeDate?: string;
  paidAmount?: number;
  paidAt?: string;
  notes?: string;
}

export interface BillingDocument {
  id: string; // Unique ID (e.g. "doc_1727345678")
  documentNumber: string; // e.g. "0069-09-053", "QT-2569-09-001", "INV-2569-09-001"
  type: DocumentType;
  title?: string; // Override document title if needed (e.g. "ใบเสร็จรับเงิน/ใบกำกับภาษี", "ใบเสนอราคา", "ใบแจ้งหนี้")
  status: DocumentStatus;
  
  // Dates
  issueDate: string; // "YYYY-MM-DD"
  dueDate?: string; // "YYYY-MM-DD" (for quotation / invoice)
  checkIn?: string; // "YYYY-MM-DD"
  checkOut?: string; // "YYYY-MM-DD"
  roomNumber?: string; // e.g. "308"

  // Link to reservation
  bookingId?: string; // Optional booking ID link

  // Parties
  company: CompanyProfile;
  customer: CustomerInfo;

  // Line items
  items: BillingItem[];

  // Calculation fields
  vatType: VatType; // "included" | "excluded" | "exempt"
  vatRate: number; // default 7
  discount: number; // Discount amount
  
  // Computed values
  subtotal: number; // Gross total of items minus discount
  netBeforeVat: number; // Net Amount before VAT (ยอดก่อนภาษีมูลค่าเพิ่ม)
  vatAmount: number; // ภาษีมูลค่าเพิ่ม 7%
  totalAmount: number; // รวมเงินที่ชำระ (Net Amount include VAT)
  
  // Withholding Tax (ภาษีหัก ณ ที่จ่าย เช่น 1%, 3%)
  withholdingTaxPercent?: number; // 0, 1, 3
  withholdingTaxAmount?: number;
  netPayable: number; // Total after withholding tax deduction

  // Thai Baht Text
  bahtText: string; // "หนึ่งพันสามร้อยเก้าสิบบาทถ้วน"

  // Payment
  payment: PaymentInfo;

  // Signatures & Remarks
  remarks?: string;
  footerNote?: string; // e.g. "*ใบเสร็จรับเงินฉบับนี้จะมีผลสมบูรณ์เมื่อเช็คของท่านเรียกเก็บเงินจากธนาคารเรียบร้อยแล้ว*"
  preparedBy?: string;
  authorizedBy?: string;

  // Metadata
  isWebRequest?: boolean; // Set to true if requested online by customer from public homepage
  createdAt: string;
  updatedAt: string;
}

export const defaultCompanyProfile: CompanyProfile = {
  name: "THE FELIX PROPERTY CO.,LTD.",
  thaiName: "บริษัท เดอะ เฟลิกซ์ พร็อพเพอร์ตี้ จำกัด (สำนักงานใหญ่)",
  branch: "สำนักงานใหญ่",
  address: "37/93 หมู่ที่ 1 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120",
  tel: "02-288 0965 / มือถือ 099-617-8695",
  email: "Them5residence@gmail.com",
  taxId: "0125561031626",
  logoUrl: "",
  signatureName: "ผู้รับเงิน",
  signatureRole: "Authorized Signature",
  bankName: "ธนาคารกสิกรไทย (KBank)",
  bankAccountName: "บจก. เดอะ เฟลิกซ์ พร็อพเพอร์ตี้",
  bankAccountNumber: "099-2-61786-9",
  promptPay: "0125561031626"
};
