package api

// zkLogin Salt 서비스.
//
// zkLogin은 OAuth(Google) 로그인으로 Sui 주소를 쓰게 해주는 네이티브 프리미티브다.
// 사용자별 고정 salt가 JWT와 결합되어 Sui 주소를 결정하므로, "같은 구글 계정 → 항상 같은
// salt → 항상 같은 주소"가 보장돼야 한다. 그래서 salt는 master secret과 JWT의
// (iss, aud, sub)로 결정적으로 도출한다(랜덤 저장 X). master secret이 유출되면 전체 주소
// 매핑이 노출되므로 환경변수로만 관리하고 로그에 남기지 않는다.

import (
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"hash"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

// JWKS 캐시 TTL — 만료되면 모르는 kid가 아니어도 재조회해 회전된(은퇴) 키 사용을 막는다.
const jwksTTL = time.Hour

// ErrInvalidIDToken — JWT 검증 실패(서명/만료/iss/aud/형식). 핸들러는 401로 매핑.
var ErrInvalidIDToken = errors.New("invalid id token")

// ZkLoginClaims — salt 도출에 필요한 최소 OIDC 클레임.
type ZkLoginClaims struct {
	Iss string
	Aud string
	Sub string
}

// JWTVerifier — JWT를 검증하고 클레임을 돌려준다. 실제 구현은 GoogleJWTVerifier,
// 테스트는 stub으로 대체 가능하게 인터페이스로 분리.
type JWTVerifier interface {
	Verify(ctx context.Context, rawJWT string) (ZkLoginClaims, error)
}

// ZkLoginService — JWT 검증 후 결정적 salt를 도출한다.
type ZkLoginService struct {
	masterSecret []byte
	verifier     JWTVerifier
}

func NewZkLoginService(masterSecret string, verifier JWTVerifier) *ZkLoginService {
	return &ZkLoginService{masterSecret: []byte(masterSecret), verifier: verifier}
}

// DeriveSalt — JWT를 검증하고 사용자별 결정적 salt(십진 문자열)를 반환한다.
func (s *ZkLoginService) DeriveSalt(ctx context.Context, rawJWT string) (string, error) {
	claims, err := s.verifier.Verify(ctx, rawJWT)
	if err != nil {
		return "", err
	}
	return computeSalt(s.masterSecret, claims), nil
}

// computeSalt — HMAC-SHA256(masterSecret, len-prefixed(iss,aud,sub))의 앞 16바이트를
// big-endian 정수(십진 문자열)로. 16바이트=128비트라 zkLogin salt 상한(2^128) 안에 든다.
//
// 각 클레임을 길이 prefix로 구분(도메인 분리)한다. 단순 "iss|aud|sub" 연결은 클레임에 '|'가
// 들어가면 서로 다른 클레임 조합이 같은 입력으로 충돌할 수 있다(예: ("a|b","c") vs ("a","b|c")).
func computeSalt(masterSecret []byte, c ZkLoginClaims) string {
	mac := hmac.New(sha256.New, masterSecret)
	writeLenPrefixed(mac, c.Iss)
	writeLenPrefixed(mac, c.Aud)
	writeLenPrefixed(mac, c.Sub)
	sum := mac.Sum(nil)
	return new(big.Int).SetBytes(sum[:16]).String()
}

func writeLenPrefixed(h hash.Hash, s string) {
	var lenBuf [8]byte
	binary.BigEndian.PutUint64(lenBuf[:], uint64(len(s)))
	_, _ = h.Write(lenBuf[:])
	_, _ = h.Write([]byte(s))
}

// === Google ID 토큰 검증기 (RS256 + JWKS) ===

// GoogleJWTVerifier — Google ID 토큰을 RS256 서명·iss·aud·exp 기준으로 검증한다.
// JWKS는 메모리에 캐시하고, 모르는 kid를 만나면 1회 재조회한다(키 로테이션 대응).
type GoogleJWTVerifier struct {
	expectedAudience string
	jwksURL          string
	httpClient       *http.Client
	mu               sync.RWMutex
	keys             map[string]*rsa.PublicKey
	lastRefresh      time.Time
}

func NewGoogleJWTVerifier(audience string) *GoogleJWTVerifier {
	return &GoogleJWTVerifier{
		expectedAudience: audience,
		jwksURL:          "https://www.googleapis.com/oauth2/v3/certs",
		httpClient:       &http.Client{Timeout: 10 * time.Second},
		keys:             map[string]*rsa.PublicKey{},
	}
}

func (v *GoogleJWTVerifier) Verify(ctx context.Context, raw string) (ZkLoginClaims, error) {
	parts := strings.Split(raw, ".")
	if len(parts) != 3 {
		return ZkLoginClaims{}, fmt.Errorf("%w: malformed token", ErrInvalidIDToken)
	}

	var hdr struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := decodeJWTSegment(parts[0], &hdr); err != nil {
		return ZkLoginClaims{}, fmt.Errorf("%w: bad header", ErrInvalidIDToken)
	}
	if hdr.Alg != "RS256" {
		return ZkLoginClaims{}, fmt.Errorf("%w: unsupported alg %q", ErrInvalidIDToken, hdr.Alg)
	}

	pub, err := v.key(ctx, hdr.Kid)
	if err != nil {
		return ZkLoginClaims{}, err
	}

	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return ZkLoginClaims{}, fmt.Errorf("%w: bad signature encoding", ErrInvalidIDToken)
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(pub, crypto.SHA256, digest[:], sig); err != nil {
		return ZkLoginClaims{}, fmt.Errorf("%w: signature verification failed", ErrInvalidIDToken)
	}

	var claims struct {
		Iss string `json:"iss"`
		Aud string `json:"aud"`
		Sub string `json:"sub"`
		Exp int64  `json:"exp"`
	}
	if err := decodeJWTSegment(parts[1], &claims); err != nil {
		return ZkLoginClaims{}, fmt.Errorf("%w: bad claims", ErrInvalidIDToken)
	}
	if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
		return ZkLoginClaims{}, fmt.Errorf("%w: token expired", ErrInvalidIDToken)
	}
	if claims.Iss != "accounts.google.com" && claims.Iss != "https://accounts.google.com" {
		return ZkLoginClaims{}, fmt.Errorf("%w: unexpected issuer", ErrInvalidIDToken)
	}
	// audience는 fail-closed: 미설정이면 검증 불가로 보고 거부한다.
	// (예전엔 미설정 시 검사를 건너뛰어 아무 Google 앱 토큰이나 통과하는 인증 우회였음.)
	if v.expectedAudience == "" {
		return ZkLoginClaims{}, fmt.Errorf("%w: verifier audience not configured", ErrInvalidIDToken)
	}
	if claims.Aud != v.expectedAudience {
		return ZkLoginClaims{}, fmt.Errorf("%w: audience mismatch", ErrInvalidIDToken)
	}
	if claims.Sub == "" {
		return ZkLoginClaims{}, fmt.Errorf("%w: missing sub", ErrInvalidIDToken)
	}
	return ZkLoginClaims{Iss: claims.Iss, Aud: claims.Aud, Sub: claims.Sub}, nil
}

func (v *GoogleJWTVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	k := v.keys[kid]
	fresh := time.Since(v.lastRefresh) < jwksTTL
	v.mu.RUnlock()
	// 캐시에 있고 TTL 내면 그대로 사용. 모르는 kid거나 캐시가 만료됐으면 재조회.
	if k != nil && fresh {
		return k, nil
	}
	if err := v.refresh(ctx); err != nil {
		// 재조회 실패 시 만료됐어도 캐시 키가 있으면 가용성 위해 폴백.
		if k != nil {
			return k, nil
		}
		return nil, fmt.Errorf("%w: jwks fetch: %v", ErrInvalidIDToken, err)
	}
	v.mu.RLock()
	k = v.keys[kid]
	v.mu.RUnlock()
	if k == nil {
		return nil, fmt.Errorf("%w: unknown key id", ErrInvalidIDToken)
	}
	return k, nil
}

func (v *GoogleJWTVerifier) refresh(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks status %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kid string `json:"kid"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	// 응답 본문 크기 제한(메모리 보호) — JWKS는 작다.
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&jwks); err != nil {
		return err
	}

	next := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, jk := range jwks.Keys {
		nBytes, err := base64.RawURLEncoding.DecodeString(jk.N)
		if err != nil {
			continue
		}
		eBytes, err := base64.RawURLEncoding.DecodeString(jk.E)
		if err != nil {
			continue
		}
		next[jk.Kid] = &rsa.PublicKey{
			N: new(big.Int).SetBytes(nBytes),
			E: int(new(big.Int).SetBytes(eBytes).Int64()),
		}
	}
	v.mu.Lock()
	v.keys = next
	v.lastRefresh = time.Now()
	v.mu.Unlock()
	return nil
}

func decodeJWTSegment(seg string, dst any) error {
	b, err := base64.RawURLEncoding.DecodeString(seg)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dst)
}
