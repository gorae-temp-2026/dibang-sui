// 환경변수 스키마 — 부팅 시점 검증의 SSOT.
// 컨벤션: _code_convention/ENV_MANAGEMENT.md
//
// 사용 규칙:
//   - Config 로드는 main.go 진입 직후 LoadConfig() 한 번만 호출.
//   - 이후 os.Getenv 직접 호출 금지. 모든 env 접근은 Config struct 필드로.
//   - 신규 env 키 추가 시 (a) .env.example (b) 본 struct (c) 사용처 세 곳을 같이 갱신.

package api

import (
	"strings"

	"github.com/kelseyhightower/envconfig"
)

// Config 는 서버 전역에서 사용하는 환경변수 카탈로그.
//
// envconfig 태그 의미:
//   - required: 미설정 시 LoadConfig() 가 에러 반환 → main 에서 fatal
//   - default:  미설정 시 적용될 기본값 (기존 main.go 의 fallback 정책 보존)
//   - 둘 다 없는 키는 빈 문자열 허용 (optional)
type Config struct {
	// DB / 서버
	DatabaseURL string `envconfig:"DATABASE_URL" default:"postgresql://postgres:postgres@127.0.0.1:54322/postgres?default_query_exec_mode=simple_protocol"`
	Port        string `envconfig:"PORT"         default:"8080"`

	// Supabase
	SupabaseURL            string `envconfig:"SUPABASE_URL"               required:"true"`
	SupabaseAnonKey        string `envconfig:"SUPABASE_ANON_KEY"          required:"true"`
	SupabaseServiceRoleKey string `envconfig:"SUPABASE_SERVICE_ROLE_KEY"` // 미설정 시 일부 기능(admin, Supabase Storage 업로드) 비활성 — 코드 측에서 분기

	// Admin / CORS
	AdminEmail     string `envconfig:"ADMIN_EMAIL"     default:"admin@gorae.dev"`
	AllowedOrigins string `envconfig:"ALLOWED_ORIGINS" default:"http://localhost:*"`

	// Upload
	UploadDriver        string `envconfig:"UPLOAD_DRIVER"`
	UploadBucketPublic  string `envconfig:"UPLOAD_BUCKET_PUBLIC"  default:"v3-uploads-public"`
	UploadBucketPrivate string `envconfig:"UPLOAD_BUCKET_PRIVATE" default:"v3-uploads-private"`

	// zkLogin — Salt 도출 master secret + Google OAuth client id(=ID 토큰 audience).
	// 미설정 시 /zklogin/salt 비활성(코드 측 분기). master secret은 절대 로그 금지.
	ZkLoginMasterSecret string `envconfig:"ZKLOGIN_MASTER_SECRET"`
	GoogleClientID      string `envconfig:"GOOGLE_CLIENT_ID"`

	// Sponsor — 가스 대납 sponsor 키페어(bech32 suiprivkey) + 기본 가스 예산.
	// 미설정 시 /sponsor/execute 비활성. 키는 절대 로그 금지.
	SponsorPrivateKey string `envconfig:"SPONSOR_PRIVATE_KEY"`
	SponsorGasBudget  string `envconfig:"SPONSOR_GAS_BUDGET" default:"30000000"`
	SuiNetwork        string `envconfig:"SUI_NETWORK"        default:"testnet"`
	SuiPackageID      string `envconfig:"SUI_PACKAGE_ID"`

	// 온체인 읽기 프록시(/onchain/*) — Sui GraphQL 업스트림. 서버-투-서버라 CORS 무관.
	// gRPC는 이벤트 타입쿼리 불가, JSON-RPC는 2026-07-31 sunset → GraphQL 채택.
	SuiGraphqlURL string `envconfig:"SUI_GRAPHQL_URL" default:"https://graphql.testnet.sui.io/graphql"`
	// 이벤트/오브젝트 타입 필터용 original package id(고정 0xf33fba09…). moveCall용 packageId와 구분.
	SuiOriginalPackageID string `envconfig:"SUI_ORIGINAL_PACKAGE_ID" default:"0xf33fba09dcade57bb0a27bd0f0bbd698a18d358c74ae7273d0a85bcab9b7e77d"`

	// Dev 인증 우회 (localhost·dev 전용). 기본 false. ★prod .env에 절대 넣지 않는다.
	// true일 때만 X-Dev-Auth 헤더로 고정 DEV_USER_ID 를 인증(Supabase 검증 우회) — 헤드리스 온체인 테스트용.
	DevAuthBypass bool   `envconfig:"DEV_AUTH_BYPASS" default:"false"`
	DevUserID     string `envconfig:"DEV_USER_ID"`
}

// LoadConfig 는 환경변수를 읽어 Config 를 채운다. 필수 키 누락 시 error 반환.
func LoadConfig() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// AdminEmails 는 ADMIN_EMAIL 의 콤마 구분 문자열을 슬라이스로.
func (c *Config) AdminEmails() []string {
	return strings.Split(c.AdminEmail, ",")
}

// AllowedOriginsList 는 ALLOWED_ORIGINS 의 콤마 구분 문자열을 슬라이스로.
func (c *Config) AllowedOriginsList() []string {
	return strings.Split(c.AllowedOrigins, ",")
}

// IsLocalUpload 는 UPLOAD_DRIVER=local 여부 (dev 명시 opt-in).
func (c *Config) IsLocalUpload() bool {
	return c.UploadDriver == "local"
}
