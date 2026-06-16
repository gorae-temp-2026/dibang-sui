// sweep-storage-orphans: DB가 참조하지 않는 스토리지 객체 점검·정리 (STORAGE.md "정리는 서버 몫").
//
// 참조 출처: v3_mobile_invitations(cover_image·gallery_photos·design_config),
// v3_memories(photo_url), v3_shared_photos(storage_path), v3_mobile_invitation_photos(storage_path).
// URL·key 양형식 모두 정규화해 비교한다.
//
// 기본은 보고 전용. --delete 는 v3-tmp 만료분(미참조 + 유예 경과)만 삭제 —
// 일반 고아(orphan)는 항상 보고만 하며, 삭제 확장은 사용자 승인 후 별도 결정.
// 유예(--grace-hours, 기본 48h)는 업로드 직후·저장 전 상태를 보호한다.
//
// 주기 구동: pg_cron은 storage API 삭제를 직접 못 하므로 본 도구를 외부 스케줄
// (cron/CI)로 실행하는 방식을 채택 — 선례: cmd/migrate-storage-scope.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"

	api "gorae-api/server"
)

// cmdConfig — 본 도구가 사용하는 env 부분집합. 컨벤션: _code_convention/ENV_MANAGEMENT.md
type cmdConfig struct {
	DatabaseURL            string `envconfig:"DATABASE_URL"              required:"true"`
	SupabaseURL            string `envconfig:"SUPABASE_URL"              required:"true"`
	SupabaseServiceRoleKey string `envconfig:"SUPABASE_SERVICE_ROLE_KEY" required:"true"`
	UploadBucketPublic     string `envconfig:"UPLOAD_BUCKET_PUBLIC" default:"v3-uploads-public"`
	UploadBucketPrivate    string `envconfig:"UPLOAD_BUCKET_PRIVATE" default:"v3-uploads-private"`
}

func main() {
	_ = godotenv.Load()
	del := flag.Bool("delete", false, "v3-tmp 만료분 삭제 (기본: 보고 전용)")
	graceHours := flag.Int("grace-hours", 48, "미참조 객체 유예 시간")
	flag.Parse()

	var cfg cmdConfig
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("환경변수 검증 실패: %v", err)
	}
	supabaseURL := strings.TrimRight(cfg.SupabaseURL, "/")
	buckets := []string{cfg.UploadBucketPublic, cfg.UploadBucketPrivate}
	uploader := api.NewSupabaseStorage(supabaseURL, cfg.SupabaseServiceRoleKey)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	referenced := collectReferencedKeys(ctx, pool, supabaseURL, buckets)
	log.Printf("참조 key %d개 수집", len(referenced))

	grace := time.Duration(*graceHours) * time.Hour
	now := time.Now()
	counts := map[string]int{}
	var tmpExpired []struct{ bucket, key string }
	var orphans []string

	for _, bucket := range buckets {
		rows, err := pool.Query(ctx, `SELECT name, created_at FROM storage.objects WHERE bucket_id=$1`, bucket)
		if err != nil {
			log.Fatalf("storage.objects(%s): %v", bucket, err)
		}
		for rows.Next() {
			var name string
			var createdAt time.Time
			if err := rows.Scan(&name, &createdAt); err != nil {
				log.Fatalf("scan: %v", err)
			}
			cls := classifyObject(name, createdAt, now, grace, referenced)
			counts[cls]++
			switch cls {
			case "tmp-expired":
				tmpExpired = append(tmpExpired, struct{ bucket, key string }{bucket, name})
			case "orphan":
				if len(orphans) < 200 {
					orphans = append(orphans, bucket+"/"+name)
				}
			}
		}
		rows.Close()
	}

	fmt.Printf("\n== 분류 ==\nreferenced %d / grace %d / tmp-expired %d / orphan %d\n",
		counts["referenced"], counts["grace"], counts["tmp-expired"], counts["orphan"])
	for _, o := range orphans {
		fmt.Printf("  orphan(보고만): %s\n", o)
	}
	for _, te := range tmpExpired {
		fmt.Printf("  tmp-expired: %s/%s\n", te.bucket, te.key)
	}

	if !*del {
		fmt.Println("(보고 전용 — --delete 로 tmp-expired 삭제)")
		return
	}
	deleted, failed := 0, 0
	for _, te := range tmpExpired {
		if err := uploader.Delete(ctx, te.bucket, te.key); err != nil {
			log.Printf("  삭제 실패 %s/%s: %v", te.bucket, te.key, err)
			failed++
			continue
		}
		deleted++
	}
	fmt.Printf("tmp-expired 삭제 %d (실패 %d)\n", deleted, failed)
}

// collectReferencedKeys: DB의 모든 스토리지 참조를 key 집합으로 수집.
func collectReferencedKeys(ctx context.Context, pool *pgxpool.Pool, supabaseURL string, buckets []string) map[string]bool {
	refs := map[string]bool{}
	add := func(ref string) {
		if k := normalizeRefToKey(ref, supabaseURL, buckets); k != "" {
			refs[k] = true
		}
	}

	// invitations: cover + gallery(jsonb 배열) + design_config 내 image_url 전부
	rows, err := pool.Query(ctx, `
		SELECT COALESCE(cover_image,''),
		       COALESCE(gallery_photos,'[]'::jsonb)::text,
		       COALESCE(design_config,'{}'::jsonb)::text
		FROM v3_mobile_invitations`)
	if err != nil {
		log.Fatalf("invitations: %v", err)
	}
	for rows.Next() {
		var cover, galleryJSON, designJSON string
		if err := rows.Scan(&cover, &galleryJSON, &designJSON); err != nil {
			log.Fatalf("scan: %v", err)
		}
		add(cover)
		for _, ref := range extractJSONStrings(galleryJSON) {
			add(ref)
		}
		for _, ref := range extractImageURLs(designJSON) {
			add(ref)
		}
	}
	rows.Close()

	for _, q := range []string{
		`SELECT COALESCE(photo_url,'') FROM v3_memories`,
		`SELECT storage_path FROM v3_shared_photos`,
		`SELECT storage_path FROM v3_mobile_invitation_photos`,
	} {
		rows, err := pool.Query(ctx, q)
		if err != nil {
			log.Fatalf("%s: %v", q, err)
		}
		for rows.Next() {
			var ref string
			if err := rows.Scan(&ref); err != nil {
				log.Fatalf("scan: %v", err)
			}
			add(ref)
		}
		rows.Close()
	}
	return refs
}
