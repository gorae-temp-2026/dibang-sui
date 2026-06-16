package api

import (
	"sort"
	"time"
)

// sortActivitiesDesc sorts merged activities by CreatedAt desc (stable).
func sortActivitiesDesc(items []AdminActivity) {
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
}

// parseRFC3339 wraps time.Parse for nullable Supabase timestamps.
func parseRFC3339(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, s)
}
