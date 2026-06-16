// CSV 다운로드 헬퍼 — 브라우저 DOM/Blob API를 페이지 컴포넌트에서 격리한다.
// 한글 엑셀 호환을 위해 UTF-8 BOM(U+FEFF)을 선두에 부착한다.

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
