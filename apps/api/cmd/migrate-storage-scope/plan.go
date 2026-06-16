package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"strings"
)

// 이관 계획 수립 — 순수 로직 (스토리지·DB 접근 없음).
// 원칙: STORAGE.md "경로 = 소유 리소스 스코프". 멱등: 목표 스코프 참조는 skip.

type move struct {
	srcKey, dstKey string
}

// publicKeyFromURL: 우리 public 버킷의 절대 URL이면 object key를 추출.
// 레거시 데이터 방어: 쿼리스트링·fragment 절단 + 퍼센트 디코딩 (V3 리뷰).
func publicKeyFromURL(ref, supabaseURL, bucket string) (string, bool) {
	marker := strings.TrimRight(supabaseURL, "/") + "/storage/v1/object/public/" + bucket + "/"
	if !strings.HasPrefix(ref, marker) {
		return "", false
	}
	key := strings.TrimPrefix(ref, marker)
	if i := strings.IndexAny(key, "?#"); i >= 0 {
		key = key[:i]
	}
	if decoded, err := url.PathUnescape(key); err == nil {
		key = decoded
	}
	if key == "" {
		return "", false
	}
	return key, true
}

// isDuplicateCopyErr: Supabase copy의 destination 기존재(409 Duplicate)는 "이미 복사됨"으로
// 간주한다 — dstKey가 src basename 기준이라 결정적이므로, 부분 실패 후 재실행에서
// 같은 이동이 다시 계획돼도 영구 미이관에 빠지지 않게 하는 멱등 장치 (V3 리뷰).
func isDuplicateCopyErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, " 409 ") || strings.Contains(msg, "Duplicate") || strings.Contains(msg, "already exists")
}

// rewriteGalleryJSON: gallery_photos jsonb 배열을 []any로 라운드트립 —
// null 요소는 그대로 보존하고, 문자열 외(숫자·객체) 요소는 error(행 skip).
func rewriteGalleryJSON(src string, rewrite func(ref string) (string, bool)) (string, bool, error) {
	if src == "" {
		return "[]", false, nil
	}
	var arr []any
	if err := json.Unmarshal([]byte(src), &arr); err != nil {
		return "", false, err
	}
	changed := false
	for i, raw := range arr {
		if raw == nil {
			continue // null 보존
		}
		s, ok := raw.(string)
		if !ok {
			return "", false, fmt.Errorf("gallery_photos[%d]: 문자열이 아닌 요소 %T", i, raw)
		}
		if newRef, did := rewrite(s); did {
			arr[i] = newRef
			changed = true
		}
	}
	if !changed {
		return src, false, nil
	}
	out, err := json.Marshal(arr)
	return string(out), true, err
}

// planRef: 참조 1건의 이관 계획.
//   migrate     — user 폴더 등 비스코프 객체 → dstPrefix로 이동 대상
//   already     — 이미 목표 스코프 (멱등 skip)
//   foreign     — 외부 도메인·다른 버킷 (보고만)
func planRef(ref, supabaseURL, bucket, dstPrefix string) (string, *move, string) {
	key, ok := publicKeyFromURL(ref, supabaseURL, bucket)
	if !ok {
		return "", nil, "foreign"
	}
	if strings.HasPrefix(key, dstPrefix) {
		return "", nil, "already"
	}
	dstKey := dstPrefix + path.Base(key)
	newRef := strings.TrimRight(supabaseURL, "/") + "/storage/v1/object/public/" + bucket + "/" + dstKey
	return newRef, &move{srcKey: key, dstKey: dstKey}, "migrate"
}

// rewriteDesignConfigJSON: design_config jsonb에서 canvas.items[].image_url과
// lettering.image_url을 rewrite 콜백으로 재작성. 콜백은 (새 참조, 변경 여부) 반환.
func rewriteDesignConfigJSON(src []byte, rewrite func(ref, subKind string) (string, bool)) ([]byte, bool, error) {
	if len(src) == 0 {
		return src, false, nil
	}
	var dc map[string]any
	if err := json.Unmarshal(src, &dc); err != nil {
		return nil, false, err
	}
	changed := false

	if canvas, ok := dc["canvas"].(map[string]any); ok {
		if items, ok := canvas["items"].([]any); ok {
			for _, raw := range items {
				item, ok := raw.(map[string]any)
				if !ok {
					continue
				}
				ref, ok := item["image_url"].(string)
				if !ok || ref == "" {
					continue
				}
				if newRef, did := rewrite(ref, "canvas"); did {
					item["image_url"] = newRef
					changed = true
				}
			}
		}
	}
	if lettering, ok := dc["lettering"].(map[string]any); ok {
		if ref, ok := lettering["image_url"].(string); ok && ref != "" {
			if newRef, did := rewrite(ref, "lettering"); did {
				lettering["image_url"] = newRef
				changed = true
			}
		}
	}

	if !changed {
		return src, false, nil
	}
	out, err := json.Marshal(dc)
	return out, true, err
}
