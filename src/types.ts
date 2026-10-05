export interface RoomType {
  id: string;
  name: string;
  thaiName: string;
  price: number;
  size: number; // in sqm
  capacity: number; // max guests
  bedType: string;
  description: string;
  longDescription: string;
  imageUrl: string;
  amenities: string[];
  matterportUrl?: string;
  active?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CheckAvailabilityRequest {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType: string;
}

export interface BookingDetails {
  roomType: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  totalPrice: number;
}

export interface BookingRecord extends BookingDetails {
  id: string;
  bookingId?: string;
  createdAt: string;
  status: "Pending" | "Confirmed" | "Paid" | "Cancelled";
  paymentProofUrl?: string;
  specialRequest?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  tier: "Silver" | "Gold" | "Elite";
  points: number;
  joinedBookingsCount: number;
  createdAt: string;
}

export interface LineSettings {
  enabled: boolean;
  token: string; // LINE Notify Token
  channelAccessToken?: string; // LINE Messaging API Channel Access Token
  targetId?: string; // Target User ID or Group ID for Messaging API
  webhookUrl?: string; // Webhook forwarding (Discord/Slack/Make/Zapier)
}

export interface NotificationLog {
  id: string;
  bookingId: string;
  channel: "line" | "email" | "both";
  recipient: string;
  status: "sent" | "simulated" | "failed";
  message: string;
  createdAt: string;
}

export interface AdminRoleConfig {
  id: string;
  name: string;
  description?: string;
  badgeColor?: "amber" | "cyan" | "zinc" | "emerald" | "purple" | "rose" | "blue";
  isSystem?: boolean;
}

export interface AdminMenuItemConfig {
  id: string; // Tab identifier, e.g. "dashboard", "rooms", "bookings", or custom tab/link
  label: string; // Thai display label
  iconName: string; // Lucide icon name string
  order: number; // Order index for sorting (1, 2, 3...)
  allowedRoles: string[]; // List of role names allowed to view/access, or ["*"] for all
  visible: boolean; // Toggle visible or hidden
  badgeType?: "pendingBookings" | "membersCount" | "adminsCount" | "partnersCount" | "custom" | "text" | "none";
  badgeText?: string;
  isSystem?: boolean;
  customUrl?: string; // If this opens an external link
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

export type InvoiceDocType = "tax_invoice" | "quotation" | "invoice" | "receipt";
export type InvoiceStatus = "draft" | "pending" | "paid" | "cancelled";
export type VatCalculationType = "include" | "exclude" | "exempt";

export interface InvoiceRecord {
  id: string;
  docNumber: string;
  docType: InvoiceDocType;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  status: InvoiceStatus;
  bookingId?: string; // Optional reference to Booking Record
  
  // Issuer details (โรงแรม / ผู้ออกเอกสาร)
  companyName: string;
  companyTaxId: string;
  companyBranch: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail?: string;

  // Customer details (ลูกค้า / ผู้รับบริการ)
  customerName: string;
  customerTaxId?: string;
  customerBranch?: string;
  customerAddress: string;
  customerPhone?: string;
  customerEmail?: string;

  // Items
  items: InvoiceItem[];

  // Calculation
  subtotal: number;
  discountTotal: number;
  afterDiscount: number;
  vatType: VatCalculationType;
  vatRate: number; // 7
  vatAmount: number;
  withholdingTaxRate?: number; // 0, 1, 2, 3
  withholdingTaxAmount?: number;
  grandTotal: number;
  bahtText: string;

  // Payment & Bank Info
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  promptPayId?: string;
  paymentMethod?: string;
  paymentDate?: string;
  paymentRef?: string;

  // Additional
  remarks?: string;
  authorizedSigner?: string;
  collectorName?: string;
  createdAt: string;
  updatedAt?: string;
}

