import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    AdobeDC?: any;
  }
}

interface AdobePdfViewerProps {
  file: File;
}

const ADOBE_SDK_URL = "https://acrobatservices.adobe.com/view-sdk/main.js";
const VIEWER_DIV_ID = "adobe-dc-view";

export function AdobePdfViewer({ file }: AdobePdfViewerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef(false);

  const clientId =
    import.meta.env.VITE_ADOBE_EMBED_CLIENT_ID ||
    "048d3b403ff94ee88a1144dea1f58179";

  useEffect(() => {
    abortRef.current = false;
    setStatus("loading");
    setErrorMessage(null);

    let isMounted = true;

    async function loadAdobeSDK(): Promise<any> {
      if (window.AdobeDC) {
        return window.AdobeDC;
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Adobe PDF Embed API timed out loading."));
        }, 15000);

        const onReady = () => {
          clearTimeout(timeout);
          document.removeEventListener("adobe_dc_view_sdk.ready", onReady);
          resolve(window.AdobeDC);
        };

        document.addEventListener("adobe_dc_view_sdk.ready", onReady);

        if (!document.querySelector(`script[src="${ADOBE_SDK_URL}"]`)) {
          const script = document.createElement("script");
          script.src = ADOBE_SDK_URL;
          script.async = true;
          script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Failed to load Adobe PDF Embed API script."));
          };
          document.head.appendChild(script);
        }
      });
    }

    async function initializeAndRender() {
      try {
        const AdobeDC = await loadAdobeSDK();
        if (!isMounted || abortRef.current) return;

        const container = document.getElementById(VIEWER_DIV_ID);
        if (!container) {
          throw new Error("Viewer container element not found in DOM.");
        }
        container.innerHTML = "";

        const adobeDCView = new AdobeDC.View({
          clientId: clientId,
          divId: VIEWER_DIV_ID,
        });

        const buffer = await file.arrayBuffer();
        if (!isMounted || abortRef.current) return;

        await adobeDCView.previewFile(
          {
            content: {
              promise: Promise.resolve(buffer),
            },
            metaData: {
              fileName: file.name,
            },
          },
          {
            embedMode: "FULL_WINDOW",
            defaultViewMode: "FIT_PAGE",
            showLeftHandPanel: false,
            showAnnotationTools: false,
            showToolsOnTextSelection: false,
            showDownloadPDF: true,
            showPrintPDF: true,
            showPageControls: true,
          }
        );

        if (isMounted) {
          setStatus("ready");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(
          err?.message || "Unable to display PDF preview."
        );
      }
    }

    initializeAndRender();

    return () => {
      isMounted = false;
      abortRef.current = true;
      const el = document.getElementById(VIEWER_DIV_ID);
      if (el) el.innerHTML = "";
    };
  }, [file, clientId]);

  return (
    <div
      className="w-full h-full relative"
      style={{ width: "100%", height: "100%", minHeight: "100%" }}
    >
      <div
        id={VIEWER_DIV_ID}
        className="w-full h-full"
        style={{ width: "100%", height: "100%", minHeight: "100%" }}
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-2 z-10 pointer-events-none">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Opening PDF in full page...</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-2 bg-background z-10">
          <p className="text-sm font-medium text-destructive">Preview Error</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {errorMessage || "Unable to display PDF preview."}
          </p>
        </div>
      )}
    </div>
  );
}

export default AdobePdfViewer;
