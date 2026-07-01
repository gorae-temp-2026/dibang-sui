package api

// 온체인(Sui) 읽기 프록시 /onchain/* 핸들러 (StrictServerInterface).
// s.Onchain(OnchainReader = GraphQL 리더, 프로덕션은 캐시 래핑)로 Sui를 읽어 SDK 반환타입과 1:1 매핑.
// 없는 단건은 200 null(SDK 계약). 이벤트는 전량 페이지네이션(리더가 수행).

import (
	"context"
	"net/http"
	"sort"
)

// writeOnchainNull 은 nullable 단건 미존재 시 200 null 을 쓴다(FE if(!x) 계약).
func writeOnchainNull(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, err := w.Write([]byte("null"))
	return err
}

// ════════ A. 단일 오브젝트 ════════

func (s *Server) GetOnchainWedding(ctx context.Context, req GetOnchainWeddingRequestObject) (GetOnchainWeddingResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.WeddingId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainWedding200JSONResponse(mapWedding(f)), nil
}

func (s *Server) GetOnchainWeddingLounge(ctx context.Context, req GetOnchainWeddingLoungeRequestObject) (GetOnchainWeddingLoungeResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.LoungeId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainWeddingLounge200JSONResponse(mapLounge(f)), nil
}

func (s *Server) GetOnchainVault(ctx context.Context, req GetOnchainVaultRequestObject) (GetOnchainVaultResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.VaultId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainVault200JSONResponse(mapVault(f)), nil
}

func (s *Server) GetOnchainMoi(ctx context.Context, req GetOnchainMoiRequestObject) (GetOnchainMoiResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.MoiId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainMoi200JSONResponse(mapMoi(f)), nil
}

func (s *Server) GetOnchainInvitation(ctx context.Context, req GetOnchainInvitationRequestObject) (GetOnchainInvitationResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.InvitationId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainInvitation200JSONResponse(mapInvitation(f)), nil
}

func (s *Server) GetOnchainMoiItem(ctx context.Context, req GetOnchainMoiItemRequestObject) (GetOnchainMoiItemResponseObject, error) {
	f, err := s.Onchain.Object(ctx, req.ItemId)
	if err != nil {
		return nil, err
	}
	if f == nil {
		return onchainNull{}, nil
	}
	return GetOnchainMoiItem200JSONResponse(mapMoiItem(f)), nil
}

// ════════ B. 소유 오브젝트 + 잔액 ════════

func (s *Server) GetOnchainOwnedMoiIds(ctx context.Context, req GetOnchainOwnedMoiIdsRequestObject) (GetOnchainOwnedMoiIdsResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("moi", "Moi"))
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(objs))
	for _, o := range objs {
		ids = append(ids, o.ID)
	}
	return GetOnchainOwnedMoiIds200JSONResponse(ids), nil
}

func (s *Server) GetOnchainOwnedMoiItems(ctx context.Context, req GetOnchainOwnedMoiItemsRequestObject) (GetOnchainOwnedMoiItemsResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("moi", "MoiItem"))
	if err != nil {
		return nil, err
	}
	items := make([]OnchainMoiItem, 0, len(objs))
	for _, o := range objs {
		it := mapMoiItem(o.Fields)
		it.Id = o.ID
		items = append(items, it)
	}
	return GetOnchainOwnedMoiItems200JSONResponse(items), nil
}

func (s *Server) GetOnchainOwnedWeddingCaps(ctx context.Context, req GetOnchainOwnedWeddingCapsRequestObject) (GetOnchainOwnedWeddingCapsResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("wedding", "WeddingCap"))
	if err != nil {
		return nil, err
	}
	ids := make([]string, 0, len(objs))
	for _, o := range objs {
		ids = append(ids, o.ID)
	}
	return GetOnchainOwnedWeddingCaps200JSONResponse(ids), nil
}

func (s *Server) GetOnchainWeddingCap(ctx context.Context, req GetOnchainWeddingCapRequestObject) (GetOnchainWeddingCapResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("wedding", "WeddingCap"))
	if err != nil {
		return nil, err
	}
	var capID *string
	for _, o := range objs {
		if ocStr(o.Fields["wedding_id"]) == req.Params.WeddingId {
			id := o.ID
			capID = &id
			break
		}
	}
	return GetOnchainWeddingCap200JSONResponse(OnchainWeddingCap{CapId: capID}), nil
}

func (s *Server) GetOnchainParticipation(ctx context.Context, req GetOnchainParticipationRequestObject) (GetOnchainParticipationResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("event", "Participation"))
	if err != nil {
		return nil, err
	}
	for _, o := range objs {
		if ocStr(o.Fields["event_id"]) == req.Params.EventId {
			p := mapParticipation(o.Fields)
			p.Id = o.ID
			return GetOnchainParticipation200JSONResponse(p), nil
		}
	}
	return onchainNull{}, nil
}

func (s *Server) GetOnchainAnyParticipation(ctx context.Context, req GetOnchainAnyParticipationRequestObject) (GetOnchainAnyParticipationResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("event", "Participation"))
	if err != nil {
		return nil, err
	}
	if len(objs) == 0 {
		return onchainNull{}, nil
	}
	p := mapParticipation(objs[0].Fields)
	p.Id = objs[0].ID
	return GetOnchainAnyParticipation200JSONResponse(p), nil
}

func (s *Server) GetOnchainOwnedIumRequests(ctx context.Context, req GetOnchainOwnedIumRequestsRequestObject) (GetOnchainOwnedIumRequestsResponseObject, error) {
	objs, err := s.Onchain.OwnedObjects(ctx, req.Address, s.moveType("ium", "IumRequest"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainOwnedIumRequest, 0, len(objs))
	for _, o := range objs {
		out = append(out, mapOwnedIumRequest(o.ID, o.Fields))
	}
	return GetOnchainOwnedIumRequests200JSONResponse(out), nil
}

func (s *Server) GetOnchainBalance(ctx context.Context, req GetOnchainBalanceRequestObject) (GetOnchainBalanceResponseObject, error) {
	bal, err := s.Onchain.Balance(ctx, req.Address)
	if err != nil {
		return nil, err
	}
	return GetOnchainBalance200JSONResponse(OnchainBalance{Mist: bal}), nil
}

// ════════ C. 이벤트 타입 스캔 ════════

func (s *Server) GetOnchainSignals(ctx context.Context, req GetOnchainSignalsRequestObject) (GetOnchainSignalsResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("signal", "SignalEmitted"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainSignal, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapSignal(e))
	}
	return GetOnchainSignals200JSONResponse(out), nil
}

func (s *Server) GetOnchainParticipated(ctx context.Context, req GetOnchainParticipatedRequestObject) (GetOnchainParticipatedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("event", "Participated"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainParticipated, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapParticipated(e))
	}
	return GetOnchainParticipated200JSONResponse(out), nil
}

func (s *Server) GetOnchainEventCreated(ctx context.Context, req GetOnchainEventCreatedRequestObject) (GetOnchainEventCreatedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("event", "EventCreated"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainEventCreated, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapEventCreated(e))
	}
	return GetOnchainEventCreated200JSONResponse(out), nil
}

func (s *Server) GetOnchainActionLogged(ctx context.Context, req GetOnchainActionLoggedRequestObject) (GetOnchainActionLoggedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("ledger", "ActionLogged"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainActionLogged, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapActionLogged(e))
	}
	return GetOnchainActionLogged200JSONResponse(out), nil
}

func (s *Server) GetOnchainMoiCreated(ctx context.Context, req GetOnchainMoiCreatedRequestObject) (GetOnchainMoiCreatedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("moi", "MoiCreated"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainMoiCreated, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapMoiCreated(e))
	}
	return GetOnchainMoiCreated200JSONResponse(out), nil
}

func (s *Server) GetOnchainGiftSent(ctx context.Context, req GetOnchainGiftSentRequestObject) (GetOnchainGiftSentResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("gift", "GiftSent"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainGiftSent, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapGiftSent(e))
	}
	return GetOnchainGiftSent200JSONResponse(out), nil
}

func (s *Server) GetOnchainIumRequested(ctx context.Context, req GetOnchainIumRequestedRequestObject) (GetOnchainIumRequestedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("ium", "IumRequested"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainIumRequested, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapIumRequested(e))
	}
	return GetOnchainIumRequested200JSONResponse(out), nil
}

func (s *Server) GetOnchainIumAccepted(ctx context.Context, req GetOnchainIumAcceptedRequestObject) (GetOnchainIumAcceptedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("ium", "IumAccepted"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainIumAccepted, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapIumAccepted(e))
	}
	return GetOnchainIumAccepted200JSONResponse(out), nil
}

func (s *Server) GetOnchainRsvp(ctx context.Context, req GetOnchainRsvpRequestObject) (GetOnchainRsvpResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("rsvp", "RsvpSubmitted"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainRsvpEvent, 0)
	for _, e := range evs {
		if ocStr(e["wedding_id"]) != req.Params.WeddingId {
			continue
		}
		out = append(out, mapRsvp(e))
	}
	return GetOnchainRsvp200JSONResponse(out), nil
}

func (s *Server) GetOnchainNotesSent(ctx context.Context, req GetOnchainNotesSentRequestObject) (GetOnchainNotesSentResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("note", "NoteSent"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainNoteSent, 0)
	for _, e := range evs {
		from, to := ocStr(e["from"]), ocStr(e["to"])
		if from != req.Params.Address && to != req.Params.Address {
			continue
		}
		out = append(out, mapNoteSent(e))
	}
	return GetOnchainNotesSent200JSONResponse(out), nil
}

func (s *Server) GetOnchainNoteBoxes(ctx context.Context, req GetOnchainNoteBoxesRequestObject) (GetOnchainNoteBoxesResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("note", "NoteBoxCreated"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainNoteBoxCreated, 0)
	for _, e := range evs {
		a, b := ocStr(e["participant_a"]), ocStr(e["participant_b"])
		if a != req.Params.Address && b != req.Params.Address {
			continue
		}
		out = append(out, mapNoteBoxCreated(e))
	}
	return GetOnchainNoteBoxes200JSONResponse(out), nil
}

func (s *Server) GetOnchainWeddingsCreated(ctx context.Context, req GetOnchainWeddingsCreatedRequestObject) (GetOnchainWeddingsCreatedResponseObject, error) {
	evs, err := s.Onchain.Events(ctx, s.moveType("wedding", "WeddingCreated"))
	if err != nil {
		return nil, err
	}
	out := make([]OnchainWeddingCreated, 0, len(evs))
	for _, e := range evs {
		out = append(out, mapWeddingCreated(e))
	}
	return GetOnchainWeddingsCreated200JSONResponse(out), nil
}

// ════════ D. 복합 ════════

func (s *Server) GetOnchainDiscover(ctx context.Context, req GetOnchainDiscoverRequestObject) (GetOnchainDiscoverResponseObject, error) {
	moiEvents, err := s.Onchain.Events(ctx, s.moveType("moi", "MoiCreated"))
	if err != nil {
		return nil, err
	}
	participated, err := s.Onchain.Events(ctx, s.moveType("event", "Participated"))
	if err != nil {
		return nil, err
	}
	eventCreated, err := s.Onchain.Events(ctx, s.moveType("event", "EventCreated"))
	if err != nil {
		return nil, err
	}
	// signal 은 best-effort(실패해도 degree 폴백으로 카드 표시) — SDK discoverUsers 동작 보존.
	signals, sErr := s.Onchain.Events(ctx, s.moveType("signal", "SignalEmitted"))
	if sErr != nil {
		signals = nil
	}
	return GetOnchainDiscover200JSONResponse(buildDiscover(req.Params.Address, moiEvents, participated, eventCreated, signals)), nil
}

func (s *Server) GetOnchainInvitationForWedding(ctx context.Context, req GetOnchainInvitationForWeddingRequestObject) (GetOnchainInvitationForWeddingResponseObject, error) {
	wf, err := s.Onchain.Object(ctx, req.WeddingId)
	if err != nil {
		return nil, err
	}
	if wf == nil {
		return onchainNull{}, nil
	}
	host := ocStr(wf["primary_host"])
	if host == "" {
		return onchainNull{}, nil
	}
	evs, err := s.Onchain.Events(ctx, s.moveType("invitation", "InvitationCreated"))
	if err != nil {
		return nil, err
	}
	latestID := ""
	for _, e := range evs {
		if ocStr(e["wedding_id"]) != req.WeddingId {
			continue
		}
		if ocStr(e["creator"]) != host { // 주최자 발행분만 인정(제3자 위조 거름)
			continue
		}
		latestID = ocStr(e["invitation_id"]) // ascending → 마지막(최신)
	}
	if latestID == "" {
		return onchainNull{}, nil
	}
	inv, err := s.Onchain.Object(ctx, latestID)
	if err != nil {
		return nil, err
	}
	if inv == nil {
		return onchainNull{}, nil
	}
	return GetOnchainInvitationForWedding200JSONResponse(mapInvitation(inv)), nil
}

// buildDegreeMap 은 SignalEmitted(from→to) + Participated(같은 이벤트 참가) 간선으로 BFS 최단거리.
func buildDegreeMap(signals, participated []map[string]any, myAddr string) map[string]int {
	adj := map[string]map[string]struct{}{}
	addEdge := func(a, b string) {
		na, nb := ocNorm(a), ocNorm(b)
		if na == nb || na == "" || nb == "" {
			return
		}
		if adj[na] == nil {
			adj[na] = map[string]struct{}{}
		}
		if adj[nb] == nil {
			adj[nb] = map[string]struct{}{}
		}
		adj[na][nb] = struct{}{}
		adj[nb][na] = struct{}{}
	}
	for _, sig := range signals {
		addEdge(ocStr(sig["from"]), ocStr(sig["to"]))
	}
	byEvent := map[string][]string{}
	for _, p := range participated {
		eid := ocStr(p["event_id"])
		byEvent[eid] = append(byEvent[eid], ocNorm(ocStr(p["participant"])))
	}
	for _, members := range byEvent {
		for i := 0; i < len(members); i++ {
			for j := i + 1; j < len(members); j++ {
				addEdge(members[i], members[j])
			}
		}
	}
	my := ocNorm(myAddr)
	dist := map[string]int{my: 0}
	queue := []string{my}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		d := dist[cur]
		for nb := range adj[cur] {
			if _, ok := dist[nb]; !ok {
				dist[nb] = d + 1
				queue = append(queue, nb)
			}
		}
	}
	return dist
}

// buildDiscover 는 SDK discoverUsers 이식: MoiCreated+Participated 유저풀, 공유 결혼식, degree.
func buildDiscover(myAddr string, moiEvents, participated, eventCreated, signals []map[string]any) []OnchainDiscoveredUser {
	my := ocNorm(myAddr)
	weddingEventIDs := map[string]struct{}{}
	for _, e := range eventCreated {
		if ocInt(e["event_type"]) == 0 { // WEDDING=0 (INYEON=1 제외)
			weddingEventIDs[ocStr(e["event_id"])] = struct{}{}
		}
	}
	degree := buildDegreeMap(signals, participated, myAddr)
	moiByOwner := map[string]string{}
	for _, m := range moiEvents {
		moiByOwner[ocNorm(ocStr(m["owner"]))] = ocStr(m["moi_id"])
	}
	seen := map[string]struct{}{}
	for _, m := range moiEvents {
		if o := ocNorm(ocStr(m["owner"])); o != my {
			seen[o] = struct{}{}
		}
	}
	for _, p := range participated {
		if o := ocNorm(ocStr(p["participant"])); o != my {
			seen[o] = struct{}{}
		}
	}
	myWedding := map[string]struct{}{}
	for _, p := range participated {
		eid := ocStr(p["event_id"])
		if _, w := weddingEventIDs[eid]; w && ocNorm(ocStr(p["participant"])) == my {
			myWedding[eid] = struct{}{}
		}
	}
	owners := make([]string, 0, len(seen))
	for o := range seen {
		owners = append(owners, o)
	}
	sort.Strings(owners) // 결정적 순서
	out := make([]OnchainDiscoveredUser, 0, len(owners))
	for _, owner := range owners {
		shared := []string{}
		for _, p := range participated {
			eid := ocStr(p["event_id"])
			if ocNorm(ocStr(p["participant"])) != owner {
				continue
			}
			if _, w := weddingEventIDs[eid]; !w {
				continue
			}
			if _, mine := myWedding[eid]; mine {
				shared = append(shared, eid)
			}
		}
		d, ok := degree[owner]
		if !ok {
			d = 6
		}
		out = append(out, OnchainDiscoveredUser{
			Address:        owner,
			MoiId:          moiByOwner[owner],
			SharedEventIds: shared,
			MutualCount:    len(shared),
			Degree:         d,
		})
	}
	return out
}

// onchainNull 은 모든 nullable 단건 op 의 ResponseObject 를 만족(200 null).
type onchainNull struct{}

func (onchainNull) VisitGetOnchainWeddingResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainWeddingLoungeResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainVaultResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainMoiResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainInvitationResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainMoiItemResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainParticipationResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainAnyParticipationResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}
func (onchainNull) VisitGetOnchainInvitationForWeddingResponse(w http.ResponseWriter) error {
	return writeOnchainNull(w)
}

// ════════ 캐시 무효화 (TX 성공 후 프론트가 호출) ════════

// onchainPurger 는 캐시 리더의 무효화 능력(cachedReader 가 구현). 리더가 캐시가 아니면 no-op.
type onchainPurger interface {
	PurgeAddress(addr string)
	PurgeEvents()
}

func (s *Server) InvalidateOnchainCache(ctx context.Context, req InvalidateOnchainCacheRequestObject) (InvalidateOnchainCacheResponseObject, error) {
	if p, ok := s.Onchain.(onchainPurger); ok {
		p.PurgeAddress(req.Params.Address) // per-user 키(소유물·잔액)
		p.PurgeEvents()                    // 전역 이벤트 키 — 내 이음/시그널/신규참가 즉시 반영(BE-V 지적)
	}
	return InvalidateOnchainCache204Response{}, nil
}
