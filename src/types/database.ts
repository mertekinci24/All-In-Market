export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string
          user_id: string
          name: string
          marketplace: string
          api_key_enc: string | null
          iv: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          marketplace: string
          api_key_enc?: string | null
          iv?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          marketplace?: string
          api_key_enc?: string | null
          iv?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          store_id: string
          external_id: string | null
          name: string
          buy_price: number
          sales_price: number | null
          competitor_price: number | null
          commission_rate: number
          vat_rate: number
          desi: number
          shipping_cost: number
          extra_cost: number
          ad_cost: number
          stock_status: string
          image_url: string | null
          category: string | null
          marketplace_url: string | null
          last_scraped: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          external_id?: string | null
          name: string
          buy_price?: number
          sales_price?: number | null
          competitor_price?: number | null
          commission_rate?: number
          vat_rate?: number
          desi?: number
          shipping_cost?: number
          extra_cost?: number
          ad_cost?: number
          stock_status?: string
          image_url?: string | null
          category?: string | null
          marketplace_url?: string | null
          last_scraped?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          external_id?: string | null
          name?: string
          buy_price?: number
          sales_price?: number | null
          competitor_price?: number | null
          commission_rate?: number
          vat_rate?: number
          desi?: number
          shipping_cost?: number
          extra_cost?: number
          ad_cost?: number
          stock_status?: string
          image_url?: string | null
          category?: string | null
          marketplace_url?: string | null
          last_scraped?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      price_snapshots: {
        Row: {
          id: string
          product_id: string
          sales_price: number
          competitor_price: number | null
          buy_price: number
          net_profit: number | null
          snapshot_date: string
        }
        Insert: {
          id?: string
          product_id: string
          sales_price: number
          competitor_price?: number | null
          buy_price: number
          net_profit?: number | null
          snapshot_date?: string
        }
        Update: {
          id?: string
          product_id?: string
          sales_price?: number
          competitor_price?: number | null
          buy_price?: number
          net_profit?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_settings: {
        Row: {
          id: string
          store_id: string
          telegram_enabled: boolean
          telegram_chat_id: string | null
          telegram_bot_token: string | null
          browser_enabled: boolean
          notify_price_drop: boolean
          notify_margin_warning: boolean
          notify_stock_change: boolean
          notify_competitor_change: boolean
          margin_threshold: number
          price_change_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          telegram_enabled?: boolean
          telegram_chat_id?: string | null
          telegram_bot_token?: string | null
          browser_enabled?: boolean
          notify_price_drop?: boolean
          notify_margin_warning?: boolean
          notify_stock_change?: boolean
          notify_competitor_change?: boolean
          margin_threshold?: number
          price_change_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          telegram_enabled?: boolean
          telegram_chat_id?: string | null
          telegram_bot_token?: string | null
          browser_enabled?: boolean
          notify_price_drop?: boolean
          notify_margin_warning?: boolean
          notify_stock_change?: boolean
          notify_competitor_change?: boolean
          margin_threshold?: number
          price_change_threshold?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
