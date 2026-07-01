package api

import (
	"strconv"
	"strings"
)

// ocNorm 은 주소 비교 정규화(GraphQL은 canonical 0x+64hex를 주지만 SDK normalizeSuiAddress 동작 보존).
func ocNorm(a string) string { return strings.ToLower(a) }

// 온체인 GraphQL contents.json(map[string]any) → 응답 모델 매핑.
// 필드 키는 SDK queries.ts parsedJson 과 동일 snake_case.
// u64(amount·magnitude·created_at_ms·balance)는 GraphQL json에서 string으로 옴. 작은 u64(kind·role_id 등)는 number(float64).

func ocStr(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func ocStrOr(v any, def string) string {
	if s := ocStr(v); s != "" {
		return s
	}
	return def
}

func ocInt(v any) int {
	switch x := v.(type) {
	case float64:
		return int(x)
	case string:
		n, _ := strconv.Atoi(x)
		return n
	case int:
		return x
	}
	return 0
}

func ocInt64(v any) int64 {
	switch x := v.(type) {
	case float64:
		return int64(x)
	case string:
		n, _ := strconv.ParseInt(x, 10, 64)
		return n
	}
	return 0
}

// ocOptStr 은 Move Option<T>/nullable 필드를 *string 으로. 빈문자열·nil·{vec:[]}은 nil.
func ocOptStr(v any) *string {
	switch x := v.(type) {
	case string:
		if x == "" {
			return nil
		}
		s := x
		return &s
	case map[string]any:
		if vec, ok := x["vec"].([]any); ok && len(vec) > 0 {
			if s := ocStr(vec[0]); s != "" {
				return &s
			}
		}
	}
	return nil
}

// ocEquipped 은 VecMap<String,ID> json({contents:[{key,value}]}) → map[slot]itemId.
func ocEquipped(v any) map[string]string {
	out := map[string]string{}
	m, ok := v.(map[string]any)
	if !ok {
		return out
	}
	contents, ok := m["contents"].([]any)
	if !ok {
		return out
	}
	for _, e := range contents {
		if entry, ok := e.(map[string]any); ok {
			out[ocStr(entry["key"])] = ocStr(entry["value"])
		}
	}
	return out
}

// moveType 은 original package id + 모듈 + 타입명으로 완전수식 타입 문자열을 만든다.
// 이벤트 필터·오브젝트 필터에 사용 (SDK eventType() 대응).
func (s *Server) moveType(module, name string) string {
	return s.OnchainPkg + "::" + module + "::" + name
}

// ── A. 단일 오브젝트 매퍼 ──

func mapWedding(f map[string]any) OnchainWedding {
	return OnchainWedding{
		Id:      ocStr(f["id"]),
		Status:  ocStr(f["status"]),
		Hosts:   []string{ocStr(f["primary_host"])},
		VaultId: ocOptStr(f["vault_id"]),
		EventId: ocStr(f["event_id"]),
	}
}

func mapLounge(f map[string]any) OnchainWeddingLounge {
	return OnchainWeddingLounge{Id: ocStr(f["id"]), WeddingId: ocStr(f["wedding_id"])}
}

func mapVault(f map[string]any) OnchainCashGiftVault {
	return OnchainCashGiftVault{Id: ocStr(f["id"]), WeddingId: ocStr(f["wedding_id"]), Balance: ocStrOr(f["balance"], "0")}
}

func mapMoi(f map[string]any) OnchainMoi {
	return OnchainMoi{Id: ocStr(f["id"]), Owner: ocStr(f["owner"]), Equipped: ocEquipped(f["equipped"])}
}

func mapMoiItem(f map[string]any) OnchainMoiItem {
	return OnchainMoiItem{Id: ocStr(f["id"]), Name: ocStr(f["name"]), ItemType: ocStr(f["item_type"]), Slot: ocStr(f["slot"])}
}

func mapInvitation(f map[string]any) OnchainInvitation {
	return OnchainInvitation{
		Id: ocStr(f["id"]), WeddingId: ocStr(f["wedding_id"]), Creator: ocStr(f["creator"]), Slug: ocStr(f["slug"]),
		GroomNameBlobId: ocStr(f["groom_name"]), BrideNameBlobId: ocStr(f["bride_name"]),
		Date: ocStr(f["date"]), Time: ocStr(f["time"]), VenueName: ocStr(f["venue_name"]), VenueHall: ocStr(f["venue_hall"]),
		CoverPhotoBlobId: ocStr(f["cover_photo_url"]), GreetingBlobId: ocStr(f["greeting"]),
	}
}

// ── B. 소유 오브젝트 매퍼 ──

func mapParticipation(f map[string]any) OnchainParticipation {
	return OnchainParticipation{
		Id: ocStr(f["id"]), EventId: ocStr(f["event_id"]), EventType: ocInt(f["event_type"]),
		Participant: ocStr(f["participant"]), RoleId: ocInt(f["role_id"]),
	}
}

func mapOwnedIumRequest(objID string, f map[string]any) OnchainOwnedIumRequest {
	return OnchainOwnedIumRequest{RequestId: objID, EventId: ocStr(f["event_id"]), Initiator: ocStr(f["initiator"])}
}

// ── C. 이벤트 매퍼 ──

func mapSignal(f map[string]any) OnchainSignal {
	return OnchainSignal{
		EventId: ocStr(f["event_id"]), Kind: ocInt(f["kind"]), ResourceId: ocInt(f["resource_id"]),
		Source: ocInt(f["source"]), From: ocStr(f["from"]), To: ocStr(f["to"]),
		Magnitude: ocInt64(f["magnitude"]), Ts: ocInt64(f["created_at_ms"]),
	}
}

func mapParticipated(f map[string]any) OnchainParticipated {
	return OnchainParticipated{EventId: ocStr(f["event_id"]), Participant: ocStr(f["participant"]), RoleId: ocInt(f["role_id"])}
}

func mapEventCreated(f map[string]any) OnchainEventCreated {
	return OnchainEventCreated{EventId: ocStr(f["event_id"]), EventType: ocInt(f["event_type"]), Creator: ocStr(f["creator"])}
}

func mapActionLogged(f map[string]any) OnchainActionLogged {
	return OnchainActionLogged{
		EventId: ocStr(f["event_id"]), ActionType: ocInt(f["action_type"]), Actor: ocStr(f["actor"]),
		Target: ocOptStr(f["target"]), RoleId: ocInt(f["role_id"]), Amount: ocInt64(f["amount"]), Ts: ocInt64(f["created_at_ms"]),
	}
}

func mapMoiCreated(f map[string]any) OnchainMoiCreated {
	return OnchainMoiCreated{MoiId: ocStr(f["moi_id"]), Owner: ocStr(f["owner"])}
}

func mapGiftSent(f map[string]any) OnchainGiftSent {
	return OnchainGiftSent{ItemId: ocStr(f["item_id"]), ItemName: ocStr(f["item_name"]), From: ocStr(f["from"]), To: ocStr(f["to"])}
}

func mapIumRequested(f map[string]any) OnchainIumRequested {
	return OnchainIumRequested{EventId: ocStr(f["event_id"]), Initiator: ocStr(f["initiator"]), ToUser: ocStr(f["to_user"])}
}

func mapIumAccepted(f map[string]any) OnchainIumAccepted {
	return OnchainIumAccepted{EventId: ocStr(f["event_id"]), Initiator: ocStr(f["initiator"]), Receiver: ocStr(f["receiver"])}
}

func mapRsvp(f map[string]any) OnchainRsvpEvent {
	return OnchainRsvpEvent{
		WeddingId: ocStr(f["wedding_id"]), Submitter: ocStr(f["submitter"]), RecipientSlot: ocInt(f["recipient_slot"]),
		Attendance: ocInt(f["attendance"]), CompanionCount: ocInt(f["companion_count"]), Meal: ocInt(f["meal"]),
		SubmittedAt: ocInt64(f["submitted_at"]),
	}
}

func mapNoteSent(f map[string]any) OnchainNoteSent {
	return OnchainNoteSent{
		NoteBoxId: ocStr(f["note_box_id"]), From: ocStr(f["from"]), To: ocStr(f["to"]),
		BlobId: ocStr(f["blob_id"]), Ts: ocInt64(f["created_at_ms"]),
	}
}

func mapNoteBoxCreated(f map[string]any) OnchainNoteBoxCreated {
	return OnchainNoteBoxCreated{NoteBoxId: ocStr(f["note_box_id"]), ParticipantA: ocStr(f["participant_a"]), ParticipantB: ocStr(f["participant_b"])}
}

func mapWeddingCreated(f map[string]any) OnchainWeddingCreated {
	return OnchainWeddingCreated{EventId: ocStr(f["event_id"]), WeddingId: ocStr(f["wedding_id"]), LoungeId: ocStr(f["lounge_id"])}
}
