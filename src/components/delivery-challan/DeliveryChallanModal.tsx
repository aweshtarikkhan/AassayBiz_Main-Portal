import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download, MessageSquare, Edit, Copy, Check, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  DeliveryChallanDocument,
  DeliveryChallanData,
  DeliveryChallanLineData,
} from "./DeliveryChallanDocument";


interface DeliveryChallanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challan: DeliveryChallanData;
  lines: DeliveryChallanLineData[];
  org: any;
  client: any;
  branch?: any | null;
  onEdit?: () => void;
}

export function DeliveryChallanModal({
  open,
  onOpenChange,
  challan,
  lines,
  org,
  client,
  branch,
  onEdit,
}: DeliveryChallanModalProps) {
  const { toast } = useToast();
  const documentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const [copied, setCopied] = useState(false);

  // Generate WhatsApp Message text for driver / logistics
  const generateWhatsAppMessage = () => {
    const formatAddress = (addr: any): string => {
      if (!addr) return "";
      if (typeof addr === "string") {
        try {
          const trimmed = addr.trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const parsed = JSON.parse(trimmed);
            if (parsed && typeof parsed === "object") {
              const parts = [parsed.street, parsed.city, parsed.state, parsed.zip || parsed.pincode, parsed.country].filter(Boolean);
              return parts.length > 0 ? parts.join(", ") : "";
            }
          }
        } catch (_) {}
        return addr;
      }
      if (typeof addr === "object") {
        const parts = [addr.street, addr.city, addr.state, addr.zip || addr.pincode, addr.country].filter(Boolean);
        return parts.length > 0 ? parts.join(", ") : "";
      }
      return String(addr);
    };

    const orgName = org?.name || "Sender";
    const clientName = client?.display_name || "Consignee";
    const dest = formatAddress(challan.destination) || client?.state || "Destination";
    const vehicle = challan.vehicle_number || "N/A";
    const eway = challan.eway_bill_number || "N/A";
    const date = challan.challan_date || "Today";

    const itemsText = lines
      .filter((l) => l.description)
      .map((l, i) => `${i + 1}. *${l.description}* - Qty: ${l.quantity} ${l.unit || "units"}`)
      .join("\n");

    const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

    return `🚚 *DELIVERY CHALLAN DISPATCH*
━━━━━━━━━━━━━━━━━━━━
📄 *Challan No:* ${challan.challan_number}
📅 *Date:* ${date}
🏢 *From:* ${orgName}
📍 *To (Consignee):* ${clientName} (${dest})
🚛 *Vehicle No:* ${vehicle}
👤 *Transporter:* ${challan.transporter || "Direct Delivery"}
${eway !== "N/A" ? `📋 *E-Way Bill:* ${eway}\n` : ""}
📦 *Items Loaded:*
${itemsText}
*Total Items:* ${totalQty}

⚠️ *Driver Instruction:* Please ensure goods count matches on arrival and get the signed & stamped receiver copy.
━━━━━━━━━━━━━━━━━━━━`;
  };



  // Direct 1-Page PDF Download
  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    setDownloading(true);
    toast({ title: "Generating 1-page Delivery Challan PDF..." });

    try {
      // High-resolution canvas snapshot of the document
      const canvas = await html2canvas(documentRef.current, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;

      // Fit cleanly onto one single A4 page
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      const renderWidth = pdfWidth;
      const renderHeight = renderWidth / ratio;

      // Center vertically if height is less than page height
      const yOffset = renderHeight < pdfHeight ? Math.max(0, (pdfHeight - renderHeight) / 2 - 4) : 0;

      pdf.addImage(imgData, "JPEG", 0, yOffset, renderWidth, Math.min(renderHeight, pdfHeight));
      pdf.save(`Delivery_Challan_${challan.challan_number || "Doc"}.pdf`);

      toast({ title: "PDF downloaded successfully" });
    } catch (err: any) {
      toast({
        title: "PDF generation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Print single page cleanly
  const handlePrint = () => {
    window.print();
  };

  // Copy Challan text summary
  const handleCopyText = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Challan details copied to clipboard" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-100">
          {/* Header Bar */}
          <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between space-y-0">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span>Delivery Challan:</span>
                <span className="font-mono text-primary font-semibold">{challan.challan_number}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Govt Rule 55 Compliant 1-Page Official Format
              </DialogDescription>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">


              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>

              <Button
                size="sm"
                className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Generating..." : "Download PDF"}
              </Button>

              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Printable Preview Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/70">
            <div className="bg-white shadow-lg rounded-sm print:shadow-none w-full max-w-[800px]">
              <DeliveryChallanDocument
                ref={documentRef}
                challan={challan}
                lines={lines}
                org={org}
                client={client}
                branch={branch}
              />
            </div>
          </div>

          {/* Bottom Quick Footer */}
          <div className="p-3 bg-white border-t flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>Driver: {challan.driver_name || "—"} ({challan.driver_phone || "No phone"})</span>
              <span>•</span>
              <span>Vehicle: {challan.vehicle_number || "—"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleCopyText}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Details"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </>
  );
}
