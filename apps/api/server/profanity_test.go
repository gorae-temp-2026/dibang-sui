package api

import "testing"

func TestDetectProfanity(t *testing.T) {
	cases := []struct {
		name    string
		input   string
		wantHit bool
	}{
		{"empty string", "", false},
		{"clean text", "축하해요 행복하세요", false},
		{"plain 시발", "시발 욕설", true},
		{"contains 씨발 mid sentence", "축하해요 씨발 진심으로", true},
		{"ㅅㅂ with space normalized", "ㅅ ㅂ 진짜", true},
		{"ㅂㅅ with special char normalized", "ㅂ.ㅅ 같은 놈", true},
		{"한남 hate term", "이런 한남 같은", true},
		{"개새끼 substring", "개새끼야", true},
		{"uppercase 시bal", "야 SI BAL", false}, // 영문 si bal은 리스트에 'sibal' 아님(별도) - 'sibal'/'씨bal' 별개 케이스
		{"safe but contains 년 (해/년)", "내년에도", true}, // hardcoded blacklist 부작용 — v2 동작 그대로 (포팅 충실도)
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := DetectProfanity(tc.input)
			hit := got != ""
			if hit != tc.wantHit {
				t.Fatalf("DetectProfanity(%q) = %q (hit=%v), wantHit=%v", tc.input, got, hit, tc.wantHit)
			}
		})
	}
}

func TestDetectProfanity_NormalizesSpecialChars(t *testing.T) {
	// 공백·특수문자 우회 시도가 normalize로 모두 잡혀야 함
	for _, in := range []string{"시 발", "시-발", "시.발", "시!발", "시*발", "시__발"} {
		if got := DetectProfanity(in); got == "" {
			t.Errorf("DetectProfanity(%q) = empty, expected hit (normalize 우회)", in)
		}
	}
}
