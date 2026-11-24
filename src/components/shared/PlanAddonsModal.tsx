import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CheckSquare,
  Receipt,
  Plus,
  Minus,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { usePlatformPricing } from "@/lib/platform-pricing";

export type AddonPlanType = "hr" | "crm" | "suite";

export interface PlanAddonsValues {
  extraEmployees: number; // HR extra employees
  extraCrmMembers: number; // CRM extra sales members
  taskEmployees: number; // Task management slots
  expenseEmployees: number; // Expense management slots
}

interface PlanAddonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType: AddonPlanType;
  billingCycle: "monthly" | "yearly";
  initialValues: PlanAddonsValues;
  onSave: (newValues: PlanAddonsValues) => void;
  planDisplayName?: string;
}

export function PlanAddonsModal({
  open,
  onOpenChange,
  planType,
  billingCycle,
  initialValues,
  onSave,
  planDisplayName,
}: PlanAddonsModalProps) {
  const { pricing } = usePlatformPricing();
  const isYearly = billingCycle === "yearly";

  const [extraEmployees, setExtraEmployees] = useState(initialValues.extraEmployees || 0);
  const [extraCrmMembers, setExtraCrmMembers] = useState(initialValues.extraCrmMembers || 0);
  const [taskEmployees, setTaskEmployees] = useState(initialValues.taskEmployees || 0);
  const [expenseEmployees, setExpenseEmployees] = useState(initialValues.expenseEmployees || 0);

  // Sync state whenever modal opens or initialValues change
  useEffect(() => {
    if (open) {
      setExtraEmployees(initialValues.extraEmployees || 0);
      setExtraCrmMembers(initialValues.extraCrmMembers || 0);
      setTaskEmployees(initialValues.taskEmployees || 0);
      setExpenseEmployees(initialValues.expenseEmployees || 0);
    }
  }, [open, initialValues]);

  const hrPriceMonthly = pricing.hrExtraEmployeePrice || 49;
  const crmPriceMonthly = pricing.crmExtraMemberPrice || 99;
  const taskPriceMonthly = pricing.taskPriceMonthly || 99;
  const taskPriceYearly = pricing.taskPriceYearly || taskPriceMonthly * 12;
  const expensePriceMonthly = pricing.expensePriceMonthly || 499;
  const expensePriceYearly = pricing.expensePriceYearly || expensePriceMonthly * 12;

  // Cost calculations
  const hrCost = extraEmployees * (isYearly ? hrPriceMonthly * 12 : hrPriceMonthly);
  const crmCost = extraCrmMembers * (isYearly ? crmPriceMonthly * 12 : crmPriceMonthly);
  const taskCost = taskEmployees * (isYearly ? taskPriceYearly : taskPriceMonthly);
  const expenseCost = expenseEmployees * (isYearly ? expensePriceYearly : expensePriceMonthly);

  let totalAddonCost = 0;
  let activeAddonCount = 0;

  if (planType === "hr") {
    totalAddonCost = hrCost + taskCost + expenseCost;
    if (extraEmployees > 0) activeAddonCount++;
    if (taskEmployees > 0) activeAddonCount++;
    if (expenseEmployees > 0) activeAddonCount++;
  } else if (planType === "crm") {
    totalAddonCost = crmCost;
    if (extraCrmMembers > 0) activeAddonCount++;
  } else if (planType === "suite") {
    totalAddonCost = hrCost + crmCost + taskCost + expenseCost;
    if (extraEmployees > 0) activeAddonCount++;
    if (extraCrmMembers > 0) activeAddonCount++;
    if (taskEmployees > 0) activeAddonCount++;
    if (expenseEmployees > 0) activeAddonCount++;
  }

  const handleApply = () => {
    onSave({
      extraEmployees: planType === "crm" ? initialValues.extraEmployees : extraEmployees,
      extraCrmMembers: planType === "hr" ? initialValues.extraCrmMembers : extraCrmMembers,
      taskEmployees: planType === "crm" ? initialValues.taskEmployees : taskEmployees,
      expenseEmployees: planType === "crm" ? initialValues.expenseEmployees : expenseEmployees,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    if (planType === "hr") {
      setExtraEmployees(0);
      setTaskEmployees(0);
      setExpenseEmployees(0);
    } else if (planType === "crm") {
      setExtraCrmMembers(0);
    } else if (planType === "suite") {
      setExtraEmployees(0);
      setExtraCrmMembers(0);
      setTaskEmployees(0);
      setExpenseEmployees(0);
    }
  };

  const getTitle = () => {
    if (planDisplayName) return `${planDisplayName} Add-ons`;
    switch (planType) {
      case "hr":
        return "Business HR Add-ons";
      case "crm":
        return "Business CRM Add-ons";
      case "suite":
        return "Business Suite Add-ons";
      default:
        return "Plan Add-ons";
    }
  };

  const getDescription = () => {
    switch (planType) {
      case "hr":
        return "Choose additional employee attendance seats, task management, or expense tracking add-ons for your HR Suite.";
      case "crm":
        return "Add extra sales executive logins for your team to access the CRM portal.";
      case "suite":
        return "Customize all available add-ons (HR seats, CRM sales logins, tasks & expense tracking) for your Business Suite.";
      default:
        return "Customize your plan with specialized add-on capabilities.";
    }
  };

  const showHrEmployees = planType === "hr" || planType === "suite";
  const showCrmMembers = planType === "crm" || planType === "suite";
  const showTaskManagement = planType === "hr" || planType === "suite";
  const showExpenseManagement = planType === "hr" || planType === "suite";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-2xl sm:rounded-3xl">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-100 text-[#e77817]">
              <Layers className="w-5 h-5" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900">
              {getTitle()}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Addon Items List */}
        <div className="space-y-4 my-2">
          {/* 1. HR Extra Employees */}
          {showHrEmployees && (
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Users className="w-4 h-4" />
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Add-on Employees (Attendance & Payroll)
                    </h4>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold">
                      ₹{hrPriceMonthly}/emp/mo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    Expand employee capacity for attendance punching, leave rosters, and salary slip generation.
                  </p>
                </div>

                {/* Counter & Cost */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setExtraEmployees(Math.max(0, extraEmployees - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={extraEmployees}
                      onChange={(e) => setExtraEmployees(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setExtraEmployees(extraEmployees + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {extraEmployees > 0 && (
                    <span className="text-xs font-bold text-emerald-700">
                      +₹{hrCost.toLocaleString("en-IN")}/{isYearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-100/60 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                {[5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setExtraEmployees(num)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      extraEmployees === num
                        ? "bg-[#e77817] text-white border-[#e77817] font-bold shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    +{num} Employees
                  </button>
                ))}
                {extraEmployees > 0 && (
                  <button
                    type="button"
                    onClick={() => setExtraEmployees(0)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. CRM Extra Sales Team */}
          {showCrmMembers && (
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Add-on Sales Employee (CRM Portal Seats)
                    </h4>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold">
                      ₹{crmPriceMonthly}/member/mo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    Dedicated login accounts for sales executives to manage leads, record calls, and track pipeline deals.
                  </p>
                </div>

                {/* Counter & Cost */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setExtraCrmMembers(Math.max(0, extraCrmMembers - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={extraCrmMembers}
                      onChange={(e) => setExtraCrmMembers(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setExtraCrmMembers(extraCrmMembers + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {extraCrmMembers > 0 && (
                    <span className="text-xs font-bold text-blue-700">
                      +₹{crmCost.toLocaleString("en-IN")}/{isYearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-blue-100/60 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setExtraCrmMembers(num)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      extraCrmMembers === num
                        ? "bg-[#e77817] text-white border-[#e77817] font-bold shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    +{num} Sales Seat{num > 1 ? "s" : ""}
                  </button>
                ))}
                {extraCrmMembers > 0 && (
                  <button
                    type="button"
                    onClick={() => setExtraCrmMembers(0)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. Task Management Module */}
          {showTaskManagement && (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                      <CheckSquare className="w-4 h-4" />
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Task Management Add-on
                    </h4>
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold">
                      ₹{taskPriceMonthly}/employee/mo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    Assign, schedule, and track employee work with live status updates, team clusters, and priority queues.
                  </p>
                </div>

                {/* Counter & Cost */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTaskEmployees(Math.max(0, taskEmployees - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={taskEmployees}
                      onChange={(e) => setTaskEmployees(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setTaskEmployees(taskEmployees + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {taskEmployees > 0 && (
                    <span className="text-xs font-bold text-amber-700">
                      +₹{taskCost.toLocaleString("en-IN")}/{isYearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-amber-100/60 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                {[1, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTaskEmployees(num)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      taskEmployees === num
                        ? "bg-[#e77817] text-white border-[#e77817] font-bold shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    +{num} Assigned Staff
                  </button>
                ))}
                {taskEmployees > 0 && (
                  <button
                    type="button"
                    onClick={() => setTaskEmployees(0)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. Expense Management Module */}
          {showExpenseManagement && (
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/20 p-4 sm:p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Expense & Travel Claims Add-on
                    </h4>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold">
                      ₹{expensePriceMonthly}/employee/mo
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                    Automate bike/car/cab KM rates, monthly travel cards, fuel bills, multi-stage approval, and disbursements.
                  </p>
                </div>

                {/* Counter & Cost */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setExpenseEmployees(Math.max(0, expenseEmployees - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={expenseEmployees}
                      onChange={(e) => setExpenseEmployees(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center font-bold text-sm text-slate-900 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setExpenseEmployees(expenseEmployees + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Increase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {expenseEmployees > 0 && (
                    <span className="text-xs font-bold text-emerald-700">
                      +₹{expenseCost.toLocaleString("en-IN")}/{isYearly ? "yr" : "mo"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-100/60 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                {[1, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setExpenseEmployees(num)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      expenseEmployees === num
                        ? "bg-[#e77817] text-white border-[#e77817] font-bold shadow-2xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    +{num} Claiming Staff
                  </button>
                ))}
                {expenseEmployees > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpenseEmployees(0)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary & Action Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-4 sm:p-6 rounded-b-2xl sm:rounded-b-3xl">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#e77817] shrink-0 font-bold">
              {activeAddonCount}
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Add-ons Total ({isYearly ? "Yearly" : "Monthly"})
              </div>
              <div className="text-lg font-black text-slate-900">
                ₹{totalAddonCost.toLocaleString("en-IN")}
                <span className="text-xs font-medium text-slate-500 ml-1">
                  /{isYearly ? "year" : "month"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeAddonCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="bg-[#e77817] hover:bg-[#d46a0f] text-white font-bold text-xs sm:text-sm px-5 shadow-md shadow-orange-500/20"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Apply & Save Add-ons
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
