// Public product facts shared by the landing page, JSON-LD and llms.txt.
// Limits are checked against the extension configuration in extension.test.tsx.
export const extensionProduct = {
  name: "ReviewBoost 리뷰 수집기",
  path: "/extension",
  updatedAt: "2026-10-14",
  description: "쿠팡·스마트스토어·무신사 등 12개 쇼핑몰의 상품 리뷰를 엑셀(.xlsx)과 CSV로 저장하는 Chrome 확장 프로그램입니다. 무료로 하루 50개를 수집하고, 필요할 때 ReviewBoost AI 분석으로 연결하세요.",
  platforms: ["쿠팡", "스마트스토어·브랜드스토어", "무신사", "29CM", "G마켓", "옥션", "11번가", "SSG닷컴", "오늘의집", "컬리", "올리브영", "톡스토어"],
  freeDailyLimit: 50,
  monthlyPrice: 4900,
  perCollectionLimit: 2000,
  features: [
    "상품 페이지의 공개 리뷰 수집",
    "엑셀(.xlsx)·CSV 다운로드",
    "리뷰 본문·별점·작성일 및 제공되는 이미지 URL 내보내기",
    "최근 수집 기록 최대 5건 다시 열기",
    "선택 시 ReviewBoost AI 리뷰 분석으로 전송"
  ]
};

export const extensionSteps = [
  "Chrome 웹 스토어에서 ReviewBoost 리뷰 수집기를 설치합니다.",
  "지원 쇼핑몰의 상품 상세 페이지를 열고 리뷰 영역이 보이는지 확인합니다.",
  "브라우저 도구 모음에서 확장 프로그램을 열고 수집할 개수를 정한 뒤 ‘리뷰 수집’을 누릅니다.",
  "수집이 끝나면 ‘엑셀 다운로드’ 또는 ‘CSV 다운로드’를 선택합니다. AI 분석이 필요하면 ‘ReviewBoost로 분석’을 누릅니다."
];

export const extensionFaqs = [
  {
    question: "쿠팡 리뷰를 엑셀이나 CSV로 어떻게 다운로드하나요?",
    answer: "ReviewBoost 리뷰 수집기를 Chrome에 설치하고 쿠팡 상품 상세 페이지를 여세요. 확장 프로그램에서 ‘리뷰 수집’을 누른 뒤 엑셀(.xlsx) 또는 CSV 다운로드를 선택하면 됩니다. 상품 하나씩 수집하며, 실제 수집량은 공개된 리뷰와 쇼핑몰 응답에 따라 달라집니다."
  },
  {
    question: "스마트스토어와 네이버 브랜드스토어도 지원하나요?",
    answer: "네. smartstore.naver.com과 brand.naver.com의 상품 상세 페이지에서 리뷰를 수집할 수 있습니다. 스마트스토어·브랜드스토어 외에도 쿠팡, 무신사, 29CM, G마켓, 옥션, 11번가, SSG닷컴, 오늘의집, 컬리, 올리브영, 톡스토어를 지원합니다."
  },
  {
    question: "무료로 몇 개까지 수집할 수 있나요?",
    answer: `무료 이용자는 하루 ${extensionProduct.freeDailyLimit}개까지 리뷰를 수집할 수 있습니다. Extension 플랜은 월 ${extensionProduct.monthlyPrice.toLocaleString("ko-KR")}원으로 일일 수집 한도가 없고 Basic·Pro 구독에도 포함됩니다. 유료 플랜도 한 번에 최대 ${extensionProduct.perCollectionLimit.toLocaleString("ko-KR")}개까지 수집하며, 쇼핑몰에서 제공하는 리뷰 범위와 접근 제한이 적용됩니다.`
  },
  {
    question: "리뷰 수집과 AI 분석은 같은 기능인가요?",
    answer: "리뷰 수집은 상품 페이지의 리뷰를 엑셀·CSV 파일로 저장하는 기능입니다. AI 분석은 수집한 리뷰를 ReviewBoost에 보내 감성, 이슈 카테고리, 부정 키워드와 개선안을 확인하는 별도 기능입니다. 수집 한도와 분석 요금제의 이용 한도는 다릅니다."
  },
  {
    question: "내보낸 파일에는 어떤 정보가 들어가나요?",
    answer: "리뷰 본문, 별점, 작성일 등 쇼핑몰이 제공하는 정보를 저장합니다. 작성자 표시, 상품 옵션, 도움이 됐어요 수, 사진·영상 URL은 제공되는 경우 포함하며 쇼핑몰마다 일부 항목은 비어 있을 수 있습니다. 이미지 URL이 포함되어도 이미지 파일 자체를 다운로드하는 것은 아닙니다."
  },
  {
    question: "수집한 리뷰가 자동으로 AI 분석 서버에 전송되나요?",
    answer: "리뷰는 브라우저에 저장되며 ‘ReviewBoost로 분석’을 선택할 때 분석 서버로 전송됩니다. 계정을 연결하면 사용량 확인과 수집 개수 기록을 위해 서버에 연결하고, 사용량 관련 이벤트도 전송합니다. 문의를 보내면 입력한 이메일과 문의 내용이 전송됩니다."
  },
  {
    question: "리뷰 수집이 안 되거나 일부만 수집되면 어떻게 하나요?",
    answer: "검색 결과가 아닌 상품 상세 페이지인지 확인하고 리뷰 영역을 연 뒤 다시 시도하세요. 쇼핑몰의 로그인 요구, 접근 제한, 화면 변경 또는 공개 리뷰 수에 따라 수집량이 줄거나 실패할 수 있습니다. 계속 실패하면 쇼핑몰 이름, 상품 URL, 오류 메시지를 ReviewBoost 문의 페이지로 보내주세요."
  }
];
