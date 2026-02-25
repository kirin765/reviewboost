import type { Meta, StoryObj } from "@storybook/react";
import AnalysisResultDigest from "./AnalysisResultDigest";

const meta: Meta<typeof AnalysisResultDigest> = {
  title: "Dashboard/AnalysisResultDigest",
  component: AnalysisResultDigest
};

export default meta;

type Story = StoryObj<typeof AnalysisResultDigest>;

const resultData = {
  stats: {
    total: 128,
    positive: 84,
    negative: 20,
    neutral: 24,
    positiveRatio: 0.65625,
    negativeRatio: 0.15625,
    avgRating: 4.43,
    negativeKeywordsTop10: [
      { keyword: "느림", count: 10 },
      { keyword: "포장", count: 8 }
    ],
    categoryCounts: {
      배송: 9,
      품질: 6,
      가격: 3,
      사용성: 1,
      CS: 2,
      기타: 0
    },
    priorityScore: 61.2,
    recentness: {
      hasDates: true,
      last30Share: 0.2,
      last90Share: 0.34,
      last30NegativeRatio: 0.09
    }
  },
  suggestions: {
    detailPageCopy: ["배송 상태 표시를 실시간으로 노출하세요."],
      csResponseTemplates: ["배송 지연 시 사전 공지를 추가하세요."],
      faqRecommendations: ["교환/반품 규정 FAQ를 상단으로 고정하세요."],
      notes: ["응답 템플릿에 사과 문구와 조치 확인 링크를 기본값으로 넣습니다."]
    }
  };

export const Default: Story = {
  args: {
    result: resultData
  }
};
