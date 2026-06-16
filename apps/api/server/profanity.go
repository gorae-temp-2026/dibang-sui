package api

import "strings"

// 1차 욕설/비방 필터 (하드코딩 블랙리스트).
// 메모리북 메시지 자동선별(_scenario/wedding-memorybook-2026-05-24) 단계에서 적용.
// v2 web-mobile-application/apps/api/src/lib/profanity.ts 1:1 포팅.
var profanityList = []string{
	// 기본 욕설
	"시발", "씨발", "시bal", "씨bal", "ㅅㅂ", "ㅆㅂ", "씹", "좆", "ㅈㄹ",
	"병신", "ㅂㅅ", "멍청", "바보",
	"개새끼", "새끼", "ㅅㅋ",
	"꺼져", "닥쳐", "죽어",
	"지랄", "미친", "ㅁㅊ",
	"년", "놈",
	// 비방/혐오
	"쓰레기", "찐따", "한남", "한녀",
	"느금마", "니엄마", "니애미", "느그",
	// 성적 비방
	"보지", "자지", "섹스",
}

// 공백/특수문자/대소문자 정규화 — 우회 시도(시 발, 시.발 등) 차단용.
var profanityStripChars = " \t\n\r-_.*!@#$%^&()=+~`|\\/<>?:;\"',[]{}"

func normalizeProfanity(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if strings.ContainsRune(profanityStripChars, r) {
			continue
		}
		b.WriteRune(r)
	}
	return strings.ToLower(b.String())
}

// DetectProfanity는 텍스트에 욕설/비방이 포함되어 있는지 검사하고,
// 매칭된 키워드를 반환한다. 없으면 빈 문자열.
func DetectProfanity(text string) string {
	normalized := normalizeProfanity(text)
	for _, word := range profanityList {
		if strings.Contains(normalized, normalizeProfanity(word)) {
			return word
		}
	}
	return ""
}
