export type VillaStatus = 'active' | 'maintenance' | 'inactive';
export type BookingStatus = 'pending' | 'deposited' | 'checked_in' | 'checked_out' | 'cancelled' | 'completed';

export interface VillaDetailItem {
  label: string;
  value: string;
}

export interface MonthlyPrice {
  month: number;
  year: number;
  weekday_price: number;
  weekend_price: number;
  friday_price?: number;
  sunday_price?: number;
}

export interface AdditionalService {
  name: string;
  price: number;
}

export interface Villa {
  id: string;
  name: string;
  address: string;
  description: string;
  price: number;
  images: string[];
  amenities: string[];
  status: VillaStatus;
  bedrooms: number;
  bathrooms: number;
  capacity: {
    adults: number;
    children: number;
  };
  villa_details?: VillaDetailItem[];
  map_link?: string;
  map_embed_url?: string;
  monthly_prices?: MonthlyPrice[];
  created_at?: string;
}

export interface Booking {
  id: string;
  villa_id: string;
  customer_name: string;
  customer_phone: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  deposit_amount: number;
  status: BookingStatus;
  notes: string;
  additional_services?: AdditionalService[];
  created_at?: string;
}

export type UserRole = 'owner' | 'admin' | 'staff' | 'pending' | 'pending_owner';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  tenant_id?: string;
  created_at: string;
}
