import { Suspense } from "react";
import HomePageContent from "@/components/home/HomePageContent";
import HomePageStatus from "@/components/home/HomePageStatus";

export default function HomePage() {
  return (
    <main className="pageMain marketingPage">
      <Suspense fallback={null}>
        <HomePageStatus />
      </Suspense>
      <HomePageContent />
    </main>
  );
}
