import React from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
};

export default function Skeleton({ width = "100%", height = 16, className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={{ width, height }} role="status" aria-label="로딩중" />;
}

