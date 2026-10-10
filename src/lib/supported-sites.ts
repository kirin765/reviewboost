export const supportedSites = [
  { key: "coupang", name: "쿠팡", domain: "www.coupang.com", page: "상품 상세 페이지" },
  { key: "smartstore", name: "스마트스토어·브랜드스토어", domain: "smartstore.naver.com · brand.naver.com", page: "상품 상세 페이지" },
  { key: "musinsa", name: "무신사", domain: "www.musinsa.com", page: "상품 상세 페이지" },
  { key: "29cm", name: "29CM", domain: "www.29cm.co.kr", page: "상품 상세 페이지" },
  { key: "gmarket", name: "G마켓", domain: "item.gmarket.co.kr", page: "상품 상세 페이지" },
  { key: "auction", name: "옥션", domain: "itempage3.auction.co.kr", page: "상품 상세 페이지" },
  { key: "11st", name: "11번가", domain: "www.11st.co.kr", page: "상품 상세 페이지" },
  { key: "ssg", name: "SSG닷컴", domain: "www.ssg.com", page: "상품 상세 페이지" },
  { key: "ohou", name: "오늘의집", domain: "store.ohou.se", page: "상품 상세 페이지" },
  { key: "curly", name: "컬리", domain: "www.kurly.com", page: "상품 상세 페이지" },
  { key: "oliveyoung", name: "올리브영", domain: "www.oliveyoung.co.kr", page: "PC 상품 상세 페이지 · 확장 1.5.2 이상" }
] as const;

export const extensionStores = [
  { name: "Chrome", url: "https://chromewebstore.google.com/detail/kdmjkpfbccikgbaemcbifemeichmehlm" },
  { name: "Edge", url: "https://microsoftedge.microsoft.com/addons/detail/miocbdjngjgioklfjoimedfjmlfmhdli" },
  { name: "Whale", url: "https://store.whale.naver.com/detail/bkenmdkiidkgeopjnaaafomacfjfciai" },
  { name: "Firefox", url: "https://addons.mozilla.org/en-US/firefox/addon/reviewboost-%EB%A6%AC%EB%B7%B0-%EC%88%98%EC%A7%91%EA%B8%B0/" }
] as const;

export const extensionDescription = "쿠팡·스마트스토어·무신사·올리브영 등 11개 쇼핑몰의 상품 리뷰를 CSV·엑셀로 다운로드하세요. ReviewBoost 확장 프로그램의 지원 사이트, 설치 방법과 무료 수집 한도를 확인할 수 있습니다.";
