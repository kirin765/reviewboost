"use client";

import type { ReactNode } from "react";
import React from "react";
import CopyButton from "@/components/CopyButton";

export type AnalysisListSectionItem = {
  id: string;
  label: ReactNode;
  right: ReactNode;
  copyText?: string;
};

export function AnalysisListSection({
  title,
  items,
  emptyMessage
}: {
  title: string;
  items: AnalysisListSectionItem[];
  emptyMessage: string;
}) {
    return (
    <div className="card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <ul className="list" aria-label={title}>
          {items.map((item) => (
            <li className="row" key={item.id}>
              <div className="left">{item.label}</div>
              <div className="rowActions">
                <span>{item.right}</span>
                {item.copyText ? <CopyButton text={item.copyText} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
