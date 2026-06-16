package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newSaltHandlerForTest(v JWTVerifier) http.HandlerFunc {
	return NewZkLoginSaltHandler(NewZkLoginService("test-master-secret", v))
}

func TestSaltHandlerReturnsSalt(t *testing.T) {
	claims := ZkLoginClaims{Iss: "https://accounts.google.com", Aud: "aud", Sub: "user-1"}
	h := newSaltHandlerForTest(stubVerifier{claims: claims})

	req := httptest.NewRequest(http.MethodPost, "/zklogin/salt", strings.NewReader(`{"token":"x.y.z"}`))
	rec := httptest.NewRecorder()
	h(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "salt")
	// 결정적: 동일 claims면 서비스가 산출하는 salt와 일치해야.
	assert.Contains(t, rec.Body.String(), computeSalt([]byte("test-master-secret"), claims))
}

func TestSaltHandlerMissingToken(t *testing.T) {
	h := newSaltHandlerForTest(stubVerifier{})
	req := httptest.NewRequest(http.MethodPost, "/zklogin/salt", strings.NewReader(`{}`))
	rec := httptest.NewRecorder()
	h(rec, req)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestSaltHandlerInvalidToken(t *testing.T) {
	h := newSaltHandlerForTest(stubVerifier{err: ErrInvalidIDToken})
	req := httptest.NewRequest(http.MethodPost, "/zklogin/salt", strings.NewReader(`{"token":"bad"}`))
	rec := httptest.NewRecorder()
	h(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
