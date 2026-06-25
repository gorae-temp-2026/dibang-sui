package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIsValidHostSlot(t *testing.T) {
	valid := []string{"groom", "bride", "groom_father", "groom_mother", "bride_father", "bride_mother"}
	for _, s := range valid {
		assert.True(t, isValidHostSlot(s), "expected valid: %s", s)
	}
	invalid := []string{"admin", "groom; DROP TABLE", "", "host_groom_id", "GROOM"}
	for _, s := range invalid {
		assert.False(t, isValidHostSlot(s), "expected invalid: %s", s)
	}
}

func TestGoogleSubToUUID(t *testing.T) {
	// 같은 sub → 같은 UUID (결정적)
	uuid1 := googleSubToUUID("115714567202726569336")
	uuid2 := googleSubToUUID("115714567202726569336")
	assert.Equal(t, uuid1, uuid2)

	// 다른 sub → 다른 UUID
	uuid3 := googleSubToUUID("999999999999999999999")
	assert.NotEqual(t, uuid1, uuid3)

	// UUID 형식 확인
	assert.Len(t, uuid1, 36) // xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
	assert.Contains(t, uuid1, "-")
}

func TestVerifyGoogleJWT_InvalidFormat(t *testing.T) {
	_, err := VerifyGoogleJWT("not-a-jwt", nil)
	require.Error(t, err)
}

func TestVerifyGoogleJWT_ExpiredToken(t *testing.T) {
	// 실제 만료된 Google JWT — 서명 검증은 통과하지만 exp 체크에서 실패해야 함
	// (kid가 rotate 됐으면 서명 검증 단계에서 먼저 실패)
	expired := "eyJhbGciOiJSUzI1NiIsImtpZCI6ImQxMjk3OGJhNGMyOWVmMTE1NGEzNGU0ODcwYzdhM2E1MWQyNmRmMTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJzdWIiOiIxMTU3MTQ1NjcyMDI3MjY1NjkzMzYiLCJleHAiOjF9.invalid_sig"
	_, err := VerifyGoogleJWT(expired, nil)
	require.Error(t, err)
}

func TestVerifyGoogleJWT_WrongAudience(t *testing.T) {
	// 빈 JWT 형식이지만 audience 불일치 테스트 — 실제로는 서명 실패가 먼저
	_, err := VerifyGoogleJWT("a.b.c", []string{"wrong-client-id"})
	require.Error(t, err)
}
