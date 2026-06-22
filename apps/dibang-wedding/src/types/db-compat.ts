// DB 호환 타입 — @gorae/contracts에서 가져오던 타입을 로컬에 정의.
// DB 완전 제거 후에도 기존 컴포넌트가 깨지지 않도록 하는 호환 레이어.
// 온체인 전환이 완료되면 이 파일의 타입들은 온체인 타입으로 교체한다.

export type WeddingStatus = 'active' | 'completed' | 'cancelled'

export type User = {
  id: string
  name: string
  email?: string
  phone?: string
  profile_image_url?: string
  created_at: string
  consents_required: Array<'age_verification' | 'service' | 'privacy' | 'marketing'>
  marketing_agreed?: boolean
}

export type InvitationSummary = {
  id: string
  slug: string
  cover_image?: string
}

export type WeddingSummary = {
  id: string
  status: WeddingStatus
  groom_name: string
  bride_name: string
  groom_father_name?: string
  groom_mother_name?: string
  bride_father_name?: string
  bride_mother_name?: string
  date: string
  time?: string
  venue_name?: string
  venue_hall?: string
  invitations: InvitationSummary[]
  lounge_id?: string
  my_role?: string
}

export type ParticipatedWedding = {
  id: string
  groom_name: string
  bride_name: string
  date: string
  time?: string
  venue_name?: string
  venue_hall?: string
  cover_image?: string
  lounge_id: string
}

export type HostSlots = {
  host_groom_id?: string
  host_bride_id?: string
  host_groom_father_id?: string
  host_groom_mother_id?: string
  host_bride_father_id?: string
  host_bride_mother_id?: string
}

export type Venue = {
  venue_name: string
  venue_address: string
  venue_hall?: string
}

export type Account = {
  bank?: string
  address?: string
}

export type WeddingInfo = {
  groom_name: string
  bride_name: string
  groom_father_name?: string
  groom_mother_name?: string
  bride_father_name?: string
  bride_mother_name?: string
  groom_father_deceased?: boolean
  groom_mother_deceased?: boolean
  bride_father_deceased?: boolean
  bride_mother_deceased?: boolean
  date: string
  time: string
  venue: Venue
  groom_account?: Account
  bride_account?: Account
  groom_father_account?: Account
  groom_mother_account?: Account
  bride_father_account?: Account
  bride_mother_account?: Account
}

export type Wedding = {
  id: string
  status: WeddingStatus
  info: WeddingInfo
  hosts: HostSlots
  lounge?: { id: string; name: string }
  invitations: InvitationSummary[]
  created_at: string
}

export type GatherPlaceSummary = {
  id: string
  type: string
}

export type Lounge = {
  id: string
  wedding_id: string
  name: string
  gather_place?: { id: string; type?: string; name?: string }
}

export type FeedItemType = 'guestbook_entry' | 'guestbook_message' | 'lounge_check_in' | 'host_announcement' | 'memory' | 'lounge_event'

export type FeedItem = {
  type: FeedItemType | string
  id: string
  created_at: string
  data?: Record<string, unknown>
  heart_count?: number
  comment_count?: number
  my_heart?: boolean
}

export type FeedComment = {
  id: string
  user_id: string
  user_name: string
  target_type: 'guestbook_entry' | 'host_announcement'
  target_id: string
  message: string
  created_at: string
}

export type Announcement = {
  id: string
  lounge_id: string
  host_id: string
  message: string
  is_pinned: boolean
  created_at: string
}

export type RecipientSlot = 'groom' | 'bride' | 'groom_father' | 'groom_mother' | 'bride_father' | 'bride_mother'

export type RelationCategory = '가족/친척' | '친구/지인' | '동문/동창' | '직장동료' | '스승/제자' | '기타모임'

export type PayMethod = 'transfer' | 'kakaopay' | 'toss' | 'cash'

export type CashGift = {
  id: string
  wedding_id: string
  guest_name: string
  guest_id?: string
  recipient_slot: RecipientSlot
  relation_category: RelationCategory
  relation_detail?: string
  amount: number
  pay_method: PayMethod
  readonly attended: boolean
  guestbook_entry_id?: string
  created_at: string
}

export type Rsvp = {
  id: string
  wedding_id: string
  recipient_slot: RecipientSlot
  guest_name: string
  attendance: 'attending' | 'absent'
  companion_count: number
  meal: 'yes' | 'no' | 'undecided'
  phone_last4?: string
  created_at: string
}

export type HostInvite = {
  id: string
  wedding_id: string
  slot: RecipientSlot
  token: string
  status: 'pending' | 'accepted' | 'cancelled'
  invited_user_id?: string
  created_at: string
  accepted_at?: string
}

export type CreateHostInviteRequest = {
  slot: RecipientSlot
}

export type HostCreateCashGiftRequest = {
  guest_name: string
  relation_category: RelationCategory
  relation_detail?: string
  amount: number
  pay_method: PayMethod
}

export type UpdateCashGiftRequest = {
  guest_name?: string
  relation_category?: RelationCategory
  relation_detail?: string
  amount?: number
  pay_method?: PayMethod
}

export type CreateWeddingRequest = {
  info: WeddingInfo
  hosts: HostSlots
  slug: string
}

export type UpdateWeddingRequest = {
  info?: WeddingInfo
  hosts?: HostSlots
  version?: number
}

export type CoverTextConfig = {
  text?: string
  font_size?: number
  x?: number
  y?: number
  rotation?: number
  animation?: 'none' | 'fade-in' | 'typing'
  color_type?: 'solid' | 'gradient'
  solid_color?: string
  gradient_colors?: string[]
}

export type DesignConfig = {
  lettering?: {
    source?: 'text' | 'upload' | 'draw'
    image_url?: string | null
    strokes?: Array<{
      d?: string
      color?: string
      width?: number
      tool?: 'pen' | 'brush'
      points?: Array<{ x?: number; y?: number; t?: number }>
    }>
    draw_view_box?: { width?: number; height?: number }
    animation?: 'none' | 'fade-in' | 'draw' | 'typing' | 'stroke-order'
    x?: number
    y?: number
    width?: number
    height?: number
    rotation?: number
  }
  theme?: {
    fonts?: { title?: string; subtitle?: string; body?: string }
    colors?: { background?: string; text?: string; button?: string; accent?: string }
  }
  sections?: Array<{
    key: 'greeting' | 'weddingDate' | 'location' | 'notice' | 'gallery' | 'account' | 'canvas'
    enabled: boolean
    order: number
  }>
  canvas?: {
    title?: string
    subtitle?: string
    items?: Array<{
      id?: string
      type?: string
      x?: number
      y?: number
      width?: number
      height?: number
      rotation?: number
      z_index?: number
      strokes?: Array<{ d?: string; color?: string; width?: number; tool?: string }>
      view_box?: { width?: number; height?: number }
      text?: string
      font_size?: number
      font_family?: string
      color?: string
      image_url?: string
      is_sticker?: boolean
    }>
    background_color?: string
    view_box?: { width?: number; height?: number }
  }
  cover_image_position?: {
    cropArea?: { x?: number; y?: number; width?: number; height?: number }
    zoom?: number
    editorCrop?: { x?: number; y?: number }
  }
}

export type UpdateInvitationRequest = {
  design_config?: DesignConfig
  [key: string]: unknown
}

export type CreateLoungeCheckInRequest = {
  recipient_slot?: RecipientSlot
  relation_category?: RelationCategory
  relation_detail?: string
}

export type LoungeCheckIn = {
  id: string
  lounge_id: string
  user_id: string
  created_at: string
}

export type UpdateUserRequest = {
  name?: string
  profile_image_url?: string
}

export type SharedPhoto = {
  id: string
  lounge_id: string
  guest_user_id: string
  storage_path: string
  file_name?: string
  file_size?: number
  mime_type?: string
  created_at: string
}

export type SharedPhotoGroupSide = 'groom' | 'bride' | 'other'

export type SharedPhotoInGroup = {
  id: string
  storage_path: string
  created_at: string
}

export type SharedPhotoGroup = {
  user_id: string
  guest_name: string
  side?: SharedPhotoGroupSide
  recipient_slot?: string | null
  relation_category?: string | null
  relation_detail?: string | null
  photos: SharedPhotoInGroup[]
  photo_count: number
}

export type MemoryBookCouple = {
  groom_name: string
  bride_name: string
  wedding_date: string
  time?: string | null
  venue_name: string
  venue_address?: string | null
  venue_hall?: string | null
  cover_photo_url?: string | null
}

export type MemoryBookPhoto = {
  id: string
  storage_path: string
  guest_user_id?: string | null
}

export type MemoryBookMessage = {
  id: string
  guest_name?: string | null
  relation_label?: string | null
  side?: 'groom' | 'bride' | 'other'
  message: string
  is_heart: boolean
  created_at: string
}

export type MemoryBookStats = {
  total_guests: number
  total_messages: number
  photos_uploaded: number
}

export type MemoryBookData = {
  couple: MemoryBookCouple
  curated_photos: MemoryBookPhoto[]
  display_photos: string[]
  mec_messages: MemoryBookMessage[]
  stats: MemoryBookStats
}

export type LoungePreview = {
  id: string
  wedding_id: string
  name: string
}
