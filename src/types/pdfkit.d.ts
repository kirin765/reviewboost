declare module "pdfkit" {
  import type { EventEmitter } from "node:events";

  declare class PDFDocument extends EventEmitter {
    constructor(options?: { size?: string | [number, number] | Record<string, unknown>; margin?: number; info?: Record<string, unknown> });
    text(text: string, options?: { lineGap?: number; underline?: boolean }): this;
    fillColor(color: string): this;
    moveDown(multiplier?: number): this;
    fontSize(size: number): this;
    registerFont(name: string, src: string): void;
    font(name: string): this;
    on(event: "data", listener: (chunk: string | Uint8Array | Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    end(): void;
  }

  const PDFDocument: {
    new (options?: { size?: string | [number, number] | Record<string, unknown>; margin?: number; info?: Record<string, unknown> }): PDFDocument;
  };
  export default PDFDocument;
}
