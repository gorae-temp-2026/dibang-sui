// ---------- Lounge ----------

export interface Lounge {
  id: string;
  name: string;
  wedding_id: string;
  gather_place: {
    id: string;
    type: string;
  };
}

// ---------- Wedding ----------

export interface Wedding {
  id: string;
  info: WeddingInfo;
  hosts: HostSlots;
  lounge: {
    id: string;
    name: string;
    gather_place_id?: string;
  };
  status: string;
  created_at: string;
  invitation: {
    id: string;
    slug?: string;
  };
}

export interface WeddingInfo {
  groom_name: string;
  bride_name: string;
  groom_father_name?: string;
  groom_mother_name?: string;
  bride_father_name?: string;
  bride_mother_name?: string;
  date: string;
  time: string;
  venue: {
    venue_name: string;
    venue_hall?: string;
    venue_address: string;
  };
}

export interface HostSlots {
  host_groom_id?: string;
  host_bride_id?: string;
  host_groom_father_id?: string;
  host_groom_mother_id?: string;
  host_bride_father_id?: string;
  host_bride_mother_id?: string;
}

// ---------- Lounge Entry ----------

export interface LoungeCheckInItem {
  id: string;
  user_id: string;
  lounge_id: string;
  visitor_name?: string;
  created_at: string;
}

export interface LoungeCheckInListResponse {
  data: LoungeCheckInItem[];
  has_more: boolean;
  next_cursor?: string;
}

// ---------- Feed Item ----------

export type FeedItemType = 'guestbook_entry' | 'lounge_check_in' | 'host_announcement' | 'guestbook_message';

export interface FeedItem {
  type: FeedItemType;
  id: string;
  created_at: string;
  data: Record<string, unknown>;
  heart_count?: number;
  comment_count?: number;
  my_heart?: boolean;
  is_pinned?: boolean;
}

export interface FeedListResponse {
  data: FeedItem[];
  next_cursor?: string;
  has_more: boolean;
}

// ---------- Feed Comment ----------

export interface FeedComment {
  id: string;
  user_id: string;
  user_name: string;
  target_type: string;
  target_id: string;
  message: string;
  created_at: string;
}

export interface FeedCommentListResponse {
  data: FeedComment[];
  has_more: boolean;
}

// ---------- Feed Heart ----------

export interface FeedHeartResponse {
  hearted: boolean;
  heart_count: number;
}
