import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Sparkles,
  Download,
  Share2,
  PanelLeft,
  PanelRight,
  Search,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  FileCheck2,
  Info,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  FloatingButtonGroup,
  type FloatingButtonGroupItem,
} from "@/components/arc/floating-button-group/floating-button-group";
import {
  processPdfDocument,
  renderPageToCanvas,
  type PdfDocumentData,
} from "@/lib/pdf-utils";
import { exportCleanedPdf } from "@/lib/export-clean-pdf";

interface PdfProcessingPageProps {
  file: File;
  onBackToUpload: () => void;
}

export function PdfProcessingPage({
  file,
  onBackToUpload,
}: PdfProcessingPageProps) {
  const [docData, setDocData] = useState<PdfDocumentData | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"original" | "clean">("original");

  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(10);
  const [loadingStep, setLoadingStep] = useState<string>("Initializing...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Responsive defaults: collapse panels on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowInfoPanel(false);
      }
      if (window.innerWidth < 768) {
        setShowThumbnails(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process PDF on mount
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMessage(null);

    processPdfDocument(file, (percent, step) => {
      if (!isCancelled) {
        setLoadingProgress(percent);
        setLoadingStep(step);
      }
    })
      .then(({ pdfDoc: loadedPdf, data }) => {
        if (!isCancelled) {
          setPdfDoc(loadedPdf);
          setDocData(data);
          setCurrentPage(1);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("PDF Processing Error:", err);
          setErrorMessage(err.message || "Failed to process PDF document.");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Render original PDF page to canvas when on original mode
  useEffect(() => {
    if (viewMode !== "original" || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    const canvas = canvasRef.current;
    const scale = (zoom / 100) * 1.33; // Normalized 96dpi to standard view scale

    renderPageToCanvas(pdfDoc, currentPage, canvas, scale).catch((err) => {
      if (!isCancelled) {
        console.error("Error rendering page to canvas:", err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [viewMode, pdfDoc, currentPage, zoom]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when user types in search or input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        setCurrentPage((prev) =>
          docData ? Math.min(docData.numPages, prev + 1) : prev
        );
      } else if (e.key === "+" || (e.ctrlKey && e.key === "=")) {
        e.preventDefault();
        setZoom((prev) => Math.min(250, prev + 25));
      } else if (e.key === "-" || (e.ctrlKey && e.key === "-")) {
        e.preventDefault();
        setZoom((prev) => Math.max(50, prev - 25));
      } else if (e.key === "0" && e.ctrlKey) {
        e.preventDefault();
        setZoom(100);
      } else if (e.key === "Escape") {
        if (showSearch) setShowSearch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [docData, showSearch]);

  const activePageData = useMemo(() => {
    if (!docData) return null;
    return (
      docData.pages.find((p) => p.pageNumber === currentPage) ||
      docData.pages[0] ||
      null
    );
  }, [docData, currentPage]);

  const handleDownloadOriginal = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCleaned = () => {
    if (!docData) return;
    exportCleanedPdf(docData);
  };

  const handleCopyCurrentPageText = () => {
    if (!activePageData) return;
    navigator.clipboard.writeText(activePageData.rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // FloatingButtonGroup items for Navigation
  const navGroupItems = useMemo<readonly FloatingButtonGroupItem[]>(() => {
    const total = docData?.numPages || 1;
    return [
      {
        id: "prev-page",
        label: "Previous Page",
        icon: <ChevronLeft className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "←",
        disabled: currentPage <= 1,
        onSelect: () => setCurrentPage((p) => Math.max(1, p - 1)),
      },
      {
        id: "page-indicator",
        label: `${currentPage} / ${total}`,
        disabled: false,
      },
      {
        id: "next-page",
        label: "Next Page",
        icon: <ChevronRight className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "→",
        disabled: currentPage >= total,
        onSelect: () => setCurrentPage((p) => Math.min(total, p + 1)),
      },
    ];
  }, [currentPage, docData?.numPages]);

  // FloatingButtonGroup items for Zoom Controls
  const zoomGroupItems = useMemo<readonly FloatingButtonGroupItem[]>(() => {
    return [
      {
        id: "zoom-out",
        label: "Zoom Out",
        icon: <ZoomOut className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "-",
        disabled: zoom <= 50,
        onSelect: () => setZoom((z) => Math.max(50, z - 25)),
      },
      {
        id: "zoom-level",
        label: `${zoom}%`,
        disabled: false,
        onSelect: () => setZoom(100),
      },
      {
        id: "zoom-in",
        label: "Zoom In",
        icon: <ZoomIn className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "+",
        disabled: zoom >= 250,
        onSelect: () => setZoom((z) => Math.min(250, z + 25)),
      },
      { type: "separator" },
      {
        id: "fit-page",
        label: "Fit to Page",
        icon: <Maximize2 className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "0",
        onSelect: () => setZoom(100),
      },
    ];
  }, [zoom]);

  // FloatingButtonGroup items for View Mode Toggle
  const modeGroupItems = useMemo<readonly FloatingButtonGroupItem[]>(() => {
    return [
      {
        id: "mode-original",
        label: "Original PDF",
        icon: <FileText className="w-4 h-4" />,
        pressed: viewMode === "original",
        onSelect: () => setViewMode("original"),
      },
      {
        id: "mode-clean",
        label: "Clean View",
        icon: <Sparkles className="w-4 h-4" />,
        pressed: viewMode === "clean",
        onSelect: () => setViewMode("clean"),
      },
    ];
  }, [viewMode]);

  // FloatingButtonGroup items for Document Actions & Sidebars
  const actionsGroupItems = useMemo<readonly FloatingButtonGroupItem[]>(() => {
    return [
      {
        id: "search-toggle",
        label: "Search Text",
        icon: <Search className="w-4 h-4" />,
        iconOnly: true,
        pressed: showSearch,
        onSelect: () => setShowSearch((s) => !s),
      },
      {
        id: "download-original",
        label: "Download Original",
        icon: <Download className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "⌘D",
        onSelect: handleDownloadOriginal,
      },
      {
        id: "export-clean",
        label: "Export Cleaned PDF",
        icon: <Share2 className="w-4 h-4" />,
        iconOnly: true,
        shortcut: "⌘E",
        onSelect: handleExportCleaned,
      },
      { type: "separator" },
      {
        id: "toggle-thumbnails",
        label: showThumbnails ? "Hide Thumbnails" : "Show Thumbnails",
        icon: <PanelLeft className="w-4 h-4" />,
        iconOnly: true,
        pressed: showThumbnails,
        onSelect: () => setShowThumbnails((t) => !t),
      },
      {
        id: "toggle-info",
        label: showInfoPanel ? "Hide Details" : "Show Details",
        icon: <PanelRight className="w-4 h-4" />,
        iconOnly: true,
        pressed: showInfoPanel,
        onSelect: () => setShowInfoPanel((i) => !i),
      },
    ];
  }, [showSearch, showThumbnails, showInfoPanel, file.name, docData]);

  // Search match count
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim() || !activePageData) return 0;
    const q = searchQuery.toLowerCase();
    const matches = activePageData.rawText
      .toLowerCase()
      .split(q).length - 1;
    return matches;
  }, [searchQuery, activePageData]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-white text-neutral-900 select-none overflow-hidden font-sans">
      {/* Top Acrobat-Style Toolbar */}
      <header className="h-14 border-b border-neutral-200 bg-white px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Left Section: Back, Document Icon & File Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToUpload}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            title="Return to upload screen"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <div className="h-5 w-[1px] bg-neutral-200 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-red-50 border border-red-200/60 flex items-center justify-center shrink-0 text-red-600">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex flex-col">
              <span
                className="text-xs font-semibold text-neutral-900 truncate max-w-[140px] sm:max-w-[220px] md:max-w-[280px]"
                title={file.name}
              >
                {file.name}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                {docData
                  ? `${docData.numPages} ${docData.numPages === 1 ? "page" : "pages"} • ${(docData.metadata.fileSize / (1024 * 1024)).toFixed(1)} MB`
                  : "Loading document..."}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section: Page Navigation, Zoom Controls, Mode Switch using FloatingButtonGroup */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          {/* Navigation Group */}
          <FloatingButtonGroup
            items={navGroupItems}
            label="Page navigation"
            variant="muted"
            size="sm"
          />

          {/* Zoom Group */}
          <FloatingButtonGroup
            items={zoomGroupItems}
            label="Zoom controls"
            variant="muted"
            size="sm"
          />

          {/* View Mode Toggle */}
          <FloatingButtonGroup
            items={modeGroupItems}
            label="Document view modes"
            variant="muted"
            size="sm"
          />
        </div>

        {/* Right Section: OCR Status & Actions using FloatingButtonGroup */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* OCR Status Pill */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium"
            title="Adobe PDF Services OCR Extraction active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {docData
                ? `OCR Ready (${docData.metadata.overallConfidence}%)`
                : "OCR Processing..."}
            </span>
          </div>

          {/* Actions & Panel Toggles Group */}
          <FloatingButtonGroup
            items={actionsGroupItems}
            label="Document actions and sidebars"
            variant="muted"
            size="sm"
          />
        </div>
      </header>

      {/* Sub-bar for Mobile / Small Screens */}
      <div className="md:hidden h-10 border-b border-neutral-200 bg-neutral-50 px-3 flex items-center justify-between gap-2 shrink-0">
        <FloatingButtonGroup
          items={navGroupItems}
          label="Mobile page navigation"
          variant="muted"
          size="sm"
        />

        <FloatingButtonGroup
          items={modeGroupItems}
          label="Mobile view mode"
          variant="muted"
          size="sm"
        />
      </div>

      {/* Live Search Floating Bar when triggered */}
      {showSearch && (
        <div className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between gap-3 shadow-xs shrink-0 z-20">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search in extracted page text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white text-neutral-900"
            />
            {searchQuery && (
              <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                {searchMatchesCount} {searchMatchesCount === 1 ? "match" : "matches"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setShowSearch(false);
            }}
            className="text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        {/* Left Sidebar: Page Thumbnails */}
        {showThumbnails && (
          <aside className="w-52 lg:w-60 h-full border-r border-neutral-200 bg-white flex flex-col shrink-0 z-10 transition-all select-none">
            <div className="h-10 px-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pages ({docData?.numPages || 0})
              </span>
              <button
                type="button"
                onClick={() => setShowThumbnails(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
              {docData?.pages.map((p) => {
                const isSelected = p.pageNumber === currentPage;
                return (
                  <button
                    key={p.pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(p.pageNumber)}
                    className="w-full flex flex-col items-center group cursor-pointer focus:outline-none"
                  >
                    <div
                      className={`w-full aspect-[1/1.35] bg-neutral-100 rounded border transition-all overflow-hidden flex items-center justify-center shadow-xs ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/20 shadow-sm"
                          : "border-neutral-200 group-hover:border-neutral-400"
                      }`}
                    >
                      {p.thumbnailUrl ? (
                        <img
                          src={p.thumbnailUrl}
                          alt={`Page ${p.pageNumber}`}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400 font-mono">
                          Page {p.pageNumber}
                        </span>
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-xs font-medium ${
                        isSelected ? "text-blue-600 font-semibold" : "text-neutral-600 group-hover:text-neutral-900"
                      }`}
                    >
                      {p.pageNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Document Canvas Workspace */}
        <main
          ref={canvasContainerRef}
          className="flex-1 h-full bg-[#f3f4f6] overflow-auto flex flex-col items-center p-4 sm:p-8 relative"
        >
          {loading ? (
            <div className="my-auto flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">
                Processing Document
              </h3>
              <p className="text-xs text-neutral-500 mb-3">{loadingStep}</p>
              <div className="w-48 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          ) : errorMessage ? (
            <div className="my-auto flex flex-col items-center justify-center p-8 text-center max-w-md bg-white rounded-xl border border-red-200 shadow-sm">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">
                Document Loading Error
              </h3>
              <p className="text-xs text-neutral-500 mb-4">{errorMessage}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center my-auto transition-all duration-200">
              {/* Document Page Canvas Container */}
              <div
                className="bg-white rounded-sm border border-neutral-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.08)] relative overflow-hidden transition-all duration-200 select-text"
                style={{
                  width: `${Math.round(612 * (zoom / 100))}px`,
                  minHeight: `${Math.round(792 * (zoom / 100))}px`,
                }}
              >
                {viewMode === "original" ? (
                  /* Original PDF View (Retina Canvas) */
                  <div className="w-full h-full flex items-center justify-center relative">
                    <canvas
                      ref={canvasRef}
                      className="block max-w-full h-auto mx-auto"
                    />
                  </div>
                ) : (
                  /* Clean View (Processed Typography, Normalized Layout, Clean Tables) */
                  <div className="p-8 sm:p-12 text-neutral-900 font-sans space-y-6">
                    {/* Clean Header watermark */}
                    <div className="border-b border-neutral-100 pb-3 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                      <span>{docData?.metadata.filename}</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium">
                        <Sparkles className="w-3 h-3" /> Clean Normalized View
                      </span>
                    </div>

                    {/* Clean Content Sections */}
                    {activePageData?.sections && activePageData.sections.length > 0 ? (
                      activePageData.sections.map((section, idx) => {
                        if (section.type === "heading" && section.content) {
                          return (
                            <h1
                              key={idx}
                              className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 pt-2"
                            >
                              <HighlightSearch
                                text={section.content}
                                query={searchQuery}
                              />
                            </h1>
                          );
                        }

                        if (section.type === "subheading" && section.content) {
                          return (
                            <h2
                              key={idx}
                              className="text-base sm:text-lg font-semibold tracking-tight text-neutral-800 pt-1"
                            >
                              <HighlightSearch
                                text={section.content}
                                query={searchQuery}
                              />
                            </h2>
                          );
                        }

                        if (section.type === "paragraph" && section.content) {
                          return (
                            <p
                              key={idx}
                              className="text-sm leading-relaxed text-neutral-700"
                            >
                              <HighlightSearch
                                text={section.content}
                                query={searchQuery}
                              />
                            </p>
                          );
                        }

                        if (section.type === "list" && section.items) {
                          return (
                            <ul key={idx} className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
                              {section.items.map((item, itemIdx) => (
                                <li key={itemIdx}>
                                  <HighlightSearch text={item} query={searchQuery} />
                                </li>
                              ))}
                            </ul>
                          );
                        }

                        if (section.type === "table" && section.tableData) {
                          const { headers, rows } = section.tableData;
                          return (
                            <div
                              key={idx}
                              className="my-4 overflow-x-auto rounded-lg border border-neutral-200"
                            >
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-neutral-50/80 border-b border-neutral-200">
                                    {headers.map((h, hIdx) => (
                                      <th
                                        key={hIdx}
                                        className="py-2.5 px-3.5 font-semibold text-neutral-800"
                                      >
                                        <HighlightSearch text={h} query={searchQuery} />
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                  {rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className={
                                        rIdx % 2 === 1
                                          ? "bg-neutral-50/30"
                                          : "bg-white"
                                      }
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className="py-2.5 px-3.5 text-neutral-700 font-normal"
                                        >
                                          <HighlightSearch
                                            text={cell}
                                            query={searchQuery}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        }

                        return null;
                      })
                    ) : (
                      <div className="py-12 text-center text-sm text-neutral-400">
                        {activePageData?.rawText ? (
                          <div className="whitespace-pre-wrap text-left text-sm leading-relaxed text-neutral-800">
                            <HighlightSearch
                              text={activePageData.rawText}
                              query={searchQuery}
                            />
                          </div>
                        ) : (
                          "No readable text extracted for this page."
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Page Indicator Floating Pill */}
              <div className="mt-4 px-3 py-1 bg-white/80 backdrop-blur-xs border border-neutral-200/80 rounded-full text-[11px] font-mono text-neutral-600 shadow-xs">
                Page {currentPage} of {docData?.numPages || 1}
              </div>
            </div>
          )}
        </main>

        {/* Right Information & OCR Panel */}
        {showInfoPanel && (
          <aside className="w-72 lg:w-80 h-full border-l border-neutral-200 bg-white flex flex-col shrink-0 z-10 select-none overflow-hidden">
            {/* Panel Header */}
            <div className="h-10 px-3 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Document & OCR
              </span>
              <button
                type="button"
                onClick={() => setShowInfoPanel(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded cursor-pointer"
                title="Collapse details panel"
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Panel Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-neutral-600">
              {/* OCR Status Box */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    OCR Processing
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-100/70 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                    COMPLETE
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Confidence Score:</span>
                    <span className="font-semibold text-neutral-800 font-mono">
                      {docData?.metadata.overallConfidence}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${docData?.metadata.overallConfidence || 95}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-200/80 text-[11px]">
                  <div>
                    <span className="text-neutral-400 block">Total Words</span>
                    <span className="font-semibold text-neutral-800 font-mono">
                      {docData?.metadata.wordCount.toLocaleString() || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block">Characters</span>
                    <span className="font-semibold text-neutral-800 font-mono">
                      {docData?.metadata.characterCount.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Text for Current Page */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-neutral-500" />
                    Page {currentPage} Text
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCurrentPageText}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded transition-colors cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Text
                      </>
                    )}
                  </button>
                </div>

                <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed text-neutral-700">
                  {activePageData?.rawText || "No text detected on this page."}
                </div>
              </div>

              {/* Uncertain Words Review */}
              {activePageData?.words &&
                activePageData.words.some((w) => w.isUncertain) && (
                  <div className="space-y-1.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                    <span className="font-semibold text-amber-900 flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Low Confidence Words Flagged
                    </span>
                    <p className="text-[10px] text-amber-800 leading-normal">
                      The following words have lower OCR certainty and were normalized:
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {activePageData.words
                        .filter((w) => w.isUncertain)
                        .slice(0, 10)
                        .map((w, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            title={`Confidence: ${w.confidence}%`}
                          >
                            {w.text} ({w.confidence}%)
                          </span>
                        ))}
                    </div>
                  </div>
                )}

              {/* Document Metadata Details */}
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <span className="font-semibold text-neutral-900 block">
                  Metadata
                </span>
                <dl className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">File Name</dt>
                    <dd className="font-medium text-neutral-800 truncate max-w-[150px]" title={file.name}>
                      {file.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">File Size</dt>
                    <dd className="font-medium text-neutral-800 font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Page Count</dt>
                    <dd className="font-medium text-neutral-800 font-mono">
                      {docData?.numPages || 1}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Dimensions</dt>
                    <dd className="font-medium text-neutral-800 font-mono">
                      {docData?.metadata.dimensions}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-neutral-400">Engine</dt>
                    <dd className="font-medium text-neutral-800">
                      Adobe Services Protocol
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleExportCleaned}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-900 text-white font-medium text-xs hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Export Cleaned PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadOriginal}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-100 text-neutral-700 font-medium text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Original
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// Subcomponent to highlight search terms
function HighlightSearch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;

  const q = query.trim().toLowerCase();
  const parts = text.split(new RegExp(`(${q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q ? (
          <mark
            key={i}
            className="bg-yellow-200 text-neutral-900 rounded-xs px-0.5 font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default PdfProcessingPage;
