// migrate-storage-scope: 기존 객체를 리소스 스코프 경로로 이관 (STORAGE.md 일관화).
//
//	v3_mobile_invitations: cover_image / gallery_photos[] / design_config(canvas·lettering)
//	  → v3-mobile-invitation/{weddingId}/{subKind}/{basename}
//	v3_memories: photo_url → v3-memory/{loungeId}/{basename}
//
// 동작: 행 단위로 (1) 계획 수립 → (2) Storage copy → (3) DB 참조 재작성 →
// (4) --purge 시 원본 삭제. copy 실패 행은 skip + 보고 (원본 참조 유지 — 안전.
// 이미 복사된 선행 사본은 미참조 고아로 남아 sweep이 정리).
// 멱등: 스코프 경로 참조는 already skip + dstKey가 결정적(basename)이라
// 부분 실패 후 재실행 시 copy 409(Duplicate)는 성공으로 간주.
// --purge는 삭제 전 srcKey의 잔여 DB 참조를 검사해 공유 객체 유실을 차단.
// 외부 도메인·다른 버킷 참조는 foreign으로 보고만.
//
// 플래그: --apply 없으면 dry-run. --purge 는 --apply 에서만 유효.
// 선례: cmd/migrate-photos(DB 재작성), cmd/rebucket-photos(copy).
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"strings"

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
}

type counters struct {
	rows, migrated, already, foreign, copyFail, updateFail, purged, purgeFail int
	foreignRefs                                                              []string
}

func main() {
	_ = godotenv.Load()
	apply := flag.Bool("apply", false, "false면 dry-run")
	purge := flag.Bool("purge", false, "이관 성공 행의 원본 객체 삭제 (--apply에서만)")
	flag.Parse()
	if *purge && !*apply {
		log.Fatal("--purge 는 --apply 와 함께만 사용")
	}

	var cfg cmdConfig
	if err := envconfig.Process("", &cfg); err != nil {
		log.Fatalf("환경변수 검증 실패: %v", err)
	}
	supabaseURL := strings.TrimRight(cfg.SupabaseURL, "/")
	uploader := api.NewSupabaseStorage(supabaseURL, cfg.SupabaseServiceRoleKey)

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	c := &counters{}
	migrateInvitations(ctx, pool, uploader, cfg, supabaseURL, *apply, *purge, c)
	migrateMemories(ctx, pool, uploader, cfg, supabaseURL, *apply, *purge, c)

	fmt.Printf("\n== 결과 ==\n행 %d / 이관 %d / 기스코프 %d / 외부참조 %d / copy실패 %d / update실패 %d / purge %d (실패 %d)\n",
		c.rows, c.migrated, c.already, c.foreign, c.copyFail, c.updateFail, c.purged, c.purgeFail)
	for _, f := range c.foreignRefs {
		fmt.Printf("  foreign: %s\n", f)
	}
	if !*apply {
		fmt.Println("(dry-run — --apply 로 실제 이관)")
	}
}

// applyMoves: 계획된 copy를 전부 수행. 동일 (src,dst) 중복은 1회만,
// 409(이미 존재)는 성공 간주(재실행 멱등). 그 외 실패는 false (행 skip — 원본 참조 유지).
func applyMoves(ctx context.Context, up api.StorageUploader, bucket string, moves []move, c *counters) bool {
	seen := map[move]bool{}
	for _, m := range moves {
		if seen[m] {
			continue
		}
		seen[m] = true
		if err := up.Copy(ctx, bucket, m.srcKey, bucket, m.dstKey); err != nil {
			if isDuplicateCopyErr(err) {
				log.Printf("  copy 생략(목적지 기존재 — 이전 시도 사본) %s → %s", m.srcKey, m.dstKey)
				continue
			}
			log.Printf("  copy 실패 %s → %s: %v", m.srcKey, m.dstKey, err)
			c.copyFail++
			return false
		}
	}
	return true
}

// purgeMoves: 원본 삭제 전 srcKey가 DB 어디서도 더 이상 참조되지 않는지 검사 —
// 여러 행이 같은 객체를 참조하는 경우의 유실 차단 (V3 리뷰).
func purgeMoves(ctx context.Context, pool *pgxpool.Pool, up api.StorageUploader, bucket string, moves []move, c *counters) {
	seen := map[string]bool{}
	for _, m := range moves {
		if seen[m.srcKey] {
			continue
		}
		seen[m.srcKey] = true
		var refs int
		err := pool.QueryRow(ctx, `
			SELECT (SELECT count(*) FROM v3_mobile_invitations
			         WHERE cover_image LIKE '%'||$1 OR gallery_photos::text LIKE '%'||$1 OR design_config::text LIKE '%'||$1)
			     + (SELECT count(*) FROM v3_memories WHERE photo_url LIKE '%'||$1)`, m.srcKey).Scan(&refs)
		if err != nil {
			log.Printf("  purge 보류(참조 검사 실패) %s: %v", m.srcKey, err)
			c.purgeFail++
			continue
		}
		if refs > 0 {
			log.Printf("  purge 보류(잔여 참조 %d건) %s", refs, m.srcKey)
			continue
		}
		if err := up.Delete(ctx, bucket, m.srcKey); err != nil {
			log.Printf("  purge 실패(잔존 — sweep 대상) %s: %v", m.srcKey, err)
			c.purgeFail++
			continue
		}
		c.purged++
	}
}

func migrateInvitations(ctx context.Context, pool *pgxpool.Pool, up api.StorageUploader, cfg cmdConfig, supabaseURL string, apply, purge bool, c *counters) {
	rows, err := pool.Query(ctx, `
		SELECT id, wedding_id, COALESCE(cover_image,''), COALESCE(gallery_photos,'[]'::jsonb)::text, COALESCE(design_config,'{}'::jsonb)::text
		FROM v3_mobile_invitations ORDER BY created_at`)
	if err != nil {
		log.Fatalf("invitations query: %v", err)
	}
	defer rows.Close()

	type row struct {
		id, weddingID, cover, galleryJSON, designJSON string
	}
	var list []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.weddingID, &r.cover, &r.galleryJSON, &r.designJSON); err != nil {
			log.Fatalf("scan: %v", err)
		}
		list = append(list, r)
	}

	bucket := cfg.UploadBucketPublic
	for _, r := range list {
		c.rows++
		prefix := func(subKind string) string {
			return "v3-mobile-invitation/" + r.weddingID + "/" + subKind + "/"
		}
		var moves []move
		newCover := r.cover
		coverChanged := false
		if r.cover != "" {
			if newRef, mv, status := planRef(r.cover, supabaseURL, bucket, prefix("cover")); status == "migrate" {
				newCover, coverChanged = newRef, true
				moves = append(moves, *mv)
			} else {
				tally(c, status, r.cover)
			}
		}

		galleryOut, galleryChanged, err := rewriteGalleryJSON(r.galleryJSON, func(ref string) (string, bool) {
			newRef, mv, status := planRef(ref, supabaseURL, bucket, prefix("gallery"))
			if status != "migrate" {
				tally(c, status, ref)
				return "", false
			}
			moves = append(moves, *mv)
			return newRef, true
		})
		if err != nil {
			log.Printf("invitation %s: gallery 파싱 실패 skip: %v", r.id, err)
			continue
		}

		newDesign, designChanged, err := rewriteDesignConfigJSON([]byte(r.designJSON), func(ref, subKind string) (string, bool) {
			newRef, mv, status := planRef(ref, supabaseURL, bucket, prefix(subKind))
			if status != "migrate" {
				tally(c, status, ref)
				return "", false
			}
			moves = append(moves, *mv)
			return newRef, true
		})
		if err != nil {
			log.Printf("invitation %s: design_config 파싱 실패 skip: %v", r.id, err)
			continue
		}

		if len(moves) == 0 {
			continue
		}
		fmt.Printf("invitation %s (wedding %s): %d개 이관\n", r.id, r.weddingID, len(moves))
		for _, m := range moves {
			fmt.Printf("  %s → %s\n", m.srcKey, m.dstKey)
		}
		if !apply {
			c.migrated += len(moves)
			continue
		}
		if !applyMoves(ctx, up, bucket, moves, c) {
			continue
		}
		_, err = pool.Exec(ctx, `
			UPDATE v3_mobile_invitations
			SET cover_image = CASE WHEN $2 THEN $3 ELSE cover_image END,
			    gallery_photos = CASE WHEN $4 THEN $5::jsonb ELSE gallery_photos END,
			    design_config = CASE WHEN $6 THEN $7::jsonb ELSE design_config END
			WHERE id = $1`,
			r.id, coverChanged, newCover, galleryChanged, galleryOut, designChanged, string(newDesign))
		if err != nil {
			log.Printf("invitation %s: UPDATE 실패(사본은 sweep 대상으로 잔존): %v", r.id, err)
			c.updateFail++
			continue
		}
		c.migrated += len(moves)
		if purge {
			purgeMoves(ctx, pool, up, bucket, moves, c)
		}
	}
}

func migrateMemories(ctx context.Context, pool *pgxpool.Pool, up api.StorageUploader, cfg cmdConfig, supabaseURL string, apply, purge bool, c *counters) {
	rows, err := pool.Query(ctx, `
		SELECT id, lounge_id, photo_url FROM v3_memories
		WHERE photo_url IS NOT NULL AND photo_url <> '' ORDER BY created_at`)
	if err != nil {
		log.Fatalf("memories query: %v", err)
	}
	defer rows.Close()

	type row struct{ id, loungeID, photoURL string }
	var list []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.loungeID, &r.photoURL); err != nil {
			log.Fatalf("scan: %v", err)
		}
		list = append(list, r)
	}

	bucket := cfg.UploadBucketPublic
	for _, r := range list {
		c.rows++
		prefix := "v3-memory/" + r.loungeID + "/"
		newRef, mv, status := planRef(r.photoURL, supabaseURL, bucket, prefix)
		if status != "migrate" {
			tally(c, status, r.photoURL)
			continue
		}
		fmt.Printf("memory %s (lounge %s): %s → %s\n", r.id, r.loungeID, mv.srcKey, mv.dstKey)
		if !apply {
			c.migrated++
			continue
		}
		if !applyMoves(ctx, up, bucket, []move{*mv}, c) {
			continue
		}
		if _, err := pool.Exec(ctx, `UPDATE v3_memories SET photo_url = $2 WHERE id = $1`, r.id, newRef); err != nil {
			log.Printf("memory %s: UPDATE 실패(사본은 sweep 대상으로 잔존): %v", r.id, err)
			c.updateFail++
			continue
		}
		c.migrated++
		if purge {
			purgeMoves(ctx, pool, up, bucket, []move{*mv}, c)
		}
	}
}

func tally(c *counters, status, ref string) {
	switch status {
	case "already":
		c.already++
	case "foreign":
		c.foreign++
		if len(c.foreignRefs) < 50 {
			c.foreignRefs = append(c.foreignRefs, ref)
		}
	}
}
