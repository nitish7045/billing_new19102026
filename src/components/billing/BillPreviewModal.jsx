import React, { useEffect, useState } from "react";
import html2pdf from "html2pdf.js";
import { supabase } from "../../lib/supabase";
import BillPrintTemplate from "./templates/BillPrintTemplate";
import "./BillPreviewModal.css";

export default function BillPreviewModal({
  bill,
  onClose,
  autoPrint = false,
}) {
  const [exporting, setExporting] = useState(false);
  const [resolvedSignatureUrl, setResolvedSignatureUrl] = useState("");

  // A stored signature_path is a Storage path, not an image URL. Resolve it
  // whenever a preview opens so saved bills and PDF exports show the image too.
  const signaturePath =
    bill?.signature?.path ||
    bill?.signature?.storage_path ||
    bill?.signature_path ||
    "";
  const immediateSignatureUrl =
    bill?.signatureUrl ||
    bill?.signature?.previewUrl ||
    bill?.signature?.preview_url ||
    bill?.signature?.url ||
    bill?.signature?.publicUrl ||
    bill?.signature?.public_url ||
    "";

  useEffect(() => {
    let cancelled = false;
    setResolvedSignatureUrl(signaturePath ? "" : (immediateSignatureUrl || ""));
    if (signaturePath) {
      // Always refresh the signed URL from the persisted Storage path. The
      // selector's preview URL may have expired by the time a bill is edited.
      const path = String(signaturePath).replace(/^\/+/, "");
      supabase.storage.from("signatures").createSignedUrl(path, 60 * 60)
        .then(({ data, error }) => {
          if (error) throw error;
          if (!cancelled) setResolvedSignatureUrl(data?.signedUrl || "");
        })
        .catch((error) => {
          console.error("Could not load bill signature:", error);
          if (!cancelled) setResolvedSignatureUrl(immediateSignatureUrl || "");
        });
    }
    return () => { cancelled = true; };
  }, [signaturePath, immediateSignatureUrl]);

  const displayBill = {
    ...bill,
    signatureUrl: resolvedSignatureUrl,
    signature: bill?.signature ? { ...bill.signature, previewUrl: resolvedSignatureUrl } : bill?.signature,
  };

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function getSafeFileName() {
    const clean = (value) =>
      String(value ?? "")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "");

    const company = clean(
      bill?.companyName ??
      bill?.company_name ??
      bill?.company?.company_name ??
      bill?.company?.companyName
    );
    const billNo = clean(bill?.billNo ?? bill?.bill_no ?? bill?.invoice_no);
    const customer = clean(
      bill?.customerTo ?? bill?.to_address ?? bill?.customer?.to_address ?? bill?.customer?.toAddress
    );
    const site = clean(bill?.site ?? bill?.customer?.site);

    const parts = [company, billNo, customer, site].filter(Boolean);
    return (parts.join("_") || "Bill").slice(0, 180);
  }

  function handlePrint() {
    window.print();
  }

  async function handleSavePdf() {
    const element = document.getElementById("bill-print-root");

    if (!element) {
      alert(
        'Bill preview not found. Check that BillPrintTemplate contains id="bill-print-root".'
      );
      return;
    }

    if (exporting) return;

    setExporting(true);

    try {
      // Wait for all images (especially the asynchronously signed signature URL)
      // to finish loading before html2canvas captures the bill.
      await Promise.all(
        Array.from(element.querySelectorAll("img")).map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            window.setTimeout(resolve, 5000);
          });
        })
      );

      const fileName = `${getSafeFileName()}.pdf`;

      const options = {
        margin: [8, 8, 14, 8],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["tr", ".bill-print-footer", ".gst-summary", ".normal-summary", ".bill-print-signature"],
        },
      };

      // html2pdf uses the same bill HTML/CSS, with explicit page breaks and
      // page numbering added to the resulting PDF before saving.
      const worker = html2pdf().set(options).from(element).toPdf();
      const pdf = await worker.get("pdf");
      const pageCount = pdf.internal.getNumberOfPages();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(70, 70, 70);
        pdf.text(`Page ${page} of ${pageCount}`, pageWidth - 8, pageHeight - 5, {
          align: "right",
        });
      }

      const pdfBlob = pdf.output("blob");

      if ("showSaveFilePicker" in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "PDF document",
              accept: {
                "application/pdf": [".pdf"],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();

        await writable.write(pdfBlob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("PDF export failed:", error);
        alert("Could not export the PDF. Please try again.");
      }
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (!bill || !autoPrint) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bill, autoPrint]);

  if (!bill) return null;

  return (
    <div
      className="bill-preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Bill preview"
    >
      <div className="bill-preview-toolbar">
        <div>
          <strong>Bill Preview</strong>
          <span>Check the layout before exporting.</span>
        </div>

        <div className="bill-preview-toolbar-actions">
          <button
            type="button"
            className="bill-preview-close"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="bill-preview-print"
            onClick={handlePrint}
          >
            Print
          </button>

          <button
            type="button"
            className="bill-preview-export"
            onClick={handleSavePdf}
            disabled={exporting}
          >
            {exporting ? "Generating PDF..." : "Save as PDF"}
          </button>
        </div>
      </div>

      <div className="bill-preview-scroll">
        <BillPrintTemplate bill={displayBill} />
      </div>
    </div>
  );
}