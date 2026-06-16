package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

// AuthUserMeta holds the auth.users metadata that v3_users does not carry.
// Populated from Supabase GoTrue Admin API (/auth/v1/admin/users/{id}).
type AuthUserMeta struct {
	ID             string                 `json:"id"`
	Email          string                 `json:"email"`
	Provider       string                 `json:"provider"`
	LastSignInAt   *string                `json:"last_sign_in_at"`
	CreatedAt      string                 `json:"created_at"`
	UserMetadata   map[string]any `json:"user_metadata,omitempty"`
	AppMetadata    map[string]any `json:"app_metadata,omitempty"`
	BannedUntil    *string                `json:"banned_until"`
}

// SupabaseAdminClient calls Supabase GoTrue Admin endpoints with the
// service_role key. service_role must never leak to the browser; this
// client lives in the backend only.
type SupabaseAdminClient struct {
	BaseURL        string // e.g., https://xxx.supabase.co
	ServiceRoleKey string
	HTTPClient     *http.Client
	// Concurrency cap for ListAuthUsers fan-out. Defaults to 8 when zero.
	Concurrency int
}

// NewSupabaseAdminClient constructs a client. Falls back to the package-wide
// supabaseHTTPClient when no override is supplied.
func NewSupabaseAdminClient(baseURL, serviceRoleKey string) *SupabaseAdminClient {
	return &SupabaseAdminClient{
		BaseURL:        strings.TrimRight(baseURL, "/"),
		ServiceRoleKey: serviceRoleKey,
		HTTPClient:     supabaseHTTPClient,
		Concurrency:    8,
	}
}

// GetAuthUser fetches one auth user by id.
// Returns a non-nil error only on transport or 5xx; 404 returns (zero, nil)
// so callers can treat a missing auth row as "no metadata".
func (c *SupabaseAdminClient) GetAuthUser(ctx context.Context, id string) (AuthUserMeta, error) {
	if c == nil || c.ServiceRoleKey == "" {
		return AuthUserMeta{}, fmt.Errorf("supabase admin: missing service role key")
	}
	if strings.TrimSpace(id) == "" {
		return AuthUserMeta{}, fmt.Errorf("supabase admin: empty user id")
	}
	endpoint := fmt.Sprintf("%s/auth/v1/admin/users/%s", c.BaseURL, url.PathEscape(id))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return AuthUserMeta{}, err
	}
	req.Header.Set("apikey", c.ServiceRoleKey)
	req.Header.Set("Authorization", "Bearer "+c.ServiceRoleKey)

	resp, err := c.client().Do(req)
	if err != nil {
		return AuthUserMeta{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return AuthUserMeta{}, nil
	}
	if resp.StatusCode >= 400 {
		return AuthUserMeta{}, fmt.Errorf("supabase admin: GetAuthUser %s → %d", id, resp.StatusCode)
	}

	var meta AuthUserMeta
	if err := json.NewDecoder(resp.Body).Decode(&meta); err != nil {
		return AuthUserMeta{}, fmt.Errorf("supabase admin: decode: %w", err)
	}
	// GoTrue returns identity providers in app_metadata.providers / app_metadata.provider.
	if meta.Provider == "" {
		if p, ok := meta.AppMetadata["provider"].(string); ok {
			meta.Provider = p
		}
	}
	return meta, nil
}

// ListAuthUsers fetches metadata for multiple ids with bounded concurrency.
// Partial failures are logged (caller decides UX); only the transport setup
// can produce an error. Returns map keyed by user id; missing ids are absent.
func (c *SupabaseAdminClient) ListAuthUsers(ctx context.Context, ids []string) (map[string]AuthUserMeta, error) {
	result := make(map[string]AuthUserMeta, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	if c == nil || c.ServiceRoleKey == "" {
		return result, fmt.Errorf("supabase admin: missing service role key")
	}
	limit := c.Concurrency
	if limit <= 0 {
		limit = 8
	}
	sem := make(chan struct{}, limit)
	var wg sync.WaitGroup
	var mu sync.Mutex
	for _, id := range ids {
		if strings.TrimSpace(id) == "" {
			continue
		}
		wg.Add(1)
		sem <- struct{}{}
		go func(uid string) {
			defer wg.Done()
			defer func() { <-sem }()
			meta, err := c.GetAuthUser(ctx, uid)
			if err != nil {
				// Partial failure: skip and let caller render without metadata.
				return
			}
			if meta.ID == "" {
				return
			}
			mu.Lock()
			result[uid] = meta
			mu.Unlock()
		}(id)
	}
	wg.Wait()
	return result, nil
}

func (c *SupabaseAdminClient) client() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return supabaseHTTPClient
}
