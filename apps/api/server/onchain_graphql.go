package api

// 온체인 읽기 프록시(/onchain/*) 의 Sui GraphQL 업스트림 클라이언트.
// gRPC는 이벤트 타입쿼리 불가, JSON-RPC는 2026-07-31 sunset → GraphQL 채택.
// 서버-투-서버라 CORS 무관. 핸들러는 OnchainReader 인터페이스에 의존 → 테스트에서 fake 주입.
//
// 검증된 쿼리 shape(graphql.testnet.sui.io/graphql, 2026-07-01):
//   - object(address:){ asMoveObject { contents { json } } }   // 최상위 contents 없음, asMoveObject 경유. 미존재 시 object=null
//   - address(address:){ objects(filter:{type:}, first:50, after:){ nodes { address contents{json} } pageInfo{hasNextPage endCursor} } }
//   - events(filter:{type:}, first:50, after:){ nodes { contents{json} } pageInfo{hasNextPage endCursor} }   // EventFilter 필드명은 type
//   - address(address:){ balance(coinType:"0x2::sui::SUI"){ totalBalance } }
// contents.json 의 필드는 snake_case(event_id·primary_host 등) — SDK queries.ts parsedJson 과 동일 키.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// OnchainReader 는 Sui 온체인 읽기 추상화(핸들러 의존 대상).
type OnchainReader interface {
	// Object 는 오브젝트의 Move 필드(json)를 반환. 미존재 시 (nil, nil).
	Object(ctx context.Context, objectID string) (map[string]any, error)
	// OwnedObjects 는 owner 소유의 structType 오브젝트 전량(페이지네이션).
	OwnedObjects(ctx context.Context, owner, structType string) ([]OwnedObject, error)
	// Events 는 eventType 이벤트 전량의 contents.json(페이지네이션).
	Events(ctx context.Context, eventType string) ([]map[string]any, error)
	// Balance 는 owner 의 SUI 잔액(MIST 문자열). 없으면 "0".
	Balance(ctx context.Context, owner string) (string, error)
}

// OwnedObject 는 소유 오브젝트 1건(ID + Move 필드).
type OwnedObject struct {
	ID     string
	Fields map[string]any
}

const (
	gqlObject  = `query($id: SuiAddress!) { object(address: $id) { asMoveObject { contents { json } } } }`
	gqlOwned   = `query($owner: SuiAddress!, $type: String!, $after: String) { address(address: $owner) { objects(filter: {type: $type}, first: 50, after: $after) { nodes { address contents { json } } pageInfo { hasNextPage endCursor } } } }`
	gqlEvents  = `query($type: String!, $after: String) { events(filter: {type: $type}, first: 50, after: $after) { nodes { contents { json } } pageInfo { hasNextPage endCursor } } }`
	gqlBalance = `query($owner: SuiAddress!) { address(address: $owner) { balance(coinType: "0x2::sui::SUI") { totalBalance } } }`
)

// suiGraphQL 은 OnchainReader 의 HTTP 구현.
type suiGraphQL struct {
	url      string
	http     *http.Client
	maxRetry int
}

var _ OnchainReader = (*suiGraphQL)(nil)

// NewSuiGraphQL 은 GraphQL 업스트림 URL로 클라이언트를 만든다.
func NewSuiGraphQL(url string) *suiGraphQL {
	return &suiGraphQL{
		url:      url,
		http:     &http.Client{Timeout: 15 * time.Second},
		maxRetry: 3,
	}
}

// jsonContents 는 { contents { json } } 공통 파싱 조각.
type jsonContents struct {
	JSON map[string]any `json:"json"`
}

type pageInfo struct {
	HasNextPage bool    `json:"hasNextPage"`
	EndCursor   *string `json:"endCursor"`
}

// doGraphQL 은 POST 후 data 를 out 으로 언마샬. 429/5xx/네트워크는 지수 백오프 재시도.
func (c *suiGraphQL) doGraphQL(ctx context.Context, query string, vars map[string]any, out any) error {
	body, err := json.Marshal(map[string]any{"query": query, "variables": vars})
	if err != nil {
		return err
	}
	var lastErr error
	backoff := 200 * time.Millisecond
	for attempt := 0; attempt <= c.maxRetry; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
				backoff *= 2
			}
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(body))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := c.http.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		data, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("graphql upstream status %d", resp.StatusCode)
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("graphql upstream status %d: %s", resp.StatusCode, truncateBytes(data, 200))
		}
		var envelope struct {
			Data   json.RawMessage `json:"data"`
			Errors []struct {
				Message string `json:"message"`
			} `json:"errors"`
		}
		if err := json.Unmarshal(data, &envelope); err != nil {
			return fmt.Errorf("graphql decode: %w", err)
		}
		if len(envelope.Errors) > 0 {
			return fmt.Errorf("graphql error: %s", envelope.Errors[0].Message)
		}
		return json.Unmarshal(envelope.Data, out)
	}
	return fmt.Errorf("graphql failed after %d retries: %w", c.maxRetry, lastErr)
}

func (c *suiGraphQL) Object(ctx context.Context, objectID string) (map[string]any, error) {
	var out struct {
		Object *struct {
			AsMoveObject *struct {
				Contents *jsonContents `json:"contents"`
			} `json:"asMoveObject"`
		} `json:"object"`
	}
	if err := c.doGraphQL(ctx, gqlObject, map[string]any{"id": objectID}, &out); err != nil {
		return nil, err
	}
	if out.Object == nil || out.Object.AsMoveObject == nil || out.Object.AsMoveObject.Contents == nil {
		return nil, nil // 미존재 → null 계약
	}
	return out.Object.AsMoveObject.Contents.JSON, nil
}

func (c *suiGraphQL) OwnedObjects(ctx context.Context, owner, structType string) ([]OwnedObject, error) {
	result := []OwnedObject{}
	var after *string
	for {
		var out struct {
			Address *struct {
				Objects struct {
					Nodes []struct {
						Address  string        `json:"address"`
						Contents *jsonContents `json:"contents"`
					} `json:"nodes"`
					PageInfo pageInfo `json:"pageInfo"`
				} `json:"objects"`
			} `json:"address"`
		}
		vars := map[string]any{"owner": owner, "type": structType, "after": after}
		if err := c.doGraphQL(ctx, gqlOwned, vars, &out); err != nil {
			return nil, err
		}
		if out.Address == nil {
			break
		}
		for _, n := range out.Address.Objects.Nodes {
			var f map[string]any
			if n.Contents != nil {
				f = n.Contents.JSON
			}
			result = append(result, OwnedObject{ID: n.Address, Fields: f})
		}
		pi := out.Address.Objects.PageInfo
		if !pi.HasNextPage || pi.EndCursor == nil {
			break
		}
		after = pi.EndCursor
	}
	return result, nil
}

func (c *suiGraphQL) Events(ctx context.Context, eventType string) ([]map[string]any, error) {
	result := []map[string]any{}
	var after *string
	for {
		var out struct {
			Events struct {
				Nodes []struct {
					Contents *jsonContents `json:"contents"`
				} `json:"nodes"`
				PageInfo pageInfo `json:"pageInfo"`
			} `json:"events"`
		}
		vars := map[string]any{"type": eventType, "after": after}
		if err := c.doGraphQL(ctx, gqlEvents, vars, &out); err != nil {
			return nil, err
		}
		for _, n := range out.Events.Nodes {
			if n.Contents != nil {
				result = append(result, n.Contents.JSON)
			}
		}
		pi := out.Events.PageInfo
		if !pi.HasNextPage || pi.EndCursor == nil {
			break
		}
		after = pi.EndCursor
	}
	return result, nil
}

func (c *suiGraphQL) Balance(ctx context.Context, owner string) (string, error) {
	var out struct {
		Address *struct {
			Balance *struct {
				TotalBalance string `json:"totalBalance"`
			} `json:"balance"`
		} `json:"address"`
	}
	if err := c.doGraphQL(ctx, gqlBalance, map[string]any{"owner": owner}, &out); err != nil {
		return "", err
	}
	if out.Address == nil || out.Address.Balance == nil {
		return "0", nil
	}
	return out.Address.Balance.TotalBalance, nil
}

func truncateBytes(b []byte, n int) string {
	if len(b) > n {
		return string(b[:n])
	}
	return string(b)
}
