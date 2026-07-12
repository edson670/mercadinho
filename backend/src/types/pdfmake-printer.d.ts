declare module 'pdfmake/src/printer' {
  interface FontDescriptor {
    normal: string;
    bold: string;
    italics: string;
    bolditalics: string;
  }

  interface PdfKitDocument extends NodeJS.ReadableStream {
    end(): void;
  }

  class PdfPrinter {
    constructor(fonts: Record<string, FontDescriptor>);
    createPdfKitDocument(docDefinition: unknown, options?: unknown): PdfKitDocument;
  }

  export = PdfPrinter;
}
