import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeatureGuard } from "@/components/layout/FeatureGuard";

const SalesReportsPage = lazy(() => import("./pages/SalesReportsPage"));
const InventoryReportsPage = lazy(() => import("./pages/InventoryReportsPage"));
const PurchaseAccountingReportsPage = lazy(() => import("./pages/PurchaseAccountingReportsPage"));
const HRReportsPage = lazy(() => import("./pages/HRReportsPage"));

const PromotionReportsPage = lazy(() => import("./pages/PromotionReportsPage"));

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const ItemsPage = lazy(() => import("./pages/ItemsPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const TallySyncPage = lazy(() => import("./pages/TallySyncPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const InvoiceBuilderPage = lazy(() => import("./pages/InvoiceBuilderPage"));
const InvoiceDetailPage = lazy(() => import("./pages/InvoiceDetailPage"));
const EstimatesPage = lazy(() => import("./pages/EstimatesPage"));
const EstimateBuilderPage = lazy(() => import("./pages/EstimateBuilderPage"));
const EstimateDetailPage = lazy(() => import("./pages/EstimateDetailPage"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage"));
const RecordPaymentPage = lazy(() => import("./pages/RecordPaymentPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoonPage"));
const CrmIntegrationsPage = lazy(() => import("./pages/CrmIntegrationsPage"));
const SupportTicketsPage = lazy(() => import("./pages/SupportTicketsPage"));
const CreditNotesPage = lazy(() => import("./pages/CreditNotesPage"));
const CreditNoteBuilderPage = lazy(() => import("./pages/CreditNoteBuilderPage"));
const CreditNoteDetailPage = lazy(() => import("./pages/CreditNoteDetailPage"));
const InvoiceTemplatePage = lazy(() => import("./pages/InvoiceTemplatePage"));
const PortalPage = lazy(() => import("./pages/PortalPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const CustomFieldsPage = lazy(() => import("./pages/CustomFieldsPage"));
const TemplateCustomizationPage = lazy(() => import("./pages/TemplateCustomizationPage"));
const BusinessExpensesPage = lazy(() => import("./pages/BusinessExpensesPage"));
const CustomerStatementPage = lazy(() => import("./pages/CustomerStatementPage"));
const AgingDetailsPage = lazy(() => import("./pages/AgingDetailsPage"));
const ProfitLossPage = lazy(() => import("./pages/ProfitLossPage"));
const RecurringInvoicesPage = lazy(() => import("./pages/RecurringInvoicesPage"));
const GstReturnsPage = lazy(() => import("./pages/GstReturnsPage"));
const DemoAutoLoginPage = lazy(() => import("./pages/DemoAutoLoginPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ChatUIPage = lazy(() => import("./pages/ChatUIPage"));
const VendorsPage = lazy(() => import("./pages/VendorsPage"));
const VendorDetailPage = lazy(() => import("./pages/VendorDetailPage"));
const VendorPaymentsPage = lazy(() => import("./pages/VendorPaymentsPage"));
const RecordVendorPaymentPage = lazy(() => import("./pages/RecordVendorPaymentPage"));
const BillsPage = lazy(() => import("./pages/BillsPage"));
const BillBuilderPage = lazy(() => import("./pages/BillBuilderPage"));
const BillDetailPage = lazy(() => import("./pages/BillDetailPage"));
const DebitNotesPage = lazy(() => import("./pages/DebitNotesPage"));
const DebitNoteBuilderPage = lazy(() => import("./pages/DebitNoteBuilderPage"));
const DebitNoteDetailPage = lazy(() => import("./pages/DebitNoteDetailPage"));
const ChartOfAccountsPage = lazy(() => import("./pages/ChartOfAccountsPage"));
const JournalEntriesPage = lazy(() => import("./pages/JournalEntriesPage"));
const BranchesPage = lazy(() => import("./pages/BranchesPage"));
const TdsPage = lazy(() => import("./pages/TdsTcsReportsPage"));
const BusinessReportPage = lazy(() => import("./pages/BusinessReportPage"));
const AccountingReportsPage = lazy(() => import("./pages/AccountingReportsPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/PurchaseOrdersPage"));
const PurchaseOrderBuilderPage = lazy(() => import("./pages/PurchaseOrderBuilderPage"));
const PurchaseOrderDetailPage = lazy(() => import("./pages/PurchaseOrderDetailPage"));
const GrnsPage = lazy(() => import("./pages/GrnsPage"));
const GrnBuilderPage = lazy(() => import("./pages/GrnBuilderPage"));
const GrnDetailPage = lazy(() => import("./pages/GrnDetailPage"));
const DeliveryChallansPage = lazy(() => import("./pages/DeliveryChallansPage"));
const DeliveryChallanBuilderPage = lazy(() => import("./pages/DeliveryChallanBuilderPage"));
const WarehousesPage = lazy(() => import("./pages/WarehousesPage"));
const InventoryValuationPage = lazy(() => import("./pages/InventoryValuationPage"));
const BankAccountsPage = lazy(() => import("./pages/BankAccountsPage"));
const BankAccountDetailPage = lazy(() => import("./pages/BankAccountDetailPage"));
const CashFlowPage = lazy(() => import("./pages/CashFlowPage"));
const ShiftsPage = lazy(() => import("./pages/ShiftsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const LeavesPage = lazy(() => import("./pages/LeavesPage"));
const HRExpensesPage = lazy(() => import("./pages/HRExpensesPage"));
const EmployeeDocumentsPage = lazy(() => import("./pages/EmployeeDocumentsPage"));
const PayrollPage = lazy(() => import("./pages/PayrollPage"));
const PayrollRunDetailPage = lazy(() => import("./pages/PayrollRunDetailPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const LeadDetailPage = lazy(() => import("./pages/LeadDetailPage"));
const CRMTeamPage = lazy(() => import("./pages/CRMTeamPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const ActivitiesPage = lazy(() => import("./pages/ActivitiesPage"));
const MarketingTemplatesPage = lazy(() => import("./pages/MarketingTemplatesPage"));
const MarketingPostersPage = lazy(() => import("./pages/MarketingPostersPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage"));
const JourneysPage = lazy(() => import("./pages/JourneysPage"));
const MessageLogsPage = lazy(() => import("./pages/MessageLogsPage"));
const EmailPage = lazy(() => import("./pages/EmailPage"));
const AdminPanelPage = lazy(() => import("./pages/AdminPanelPage"));
const PlatformAdminPage = lazy(() => import("./pages/PlatformAdminPage"));
const DealDetailPage = lazy(() => import("./pages/DealDetailPage"));
const CRMReportPage = lazy(() => import("./pages/CRMReportPage"));
const CRMAutomationsPage = lazy(() => import("./pages/CRMAutomationsPage"));
const CRMCalendarPage = lazy(() => import("./pages/CRMCalendarPage"));
const BrochurePage = lazy(() => import("./pages/BrochurePage"));
const PamphletPage = lazy(() => import("./pages/PamphletPage"));
const SocialLaunchPostsPage = lazy(() => import("./pages/SocialLaunchPostsPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage"));
const PartnerWithUsPage = lazy(() => import("./pages/PartnerWithUsPage"));
const PartnerPortalPage = lazy(() => import("./pages/PartnerPortalPage"));
const PartnerLoginPage = lazy(() => import("./pages/PartnerLoginPage"));
const PartnerRegisterPage = lazy(() => import("./pages/PartnerRegisterPage"));
const PartnerDashboardPage = lazy(() => import("./pages/PartnerDashboardPage"));
const HRFeaturesPage = lazy(() => import("./pages/HRFeaturesPage"));
const CRMFeaturesPage = lazy(() => import("./pages/CRMFeaturesPage"));
const MarketingFeaturesPage = lazy(() => import("./pages/MarketingFeaturesPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { PlatformAdminLayout } from "@/components/layout/PlatformAdminLayout";

const queryClient = new QueryClient();

function AuthErrorRedirector() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hasAuthParams = hash.includes("error=access_denied") || search.includes("error=access_denied") || 
                          hash.includes("type=invite") || search.includes("type=invite") ||
                          hash.includes("type=recovery") || search.includes("type=recovery");
                          
    if (hasAuthParams && location.pathname === "/") {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [navigate, location]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthErrorRedirector />
        <AuthProvider>
          <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div></div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/demo" element={<DemoAutoLoginPage />} />
            <Route path="/try" element={<DemoAutoLoginPage />} />
            <Route path="/brochure" element={<BrochurePage />} />
            <Route path="/pamphlet" element={<PamphletPage />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/contact-us" element={<ContactUsPage />} />
            <Route path="/launch-posts" element={<SocialLaunchPostsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/terms-conditions" element={<TermsOfServicePage />} />
            <Route path="/refund" element={<RefundPolicyPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/cancellation-refund" element={<RefundPolicyPage />} />
            <Route path="/cancellation-policy" element={<RefundPolicyPage />} />

            {/* Protected routes */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route element={<FeatureGuard featureKey="sales" featureName="Sales" />}>
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/tally-sync" element={<TallySyncPage />} />
                <Route path="/invoices/new" element={<InvoiceBuilderPage />} />
                <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="/invoices/:id/edit" element={<InvoiceBuilderPage />} />
                <Route path="/quotations" element={<EstimatesPage />} />
                <Route path="/quotations/new" element={<EstimateBuilderPage />} />
                <Route path="/quotations/:id" element={<EstimateDetailPage />} />
                <Route path="/quotations/:id/edit" element={<EstimateBuilderPage />} />
                <Route path="/quotations/:id/convert" element={<EstimateDetailPage />} />
                <Route path="/quotation" element={<Navigate to="/quotations" replace />} />
                <Route path="/quotation/new" element={<Navigate to="/quotations/new" replace />} />
                <Route path="/quotation/:id" element={<EstimateDetailPage />} />
                <Route path="/estimates" element={<Navigate to="/quotations" replace />} />
                <Route path="/estimates/new" element={<Navigate to="/quotations/new" replace />} />
                <Route path="/estimates/:id" element={<EstimateDetailPage />} />
                <Route path="/estimates/:id/edit" element={<EstimateBuilderPage />} />
                <Route path="/estimates/:id/convert" element={<EstimateDetailPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/payments/new" element={<RecordPaymentPage />} />
                <Route path="/credit-notes" element={<CreditNotesPage />} />
                <Route path="/credit-notes/new" element={<CreditNoteBuilderPage />} />
                <Route path="/credit-notes/:id" element={<CreditNoteDetailPage />} />
                <Route path="/credit-notes/:id/edit" element={<CreditNoteBuilderPage />} />
                <Route path="/recurring-invoices" element={<RecurringInvoicesPage />} />
              </Route>

              <Route element={<FeatureGuard featureKey="catalog" featureName="Inventory Management" />}>
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>

              <Route element={<FeatureGuard featureKey="reports" featureName="Reports" />}>
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/sales-reports" element={<SalesReportsPage />} />
                <Route path="/inventory-reports" element={<InventoryReportsPage />} />
                <Route path="/purchase-accounting-reports" element={<PurchaseAccountingReportsPage />} />
                <Route path="/hr-reports" element={<HRReportsPage />} />
                <Route path="/promotion-reports" element={<PromotionReportsPage />} />
                <Route path="/business-report" element={<BusinessReportPage />} />
                <Route path="/aging-details" element={<AgingDetailsPage />} />
                <Route path="/profit-loss" element={<ProfitLossPage />} />
                <Route path="/gst-returns" element={<GstReturnsPage />} />
              </Route>

              <Route path="/templates" element={<InvoiceTemplatePage />} />
              <Route path="/templates/customize" element={<TemplateCustomizationPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/custom-fields" element={<CustomFieldsPage />} />
              <Route element={<FeatureGuard featureKey="people" featureName="Business HR" />}>
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/shifts" element={<ShiftsPage />} />
                <Route path="/leaves" element={<LeavesPage />} />
                <Route path="/employee-expenses" element={<HRExpensesPage />} />
                <Route path="/hr-expenses" element={<HRExpensesPage />} />
                <Route path="/employees/:id/documents" element={<EmployeeDocumentsPage />} />
                <Route path="/employee-documents" element={<EmployeeDocumentsPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/payroll/:id" element={<PayrollRunDetailPage />} />
              </Route>
              <Route element={<FeatureGuard featureKey="sales" featureName="Sales" />}>
                <Route path="/statements" element={<CustomerStatementPage />} />
                <Route path="/statements/:clientId" element={<CustomerStatementPage />} />
                <Route path="/emails" element={<EmailPage />} />
                <Route path="/chats" element={<ChatUIPage />} />
              </Route>
              <Route element={<FeatureGuard featureKey="purchases" featureName="Purchases" />}>
                <Route path="/vendors" element={<VendorsPage />} />
                <Route path="/vendors/:id" element={<VendorDetailPage />} />
                <Route path="/vendor-payments" element={<VendorPaymentsPage />} />
                <Route path="/vendor-payments/new" element={<RecordVendorPaymentPage />} />
                <Route path="/purchase-returns" element={<DebitNotesPage />} />
                <Route path="/purchase-returns/new" element={<DebitNoteBuilderPage />} />
                <Route path="/purchase-returns/:id" element={<DebitNoteDetailPage />} />
                <Route path="/purchase-returns/:id/edit" element={<DebitNoteBuilderPage />} />
                <Route path="/purchase-invoices" element={<BillsPage />} />
                <Route path="/purchase-invoices/new" element={<BillBuilderPage />} />
                <Route path="/purchase-invoices/:id" element={<BillDetailPage />} />
                <Route path="/purchase-invoices/:id/edit" element={<BillBuilderPage />} />
                <Route path="/bills" element={<BillsPage />} />
                <Route path="/bills/new" element={<BillBuilderPage />} />
                <Route path="/bills/:id" element={<BillDetailPage />} />
                <Route path="/bills/:id/edit" element={<BillBuilderPage />} />
                <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="/purchase-orders/new" element={<PurchaseOrderBuilderPage />} />
                <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderBuilderPage />} />
                <Route path="/grns" element={<GrnsPage />} />
                <Route path="/grns/new" element={<GrnBuilderPage />} />
                <Route path="/grns/:id" element={<GrnDetailPage />} />
                <Route path="/grns/:id/edit" element={<GrnBuilderPage />} />
                <Route path="/debit-notes" element={<DebitNotesPage />} />
                <Route path="/debit-notes/new" element={<DebitNoteBuilderPage />} />
                <Route path="/debit-notes/:id" element={<DebitNoteDetailPage />} />
                <Route path="/debit-notes/:id/edit" element={<DebitNoteBuilderPage />} />
                <Route path="/expenses" element={<BusinessExpensesPage />} />
              </Route>
              <Route element={<FeatureGuard featureKey="accounting" featureName="Banking" />}>
                <Route path="/accounts" element={<ChartOfAccountsPage />} />
                <Route path="/journal" element={<JournalEntriesPage />} />
                <Route path="/branches" element={<BranchesPage />} />
                <Route path="/tds" element={<TdsPage />} />
                <Route path="/accounting-reports" element={<AccountingReportsPage />} />
                <Route path="/bank-accounts" element={<BankAccountsPage />} />
                <Route path="/bank-accounts/:id" element={<BankAccountDetailPage />} />
                <Route path="/cash-flow" element={<CashFlowPage />} />
              </Route>

              <Route path="/delivery-challans" element={<DeliveryChallansPage />} />
              <Route path="/delivery-challans/new" element={<DeliveryChallanBuilderPage />} />
              <Route path="/delivery-challans/:id/edit" element={<DeliveryChallanBuilderPage />} />
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/inventory-valuation" element={<InventoryValuationPage />} />


              <Route element={<FeatureGuard featureKey="crm" featureName="CRM" />}>
                <Route path="/crm-report" element={<CRMReportPage />} />
                <Route path="/crm-dashboard" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm/dashboard" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm/report" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm/automations" element={<CRMAutomationsPage />} />
                <Route path="/crm-automations" element={<CRMAutomationsPage />} />
                <Route path="/automations" element={<CRMAutomationsPage />} />
                  <Route path="/calendar" element={<CRMCalendarPage />} />
                <Route path="/crm/integrations" element={<CrmIntegrationsPage />} />
                <Route path="/crm-integrations" element={<CrmIntegrationsPage />} />
                <Route path="/integrations" element={<CrmIntegrationsPage />} />
                <Route path="/tickets" element={<SupportTicketsPage />} />
                <Route path="/support-tickets" element={<SupportTicketsPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/:id" element={<LeadDetailPage />} />
                  <Route path="/crm-team" element={<CRMTeamPage />} />
                <Route path="/pipeline" element={<Navigate to="/crm-report" replace />} />
                <Route path="/pipeline/:id" element={<Navigate to="/crm-report" replace />} />
                <Route path="/activities" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm-reports" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm/reports" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm-marketing-reports" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm marketing reports" element={<Navigate to="/crm-report" replace />} />
                <Route path="/crm%20marketing%20reports" element={<Navigate to="/crm-report" replace />} />
              </Route>
              <Route element={<FeatureGuard featureKey="marketing" featureName="Business Promotion" />}>
                <Route path="/marketing/posters" element={<MarketingPostersPage />} />
                <Route path="/marketing/templates" element={<MarketingTemplatesPage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="/journeys" element={<JourneysPage />} />
                <Route path="/message-logs" element={<MessageLogsPage />} />
              </Route>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/support" element={<Navigate to="/settings?tab=support" replace />} />
              <Route path="/admin" element={<AdminPanelPage />} />
                <Route path="/feedback" element={<ComingSoonPage title="Business Feedback" description="Collect, manage, and analyze customer feedback and satisfaction ratings." />} />
                <Route path="/feedback-assessment" element={<ComingSoonPage title="Feedback Assessment Form" />} />
                <Route path="/business-analysis" element={<ComingSoonPage title="Business Analysis" description="AI-powered insights, predictive financial forecasting, and comprehensive business analytics." />} />
                <Route path="/ai-bi-report" element={<ComingSoonPage title="Business Analysis" description="AI-powered insights, predictive financial forecasting, and comprehensive business analytics." />} />
                {/* Customer support tickets accessible via /tickets under CRM */}
            </Route>

            {/* Public portal */}
            <Route path="/portal/:token" element={<PortalPage />} />

            {/* Platform Admin Route */}
            <Route
              path="/platform-admin"
              element={
                <RequireAuth>
                  <PlatformAdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<PlatformAdminPage />} />
            </Route>

            {/* Public feature pages */}
            <Route path="/hr" element={<HRFeaturesPage />} />
            <Route path="/hrms" element={<HRFeaturesPage />} />
            <Route path="/crm" element={<CRMFeaturesPage />} />
            <Route path="/marketing" element={<MarketingFeaturesPage />} />
            <Route path="/promotion" element={<MarketingFeaturesPage />} />

            {/* Redirects */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/partner" element={<PartnerWithUsPage />} />
            <Route path="/partner-with-us" element={<PartnerWithUsPage />} />

            {/* ===== Partner Portal — Completely separate system ===== */}
            <Route path="/partner-portal" element={<PartnerPortalPage />} />
            <Route path="/partner-login" element={<PartnerLoginPage />} />
            <Route path="/partner-register" element={<PartnerRegisterPage />} />
            <Route path="/partner-dashboard" element={<PartnerDashboardPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

