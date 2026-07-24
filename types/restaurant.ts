export type UserRole = "admin" | "customer" | "waiter";

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "finished" | "cancelled";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
}

export interface MenuCategory {
  id: string;
  databaseId?: string;
  name: string;
  parentId?: string;
  description?: string;
  image?: string;
  menuSide?: "food" | "drinks";
  isActive?: boolean;
}

export interface MenuItem {
  id: string;
  databaseId?: string;
  category: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isActive?: boolean;
}

export interface OrderItem {
  menu_item_id?: string;
  item_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  image?: string;
}

export interface RestaurantOrder {
  id: string;
  table_number?: string | null;
  status: OrderStatus;
  total_amount: number;
  order_items: OrderItem[];
  created_at?: string;
  finished_at?: string | null;
}

export interface FinanceEntry {
  id: string;
  amount: number;
  description: string;
  category?: string;
  entry_date: string;
  source?: string;
}

export interface UploadResult {
  message: string;
  url: string;
  provider: "s3" | "supabase" | "local";
  bucket?: string;
  path?: string;
}
