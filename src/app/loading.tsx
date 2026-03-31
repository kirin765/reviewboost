import PageLoading from "@/components/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      title="진행 중"
      description="페이지를 불러오는 중입니다."
      hint="화면이 준비되면 바로 이어서 볼 수 있습니다."
    />
  );
}
