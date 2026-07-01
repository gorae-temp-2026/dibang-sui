package api

// 온체인 읽기 온디맨드 캐시(BE-3). OnchainReader 를 감싸 TTL 캐시 + single-flight + stale-on-error.
// 이벤트 전역 스캔을 전 유저가 공유(TTL당 1회 + 동시요청 병합) → fullnode 대비 요청 수 수백배↓ = rate-limit 해소.
// 무효화(P0-10): tx-success 시 per-user 키 + 전역 이벤트 키 drop(내 이음/시그널 즉시 반영).

import (
	"context"
	"strings"
	"time"

	gocache "github.com/patrickmn/go-cache"
	"golang.org/x/sync/singleflight"
)

type cachedReader struct {
	inner OnchainReader
	cache *gocache.Cache // 1차 TTL 캐시
	stale *gocache.Cache // stale-on-error 폴백(더 긴 수명)
	sf    singleflight.Group

	objectTTL  time.Duration
	ownedTTL   time.Duration
	eventsTTL  time.Duration
	balanceTTL time.Duration
}

var _ OnchainReader = (*cachedReader)(nil)

const (
	kObj    = "obj:"    // obj:{id}
	kOwned  = "owned:"  // owned:{owner}|{type}
	kEvents = "events:" // events:{type}  (전 유저 공유)
	kBal    = "bal:"    // bal:{owner}
)

// NewCachedReader 는 BE-3 TTL 로 캐시 리더를 만든다.
// objectTTL 은 30s 절충(BE-3: 불변 wedding/lounge/invitation 300s vs 변동 vault/moi 10~15s를
// 리더 레벨에선 구분 못 함 → 안전한 중간값. tx-success 무효화가 변동분 stale 을 조기 제거).
func NewCachedReader(inner OnchainReader) *cachedReader {
	return &cachedReader{
		inner:      inner,
		cache:      gocache.New(30*time.Second, time.Minute),
		stale:      gocache.New(10*time.Minute, 10*time.Minute),
		objectTTL:  30 * time.Second,
		ownedTTL:   15 * time.Second,
		eventsTTL:  60 * time.Second,
		balanceTTL: 5 * time.Second,
	}
}

// load 는 캐시 히트 시 즉시 반환, 미스 시 single-flight 로 1회만 로드(동시요청 병합).
// 로드 실패 시 stale 캐시가 있으면 그걸 반환(가용성 우선, BE-4).
func (c *cachedReader) load(key string, ttl time.Duration, fn func() (any, error)) (any, error) {
	if v, ok := c.cache.Get(key); ok {
		return v, nil
	}
	v, err, _ := c.sf.Do(key, func() (any, error) {
		if v, ok := c.cache.Get(key); ok { // double-check(대기 중 다른 요청이 채웠을 수)
			return v, nil
		}
		v, err := fn()
		if err != nil {
			if sv, ok := c.stale.Get(key); ok {
				return sv, nil // stale-on-error
			}
			return nil, err
		}
		c.cache.Set(key, v, ttl)
		c.stale.Set(key, v, gocache.DefaultExpiration)
		return v, nil
	})
	return v, err
}

func (c *cachedReader) Object(ctx context.Context, id string) (map[string]any, error) {
	v, err := c.load(kObj+id, c.objectTTL, func() (any, error) { return c.inner.Object(ctx, id) })
	if err != nil {
		return nil, err
	}
	m, _ := v.(map[string]any) // 미존재(nil) 안전
	return m, nil
}

func (c *cachedReader) OwnedObjects(ctx context.Context, owner, structType string) ([]OwnedObject, error) {
	v, err := c.load(kOwned+owner+"|"+structType, c.ownedTTL, func() (any, error) {
		return c.inner.OwnedObjects(ctx, owner, structType)
	})
	if err != nil {
		return nil, err
	}
	objs, _ := v.([]OwnedObject)
	return objs, nil
}

func (c *cachedReader) Events(ctx context.Context, eventType string) ([]map[string]any, error) {
	v, err := c.load(kEvents+eventType, c.eventsTTL, func() (any, error) { return c.inner.Events(ctx, eventType) })
	if err != nil {
		return nil, err
	}
	evs, _ := v.([]map[string]any)
	return evs, nil
}

func (c *cachedReader) Balance(ctx context.Context, owner string) (string, error) {
	v, err := c.load(kBal+owner, c.balanceTTL, func() (any, error) { return c.inner.Balance(ctx, owner) })
	if err != nil {
		return "", err
	}
	s, _ := v.(string)
	return s, nil
}

// PurgeAddress 는 특정 주소의 per-user 키(소유물·잔액)를 버린다.
func (c *cachedReader) PurgeAddress(addr string) {
	for key := range c.cache.Items() {
		if strings.HasPrefix(key, kOwned+addr+"|") || key == kBal+addr {
			c.cache.Delete(key)
			c.stale.Delete(key)
		}
	}
}

// PurgeEvents 는 전역 이벤트 캐시 전부를 버린다(내 이음/시그널/신규참가 즉시 반영 위해 필수).
func (c *cachedReader) PurgeEvents() {
	for key := range c.cache.Items() {
		if strings.HasPrefix(key, kEvents) {
			c.cache.Delete(key)
			c.stale.Delete(key)
		}
	}
}
