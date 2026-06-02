export interface Property {
  id: number
  name: string
  address: string
  city: string
  platforms: string
  max_guests: number
  wifi_name: string | null
  wifi_password: string | null
  checkin_time: string
  checkout_time: string
  lock_code_prefix: string | null
  cleaner_email: string | null
  cleaner_name: string | null
  owner_name: string | null
  owner_email: string | null
  commission_rate: number
  guide_url: string | null
  notes: string | null
  active: number
  created_at: string
}

export interface Reservation {
  id: number
  property_id: number
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  checkin_date: string
  checkout_date: string
  nights: number
  price_per_night: number
  total_revenue: number
  platform: string
  status: string
  notes: string | null
  lock_code: string | null
  messages_sent: string
  created_at: string
}

export interface MessageTemplate {
  id: number
  property_id: number | null
  name: string
  trigger: string
  delay_hours: number
  subject: string | null
  body: string
  active: number
}

export interface Notification {
  id: number
  property_id: number | null
  reservation_id: number | null
  type: string
  recipient: string
  subject: string | null
  body: string
  sent: number
  sent_at: string | null
  created_at: string
}
