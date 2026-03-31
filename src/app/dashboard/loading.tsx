import PageLoading from "@/components/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="대시보드를 불러오고 있어요"
      description="저장된 분석과 현재 작업 화면을 준비하고 있습니다."
      hint="준비가 끝나면 업로드, 분석 결과, 저장된 기록을 바로 확인할 수 있어요."
    />
  );
}
