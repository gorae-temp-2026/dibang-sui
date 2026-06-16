package api

import (
	"context"
	"errors"
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// stubVerifier — 테스트용 JWT 검증기. 실제 Google JWKS 검증 없이 claims/err를 주입한다.
type stubVerifier struct {
	claims ZkLoginClaims
	err    error
}

func (s stubVerifier) Verify(_ context.Context, _ string) (ZkLoginClaims, error) {
	return s.claims, s.err
}

func TestComputeSaltDeterministic(t *testing.T) {
	secret := []byte("master-secret")
	c := ZkLoginClaims{Iss: "https://accounts.google.com", Aud: "client-123", Sub: "user-abc"}
	assert.Equal(t, computeSalt(secret, c), computeSalt(secret, c), "동일 claims는 동일 salt")
}

func TestComputeSaltDiffersBySub(t *testing.T) {
	secret := []byte("master-secret")
	base := ZkLoginClaims{Iss: "iss", Aud: "aud", Sub: "user-1"}
	other := base
	other.Sub = "user-2"
	assert.NotEqual(t, computeSalt(secret, base), computeSalt(secret, other), "sub 다르면 salt 달라야")
}

func TestComputeSaltDiffersByAud(t *testing.T) {
	secret := []byte("master-secret")
	base := ZkLoginClaims{Iss: "iss", Aud: "aud-1", Sub: "user"}
	other := base
	other.Aud = "aud-2"
	assert.NotEqual(t, computeSalt(secret, base), computeSalt(secret, other), "aud 다르면 salt 달라야")
}

func TestComputeSaltWithin128Bits(t *testing.T) {
	secret := []byte("master-secret")
	s := computeSalt(secret, ZkLoginClaims{Iss: "i", Aud: "a", Sub: "s"})
	n, ok := new(big.Int).SetString(s, 10)
	require.True(t, ok, "salt는 십진 문자열")
	max := new(big.Int).Lsh(big.NewInt(1), 128) // 2^128 — zkLogin salt 상한
	assert.True(t, n.Cmp(max) < 0, "salt < 2^128")
}

func TestDeriveSaltUsesVerifierClaims(t *testing.T) {
	secret := "master-secret"
	c := ZkLoginClaims{Iss: "iss", Aud: "aud", Sub: "sub"}
	svc := NewZkLoginService(secret, stubVerifier{claims: c})
	got, err := svc.DeriveSalt(context.Background(), "raw.jwt.token")
	require.NoError(t, err)
	assert.Equal(t, computeSalt([]byte(secret), c), got)
}

func TestDeriveSaltPropagatesVerifyError(t *testing.T) {
	svc := NewZkLoginService("secret", stubVerifier{err: errors.New("bad token")})
	_, err := svc.DeriveSalt(context.Background(), "raw")
	require.Error(t, err, "검증 실패는 그대로 전파")
}

func TestDeriveSaltStableForSameUser(t *testing.T) {
	// 같은 사용자(동일 claims)면 raw JWT가 달라도(에포크별 토큰 재발급) 동일 salt → 동일 Sui 주소.
	c := ZkLoginClaims{Iss: "https://accounts.google.com", Aud: "aud", Sub: "same-user"}
	svc := NewZkLoginService("secret", stubVerifier{claims: c})
	a, err1 := svc.DeriveSalt(context.Background(), "jwt-epoch-1")
	b, err2 := svc.DeriveSalt(context.Background(), "jwt-epoch-2")
	require.NoError(t, err1)
	require.NoError(t, err2)
	assert.Equal(t, a, b, "동일 계정은 항상 동일 salt")
}
