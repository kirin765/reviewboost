import React from "react";

type AnalysisStepperProps = {
  step: 1 | 2 | 3 | 4;
};

const steps: Array<{ n: 1 | 2 | 3 | 4; label: string; desc: string }> = [
  { n: 1, label: "파일 선택", desc: "CSV 업로드" },
  { n: 2, label: "열 매핑", desc: "텍스트/별점/작성일" },
  { n: 3, label: "분석 진행", desc: "우선순위·액션 자동 산출" },
  { n: 4, label: "결과 확인", desc: "리포트 다운로드" }
];

export default function AnalysisStepList({ step }: AnalysisStepperProps) {
  return (
    <div className="stepper" role="list" aria-label="분석 단계">
      {steps.map((item, idx) => {
        const isDone = step > item.n;
        const isCurrent = step === item.n;
        return (
          <React.Fragment key={item.label}>
            {idx > 0 ? (
              <div className={`stepConnector ${step > item.n ? "stepConnectorDone" : step === item.n ? "stepConnectorActive" : ""}`} aria-hidden="true" />
            ) : null}
            <div
              className={`step ${isDone ? "completed" : ""} ${isCurrent ? "active" : ""}`}
              role="listitem"
            >
              <span className="stepNumber">{isDone ? "\u2713" : item.n}</span>
              <span className="stepBody">
                <span className="stepTitle">{item.label}</span>
                <span className="stepDesc">{item.desc}</span>
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

