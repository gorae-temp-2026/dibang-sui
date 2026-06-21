package api

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 회귀: simple_protocol에서 UpdateInvitation의 jsonb 컬럼
// (gallery_photos, cover_text_config)을 COALESCE($n, col)로 갱신하면
// []byte→bytea 인코딩과 jsonb 타입 불일치(SQLSTATE 42846)로 깨지던 버그.
// useUpdateWedding가 wedding 저장 직후 invitation도 PATCH하므로 동일 버그가
// 이 경로에서도 발생한다. 픽스처는 raw SQL로 직접 생성, 임의 UUID 행만 정리.
func TestInvitationService_Update_JSONBColumns(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	// 정리 순서 보장: t.Cleanup은 LIFO. pool.Close를 먼저 등록(= 가장 나중 실행),
	// DELETE를 나중 등록(= 먼저 실행)해 닫힌 풀에서 DELETE되는 일을 막는다.
	t.Cleanup(func() { pool.Close() })

	wid := uuid.New()
	iid := uuid.New()
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	ipg := pgtype.UUID{Bytes: iid, Valid: true}
	slug := "jsonb-test-" + iid.String()
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_mobile_invitations WHERE id = $1`, ipg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '테스트신랑', '테스트신부', DATE '2026-01-01', '12:00', '테스트홀', '테스트주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")

	_, err = pool.Exec(ctx, `
		INSERT INTO v3_mobile_invitations (id, wedding_id, design_template_id, slug)
		VALUES ($1, $2, 'default', $3)`, ipg, wpg, slug)
	require.NoError(t, err, "픽스처 invitation 생성")

	svc := NewInvitationService(pool)

	photos := []string{"https://example.com/a.png", "https://example.com/b.png"}
	fontSize := 24
	coverText := "테스트 커버 문구"
	updated, err := svc.Update(ctx, openapi_types.UUID(iid), &UpdateInvitationRequest{
		GalleryPhotos:   &photos,
		CoverTextConfig: &CoverTextConfig{FontSize: &fontSize, Text: &coverText},
	})

	// FIX 전: gallery_photos/cover_text_config jsonb COALESCE에서 42846(RED).
	// FIX 후: 정상 갱신(GREEN).
	require.NoError(t, err, "jsonb gallery_photos/cover_text_config Update가 42846 없이 성공해야 한다")
	require.NotNil(t, updated)
	require.NotNil(t, updated.GalleryPhotos)
	assert.Equal(t, photos, *updated.GalleryPhotos)
	require.NotNil(t, updated.CoverTextConfig)
	require.NotNil(t, updated.CoverTextConfig.Text)
	assert.Equal(t, "테스트 커버 문구", *updated.CoverTextConfig.Text)
}

func TestInvitationService_Update_DesignConfig(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	wid := uuid.New()
	iid := uuid.New()
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	ipg := pgtype.UUID{Bytes: iid, Valid: true}
	slug := "design-cfg-test-" + iid.String()
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_mobile_invitations WHERE id = $1`, ipg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '테스트신랑', '테스트신부', DATE '2026-01-01', '12:00', '테스트홀', '테스트주소')`, wpg)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO v3_mobile_invitations (id, wedding_id, design_template_id, slug)
		VALUES ($1, $2, 'default', $3)`, ipg, wpg, slug)
	require.NoError(t, err)

	svc := NewInvitationService(pool)

	// design_config 저장
	animation := DesignConfigLetteringAnimationFadeIn
	source := Upload
	imgURL := "https://example.com/lettering.png"
	bg := "#ffffff"
	textColor := "#222222"
	btnColor := "#222222"
	accentColor := "#b08968"
	titleFont := "Pretendard"
	subtitleFont := "Nanum Myeongjo"
	bodyFont := "Gowun Batang"

	designCfg := &DesignConfig{
		Lettering: &struct {
			Animation   *DesignConfigLetteringAnimation `json:"animation,omitempty"`
			DrawViewBox *struct {
				Height *float32 `json:"height,omitempty"`
				Width  *float32 `json:"width,omitempty"`
			} `json:"draw_view_box,omitempty"`
			Height   *float32                     `json:"height,omitempty"`
			ImageUrl *string                      `json:"image_url,omitempty"`
			Rotation *float32                     `json:"rotation,omitempty"`
			Source   *DesignConfigLetteringSource `json:"source,omitempty"`
			Strokes  *[]struct {
				Color  *string `json:"color,omitempty"`
				D      *string `json:"d,omitempty"`
				Points *[]struct {
					T *float32 `json:"t,omitempty"`
					X *float32 `json:"x,omitempty"`
					Y *float32 `json:"y,omitempty"`
				} `json:"points,omitempty"`
				Tool  *DesignConfigLetteringStrokesTool `json:"tool,omitempty"`
				Width *float32                          `json:"width,omitempty"`
			} `json:"strokes,omitempty"`
			Width *float32 `json:"width,omitempty"`
			X     *float32 `json:"x,omitempty"`
			Y     *float32 `json:"y,omitempty"`
		}{
			Animation: &animation,
			Source:    &source,
			ImageUrl:  &imgURL,
		},
		Theme: &struct {
			Colors *struct {
				Accent     *string `json:"accent,omitempty"`
				Background *string `json:"background,omitempty"`
				Button     *string `json:"button,omitempty"`
				Text       *string `json:"text,omitempty"`
			} `json:"colors,omitempty"`
			Fonts *struct {
				Body     *string `json:"body,omitempty"`
				Subtitle *string `json:"subtitle,omitempty"`
				Title    *string `json:"title,omitempty"`
			} `json:"fonts,omitempty"`
		}{
			Colors: &struct {
				Accent     *string `json:"accent,omitempty"`
				Background *string `json:"background,omitempty"`
				Button     *string `json:"button,omitempty"`
				Text       *string `json:"text,omitempty"`
			}{
				Background: &bg,
				Text:       &textColor,
				Button:     &btnColor,
				Accent:     &accentColor,
			},
			Fonts: &struct {
				Body     *string `json:"body,omitempty"`
				Subtitle *string `json:"subtitle,omitempty"`
				Title    *string `json:"title,omitempty"`
			}{
				Title:    &titleFont,
				Subtitle: &subtitleFont,
				Body:     &bodyFont,
			},
		},
		Sections: &[]struct {
			Enabled bool                    `json:"enabled"`
			Key     DesignConfigSectionsKey `json:"key"`
			Order   int                     `json:"order"`
		}{
			{Key: DesignConfigSectionsKeyGreeting, Enabled: true, Order: 0},
			{Key: DesignConfigSectionsKeyGallery, Enabled: true, Order: 1},
			{Key: DesignConfigSectionsKeyLocation, Enabled: false, Order: 2},
			{Key: DesignConfigSectionsKeyAccount, Enabled: true, Order: 3},
		},
	}

	updated, err := svc.Update(ctx, openapi_types.UUID(iid), &UpdateInvitationRequest{
		DesignConfig: designCfg,
	})
	require.NoError(t, err, "design_config Update가 성공해야 한다")
	require.NotNil(t, updated)
	require.NotNil(t, updated.DesignConfig, "응답에 design_config가 포함되어야 한다")
	require.NotNil(t, updated.DesignConfig.Lettering)
	assert.Equal(t, &imgURL, updated.DesignConfig.Lettering.ImageUrl)
	require.NotNil(t, updated.DesignConfig.Theme)
	require.NotNil(t, updated.DesignConfig.Theme.Fonts)
	assert.Equal(t, &titleFont, updated.DesignConfig.Theme.Fonts.Title)
	require.NotNil(t, updated.DesignConfig.Sections)
	assert.Len(t, *updated.DesignConfig.Sections, 4)

	// nil design_config로 Update → 기존 값 보존. (낙관잠금: 첫 update 응답 version을 실어 보낸다)
	updated2, err := svc.Update(ctx, openapi_types.UUID(iid), &UpdateInvitationRequest{
		CustomMessage: ptrString("hello"),
		Version:       updated.Version,
	})
	require.NoError(t, err)
	require.NotNil(t, updated2.DesignConfig, "design_config가 nil 업데이트로 사라지면 안 됨")
	assert.Equal(t, &imgURL, updated2.DesignConfig.Lettering.ImageUrl)
}

func ptrString(s string) *string { return &s }
