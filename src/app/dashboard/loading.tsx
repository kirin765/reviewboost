import PageLoading from "@/components/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="진행 중"
      description="대시보드 화면을 준비하고 있습니다."
      hint="업로드, 열 매핑, 결과 카드가 곧 표시됩니다."
    />
  );
}
