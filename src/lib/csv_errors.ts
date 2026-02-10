export const CSV_EMPTY_HELP: string[] = [
  "엑셀/구글시트에서 데이터가 들어있는 시트를 선택한 뒤 CSV로 다시 저장해서 업로드해주세요.",
  "엑셀에서 저장할 때는 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다."
];

export const UPLOAD_BAD_CONTENT_TYPE_HELP: string[] = [
  "대시보드에서 파일 선택 후 업로드 버튼을 눌러주세요.",
  "엑셀/구글시트에서는 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다."
];

export const UPLOAD_MISSING_FILE_HELP: string[] = ["파일을 다시 선택해서 시도해주세요."];

export const UPLOAD_UNREADABLE_FILE_HELP: string[] = [
  "파일을 다시 선택해서 시도해주세요.",
  "브라우저를 새로고침한 뒤 다시 시도해보세요."
];

export const CSV_TOO_LARGE_HELP: string[] = [
  "6MB 이하로 줄이거나, CSV를 여러 파일로 나눠서 시도해주세요.",
  "기간/상품/채널별로 나눠서 내보내면 가장 빠르게 해결됩니다."
];

export const CSV_NOT_CSV_HELP: string[] = [
  "엑셀에서: 파일 > 다른 이름으로 저장 > 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장해서 업로드해주세요.",
  "구글 스프레드시트에서: 파일 > 다운로드 > '쉼표로 구분된 값(.csv)'"
];

export const CSV_ENCODING_HELP: string[] = [
  "엑셀에서 'CSV UTF-8'로 다시 저장해서 업로드해주세요.",
  "윈도우에서 저장한 CSV라면 인코딩이 CP949/EUC-KR일 수 있어요. UTF-8로 변환 후 다시 시도해주세요."
];

export const CSV_PARSE_FAILED_HELP: string[] = [
  "엑셀/구글시트에서 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 다시 저장해서 올려주세요.",
  "구분자가 ';' 또는 TAB인 경우, 쉼표(,)로 바꿔 저장하면 안정적입니다.",
  "따옴표(\")가 짝이 맞지 않거나 줄바꿈이 섞이면 파싱이 실패할 수 있어요."
];
