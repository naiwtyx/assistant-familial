/**
 * Types de la base de données Supabase.
 *
 * Rédigés à la main pour correspondre EXACTEMENT à la migration
 * `supabase/migrations/0001_init.sql`. Régénérables plus tard via :
 *   npx supabase gen types typescript --project-id <ref> --schema public
 *
 * Convention Supabase : Row (lecture), Insert (écriture), Update (modification).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      families: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string;
          role: "owner" | "parent" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id: string;
          role?: "owner" | "parent" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string;
          role?: "owner" | "parent" | "member";
          joined_at?: string;
        };
        Relationships: [];
      };
      family_invites: {
        Row: {
          id: string;
          family_id: string;
          code: string;
          created_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          code: string;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          code?: string;
          created_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      shopping_items: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          quantity: number;
          unit: string | null;
          category: string | null;
          is_checked: boolean;
          checked_by: string | null;
          checked_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          quantity?: number;
          unit?: string | null;
          category?: string | null;
          is_checked?: boolean;
          checked_by?: string | null;
          checked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          quantity?: number;
          unit?: string | null;
          category?: string | null;
          is_checked?: boolean;
          checked_by?: string | null;
          checked_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_items: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          category: string | null;
          quantity: number;
          unit: string | null;
          location: string | null;
          expiry_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          category?: string | null;
          quantity?: number;
          unit?: string | null;
          location?: string | null;
          expiry_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          category?: string | null;
          quantity?: number;
          unit?: string | null;
          location?: string | null;
          expiry_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          photo_url: string | null;
          servings: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          photo_url?: string | null;
          servings?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          photo_url?: string | null;
          servings?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          quantity: number;
          unit: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          quantity: number;
          unit?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          name?: string;
          quantity?: number;
          unit?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          family_id: string;
          user_id: string | null;
          type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id?: string | null;
          type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string | null;
          type?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          family_id: string;
          store: string | null;
          purchased_at: string;
          total: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          store?: string | null;
          purchased_at?: string;
          total?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          store?: string | null;
          purchased_at?: string;
          total?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      receipt_items: {
        Row: {
          id: string;
          receipt_id: string;
          family_id: string;
          purchased_at: string;
          name: string;
          quantity: number;
          category: string | null;
          price: number;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          family_id: string;
          purchased_at: string;
          name: string;
          quantity?: number;
          category?: string | null;
          price?: number;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          family_id?: string;
          purchased_at?: string;
          name?: string;
          quantity?: number;
          category?: string | null;
          price?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_family: {
        Args: { p_name: string };
        Returns: Database["public"]["Tables"]["families"]["Row"];
      };
      join_family_with_code: {
        Args: { p_code: string };
        Returns: Database["public"]["Tables"]["families"]["Row"];
      };
      is_family_member: {
        Args: { p_family_id: string };
        Returns: boolean;
      };
      is_family_owner: {
        Args: { p_family_id: string };
        Returns: boolean;
      };
      is_family_authorized: {
        Args: { p_family_id: string };
        Returns: boolean;
      };
      set_member_role: {
        Args: { p_family_id: string; p_user_id: string; p_role: string };
        Returns: Database["public"]["Tables"]["family_members"]["Row"];
      };
      save_receipt: {
        Args: {
          p_family_id: string;
          p_store: string | null;
          p_purchased_at: string | null;
          p_total: number | null;
          p_items: Json;
        };
        Returns: string;
      };
      shares_family_with: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
