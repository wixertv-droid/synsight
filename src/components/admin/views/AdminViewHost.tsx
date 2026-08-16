import AdminPageGuide from "@/components/admin/views/AdminPageGuide";
import AdminSeoKnowledgeControl from "@/components/admin/AdminSeoKnowledgeControl";
import AdminCommunicationsControl from "@/components/admin/AdminCommunicationsControl";
import AdminSupportUserCaseView from "@/components/admin/views/AdminSupportUserCaseView";
import AdminNewsletterControl from "@/components/admin/views/AdminNewsletterControl";
import AdminPricingControl from "@/components/admin/AdminPricingControl";
import AdminOrderPricingControl from "@/components/admin/AdminOrderPricingControl";
import AdminPromotionsControl from "@/components/admin/AdminPromotionsControl";
import AdminUserControl from "@/components/admin/AdminUserControl";
import AdminAuditView from "@/components/admin/views/AdminAuditView";
import AdminSystemStatusView from "@/components/admin/views/AdminSystemStatusView";
import AdminKiServerMonitorView from "@/components/admin/views/AdminKiServerMonitorView";
import AdminAnalysisModulesView from "@/components/admin/views/AdminAnalysisModulesView";
import AdminApiCredentialsView from "@/components/admin/views/AdminApiCredentialsView";
import AdminImageSettingsView from "@/components/admin/views/AdminImageSettingsView";
import AdminWebsiteContactSettingsView from "@/components/admin/views/AdminWebsiteContactSettingsView";
import AdminFinanceOverviewView from "@/components/admin/views/AdminFinanceOverviewView";
import AdminFinanceProvidersView from "@/components/admin/views/AdminFinanceProvidersView";
import AdminFinanceApiCostsView from "@/components/admin/views/AdminFinanceApiCostsView";
import AdminAdvertisingView from "@/components/admin/views/AdminAdvertisingView";
import AdminUserProfilePanel from "@/components/admin/views/AdminUserProfilePanel";
import AdminUserAccessControl from "@/components/admin/views/AdminUserAccessControl";
import AdminUserOverviewView, {
  AdminUserTable,
} from "@/components/admin/views/AdminUserViews";
import type { AdminUserOverviewStats } from "@/lib/repositories/admin-repository";

export default function AdminViewHost({
  view,
  overviewStats,
  userId,
  profileHrefBase,
}: {
  view: string;
  overviewStats?: AdminUserOverviewStats | null;
  userId?: number;
  profileHrefBase?: string;
}) {
  const content = (() => {
    switch (view) {
      case "user-overview":
        return <AdminUserOverviewView initialStats={overviewStats} />;
      case "user-management":
        return <AdminUserTable profileHrefBase={profileHrefBase} />;
      case "support-user-search":
        return <AdminSupportUserCaseView />;
      case "user-credits-adjust":
        return <AdminUserControl />;
      case "user-access":
        return <AdminUserAccessControl />;
      case "user-verification":
        return <AdminUserAccessControl verificationOnly />;
      case "user-audit":
        return <AdminAuditView title="Audit & Loginhistorie" />;
      case "user-blocked":
        return <AdminUserTable statusFilter="suspended" />;
      case "marketing-pricing":
        return (
          <>
            <AdminPricingControl />
            <AdminOrderPricingControl />
          </>
        );
      case "marketing-promotions":
        return <AdminPromotionsControl />;
      case "website-system":
        return <AdminSystemStatusView />;
      case "website-ki-server":
        return <AdminKiServerMonitorView />;
      case "website-api":
        return <AdminApiCredentialsView />;
      case "website-modules":
        return <AdminAnalysisModulesView panel="overview" />;
      case "analysis-overview":
        return <AdminAnalysisModulesView panel="overview" />;
      case "analysis-username":
        return <AdminAnalysisModulesView panel="username" />;
      case "analysis-digital-leak":
        return <AdminAnalysisModulesView panel="digital-leak" />;
      case "analysis-reverse-image":
        return <AdminAnalysisModulesView panel="reverse-image" />;
      case "website-images":
        return <AdminImageSettingsView />;
      case "website-contact-settings":
        return <AdminWebsiteContactSettingsView />;
      case "finance-overview":
        return <AdminFinanceOverviewView />;
      case "finance-providers":
        return <AdminFinanceProvidersView />;
      case "finance-api-costs":
        return <AdminFinanceApiCostsView />;
      case "finance-advertising":
        return <AdminAdvertisingView />;
      case "support-messages":
        return <AdminCommunicationsControl />;
      case "newsletter-center":
        return <AdminNewsletterControl />;
      case "support-activity":
        return <AdminAuditView title="Support-Aktivitäten" />;
      case "seo-knowledge-list":
        return <AdminSeoKnowledgeControl />;
      case "seo-knowledge-trash":
        return <AdminSeoKnowledgeControl trashMode />;
      case "user-profile":
        return userId ? <AdminUserProfilePanel userId={userId} /> : null;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <>
      <AdminPageGuide view={view} />
      {content}
    </>
  );
}
