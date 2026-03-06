"use client";

import React, { type PropsWithChildren } from "react";

type ErrorBoundaryProps = PropsWithChildren<{
  fallback?: React.ReactNode;
}>;

type ErrorBoundaryState = {
  hasError: boolean;
};

const fallbackUi = (
  <div className="card errorBoundaryFallback">
    <h2>일시적 오류가 발생했습니다</h2>
    <p className="hint danger">문제가 지속되면 잠시 뒤 다시 시도해 주세요.</p>
    <a className="btn btnPrimary" href="/">
      홈으로 이동
    </a>
  </div>
);

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[error-boundary]", error);
    }
  }

  render() {
    const { hasError } = this.state;
    const { children, fallback = fallbackUi } = this.props;
    if (hasError) return fallback;
    return children;
  }
}
