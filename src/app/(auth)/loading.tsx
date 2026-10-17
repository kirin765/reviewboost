import PageLoading from "@/components/PageLoading";

// Public marketing pages must render directly, including with JavaScript disabled.
// Workspace routes have their own loading boundary in dashboard/loading.tsx.

export default function Loading() {
  return (
    <PageLoading
      title="페이지를 불러오고 있어요"
      description="요청한 화면과 필요한 데이터를 준비하고 있습니다."
      hint="준비가 끝나면 바로 이어서 볼 수 있어요."
    />
  );
}
