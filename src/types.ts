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

