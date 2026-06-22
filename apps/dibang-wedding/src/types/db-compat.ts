// DB 호환 타입 — @gorae/contracts에서 가져오던 타입을 로컬에 정의.
// DB 완전 제거 후에도 기존 컴포넌트가 깨지지 않도록 하는 호환 레이어.
// 온체인 전환이 완료되면 이 파일의 타입들은 온체인 타입으로 교체한다.

export type WeddingStatus = 'active' | 'completed' | 'cancelled'

export type User = {
  id: string
  name: string
  email?: string
  profile_image_url?: string
  created_at: string
  consents_required: string[]
  marketing_agreed?: boolean
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
  invitations?: { id: string; slug: string }[]
  lounge_id?: string
  cover_image?: string
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

export type WeddingInfo = {
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
}

export type Wedding = {
  id: string
  status: WeddingStatus
  info: WeddingInfo
  hosts: HostSlots
  lounge?: { id: string; name: string }
  invitations: { id: string; slug: string }[]
  created_at: string
}

export type Lounge = {
  id: string
  wedding_id: string
  name: string
  gather_place?: { id: string; name: string }
}

export type FeedItemType = 'guestbook_entry' | 'guestbook_message' | 'lounge_check_in' | 'host_announcement' | 'memory' | 'lounge_event'

export type FeedItem = {
  type: FeedItemType | string
  id: string
  created_at: string
  data: Record<string, unknown>
  heart_count?: number
  comment_count?: number
  my_heart?: boolean
}

export type FeedComment = {
  id: string
  author_name: string
  content: string
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

export type CashGift = {
  id: string
  wedding_id: string
  guest_name: string
  amount: number
  recipient_slot: string
  relation_category: string
  relation_detail?: string
  memo?: string
  method?: string
  created_at: string
}

export type Rsvp = {
  id: string
  wedding_id: string
  guest_name: string
  recipient_slot: string
  attendance: string
  companion_count: number
  meal: string
  created_at: string
}

export type HostInvite = {
  id: string
  wedding_id: string
  slot: string
  status: string
  invitee_email?: string
}

export type CreateHostInviteRequest = {
  slot: string
  invitee_email: string
}

export type HostCreateCashGiftRequest = {
  guest_name: string
  amount: number
  recipient_slot: string
  relation_category: string
  relation_detail?: string
  memo?: string
  method?: string
}

export type UpdateCashGiftRequest = Partial<HostCreateCashGiftRequest>

export type CreateWeddingRequest = {
  info: WeddingInfo
  hosts: HostSlots
}

export type UpdateWeddingRequest = Partial<CreateWeddingRequest>

export type DesignConfig = Record<string, unknown>

export type CoverTextConfig = Record<string, unknown>

export type UpdateInvitationRequest = {
  design_config?: DesignConfig
  [key: string]: unknown
}

export type CreateLoungeCheckInRequest = {
  lounge_id: string
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
  url: string
  uploader_name?: string
}

export type SharedPhotoGroup = {
  date: string
  photos: SharedPhoto[]
}

export type MemoryBookData = {
  pages: { photos: { url: string }[] }[]
}

export type LoungePreview = {
  id: string
  wedding_id: string
  name: string
}
