package main

import (
	"testing"
	"time"
)

// 고아 객체 분류의 순수 로직.
// 안전 우선: 참조된 객체는 절대 후보가 아니며, 삭제 후보는 v3-tmp 만료분뿐.

const tSupabase = "https://x.supabase.co"

func TestNormalizeRefToKey(t *testing.T) {
	buckets := []string{"v3-uploads-public", "v3-uploads-private"}
	cases := []struct{ ref, want string }{
		{tSupabase + "/storage/v1/object/public/v3-uploads-public/v3-memory/L1/a.jpg", "v3-memory/L1/a.jpg"},
		{"v3-share/L1/U1/b.jpg", "v3-share/L1/U1/b.jpg"}, // bare key 통과
		{"https://cdn.example.com/x.jpg", ""},            // 외부 — 참조 집합에 안 넣음
		{"", ""},
	}
	for _, c := range cases {
		if got := normalizeRefToKey(c.ref, tSupabase, buckets); got != c.want {
			t.Errorf("normalizeRefToKey(%q) = %q, want %q", c.ref, got, c.want)
		}
	}
}

func TestClassifyObject(t *testing.T) {
	now := time.Date(2026, 6, 10, 12, 0, 0, 0, time.UTC)
	old := now.Add(-72 * time.Hour)
	fresh := now.Add(-1 * time.Hour)
	refs := map[string]bool{"v3-memory/L1/kept.jpg": true, "v3-tmp/U1/kept.png": true}

	cases := []struct {
		key       string
		createdAt time.Time
		want      string
	}{
		{"v3-memory/L1/kept.jpg", old, "referenced"},
		{"v3-tmp/U1/kept.png", old, "referenced"},        // 참조 중인 tmp는 만료여도 보존
		{"v3-tmp/U1/stale.png", old, "tmp-expired"},      // 미참조 + 만료 → 삭제 후보
		{"v3-tmp/U1/new.png", fresh, "grace"},            // 미참조지만 유예 내
		{"v3-memory/L1/lost.jpg", old, "orphan"},         // 미참조 일반 객체 → 보고만
		{"22222222-2222/u-legacy.png", fresh, "grace"},
	}
	for _, c := range cases {
		got := classifyObject(c.key, c.createdAt, now, 48*time.Hour, refs)
		if got != c.want {
			t.Errorf("classify(%s, %s) = %s, want %s", c.key, c.createdAt, got, c.want)
		}
	}
}
