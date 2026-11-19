import React, { useState } from "react";
import { 
  Building2, 
  Store, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  ShoppingBag,
  ShieldAlert
} from "lucide-react";
import { 
  BusinessCategory, 
  BUSINESS_CATEGORIES 
} from "@/lib/business-category";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BusinessCategorySelectorProps {
  value: BusinessCategory;
  onChange: (value: BusinessCategory) => void;
  disabled?: boolean;
}

export function BusinessCategorySelector({
  value,
  onChange,
  disabled = false,
}: BusinessCategorySelectorProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <span>Choose Business Category *</span>
          <span className="text-[11px] text-muted-foreground font-normal">(Cannot be changed later)</span>
        </label>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
          title="View Category Information"
        >
          <Info className="h-3.5 w-3.5" />
          <span>Category Info</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Industrial / Business Use Card */}
        <div
          onClick={() => !disabled && onChange("industrial")}
          className={`relative flex flex-col p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
            value === "industrial"
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border/70 hover:border-border hover:bg-muted/40"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  value === "industrial"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground leading-tight">
                  {BUSINESS_CATEGORIES.industrial.title}
                </h4>
                <p className="text-[11px] text-muted-foreground">B2B & Enterprise</p>
              </div>
            </div>
            {value === "industrial" && (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Complete B2B workflow with client directory, customized payment terms, and vendor purchase billing.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Standard Suite</span>
            <span className="font-medium text-primary">Full Features</span>
          </div>
        </div>

        {/* Retail Use Card */}
        <div
          onClick={() => !disabled && onChange("retail")}
          className={`relative flex flex-col p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
            value === "retail"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm"
              : "border-border/70 hover:border-border hover:bg-muted/40"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  value === "retail"
                    ? "bg-amber-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-foreground leading-tight">
                    {BUSINESS_CATEGORIES.retail.title}
                  </h4>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 text-[9px] px-1.5 py-0 h-4">
                    Fast Billing
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Retailer / Shop Owner</p>
              </div>
            </div>
            {value === "retail" && (
              <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            Quick counter billing with client name & mobile (no client database save needed), 0-day terms & clean UI.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Counter Sales</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">Simplified</span>
          </div>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg">Business Category Guide</DialogTitle>
                <DialogDescription>
                  Choose the category that best matches your daily operations. This configuration cannot be changed once the business is created.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Industrial */}
            <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h4 className="font-bold text-sm text-foreground">
                  1. {BUSINESS_CATEGORIES.industrial.title}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Target Audience:</strong> {BUSINESS_CATEGORIES.industrial.targetAudience}
              </p>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {BUSINESS_CATEGORIES.industrial.description}
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5 pt-1">
                {BUSINESS_CATEGORIES.industrial.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            {/* Retail */}
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 p-4 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
                  2. {BUSINESS_CATEGORIES.retail.title} (Retailer / Shop Owner)
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Target Audience:</strong> {BUSINESS_CATEGORIES.retail.targetAudience}
              </p>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {BUSINESS_CATEGORIES.retail.description}
              </p>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-5 pt-1">
                {BUSINESS_CATEGORIES.retail.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setInfoOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CategoryConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BusinessCategory;
  businessName: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function CategoryConfirmationDialog({
  open,
  onOpenChange,
  category,
  businessName,
  onConfirm,
  isConfirming = false,
}: CategoryConfirmationDialogProps) {
  const info = BUSINESS_CATEGORIES[category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg">Confirm Business Category</DialogTitle>
          <DialogDescription className="text-center text-xs">
            Please confirm your category selection for <strong className="text-foreground">"{businessName}"</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 p-3.5 rounded-xl border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Selected Category:</span>
            <Badge variant={category === "retail" ? "secondary" : "default"} className={category === "retail" ? "bg-amber-100 text-amber-900 border-amber-300" : ""}>
              {info.title}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {info.shortDesc || info.description}
          </p>
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Permanent Selection:</strong> Once created, this business category is locked and cannot be changed later.
            </span>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Change Selection
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="bg-primary hover:bg-primary/90"
          >
            {isConfirming ? "Creating Business..." : "Confirm & Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
