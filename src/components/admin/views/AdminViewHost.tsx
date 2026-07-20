import AdminCommunicationsControl from "@/components/admin/AdminCommunicationsControl";
import AdminPricingControl from "@/components/admin/AdminPricingControl";
import AdminPromotionsControl from "@/components/admin/AdminPromotionsControl";
import AdminUserControl from "@/components/admin/AdminUserControl";
import AdminPlaceholderPanel from "@/components/admin/views/AdminPlaceholderPanel";
import AdminSystemStatusView from "@/components/admin/views/AdminSystemStatusView";
import AdminAnalysisModulesView from "@/components/admin/views/AdminAnalysisModulesView";
import AdminApiCredentialsView from "@/components/admin/views/AdminApiCredentialsView";
import AdminImageSettingsView from "@/components/admin/views/AdminImageSettingsView";
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
      return <AdminUserTable />;
    case "user-search":
    case "support-user-search":
      return <AdminUserTable />;
    case "user-credits-adjust":
      return <AdminUserControl />;
    case "user-security":
    case "user-verifications":
    case "user-identity":
    case "user-syncredits":
    case "user-transactions":
    case "user-login-history":
    case "user-blocked":
      return <AdminUserTable />;
    case "user-audit":
      return (
        <AdminPlaceholderPanel
          title="Audit-Logs"
          note="Nutzen Sie die API /api/admin/audit — UI-Filter folgt in der nächsten Iteration."
        />
      );
    case "user-roles":
      return (
        <AdminPlaceholderPanel
          title="Rollen & Berechtigungen"
          note="Aktuell unterstützt: admin und user. Erweiterte Rollen werden hier konfigurierbar — ohne bestehende Rechte zu entfernen."
        />
      );
    case "marketing-pricing":
    case "marketing-packages":
      return <AdminPricingControl />;
    case "marketing-promotions":
    case "marketing-bonus":
    case "marketing-welcome":
      return <AdminPromotionsControl />;
    case "marketing-discounts":
    case "marketing-referral":
    case "marketing-stats":
      return (
        <AdminPlaceholderPanel
          title="Marketing-Erweiterung"
          note="Basierend auf promotions, payments und credit_transactions — Backend vorhanden, Dashboard folgt."
        />
      );
    case "website-system":
      return <AdminSystemStatusView />;
    case "website-api":
      return <AdminApiCredentialsView />;
    case "website-modules":
      return <AdminAnalysisModulesView />;
    case "website-images":
      return <AdminImageSettingsView />;
    case "website-uploads":
    case "website-security":
    case "website-logs":
    case "website-landing":
    case "website-dashboard":
    case "website-legal":
    case "website-cms":
      return (
        <AdminPlaceholderPanel
          title="Website-Modul"
          note="Plattform-Modul in Vorbereitung. Bestehende Upload- und Sicherheits-Pipeline bleibt aktiv."
        />
      );
    case "support-messages":
    case "support-contact":
      return <AdminCommunicationsControl />;
    case "support-tickets":
    case "support-center":
      return (
        <>
          <AdminCommunicationsControl />
          <div className="mt-6">
            <AdminPlaceholderPanel
              title="Ticket-Workflow"
              note="Vollständiges Ticket-System mit Priorität und Anhängen — contact_requests dient als Interims-Inbox."
            />
          </div>
        </>
      );
    case "support-activity":
      return (
        <AdminPlaceholderPanel
          title="Aktivitäten"
          note="Kombinierter Feed aus audit_events und sessions — API /api/admin/audit verfügbar."
        />
      );
    case "user-profile":
      return userId ? (
        <AdminUserProfilePanel userId={userId} />
      ) : (
        <AdminPlaceholderPanel title="Profil" note="Keine Benutzer-ID." />
      );
    default:
      return (
        <AdminPlaceholderPanel
          title="Modul"
          note={`Unbekannte Ansicht „${view}“. Navigation prüfen.`}
        />
      );
  }
}
