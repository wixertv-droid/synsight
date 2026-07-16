import { handleAdminCreditAdjustment } from "@/lib/admin/credits-route";

export async function POST(request: Request) {
  return handleAdminCreditAdjustment(request, "remove");
}
