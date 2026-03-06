declare module "pdfkit" {
  import type { EventEmitter } from "node:events";

  declare class PDFDocument extends EventEmitter {
    constructor(
      options?: {
        size?: string | [number, number] | Record<string, unknown>;
        margin?: number;
        info?: Record<string, unknown>;
      }
    );
    text(text: string, options?: PDFTextOptions): this;
    text(text: string, x: number, y: number, options?: PDFTextOptions): this;
    widthOfString(text: string, options?: PDFMeasureOptions): number;
    heightOfString(text: string, options?: PDFMeasureOptions): number;
    fillColor(color: string | number[]): this;
    strokeColor(color: string | number[]): this;
    lineWidth(width: number): this;
    roundedRect(x: number, y: number, width: number, height: number, radius: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    stroke(): this;
    fill(): this;
    fillAndStroke(fillColor?: string | number[], strokeColor?: string | number[]): this;
    moveDown(multiplier?: number): this;
    fontSize(size: number): this;
    registerFont(name: string, src: string): void;
    font(name: string): this;
    addPage(): void;
    on(event: "data", listener: (chunk: string | Uint8Array | Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    once(event: string, listener: (...args: unknown[]) => void): this;
    readonly page: {
      width: number;
      height: number;
    };
    end(): void;

    [key: string]: unknown;
  }

  const PDFDocument: {
    new (
      options?: {
        size?: string | [number, number] | Record<string, unknown>;
        margin?: number;
        info?: Record<string, unknown>;
      }
    ): PDFDocument;
  };

  interface PDFTextOptions {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
    lineGap?: number;
    size?: number;
    underline?: boolean;
  }

  interface PDFMeasureOptions {
    width?: number;
    align?: string;
    lineGap?: number;
    size?: number;
  }

  export default PDFDocument;
}
