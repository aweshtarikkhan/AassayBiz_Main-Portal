import { useFeatureStore } from "@/store/feature-store";

export function useSubscription() {
  const {
    subscriptionPlan,
    subscriptionStatus,
    employeeLimit,
    employeeCount,
    invoiceLimit,
    clientLimit,
    itemLimit,
    trialEndsAt,
    currentPeriodEnd,
    platformFeatures,
  } = useFeatureStore();

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  const isOnTrial = subscriptionStatus === "trial" && (trialDaysLeft ?? 0) > 0;
  const isTrialExpired = subscriptionStatus === "expired";

  const isFeatureInPlan = (featureKey: string) => platformFeatures.includes(featureKey);

  const getPlanForFeature = (featureKey: string): string | null => {
    const planMap: Record<string, string> = {
      sales: "Basic Plan",
      catalog: "Basic Plan",
      purchases: "Pro Plan",
      accounting: "Pro Plan",
      reports: "Pro Plan",
      people: "Premium Plan",
      crm: "CRM Add-on or Complete Bundle",
      marketing: "Marketing Add-on or Complete Bundle",
    };
    return planMap[featureKey] ?? null;
  };

  const hrmsExtraEmployeeCost = (count: number) => {
    if (!employeeLimit) return 0;
    const extra = Math.max(0, count - employeeLimit);
    return extra * 49; // ₹49 per extra employee
  };

  return {
    subscriptionPlan,
    subscriptionStatus,
    isOnTrial,
    isTrialExpired,
    trialDaysLeft,
    employeeLimit,
    employeeCount,
    invoiceLimit,
    clientLimit,
    itemLimit,
    currentPeriodEnd,
    platformFeatures,
    isFeatureInPlan,
    getPlanForFeature,
    hrmsExtraEmployeeCost,
  };
}
