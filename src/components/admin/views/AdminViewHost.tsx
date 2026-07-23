import AdminCommunicationsControl from "@/components/admin/AdminCommunicationsControl";
import AdminPricingControl from "@/components/admin/AdminPricingControl";
import AdminPromotionsControl from "@/components/admin/AdminPromotionsControl";
import AdminUserControl from "@/components/admin/AdminUserControl";
import AdminAuditView from "@/components/admin/views/AdminAuditView";
import AdminSystemStatusView from "@/components/admin/views/AdminSystemStatusView";
import AdminAnalysisModulesView from "@/components/admin/views/AdminAnalysisModulesView";
import AdminApiCredentialsView from "@/components/admin/views/AdminApiCredentialsView";
import AdminImageSettingsView from "@/components/admin/views/AdminImageSettingsView";
import AdminFinanceOverviewView from "@/components/admin/views/AdminFinanceOverviewView";
import AdminFinanceProvidersView from "@/components/admin/views/AdminFinanceProvidersView";
import AdminFinanceApiCostsView from "@/components/admin/views/AdminFinanceApiCostsView";
import AdminUserProfilePanel from "@/components/admin/views/AdminUserProfilePanel";
import AdminUserOverviewView, {
  AdminUserTable,
} from "@/components/admin/views/AdminUserViews";
import type { AdminUserOverviewStats } from "@/lib/repositories/admin-repository";

export default function AdminViewHost({
  view,
  overviewStats,
  userId,
}: {
  view: string;
  overviewStats?: AdminUserOverviewStats | null;
  userId?: number;
}) {
  switch (view) {
    case "user-overview":
      return <AdminUserOverviewView initialStats={overviewStats} />;
    case "user-management":
    case "support-user-search":
      return <AdminUserTable />;
    case "user-credits-adjust":
      return <AdminUserControl />;
    case "user-audit":
      return <AdminAuditView title="Audit & Loginhistorie" />;
    case "user-blocked":
      return <AdminUserTable statusFilter="suspended" />;
    case "marketing-pricing":
      return <AdminPricingControl />;
    case "marketing-promotions":
      return <AdminPromotionsControl />;
    case "website-system":
      return <AdminSystemStatusView />;
    case "website-api":
      return <AdminApiCredentialsView />;
    case "website-modules":
      return <AdminAnalysisModulesView />;
    case "website-images":
      return <AdminImageSettingsView />;
    case "finance-overview":
      return <AdminFinanceOverviewView />;
    case "finance-providers":
      return <AdminFinanceProvidersView />;
    case "finance-api-costs":
      return <AdminFinanceApiCostsView />;
    case "support-messages":
      return <AdminCommunicationsControl />;
    case "support-activity":
      return <AdminAuditView title="Support-Aktivitäten" />;
    case "user-profile":
      return userId ? <AdminUserProfilePanel userId={userId} /> : null;
    default:
      return null;
  }
}
