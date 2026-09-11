import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminNav from "@/components/AdminNav";
import AdminReviewsManager from "@/components/AdminReviewsManager";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const metadata: Metadata = {
  title: "Admin — Reviews",
  robots: { index: false, follow: false },
};

/**
 * The page shell is public — it renders only a sign-in prompt. Every
 * read and every write goes through /api/admin/reviews, which calls
 * requireAdmin() on the server. Hiding this page is NOT the security
 * boundary; that check is.
 */
export default function AdminReviewsPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <AdminNav active="/admin/reviews" />
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          Reviews
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Nothing a customer writes reaches the website until you approve it
          here. Approving and unpublishing are the same button in reverse, and
          nothing is ever deleted — a rejected review stays so the same text
          cannot be approved later by mistake. You cannot edit a review: it is
          published exactly as it was written, or not at all.
        </p>
        <div className="mt-8">
          <AdminReviewsManager supabaseConfig={supabaseConfig} />
        </div>
      </Container>
    </div>
  );
}
