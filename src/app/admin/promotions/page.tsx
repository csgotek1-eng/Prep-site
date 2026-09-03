import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminNav from "@/components/AdminNav";
import AdminPromotionsManager from "@/components/AdminPromotionsManager";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const metadata: Metadata = {
  title: "Admin — Promotions",
  robots: { index: false, follow: false },
};

/**
 * The page shell is public — it renders only a sign-in prompt. Every
 * read and every write goes through /api/admin/promotions, which calls
 * requireAdmin() on the server. Hiding this page is NOT the security
 * boundary; that check is.
 */
export default function AdminPromotionsPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <AdminNav active="/admin/promotions" />
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          Promotions
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Temporary introductory offers. An offer only reaches the website
          once you publish it, and it leaves by itself when its end date
          passes — nothing has to be deleted. Archived offers stay here so
          the leads attributed to them still make sense later.
        </p>
        <div className="mt-8">
          <AdminPromotionsManager supabaseConfig={supabaseConfig} />
        </div>
      </Container>
    </div>
  );
}
