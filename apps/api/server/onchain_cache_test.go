package api

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// countingReader 는 호출 횟수를 세는 OnchainReader(캐시 동작 검증용).
type countingReader struct {
	mu           sync.Mutex
	eventsCalls  int
	ownedCalls   int
	balanceCalls int
	delay        time.Duration
	fail         bool
}

func (c *countingReader) Object(_ context.Context, _ string) (map[string]any, error) {
	return nil, nil
}
func (c *countingReader) OwnedObjects(_ context.Context, _, _ string) ([]OwnedObject, error) {
	c.mu.Lock()
	c.ownedCalls++
	c.mu.Unlock()
	return []OwnedObject{{ID: "0xo"}}, nil
}
func (c *countingReader) Events(_ context.Context, _ string) ([]map[string]any, error) {
	if c.delay > 0 {
		time.Sleep(c.delay)
	}
	c.mu.Lock()
	c.eventsCalls++
	c.mu.Unlock()
	if c.fail {
		return nil, errors.New("upstream 429")
	}
	return []map[string]any{{"event_id": "0x1"}}, nil
}
func (c *countingReader) Balance(_ context.Context, _ string) (string, error) {
	c.mu.Lock()
	c.balanceCalls++
	c.mu.Unlock()
	return "100", nil
}

func TestCache_HitAvoidsSecondUpstream(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	ctx := context.Background()
	_, _ = c.Events(ctx, "T")
	_, _ = c.Events(ctx, "T")
	_, _ = c.Events(ctx, "T")
	assert.Equal(t, 1, inner.eventsCalls) // 3회 요청 → 업스트림 1회(TTL 캐시)
}

func TestCache_SingleFlightCoalesces(t *testing.T) {
	inner := &countingReader{delay: 50 * time.Millisecond}
	c := NewCachedReader(inner)
	ctx := context.Background()
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() { defer wg.Done(); _, _ = c.Events(ctx, "T") }()
	}
	wg.Wait()
	assert.Equal(t, 1, inner.eventsCalls) // 동시 10요청 → single-flight 로 업스트림 1회
}

func TestCache_StaleOnError(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	c.eventsTTL = 10 * time.Millisecond // 곧 만료시켜 재로드 유도
	ctx := context.Background()

	first, err := c.Events(ctx, "T") // 성공 → 캐시+stale 저장
	require.NoError(t, err)
	require.Len(t, first, 1)

	time.Sleep(20 * time.Millisecond) // 1차 캐시 만료
	inner.fail = true                 // 이후 업스트림 실패
	got, err := c.Events(ctx, "T")
	require.NoError(t, err)   // 실패해도 에러 아님
	require.Len(t, got, 1)    // stale 반환(가용성 우선)
	assert.Equal(t, "0x1", got[0]["event_id"])
}

func TestCache_PurgeEvents(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	ctx := context.Background()
	_, _ = c.Events(ctx, "T")
	c.PurgeEvents() // tx-success 무효화
	_, _ = c.Events(ctx, "T")
	assert.Equal(t, 2, inner.eventsCalls) // 무효화 후 재로드
}

func TestCache_PurgeAddress(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	ctx := context.Background()
	_, _ = c.OwnedObjects(ctx, "0xME", "T")
	_, _ = c.Balance(ctx, "0xME")
	c.PurgeAddress("0xME")
	_, _ = c.OwnedObjects(ctx, "0xME", "T")
	_, _ = c.Balance(ctx, "0xME")
	assert.Equal(t, 2, inner.ownedCalls)   // 무효화 후 재로드
	assert.Equal(t, 2, inner.balanceCalls) // 무효화 후 재로드
}

func TestCache_PurgeAddress_KeepsOthers(t *testing.T) {
	inner := &countingReader{}
	c := NewCachedReader(inner)
	ctx := context.Background()
	_, _ = c.Balance(ctx, "0xME")
	_, _ = c.Balance(ctx, "0xOTHER")
	c.PurgeAddress("0xME")
	_, _ = c.Balance(ctx, "0xME")    // 재로드
	_, _ = c.Balance(ctx, "0xOTHER") // 캐시 유지
	assert.Equal(t, 3, inner.balanceCalls) // ME 2 + OTHER 1
}
