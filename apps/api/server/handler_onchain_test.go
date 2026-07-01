package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeReader 는 OnchainReader 테스트 더블(실 GraphQL/testnet 미의존).
type fakeReader struct {
	objects map[string]map[string]any   // objectID → fields (없으면 nil 반환)
	owned   map[string][]OwnedObject    // "owner|type" → objs
	events  map[string][]map[string]any // eventType → contents.json 목록
	balance map[string]string
}

func (f *fakeReader) Object(_ context.Context, id string) (map[string]any, error) {
	return f.objects[id], nil
}
func (f *fakeReader) OwnedObjects(_ context.Context, owner, structType string) ([]OwnedObject, error) {
	return f.owned[owner+"|"+structType], nil
}
func (f *fakeReader) Events(_ context.Context, eventType string) ([]map[string]any, error) {
	return f.events[eventType], nil
}
func (f *fakeReader) Balance(_ context.Context, owner string) (string, error) {
	if b, ok := f.balance[owner]; ok {
		return b, nil
	}
	return "0", nil
}

const testPkg = "0xpkg"

func newOnchainTestServer(f *fakeReader) *Server {
	return &Server{Onchain: f, OnchainPkg: testPkg}
}

// renderResp 는 ResponseObject 의 Visit* 를 호출해 (status, body) 를 얻는다.
func renderResp(t *testing.T, visit func(w http.ResponseWriter) error) (int, string) {
	t.Helper()
	rec := httptest.NewRecorder()
	require.NoError(t, visit(rec))
	return rec.Code, rec.Body.String()
}

// ── A. 단일 오브젝트 ──

func TestGetOnchainWedding(t *testing.T) {
	f := &fakeReader{objects: map[string]map[string]any{
		"0xw1": {"id": "0xw1", "status": "active", "primary_host": "0xhost", "vault_id": "0xv", "event_id": "0xe"},
	}}
	s := newOnchainTestServer(f)

	resp, err := s.GetOnchainWedding(context.Background(), GetOnchainWeddingRequestObject{WeddingId: "0xw1"})
	require.NoError(t, err)
	code, body := renderResp(t, resp.VisitGetOnchainWeddingResponse)
	assert.Equal(t, 200, code)
	var w OnchainWedding
	require.NoError(t, json.Unmarshal([]byte(body), &w))
	assert.Equal(t, "active", w.Status)
	assert.Equal(t, []string{"0xhost"}, w.Hosts) // primary_host → hosts[]
	require.NotNil(t, w.VaultId)
	assert.Equal(t, "0xv", *w.VaultId)
	assert.Equal(t, "0xe", w.EventId)
}

func TestGetOnchainWedding_NotFound_Null(t *testing.T) {
	s := newOnchainTestServer(&fakeReader{objects: map[string]map[string]any{}})
	resp, err := s.GetOnchainWedding(context.Background(), GetOnchainWeddingRequestObject{WeddingId: "0xdead"})
	require.NoError(t, err)
	code, body := renderResp(t, resp.VisitGetOnchainWeddingResponse)
	assert.Equal(t, 200, code)
	assert.Equal(t, "null", body) // 미존재 → 200 null (FE if(!x) 계약)
}

func TestGetOnchainMoi_Equipped(t *testing.T) {
	f := &fakeReader{objects: map[string]map[string]any{
		"0xm1": {"id": "0xm1", "owner": "0xo", "equipped": map[string]any{"contents": []any{
			map[string]any{"key": "head", "value": "0xitem1"},
		}}},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainMoi(context.Background(), GetOnchainMoiRequestObject{MoiId: "0xm1"})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainMoiResponse)
	var m OnchainMoi
	require.NoError(t, json.Unmarshal([]byte(body), &m))
	assert.Equal(t, "0xitem1", m.Equipped["head"])
}

// ── B. 소유 오브젝트 + 잔액 ──

func TestGetOnchainOwnedMoiIds(t *testing.T) {
	f := &fakeReader{owned: map[string][]OwnedObject{
		"0xo|" + testPkg + "::moi::Moi": {{ID: "0xmoiA"}},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainOwnedMoiIds(context.Background(), GetOnchainOwnedMoiIdsRequestObject{Address: "0xo"})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainOwnedMoiIdsResponse)
	var ids []string
	require.NoError(t, json.Unmarshal([]byte(body), &ids))
	assert.Equal(t, []string{"0xmoiA"}, ids)
}

func TestGetOnchainWeddingCap_Filter(t *testing.T) {
	f := &fakeReader{owned: map[string][]OwnedObject{
		"0xo|" + testPkg + "::wedding::WeddingCap": {
			{ID: "0xcapWrong", Fields: map[string]any{"wedding_id": "0xother"}},
			{ID: "0xcapRight", Fields: map[string]any{"wedding_id": "0xtarget"}},
		},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainWeddingCap(context.Background(), GetOnchainWeddingCapRequestObject{
		Address: "0xo", Params: GetOnchainWeddingCapParams{WeddingId: "0xtarget"},
	})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainWeddingCapResponse)
	var cap OnchainWeddingCap
	require.NoError(t, json.Unmarshal([]byte(body), &cap))
	require.NotNil(t, cap.CapId)
	assert.Equal(t, "0xcapRight", *cap.CapId) // wedding_id 매칭분
}

func TestGetOnchainParticipation_FoundAndNull(t *testing.T) {
	f := &fakeReader{owned: map[string][]OwnedObject{
		"0xo|" + testPkg + "::event::Participation": {
			{ID: "0xpart", Fields: map[string]any{"event_id": "0xE", "event_type": float64(0), "participant": "0xo", "role_id": float64(1)}},
		},
	}}
	s := newOnchainTestServer(f)
	// found
	resp, err := s.GetOnchainParticipation(context.Background(), GetOnchainParticipationRequestObject{Address: "0xo", Params: GetOnchainParticipationParams{EventId: "0xE"}})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainParticipationResponse)
	var p OnchainParticipation
	require.NoError(t, json.Unmarshal([]byte(body), &p))
	assert.Equal(t, "0xpart", p.Id)
	assert.Equal(t, 1, p.RoleId)
	// null (다른 eventId)
	resp2, _ := s.GetOnchainParticipation(context.Background(), GetOnchainParticipationRequestObject{Address: "0xo", Params: GetOnchainParticipationParams{EventId: "0xNONE"}})
	_, body2 := renderResp(t, resp2.VisitGetOnchainParticipationResponse)
	assert.Equal(t, "null", body2)
}

func TestGetOnchainBalance(t *testing.T) {
	f := &fakeReader{balance: map[string]string{"0xo": "12345"}}
	resp, err := newOnchainTestServer(f).GetOnchainBalance(context.Background(), GetOnchainBalanceRequestObject{Address: "0xo"})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainBalanceResponse)
	var b OnchainBalance
	require.NoError(t, json.Unmarshal([]byte(body), &b))
	assert.Equal(t, "12345", b.Mist)
}

// ── 무효화 핸들러 (P0-10) ──

func TestInvalidateOnchainCache(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	s := &Server{Onchain: c, OnchainPkg: testPkg}
	ctx := context.Background()
	_, _ = c.Events(ctx, "ev")    // 전역 캐시 워밍
	_, _ = c.Balance(ctx, "0xME") // per-user 캐시 워밍

	resp, err := s.InvalidateOnchainCache(ctx, InvalidateOnchainCacheRequestObject{Params: InvalidateOnchainCacheParams{Address: "0xME"}})
	require.NoError(t, err)
	code, _ := renderResp(t, resp.VisitInvalidateOnchainCacheResponse)
	assert.Equal(t, 204, code)

	_, _ = c.Events(ctx, "ev")    // 전역 이벤트 무효화됨 → 재로드
	_, _ = c.Balance(ctx, "0xME") // per-user 무효화됨 → 재로드
	assert.Equal(t, 2, inner.eventsCalls)
	assert.Equal(t, 2, inner.balanceCalls)
}

// ── C. 이벤트 ──

func TestGetOnchainSignals(t *testing.T) {
	f := &fakeReader{events: map[string][]map[string]any{
		testPkg + "::signal::SignalEmitted": {
			{"event_id": "0xe1", "kind": float64(2), "resource_id": float64(0), "source": float64(5), "from": "0xa", "to": "0xb", "magnitude": "1", "created_at_ms": "1782088058817"},
		},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainSignals(context.Background(), GetOnchainSignalsRequestObject{})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainSignalsResponse)
	var sigs []OnchainSignal
	require.NoError(t, json.Unmarshal([]byte(body), &sigs))
	require.Len(t, sigs, 1)
	assert.Equal(t, 2, sigs[0].Kind)
	assert.Equal(t, int64(1), sigs[0].Magnitude)           // string u64 → int64
	assert.Equal(t, int64(1782088058817), sigs[0].Ts)      // created_at_ms
	assert.Equal(t, "0xa", sigs[0].From)
}

func TestGetOnchainRsvp_WeddingFilter(t *testing.T) {
	f := &fakeReader{events: map[string][]map[string]any{
		testPkg + "::rsvp::RsvpSubmitted": {
			{"wedding_id": "0xW1", "submitter": "0xs", "recipient_slot": float64(0), "attendance": float64(0), "companion_count": float64(2), "meal": float64(0), "submitted_at": "1000"},
			{"wedding_id": "0xOTHER", "submitter": "0xx"},
		},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainRsvp(context.Background(), GetOnchainRsvpRequestObject{Params: GetOnchainRsvpParams{WeddingId: "0xW1"}})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainRsvpResponse)
	var rs []OnchainRsvpEvent
	require.NoError(t, json.Unmarshal([]byte(body), &rs))
	require.Len(t, rs, 1) // 0xW1 만
	assert.Equal(t, 2, rs[0].CompanionCount)
}

func TestGetOnchainNotesSent_AddressFilter(t *testing.T) {
	f := &fakeReader{events: map[string][]map[string]any{
		testPkg + "::note::NoteSent": {
			{"note_box_id": "0xn1", "from": "0xme", "to": "0xother", "blob_id": "b1", "created_at_ms": "5"},
			{"note_box_id": "0xn2", "from": "0xstranger", "to": "0xnobody", "blob_id": "b2"},
			{"note_box_id": "0xn3", "from": "0xsomeone", "to": "0xme", "blob_id": "b3"},
		},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainNotesSent(context.Background(), GetOnchainNotesSentRequestObject{Params: GetOnchainNotesSentParams{Address: "0xme"}})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainNotesSentResponse)
	var ns []OnchainNoteSent
	require.NoError(t, json.Unmarshal([]byte(body), &ns))
	assert.Len(t, ns, 2) // from==me 또는 to==me
}

// ── D. 복합 ──

func TestGetOnchainDiscover_BFSAndShared(t *testing.T) {
	pkgEvt := func(mod, name string) string { return testPkg + "::" + mod + "::" + name }
	f := &fakeReader{events: map[string][]map[string]any{
		pkgEvt("moi", "MoiCreated"): {
			{"moi_id": "0xmoiB", "owner": "0xB"},
			{"moi_id": "0xmoiC", "owner": "0xC"},
		},
		pkgEvt("event", "EventCreated"): {
			{"event_id": "0xW", "event_type": float64(0), "creator": "0xhost"}, // WEDDING
		},
		pkgEvt("event", "Participated"): {
			{"event_id": "0xW", "participant": "0xME", "role_id": float64(0)},
			{"event_id": "0xW", "participant": "0xB", "role_id": float64(1)}, // 나와 같은 결혼식 → shared
		},
		pkgEvt("signal", "SignalEmitted"): {
			{"from": "0xME", "to": "0xB"}, // 직접 간선 → degree 1
		},
	}}
	resp, err := newOnchainTestServer(f).GetOnchainDiscover(context.Background(), GetOnchainDiscoverRequestObject{Params: GetOnchainDiscoverParams{Address: "0xME"}})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainDiscoverResponse)
	var users []OnchainDiscoveredUser
	require.NoError(t, json.Unmarshal([]byte(body), &users))
	require.Len(t, users, 2) // B, C (정렬됨)
	byAddr := map[string]OnchainDiscoveredUser{}
	for _, u := range users {
		byAddr[u.Address] = u
	}
	// 0xb: 공유 결혼식 0xW + 직접 signal 간선 → degree 1
	b := byAddr["0xb"]
	assert.Equal(t, "0xmoiB", b.MoiId)
	assert.Equal(t, 1, b.Degree)
	assert.Equal(t, []string{"0xW"}, b.SharedEventIds)
	assert.Equal(t, 1, b.MutualCount)
	// 0xc: 간선 없음 → degree 6 폴백, 공유 없음
	c := byAddr["0xc"]
	assert.Equal(t, 6, c.Degree)
	assert.Empty(t, c.SharedEventIds)
}

func TestGetOnchainInvitationForWedding_HostGate(t *testing.T) {
	f := &fakeReader{
		objects: map[string]map[string]any{
			"0xW":   {"id": "0xW", "primary_host": "0xhost", "status": "active", "event_id": "0xe"},
			"0xinv": {"id": "0xinv", "wedding_id": "0xW", "creator": "0xhost", "slug": "abc"},
		},
		events: map[string][]map[string]any{
			testPkg + "::invitation::InvitationCreated": {
				{"wedding_id": "0xW", "creator": "0xIMPOSTOR", "invitation_id": "0xfake"}, // 제3자 위조 → 거름
				{"wedding_id": "0xW", "creator": "0xhost", "invitation_id": "0xinv"},      // 주최자 정당분
			},
		},
	}
	resp, err := newOnchainTestServer(f).GetOnchainInvitationForWedding(context.Background(), GetOnchainInvitationForWeddingRequestObject{WeddingId: "0xW"})
	require.NoError(t, err)
	_, body := renderResp(t, resp.VisitGetOnchainInvitationForWeddingResponse)
	var inv OnchainInvitation
	require.NoError(t, json.Unmarshal([]byte(body), &inv))
	assert.Equal(t, "0xinv", inv.Id) // 주최자 발행분만 채택(위조 거름)
	assert.Equal(t, "abc", inv.Slug)
}
