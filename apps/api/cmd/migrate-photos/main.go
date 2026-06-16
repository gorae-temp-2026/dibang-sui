// Photo Sharing T-18: 기존 평면 저장 사진 → 신규 카테고리·ID 구조로 매핑 이관.
//
// 시나리오 §4 매핑 규칙:
//   - v3_guestbook_messages.photo_url      → v3-memory/{loungeId}/{basename}
//   - v3_mobile_invitations.cover_image    → v3-mobile-invitation/{weddingId}/cover/{basename}
//   - v3_mobile_invitations.gallery_photos → v3-mobile-invitation/{weddingId}/gallery/{basename}
//   - v3-share는 신규 기능이라 이관 대상 0건.
//
// 사용:
//   go run ./cmd/migrate-photos --dry-run
//   go run ./cmd/migrate-photos --apply --uploads-dir /Users/.../digital-guestbook-v3/apps/api/uploads
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"mime"
	"os"
	"path"
	"path/filepath"
	"strings"

	api "gorae-api/server"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

// cmdConfig — migrate-photos 가 사용하는 env 부분집합.
// 컨벤션: _code_convention/ENV_MANAGEMENT.md
type cmdConfig struct {
	DatabaseURL            string `envconfig:"DATABASE_URL"              required:"true"`
	SupabaseURL            string `envconfig:"SUPABASE_URL"`              // --apply 시점에 추가 검증
	SupabaseServiceRoleKey string `envconfig:"SUPABASE_SERVICE_ROLE_KEY"` // --apply 시점에 추가 검증
	UploadBucketPublic     string `envconfig:"UPLOAD_BUCKET_PUBLIC"      default:"v3-uploads-public"`
}

func main() {
	dryRun := flag.Bool("dry-run", false, "print mapping table only (no DB/Storage writes)")
	apply := flag.Bool("apply", false, "execute Storage upload + DB UPDATE")
	envPath := flag.String("env", ".env", "path to .env (DATABASE_URL 등)")
	uploadsDir := flag.String("uploads-dir", "", "(apply only) path to legacy ./uploads/ on local disk")
	flag.Parse()

	if !*dryRun && !*apply {
		log.Fatal("specify exactly one of --dry-run or --apply")
	}
	if *dryRun && *apply {
		log.Fatal("--dry-run and --apply are mutually exclusive")
	}

	if err := godotenv.Load(*envPath); err != nil {
		log.Printf("warn: .env not loaded (%v) — using process env", err)
	}

	var cfg cmdConfig
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("환경변수 검증 실패: %v", err)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("db ping: %v", err)
	}

	plans, err := buildPlans(ctx, pool)
	if err != nil {
		log.Fatalf("buildPlans: %v", err)
	}
	printPlans(plans)

	if *dryRun {
		fmt.Println("\n[dry-run] no writes performed.")
		return
	}

	// --apply
	if *uploadsDir == "" {
		log.Fatal("--uploads-dir is required for --apply (path to legacy ./uploads/ on local disk)")
	}
	// 청사진(faea79e) 2분리: 레거시 ./uploads → mobile-invitation은 public bucket으로.
	if cfg.SupabaseURL == "" || cfg.SupabaseServiceRoleKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply")
	}
	uploader := api.NewSupabaseStorage(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)
	publicBase := strings.TrimRight(cfg.SupabaseURL, "/") + "/storage/v1/object/public/" + cfg.UploadBucketPublic + "/"

	fmt.Printf("\n=== apply (uploads-dir=%s, bucket=%s) ===\n", *uploadsDir, cfg.UploadBucketPublic)
	var okCount, missCount, failCount int
	for _, p := range plans {
		basename := path.Base(stripURLPath(p.OldPath))
		local := filepath.Join(*uploadsDir, basename)
		f, err := os.Open(local)
		if err != nil {
			missCount++
			fmt.Printf("  [MISS]   %s  (local not found: %s)\n", p.NewPath, local)
			continue
		}
		ct := mime.TypeByExtension(filepath.Ext(basename))
		if ct == "" {
			ct = "application/octet-stream"
		}
		if _, err := uploader.Upload(ctx, cfg.UploadBucketPublic, p.NewPath, ct, f); err != nil {
			_ = f.Close()
			failCount++
			fmt.Printf("  [UP FAIL] %s: %v\n", p.NewPath, err)
			continue
		}
		_ = f.Close()

		newURL := publicBase + p.NewPath
		if err := applyDBUpdate(ctx, pool, p, newURL); err != nil {
			failCount++
			fmt.Printf("  [DB FAIL] %s: %v\n", p.NewPath, err)
			continue
		}
		okCount++
		fmt.Printf("  [OK]     %s\n", p.NewPath)
	}
	fmt.Printf("\n=== apply summary ===\n  ok=%d  missing=%d  fail=%d  (total=%d)\n",
		okCount, missCount, failCount, len(plans))
}

// MigrationPlan: 한 객체의 이관 계획.
// OwnerRowID·GalleryIndex는 DB UPDATE 시점에 어느 row·어느 array index를 갈아야 하는지 결정.
type MigrationPlan struct {
	Category     string // "v3-memory" | "v3-mobile-invitation-cover" | "v3-mobile-invitation-gallery"
	OwnerID      string // loungeId 또는 weddingId (표시용)
	OldPath      string // 기존 URL 또는 경로
	NewPath      string // 신규 storage object key (bucket 내부)
	RowKind      string // 표시용 라벨
	OwnerRowID   pgtype.UUID // UPDATE 대상 row의 id (guestbook_messages.id 또는 v3_mobile_invitations.id)
	GalleryIndex int         // gallery 카테고리일 때 jsonb 배열 idx (그 외 -1)
}

func buildPlans(ctx context.Context, pool *pgxpool.Pool) ([]MigrationPlan, error) {
	var plans []MigrationPlan

	// 1) memory: guestbook_messages.photo_url
	memRows, err := pool.Query(ctx, `
        SELECT gm.id, gm.photo_url, ge.lounge_id
        FROM v3_guestbook_messages gm
        JOIN v3_guestbook_entries ge ON ge.id = gm.guestbook_entry_id
        WHERE gm.photo_url IS NOT NULL AND gm.photo_url <> ''`)
	if err != nil {
		return nil, fmt.Errorf("memory query: %w", err)
	}
	defer memRows.Close()
	for memRows.Next() {
		var id pgtype.UUID
		var photoURL string
		var loungeID pgtype.UUID
		if err := memRows.Scan(&id, &photoURL, &loungeID); err != nil {
			return nil, err
		}
		newPath := fmt.Sprintf("v3-memory/%s/%s", uuidStr(loungeID), path.Base(stripURLPath(photoURL)))
		plans = append(plans, MigrationPlan{
			Category:     "v3-memory",
			OwnerID:      uuidStr(loungeID),
			OldPath:      photoURL,
			NewPath:      newPath,
			RowKind:      "guestbook_message:" + uuidStr(id),
			OwnerRowID:   id,
			GalleryIndex: -1,
		})
	}

	// 2) mobile-invitation cover
	covRows, err := pool.Query(ctx, `
        SELECT id, wedding_id, cover_image
        FROM v3_mobile_invitations
        WHERE cover_image IS NOT NULL AND cover_image <> ''`)
	if err != nil {
		return nil, fmt.Errorf("cover query: %w", err)
	}
	defer covRows.Close()
	for covRows.Next() {
		var id, weddingID pgtype.UUID
		var cover string
		if err := covRows.Scan(&id, &weddingID, &cover); err != nil {
			return nil, err
		}
		newPath := fmt.Sprintf("v3-mobile-invitation/%s/cover/%s", uuidStr(weddingID), path.Base(stripURLPath(cover)))
		plans = append(plans, MigrationPlan{
			Category:     "v3-mobile-invitation-cover",
			OwnerID:      uuidStr(weddingID),
			OldPath:      cover,
			NewPath:      newPath,
			RowKind:      "invitation:" + uuidStr(id) + " (col=cover_image)",
			OwnerRowID:   id,
			GalleryIndex: -1,
		})
	}

	// 3) mobile-invitation gallery (jsonb array of urls)
	galRows, err := pool.Query(ctx, `
        SELECT id, wedding_id, gallery_photos
        FROM v3_mobile_invitations
        WHERE jsonb_array_length(COALESCE(gallery_photos, '[]'::jsonb)) > 0`)
	if err != nil {
		return nil, fmt.Errorf("gallery query: %w", err)
	}
	defer galRows.Close()
	for galRows.Next() {
		var id, weddingID pgtype.UUID
		var galleryJSON []byte
		if err := galRows.Scan(&id, &weddingID, &galleryJSON); err != nil {
			return nil, err
		}
		var gallery []string
		if err := json.Unmarshal(galleryJSON, &gallery); err != nil {
			continue // 비-string array면 skip
		}
		for idx, g := range gallery {
			newPath := fmt.Sprintf("v3-mobile-invitation/%s/gallery/%s", uuidStr(weddingID), path.Base(stripURLPath(g)))
			plans = append(plans, MigrationPlan{
				Category:     "v3-mobile-invitation-gallery",
				OwnerID:      uuidStr(weddingID),
				OldPath:      g,
				NewPath:      newPath,
				RowKind:      fmt.Sprintf("invitation:%s (gallery_photos[%d])", uuidStr(id), idx),
				OwnerRowID:   id,
				GalleryIndex: idx,
			})
		}
	}

	return plans, nil
}

// applyDBUpdate: Storage upload 성공한 row의 컬럼을 신규 public URL로 UPDATE.
// cover_image(text)·photo_url(text)는 단일 컬럼 치환.
// gallery_photos(jsonb array)는 jsonb_set으로 idx만 교체.
func applyDBUpdate(ctx context.Context, pool *pgxpool.Pool, p MigrationPlan, newURL string) error {
	switch p.Category {
	case "v3-memory":
		_, err := pool.Exec(ctx,
			`UPDATE v3_guestbook_messages SET photo_url=$2 WHERE id=$1`,
			p.OwnerRowID, newURL)
		return err
	case "v3-mobile-invitation-cover":
		_, err := pool.Exec(ctx,
			`UPDATE v3_mobile_invitations SET cover_image=$2 WHERE id=$1`,
			p.OwnerRowID, newURL)
		return err
	case "v3-mobile-invitation-gallery":
		// jsonb_set(target, '{idx}', to_jsonb(text)) — idx 자리만 교체
		_, err := pool.Exec(ctx, `
            UPDATE v3_mobile_invitations
            SET gallery_photos = jsonb_set(gallery_photos, ARRAY[$2::text], to_jsonb($3::text), false)
            WHERE id=$1`,
			p.OwnerRowID, fmt.Sprintf("%d", p.GalleryIndex), newURL)
		return err
	default:
		return fmt.Errorf("unknown category: %s", p.Category)
	}
}

func printPlans(plans []MigrationPlan) {
	counts := map[string]int{}
	fmt.Println("=== migrate-photos mapping ===")
	for _, p := range plans {
		counts[p.Category]++
		fmt.Printf("  [%s] %s\n    old: %s\n    new: %s\n    row: %s\n",
			p.Category, p.OwnerID, p.OldPath, p.NewPath, p.RowKind)
	}
	fmt.Println("\n=== summary ===")
	fmt.Printf("  v3-memory:                   %d\n", counts["v3-memory"])
	fmt.Printf("  v3-mobile-invitation-cover:  %d\n", counts["v3-mobile-invitation-cover"])
	fmt.Printf("  v3-mobile-invitation-gallery:%d\n", counts["v3-mobile-invitation-gallery"])
	fmt.Printf("  v3-share:                    0 (신규 기능 — 이관 대상 0)\n")
	fmt.Printf("  total:                    %d\n", len(plans))
}

func uuidStr(u pgtype.UUID) string {
	if !u.Valid {
		return "<invalid>"
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// URL이면 path 부분만, 아니면 그대로.
func stripURLPath(s string) string {
	if i := strings.Index(s, "://"); i >= 0 {
		rest := s[i+3:]
		if j := strings.Index(rest, "/"); j >= 0 {
			return rest[j:]
		}
	}
	return s
}
