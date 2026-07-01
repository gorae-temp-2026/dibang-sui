//go:build smoke

// P0-13 통합 스모크: 실제 Sui GraphQL(graphql.testnet.sui.io) 대상으로 리더/핸들러가
// SDK 직접읽기와 동일 데이터를 내는지 대조. 네트워크 필요 → build tag 로 격리(`go test -tags smoke`).
// 일반 `go test ./...` 에는 포함 안 됨(실 testnet 미의존 원칙).
package api

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	smokeGQL     = "https://graphql.testnet.sui.io/graphql"
	smokePkg     = "0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d"
	smokeWedding = "0xf2e85e7a471e9edbdd18a2b819564e4f65bcbe7c5054516bad8f06c077f911bc"
	smokeVault   = "0x28c000a5fdac535b77bb1e52c2601b7bc508110cd15c4dd567c4a81ff4b5f2ac"
	smokeUser    = "0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb"
)

func smokeServer() *Server {
	return &Server{Onchain: NewSuiGraphQL(smokeGQL), OnchainPkg: smokePkg}
}

func TestSmoke_Object(t *testing.T) {
	c := NewSuiGraphQL(smokeGQL)
	f, err := c.Object(context.Background(), smokeWedding)
	require.NoError(t, err)
	require.NotNil(t, f)
	assert.Equal(t, "active", ocStr(f["status"]))
	assert.NotEmpty(t, ocStr(f["event_id"]))
	assert.NotEmpty(t, ocStr(f["primary_host"]))
}

func TestSmoke_Object_NotFound(t *testing.T) {
	c := NewSuiGraphQL(smokeGQL)
	f, err := c.Object(context.Background(), "0x0000000000000000000000000000000000000000000000000000000000000099")
	require.NoError(t, err)
	assert.Nil(t, f) // 미존재 → nil (200 null 계약)
}

func TestSmoke_Events(t *testing.T) {
	c := NewSuiGraphQL(smokeGQL)
	evs, err := c.Events(context.Background(), smokePkg+"::signal::SignalEmitted")
	require.NoError(t, err)
	require.NotEmpty(t, evs, "SignalEmitted 이벤트가 있어야 함")
	// 첫 이벤트 매핑 검증
	sig := mapSignal(evs[0])
	assert.NotEmpty(t, sig.From)
	assert.NotEmpty(t, sig.To)
	t.Logf("signals=%d, first from=%s kind=%d", len(evs), sig.From, sig.Kind)
}

func TestSmoke_OwnedAndBalance(t *testing.T) {
	c := NewSuiGraphQL(smokeGQL)
	parts, err := c.OwnedObjects(context.Background(), smokeUser, smokePkg+"::event::Participation")
	require.NoError(t, err)
	t.Logf("participations=%d", len(parts))
	bal, err := c.Balance(context.Background(), smokeUser)
	require.NoError(t, err)
	assert.NotEmpty(t, bal)
	t.Logf("balance=%s MIST", bal)
}

func TestSmoke_DiscoverHandler(t *testing.T) {
	s := smokeServer()
	resp, err := s.GetOnchainDiscover(context.Background(), GetOnchainDiscoverRequestObject{Params: GetOnchainDiscoverParams{Address: smokeUser}})
	require.NoError(t, err)
	list, ok := resp.(GetOnchainDiscover200JSONResponse)
	require.True(t, ok)
	require.NotEmpty(t, list, "discover 결과가 있어야 함(유저풀)")
	t.Logf("discover=%d users, first degree=%d", len(list), list[0].Degree)
}

func TestSmoke_WeddingHandler(t *testing.T) {
	s := smokeServer()
	resp, err := s.GetOnchainWedding(context.Background(), GetOnchainWeddingRequestObject{WeddingId: smokeWedding})
	require.NoError(t, err)
	w, ok := resp.(GetOnchainWedding200JSONResponse)
	require.True(t, ok)
	assert.Equal(t, "active", w.Status)
	require.NotNil(t, w.VaultId)
	assert.Equal(t, smokeVault, *w.VaultId)
}
