package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeGraphQL 은 카운트별로 다른 응답을 주는 테스트 업스트림.
// 핸들러/클라이언트 TDD 가 실 testnet 에 의존하지 않게 한다(BACKEND_TESTING.md).
func fakeGraphQL(t *testing.T, handler func(w http.ResponseWriter, r *http.Request)) *suiGraphQL {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(handler))
	t.Cleanup(srv.Close)
	c := NewSuiGraphQL(srv.URL)
	c.maxRetry = 2
	c.http = &http.Client{Timeout: 2 * time.Second}
	return c
}

func writeJSON(w http.ResponseWriter, s string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	_, _ = w.Write([]byte(s))
}

func TestSuiGraphQL_Object(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"object":{"asMoveObject":{"contents":{"json":{"id":"0xf2","event_id":"0xa8","status":"active","primary_host":"0x46","vault_id":"0x28"}}}}}}`)
	})
	fields, err := c.Object(context.Background(), "0xf2")
	require.NoError(t, err)
	require.NotNil(t, fields)
	assert.Equal(t, "active", fields["status"])
	assert.Equal(t, "0xa8", fields["event_id"])
	assert.Equal(t, "0x46", fields["primary_host"])
}

func TestSuiGraphQL_Object_NotFound(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"object":null}}`)
	})
	fields, err := c.Object(context.Background(), "0xdead")
	require.NoError(t, err)
	assert.Nil(t, fields) // 미존재 → nil,nil (200 null 계약)
}

func TestSuiGraphQL_Events_Pagination(t *testing.T) {
	var call int32
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt32(&call, 1)
		if n == 1 {
			writeJSON(w, `{"data":{"events":{"nodes":[{"contents":{"json":{"event_id":"0x1","kind":0}}}],"pageInfo":{"hasNextPage":true,"endCursor":"CUR1"}}}}`)
		} else {
			writeJSON(w, `{"data":{"events":{"nodes":[{"contents":{"json":{"event_id":"0x2","kind":2}}}],"pageInfo":{"hasNextPage":false,"endCursor":null}}}}`)
		}
	})
	evs, err := c.Events(context.Background(), "0xpkg::signal::SignalEmitted")
	require.NoError(t, err)
	require.Len(t, evs, 2) // 두 페이지 flatten
	assert.Equal(t, "0x1", evs[0]["event_id"])
	assert.Equal(t, "0x2", evs[1]["event_id"])
	assert.Equal(t, int32(2), atomic.LoadInt32(&call))
}

func TestSuiGraphQL_OwnedObjects(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"address":{"objects":{"nodes":[{"address":"0xobj1","contents":{"json":{"event_id":"0xe1","role_id":4}}}],"pageInfo":{"hasNextPage":false,"endCursor":null}}}}}`)
	})
	objs, err := c.OwnedObjects(context.Background(), "0x46", "0xpkg::event::Participation")
	require.NoError(t, err)
	require.Len(t, objs, 1)
	assert.Equal(t, "0xobj1", objs[0].ID)
	assert.Equal(t, "0xe1", objs[0].Fields["event_id"])
}

func TestSuiGraphQL_OwnedObjects_EmptyAddress(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"address":null}}`)
	})
	objs, err := c.OwnedObjects(context.Background(), "0xnope", "0xpkg::moi::Moi")
	require.NoError(t, err)
	assert.Empty(t, objs)
}

func TestSuiGraphQL_Balance(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"address":{"balance":{"totalBalance":"831421108"}}}}`)
	})
	bal, err := c.Balance(context.Background(), "0x46")
	require.NoError(t, err)
	assert.Equal(t, "831421108", bal)
}

func TestSuiGraphQL_Balance_NoCoins(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"data":{"address":{"balance":null}}}`)
	})
	bal, err := c.Balance(context.Background(), "0x46")
	require.NoError(t, err)
	assert.Equal(t, "0", bal)
}

func TestSuiGraphQL_RetryOn429(t *testing.T) {
	var call int32
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt32(&call, 1) == 1 {
			w.WriteHeader(http.StatusTooManyRequests) // 첫 요청 429 → 재시도해야 함
			return
		}
		writeJSON(w, `{"data":{"object":{"asMoveObject":{"contents":{"json":{"status":"ok"}}}}}}`)
	})
	fields, err := c.Object(context.Background(), "0x1")
	require.NoError(t, err)
	assert.Equal(t, "ok", fields["status"])
	assert.Equal(t, int32(2), atomic.LoadInt32(&call)) // 429 후 재시도 성공
}

func TestSuiGraphQL_GraphQLErrors(t *testing.T) {
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, `{"errors":[{"message":"bad type filter"}]}`)
	})
	_, err := c.Object(context.Background(), "0x1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "bad type filter")
}

func TestSuiGraphQL_SendsQueryAndVariables(t *testing.T) {
	var gotQuery string
	var gotVars map[string]any
	c := fakeGraphQL(t, func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Query     string         `json:"query"`
			Variables map[string]any `json:"variables"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		gotQuery = body.Query
		gotVars = body.Variables
		writeJSON(w, `{"data":{"events":{"nodes":[],"pageInfo":{"hasNextPage":false}}}}`)
	})
	_, err := c.Events(context.Background(), "0xpkg::signal::SignalEmitted")
	require.NoError(t, err)
	assert.Contains(t, gotQuery, "events(filter: {type: $type}")
	assert.Equal(t, "0xpkg::signal::SignalEmitted", gotVars["type"])
}
