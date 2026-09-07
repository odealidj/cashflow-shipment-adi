package dateutil

import (
	"fmt"
	"time"
)

var monthsIndo = [...]string{
	"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
	"Jul", "Agu", "Sep", "Okt", "Nov", "Des",
}

// FormatDateIndo formats a time.Time to uniform Indonesian date string: "7 Sep 2026", "1 Agu 2025"
func FormatDateIndo(t time.Time) string {
	if t.IsZero() {
		return "-"
	}
	m := int(t.Month())
	if m < 1 || m > 12 {
		return t.Format("2 Jan 2006")
	}
	return fmt.Sprintf("%d %s %d", t.Day(), monthsIndo[m], t.Year())
}
