package api

import (
	"os"
	"strings"
	"testing"
)

// unsetAll 은 LoadConfig 가 읽는 모든 env 키를 OS 레벨에서 unset 한다.
// envconfig 는 "환경에 없음" 일 때만 required 체크가 트리거되므로, t.Setenv 빈값으로는 검증 못 함.
func unsetAll(t *testing.T) {
	keys := []string{
		"DATABASE_URL", "PORT",
		"SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
		"ADMIN_EMAIL", "ALLOWED_ORIGINS",
		"UPLOAD_DRIVER", "UPLOAD_BUCKET_PUBLIC", "UPLOAD_BUCKET_PRIVATE",
	}
	prev := map[string]string{}
	for _, k := range keys {
		if v, ok := os.LookupEnv(k); ok {
			prev[k] = v
		}
		_ = os.Unsetenv(k)
	}
	t.Cleanup(func() {
		for k, v := range prev {
			_ = os.Setenv(k, v)
		}
	})
}

func TestLoadConfig_MissingRequired_Fails(t *testing.T) {
	unsetAll(t)

	_, err := LoadConfig()
	if err == nil {
		t.Fatal("필수 키 누락 시 error 기대했으나 nil")
	}
	// SUPABASE_URL 또는 SUPABASE_ANON_KEY 중 하나가 에러 메시지에 포함돼야 함
	msg := err.Error()
	if !strings.Contains(msg, "SUPABASE_URL") && !strings.Contains(msg, "SUPABASE_ANON_KEY") {
		t.Errorf("error 메시지에 SUPABASE_URL/ANON_KEY 포함 기대 — got %q", msg)
	}
}

func TestLoadConfig_AllRequiredSet_OK(t *testing.T) {
	t.Setenv("SUPABASE_URL", "https://example.supabase.co")
	t.Setenv("SUPABASE_ANON_KEY", "anon-key-test")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("필수 키 모두 설정됐는데 에러: %v", err)
	}
	if cfg.SupabaseURL != "https://example.supabase.co" {
		t.Errorf("SupabaseURL 잘못 로드: %q", cfg.SupabaseURL)
	}
	// default 값 확인
	if cfg.Port != "8080" {
		t.Errorf("Port default 8080 기대 — got %q", cfg.Port)
	}
	if cfg.UploadBucketPublic != "v3-uploads-public" {
		t.Errorf("UploadBucketPublic default 기대 — got %q", cfg.UploadBucketPublic)
	}
	if cfg.AdminEmail != "admin@gorae.dev" {
		t.Errorf("AdminEmail default 기대 — got %q", cfg.AdminEmail)
	}
}

func TestLoadConfig_AdminEmailsParse(t *testing.T) {
	t.Setenv("SUPABASE_URL", "https://example.supabase.co")
	t.Setenv("SUPABASE_ANON_KEY", "anon-key-test")
	t.Setenv("ADMIN_EMAIL", "a@x.com,b@x.com")

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig err: %v", err)
	}
	got := cfg.AdminEmails()
	if len(got) != 2 || got[0] != "a@x.com" || got[1] != "b@x.com" {
		t.Errorf("AdminEmails 콤마 split 기대 [a@x.com,b@x.com] — got %v", got)
	}
}
