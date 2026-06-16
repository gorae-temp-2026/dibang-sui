package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// 기존 객체(user 폴더 등)를 리소스 스코프 경로로 이관하는 계획 수립의 순수 로직.
// 멱등성: 이미 목표 스코프인 참조는 "already"로 skip — 재실행 안전.

const tSupabase = "https://x.supabase.co"
const tBucket = "v3-uploads-public"

func TestPublicKeyFromURL(t *testing.T) {
	cases := []struct {
		ref     string
		wantKey string
		wantOK  bool
	}{
		{tSupabase + "/storage/v1/object/public/v3-uploads-public/u1/a.jpg", "u1/a.jpg", true},
		{tSupabase + "/storage/v1/object/public/other-bucket/u1/a.jpg", "", false},
		{"https://cdn.example.com/x.jpg", "", false},
		{"", "", false},
	}
	for _, c := range cases {
		key, ok := publicKeyFromURL(c.ref, tSupabase, tBucket)
		if key != c.wantKey || ok != c.wantOK {
			t.Errorf("publicKeyFromURL(%q) = (%q,%v), want (%q,%v)", c.ref, key, ok, c.wantKey, c.wantOK)
		}
	}
}

func TestPlanRef(t *testing.T) {
	dstPrefix := "v3-mobile-invitation/W1/cover/"

	// 이관 대상: user 폴더 URL
	newRef, mv, status := planRef(
		tSupabase+"/storage/v1/object/public/v3-uploads-public/u1/aaa.jpg",
		tSupabase, tBucket, dstPrefix,
	)
	if status != "migrate" || mv == nil {
		t.Fatalf("status=%s mv=%v", status, mv)
	}
	if mv.srcKey != "u1/aaa.jpg" || mv.dstKey != dstPrefix+"aaa.jpg" {
		t.Errorf("move = %+v", mv)
	}
	if want := tSupabase + "/storage/v1/object/public/" + tBucket + "/" + dstPrefix + "aaa.jpg"; newRef != want {
		t.Errorf("newRef = %s, want %s", newRef, want)
	}

	// 이미 목표 스코프 → already (멱등)
	_, mv2, status2 := planRef(
		tSupabase+"/storage/v1/object/public/v3-uploads-public/"+dstPrefix+"bbb.jpg",
		tSupabase, tBucket, dstPrefix,
	)
	if status2 != "already" || mv2 != nil {
		t.Errorf("already case: status=%s mv=%v", status2, mv2)
	}

	// 외부 도메인 → foreign
	_, _, status3 := planRef("https://cdn.example.com/x.jpg", tSupabase, tBucket, dstPrefix)
	if status3 != "foreign" {
		t.Errorf("foreign case: status=%s", status3)
	}
}

func TestPublicKeyFromURL_QueryAndEncoding(t *testing.T) {
	// 쿼리스트링·fragment 절단 + 퍼센트 디코딩 (레거시 데이터 방어)
	key, ok := publicKeyFromURL(tSupabase+"/storage/v1/object/public/v3-uploads-public/u1/a.jpg?width=100#x", tSupabase, tBucket)
	if !ok || key != "u1/a.jpg" {
		t.Errorf("query strip: (%q,%v)", key, ok)
	}
	key2, ok2 := publicKeyFromURL(tSupabase+"/storage/v1/object/public/v3-uploads-public/u1/%ED%95%9C%EA%B8%80.jpg", tSupabase, tBucket)
	if !ok2 || key2 != "u1/한글.jpg" {
		t.Errorf("unescape: (%q,%v)", key2, ok2)
	}
}

func TestIsDuplicateCopyErr(t *testing.T) {
	cases := []struct {
		msg  string
		want bool
	}{
		{"supabase storage copy failed: 409 {\"error\":\"Duplicate\"}", true},
		{"supabase storage copy failed: 500 boom", false},
		{"", false},
	}
	for _, c := range cases {
		var err error
		if c.msg != "" {
			err = errFromString(c.msg)
		}
		if got := isDuplicateCopyErr(err); got != c.want {
			t.Errorf("%q: got %v", c.msg, got)
		}
	}
}

type errFromString string

func (e errFromString) Error() string { return string(e) }

func TestRewriteGalleryJSON_NullPreservedNonStringSkips(t *testing.T) {
	rewrite := func(ref string) (string, bool) {
		if strings.Contains(ref, "/old/") {
			return strings.Replace(ref, "/old/", "/new/", 1), true
		}
		return "", false
	}

	out, changed, err := rewriteGalleryJSON(`["https://x/old/a.jpg", null, "https://keep"]`, rewrite)
	if err != nil || !changed {
		t.Fatalf("err=%v changed=%v", err, changed)
	}
	if out != `["https://x/new/a.jpg",null,"https://keep"]` {
		t.Errorf("out = %s", out)
	}

	if _, _, err := rewriteGalleryJSON(`["a", 42]`, rewrite); err == nil {
		t.Error("number element: want err (행 skip)")
	}
}

func TestRewriteDesignConfigJSON(t *testing.T) {
	src := []byte(`{
		"canvas": {"items": [
			{"id": "i1", "type": "image", "image_url": "` + tSupabase + `/storage/v1/object/public/v3-uploads-public/u1/c.png"},
			{"id": "i2", "type": "text", "text": "hi"}
		]},
		"lettering": {"image_url": "` + tSupabase + `/storage/v1/object/public/v3-uploads-public/u1/l.svg"},
		"theme": {"id": "classic"}
	}`)
	var moves []move
	rewrite := func(ref, subKind string) (string, bool) {
		key, ok := publicKeyFromURL(ref, tSupabase, tBucket)
		if !ok {
			return "", false
		}
		dst := "v3-mobile-invitation/W1/" + subKind + "/" + key[strings.LastIndex(key, "/")+1:]
		moves = append(moves, move{srcKey: key, dstKey: dst})
		return tSupabase + "/storage/v1/object/public/" + tBucket + "/" + dst, true
	}

	out, changed, err := rewriteDesignConfigJSON(src, rewrite)
	if err != nil || !changed {
		t.Fatalf("err=%v changed=%v", err, changed)
	}
	var dc map[string]any
	if err := json.Unmarshal(out, &dc); err != nil {
		t.Fatal(err)
	}
	canvasItems := dc["canvas"].(map[string]any)["items"].([]any)
	img := canvasItems[0].(map[string]any)["image_url"].(string)
	if !strings.Contains(img, "/v3-mobile-invitation/W1/canvas/c.png") {
		t.Errorf("canvas image = %s", img)
	}
	lettering := dc["lettering"].(map[string]any)["image_url"].(string)
	if !strings.Contains(lettering, "/v3-mobile-invitation/W1/lettering/l.svg") {
		t.Errorf("lettering image = %s", lettering)
	}
	if dc["theme"].(map[string]any)["id"] != "classic" {
		t.Error("unrelated field modified")
	}
	if len(moves) != 2 {
		t.Errorf("moves = %v", moves)
	}

	// 이관 대상 없으면 changed=false, 원본 유지
	_, changed2, err2 := rewriteDesignConfigJSON([]byte(`{"theme":{"id":"a"}}`), rewrite)
	if err2 != nil || changed2 {
		t.Errorf("no-op case: changed=%v err=%v", changed2, err2)
	}
}
