// Google JWT 직접 검증 — zkLogin JWT를 Go API에서 인증.
//
// zkLogin은 Google OAuth implicit flow로 JWT를 받고, 이 JWT에 nonce가 포함되어
// Supabase signInWithIdToken과 호환되지 않는다(nonce 충돌).
// 따라서 Go API가 Google의 공개키로 JWT를 직접 검증하고 sub claim으로 유저를 식별한다.

package api

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Google JWKS (JSON Web Key Set) endpoint
const googleJWKSURL = "https://www.googleapis.com/oauth2/v3/certs"

type googleJWK struct {
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type googleJWKS struct {
	Keys []googleJWK `json:"keys"`
}

var (
	jwksCache    *googleJWKS
	jwksCacheAt  time.Time
	jwksCacheMu  sync.Mutex
	jwksCacheTTL = 1 * time.Hour
)

func fetchGoogleJWKS() (*googleJWKS, error) {
	jwksCacheMu.Lock()
	defer jwksCacheMu.Unlock()
	if jwksCache != nil && time.Since(jwksCacheAt) < jwksCacheTTL {
		return jwksCache, nil
	}
	resp, err := http.Get(googleJWKSURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var keys googleJWKS
	if err := json.NewDecoder(resp.Body).Decode(&keys); err != nil {
		return nil, err
	}
	jwksCache = &keys
	jwksCacheAt = time.Now()
	return &keys, nil
}

func getGooglePublicKey(kid string) (*rsa.PublicKey, error) {
	jwks, err := fetchGoogleJWKS()
	if err != nil {
		return nil, err
	}
	for _, k := range jwks.Keys {
		if k.Kid == kid {
			nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
			if err != nil {
				return nil, err
			}
			eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
			if err != nil {
				return nil, err
			}
			e := 0
			for _, b := range eBytes {
				e = e*256 + int(b)
			}
			return &rsa.PublicKey{N: new(big.Int).SetBytes(nBytes), E: e}, nil
		}
	}
	return nil, fmt.Errorf("google JWK kid=%s not found", kid)
}

// GoogleClaims is the subset of Google JWT claims we use.
type GoogleClaims struct {
	jwt.RegisteredClaims
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Nonce         string `json:"nonce"`
}

// VerifyGoogleJWT validates a Google-issued JWT and returns the claims.
// It checks: signature (RSA), issuer (accounts.google.com), audience (clientID), expiry.
func VerifyGoogleJWT(tokenStr string, allowedClientIDs []string) (*GoogleClaims, error) {
	// Parse header to get kid
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid JWT format")
	}

	token, err := jwt.ParseWithClaims(tokenStr, &GoogleClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		kid, ok := t.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid in JWT header")
		}
		return getGooglePublicKey(kid)
	})
	if err != nil {
		return nil, fmt.Errorf("JWT verification failed: %w", err)
	}

	claims, ok := token.Claims.(*GoogleClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Verify issuer
	iss := claims.Issuer
	if iss != "https://accounts.google.com" && iss != "accounts.google.com" {
		return nil, fmt.Errorf("invalid issuer: %s", iss)
	}

	// Verify audience (client ID)
	if len(allowedClientIDs) > 0 {
		aud := claims.Audience
		found := false
		for _, allowed := range allowedClientIDs {
			for _, a := range aud {
				if a == allowed {
					found = true
					break
				}
			}
		}
		if !found {
			return nil, fmt.Errorf("invalid audience: %v", aud)
		}
	}

	return claims, nil
}
