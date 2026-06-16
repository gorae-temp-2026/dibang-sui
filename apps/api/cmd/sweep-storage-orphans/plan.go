package main

import (
	"encoding/json"
	"strings"
	"time"
)

// 고아 분류 — 순수 로직 (STORAGE.md "정리는 서버 몫").
//
// 분류:
//   referenced  — DB 어딘가가 참조 (절대 건드리지 않음)
//   grace       — 미참조지만 유예 기간 내 (업로드 직후·저장 전 상태 보호)
//   tmp-expired — v3-tmp/ 미참조 + 유예 경과 → 삭제 후보 (--delete 시 삭제)
//   orphan      — 그 외 미참조 + 유예 경과 → 보고만 (삭제 확장은 사용자 승인 후)

// normalizeRefToKey: DB 참조값(절대 URL 또는 object key)을 key로 정규화.
// 우리 버킷의 URL이 아니면(외부 도메인) "" — 참조 집합에 포함하지 않는다.
func normalizeRefToKey(ref, supabaseURL string, buckets []string) string {
	if ref == "" {
		return ""
	}
	if !strings.Contains(ref, "://") {
		return ref // bare object key
	}
	base := strings.TrimRight(supabaseURL, "/")
	for _, b := range buckets {
		marker := base + "/storage/v1/object/public/" + b + "/"
		if strings.HasPrefix(ref, marker) {
			return strings.TrimPrefix(ref, marker)
		}
	}
	return ""
}

// extractJSONStrings: jsonb 문자열 배열에서 문자열 요소만 추출 (null·비문자열은 무시).
func extractJSONStrings(src string) []string {
	var arr []any
	if json.Unmarshal([]byte(src), &arr) != nil {
		return nil
	}
	var out []string
	for _, raw := range arr {
		if s, ok := raw.(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}

// extractImageURLs: design_config jsonb에서 canvas items·lettering의 image_url 추출.
func extractImageURLs(src string) []string {
	var dc map[string]any
	if json.Unmarshal([]byte(src), &dc) != nil {
		return nil
	}
	var out []string
	if canvas, ok := dc["canvas"].(map[string]any); ok {
		if items, ok := canvas["items"].([]any); ok {
			for _, raw := range items {
				if item, ok := raw.(map[string]any); ok {
					if s, ok := item["image_url"].(string); ok && s != "" {
						out = append(out, s)
					}
				}
			}
		}
	}
	if lettering, ok := dc["lettering"].(map[string]any); ok {
		if s, ok := lettering["image_url"].(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}

func classifyObject(key string, createdAt, now time.Time, grace time.Duration, referenced map[string]bool) string {
	if referenced[key] {
		return "referenced"
	}
	if now.Sub(createdAt) < grace {
		return "grace"
	}
	if strings.HasPrefix(key, "v3-tmp/") {
		return "tmp-expired"
	}
	return "orphan"
}
