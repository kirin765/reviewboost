const STOPWORDS = new Set([
  "정말",
  "너무",
  "진짜",
  "그냥",
  "근데",
  "그리고",
  "그래서",
  "하지만",
  "합니다",
  "했습니다",
  "했어요",
  "있어요",
  "있음",
  "없음",
  "같아요",
  "좋아요",
  "별로",
  "제품",
  "구매",
  "사용",
  "배송",
  "주문"
]);

const PARTICLE_SUFFIXES = [
  "으로",
  "에서",
  "에게",
  "한테",
  "부터",
  "까지",
  "처럼",
  "보다",
  "으로는",
  "로",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "에",
  "도",
  "만",
  "과",
  "와",
  "의",
  "들"
];

const SYNONYMS: Array<{ into: string; from: string[] }> = [
  { into: "배송지연", from: ["지연", "늦", "늦게", "늦어요", "늦음", "도착늦", "배송늦"] },
  { into: "파손", from: ["파손", "깨짐", "깨졌", "찌그러", "찢어", "박스파손"] },
  { into: "불량", from: ["불량", "하자", "고장", "오류", "불량품"] },
  { into: "구성품누락", from: ["누락", "빠졌", "없었", "미포함"] },
  { into: "CS응대", from: ["응대", "답변", "문의", "고객센터", "센터", "불친절"] },
  { into: "품질", from: ["품질", "재질", "마감", "내구"] },
  { into: "사이즈", from: ["사이즈", "크기", "작다", "작아요", "크다", "커요"] },
  { into: "냄새", from: ["냄새", "냄새나", "새", "악취"] },
  { into: "설명서", from: ["설명서", "설명", "가이드"] },
  { into: "설치/조립", from: ["설치", "조립", "세팅"] }
];

function normalizeToken(tok: string): string {
  let t = tok.toLowerCase().trim();
  if (!t) return "";
  // Exclude numeric/date-like fragments (e.g. 12, 2025, 12월, 2025년).
  if (/\d/.test(t)) return "";

  // strip simple particles/endings
  for (const suf of PARTICLE_SUFFIXES) {
    if (t.length > suf.length + 1 && t.endsWith(suf)) {
      t = t.slice(0, -suf.length);
      break;
    }
  }

  if (STOPWORDS.has(t)) return "";

  for (const s of SYNONYMS) {
    if (s.from.some((f) => t.includes(f))) return s.into;
  }

  return t;
}

function tokenize(text: string): string[] {
  // Hangul/Latin/digits chunks; removes punctuation.
  const tokens = (text.toLowerCase().match(/[0-9a-z가-힣]+/g) ?? []).filter((t) => t.length >= 2);
  return tokens.map(normalizeToken).filter(Boolean);
}

export function topKeywords(texts: string[], topN: number): Array<{ keyword: string; count: number }> {
  const freq = new Map<string, number>();
  const bigram = new Map<string, number>();

  for (const t of texts) {
    const toks = tokenize(t);
    for (const tok of toks) freq.set(tok, (freq.get(tok) ?? 0) + 1);
    for (let i = 0; i + 1 < toks.length; i++) {
      const a = toks[i]!;
      const b = toks[i + 1]!;
      if (a === b) continue;
      const phrase = `${a} ${b}`;
      bigram.set(phrase, (bigram.get(phrase) ?? 0) + 1);
    }
  }

  // Prefer phrases when they’re frequent enough.
  const merged: Array<{ keyword: string; count: number }> = [];
  for (const [k, c] of freq) merged.push({ keyword: k, count: c });
  for (const [k, c] of bigram) {
    if (c >= 3) merged.push({ keyword: k, count: c });
  }

  return merged.sort((a, b) => b.count - a.count).slice(0, topN);
}
