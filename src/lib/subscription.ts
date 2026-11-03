export type PlanType = 'free' | 'accounting' | 'hr' | 'crm' | 'promotion' | 'suite';
export type ModuleType = 'accounting' | 'hr' | 'crm' | 'promotion' | 'admin' | 'outreach';

export const PLAN_NAMES: Record<string, string> = {
  free: 'Business Starter',
  plan_1: 'Business Starter',
  accounting: 'Business Accounting',
  plan_2: 'Business Accounting',
  hr: 'Business HR',
  plan_4: 'Business HR',
  crm: 'Business CRM',
  plan_5: 'Business CRM',
  promotion: 'Business Promotion',
  plan_6: 'Business Promotion',
  suite: 'Business Suite',
  plan_3: 'Business Suite',
};

export function normalizePlanKey(plan: string = ''): string {
  const p = String(plan || '').toLowerCase().trim();
  if (p.includes('suite') || p.includes('plan_3') || p.includes('flagship') || p.includes('enterprise')) return 'suite';
  if (p.includes('hr') || p.includes('plan_4') || p.includes('people')) return 'hr';
  if (p.includes('accounting') || p.includes('plan_2') || p.includes('sales')) return 'accounting';
  if (p.includes('crm') || p.includes('plan_5')) return 'crm';
  if (p.includes('promotion') || p.includes('marketing') || p.includes('plan_6')) return 'promotion';
  if (p.includes('free') || p.includes('plan_1') || p.includes('starter')) return 'free';
  return p || 'free';
}

export function getPlanDisplayName(plan: string = 'free', employeeLimit?: number | null): string {
  const p = normalizePlanKey(plan);
  if (p === 'free') {
    if (typeof employeeLimit === 'number' && employeeLimit > 4) {
      return 'Business Suite';
    }
    if (typeof employeeLimit === 'number' && employeeLimit > 3) {
      return 'Business Accounting';
    }
    return 'Business Starter';
  }
  return PLAN_NAMES[p] || 'Business Suite';
}

/**
 * Check if the given plan has full access to a specific module.
 */
export function hasModuleAccess(plan: string = 'free', module: ModuleType): boolean {
  const p = normalizePlanKey(plan);
  if (p === 'suite') return true;
  if (p === module) return true;

  switch (module) {
    case 'accounting':
      return true; // Accounting & Invoices is visible to all plans, limits apply on free plan
    case 'hr':
      return true; // HR is visible to all plans, limits apply instead
    case 'crm':
      return true; // CRM is visible to all plans, limits apply instead
    case 'promotion':
      return p !== 'free'; // Business Promotion max features locked on Free Plan
    case 'outreach':
      return p !== 'free'; // Business Integration requires paid plan
    case 'admin':
      return p !== 'free';
    default:
      return true;
  }
}

/**
 * Calculates the exact employee limit for a given plan configuration.
 * 
 * Rules:
 * 1. Base Plan Limits:
 *    - Business Starter (Free): 3 employees
 *    - Business Accounting: 3 employees
 *    - Business CRM: 3 employees
 *    - Business Promotion: 3 employees
 *    - Business HR: 25 employees (expandable via add-on)
 *    - Business Suite: 25 employees (expandable via add-on)
 * 
 * 2. No Accidental Summing:
 *    Even if multiple plans are active (or Business Suite is active),
 *    limits are NOT summed up.
 *    The highest base limit among active tiers applies (25 for Suite/HR).
 * 
 * 3. Dynamic Capacity Expansion:
 *    Extra employee capacity can be purchased/applied
 *    for Business HR or Business Suite. Other plans (Accounting, Free, CRM, Promotion)
 *    are strictly capped at 3 employees.
 */
export function calculateEmployeeLimit(planStr: string = 'free', purchasedLimit?: number | null): number {
  const p = normalizePlanKey(planStr);

  // Base employee limits:
  // Business Suite & Business HR: 25 base employees
  // Business Accounting, Starter, CRM, Promotion: 3 base employees
  let baseLimit = 3;
  if (p === 'suite' || p === 'hr') {
    baseLimit = 25;
  } else {
    baseLimit = 3;
  }

  // Self-heal: If plan was marked 'free' but has purchased capacity (>4), it's Suite/HR scale
  if (p === 'free' && typeof purchasedLimit === 'number' && purchasedLimit > 4) {
    baseLimit = 25;
  }

  // Extra employee capacity add-ons or purchased limits:
  if (typeof purchasedLimit === 'number' && purchasedLimit > baseLimit) {
    return purchasedLimit;
  }

  return baseLimit;
}

/**
 * Limits for the Free Plan
 */
export const FREE_PLAN_LIMITS = {
  invoices: 100,
  estimates: 100,
  bills: 100,
  purchase_orders: 100,
  employees: 3,
  leads: 50,
  platform_users: 0,
  outreach_messages: 0,
};

export const PAID_PLAN_LIMITS = {
  employees: 5,
  platform_users_suite: 5,
  platform_users_standard: 3,
  outreach_messages: 500,
};

/**
 * Check if the current plan or active modular plans include Business Suite or Business CRM.
 * - Business Suite & Business CRM: Unlimited Leads
 * - Other plans (Starter/Free, Accounting, HR, Promotion): 50 leads maximum
 */
export function hasUnlimitedLeads(planStr: string = '', activePlans: string[] = []): boolean {
  if (Array.isArray(activePlans) && activePlans.length > 0) {
    const hasActiveCrmOrSuite = activePlans.some(p => {
      const norm = normalizePlanKey(p);
      return norm === 'suite' || norm === 'crm';
    });
    if (hasActiveCrmOrSuite) return true;
  }
  const p = String(planStr || '').toLowerCase();
  return (
    p.includes('suite') ||
    p.includes('crm') ||
    p.includes('plan_3') ||
    p.includes('plan_5') ||
    p.includes('flagship') ||
    p.includes('enterprise')
  );
}

export function getLeadLimit(planStr: string = '', activePlans: string[] = []): number {
  return hasUnlimitedLeads(planStr, activePlans) ? Infinity : 50;
}

/**
 * Check if the current plan or active modular plans include Business Suite or Business Accounting.
 * - Business Suite & Business Accounting: Unlimited Invoices, Quotations, PI (Bills), PO
 * - Other plans (Starter/Free, HR, CRM, Promotion): 100 maximum
 */
export function hasUnlimitedInvoices(planStr: string = '', activePlans: string[] = []): boolean {
  if (Array.isArray(activePlans) && activePlans.length > 0) {
    const hasActiveAccountingOrSuite = activePlans.some(p => {
      const norm = normalizePlanKey(p);
      return norm === 'suite' || norm === 'accounting';
    });
    if (hasActiveAccountingOrSuite) return true;
  }
  const p = String(planStr || '').toLowerCase();
  return (
    p.includes('suite') ||
    p.includes('accounting') ||
    p.includes('plan_2') ||
    p.includes('plan_3') ||
    p.includes('flagship') ||
    p.includes('enterprise')
  );
}

export function getInvoiceLimit(planStr: string = '', activePlans: string[] = []): number {
  return hasUnlimitedInvoices(planStr, activePlans) ? Infinity : 100;
}

export function hasUnlimitedEstimates(planStr: string = '', activePlans: string[] = []): boolean {
  return hasUnlimitedInvoices(planStr, activePlans);
}

export function getEstimateLimit(planStr: string = '', activePlans: string[] = []): number {
  return hasUnlimitedEstimates(planStr, activePlans) ? Infinity : 100;
}

export function hasUnlimitedBills(planStr: string = '', activePlans: string[] = []): boolean {
  return hasUnlimitedInvoices(planStr, activePlans);
}

export function getBillLimit(planStr: string = '', activePlans: string[] = []): number {
  return hasUnlimitedBills(planStr, activePlans) ? Infinity : 100;
}

export function hasUnlimitedPurchaseOrders(planStr: string = '', activePlans: string[] = []): boolean {
  return hasUnlimitedInvoices(planStr, activePlans);
}

export function getPurchaseOrderLimit(planStr: string = '', activePlans: string[] = []): number {
  return hasUnlimitedPurchaseOrders(planStr, activePlans) ? Infinity : 100;
}

/**
 * Platform Access / Team Sharing:
 * - Free Plan: NO access (0 users allowed, cannot invite or share platform)
 * - Business Suite: 5 users (extra ₹99/mo)
 * - Standard Paid: 3 users
 */
export function canSharePlatform(planStr: string = '', activePlans: string[] = []): boolean {
  const p = normalizePlanKey(planStr);
  if (p === 'free') {
    if (Array.isArray(activePlans) && activePlans.some(ap => normalizePlanKey(ap) !== 'free')) {
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Direct Email / WhatsApp document sending:
 * - Free Plan: Locked (requires upgrade)
 * - Paid Plans: Allowed
 */
export function canSendDirectEmailOrWhatsApp(planStr: string = '', activePlans: string[] = []): boolean {
  const p = normalizePlanKey(planStr);
  if (p === 'free') {
    if (Array.isArray(activePlans) && activePlans.some(ap => normalizePlanKey(ap) !== 'free')) {
      return true;
    }
    return false;
  }
  return true;
}


/**
 * CRM Portal Access Limits:
 * - Included in CRM / Suite plan: 2 Sales Team portal logins
 * - Additional Sales Team Member login: ₹999/month per member
 */
export const CRM_BASE_PORTAL_USERS_LIMIT = 2;
export const CRM_ADDITIONAL_USER_COST_PER_MONTH = 999;

export function getCrmPortalUserLimit(purchasedCrmLimit?: number | null): number {
  if (typeof purchasedCrmLimit === 'number' && purchasedCrmLimit > CRM_BASE_PORTAL_USERS_LIMIT) {
    return purchasedCrmLimit;
  }
  return CRM_BASE_PORTAL_USERS_LIMIT;
}
