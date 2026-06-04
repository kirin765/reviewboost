const CSV_COLUMNS = ['평점', '제목', '내용', '작성자', '작성일', '도움됨'];

function escapeCell(value) {
  const str = String(value ?? '').replace(/\r\n/g, ' ').replace(/\r|\n/g, ' ');
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
