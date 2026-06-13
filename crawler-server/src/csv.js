const CSV_COLUMNS = ['평점', '제목', '내용', '작성자', '작성일', '도움됨'];

function escapeCell(value) {
  let str = String(value ?? '').replace(/\r\n/g, ' ').replace(/\r|\n/g, ' ');
  // CSV 수식 인젝션 방지: 리뷰 내용은 외부 작성자가 통제하므로 =,+,-,@로 시작하면 무력화
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function reviewsToCsv(reviews) {
  const header = CSV_COLUMNS.join(',');
  const rows = reviews.map(r =>
    [r.rating, r.title, r.content, r.author, r.date, r.helpfulCount]
      .map(escapeCell)
      .join(',')
  );
  return '﻿' + [header, ...rows].join('\r\n');
}
