import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminNav from "@/components/AdminNav";
import AdminVideosManager from "@/components/AdminVideosManager";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const metadata: Metadata = {
  title: "Admin — Videos",
  robots: { index: false, follow: false },
};

/**
 * The page shell is public — it renders only a sign-in prompt. Every
 * read and write goes through /api/admin/videos, which calls
 * requireAdmin() on the server. Hiding this page is NOT the security
 * boundary; that check is.
 */
export default function AdminVideosPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <AdminNav active="/admin/videos" />
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          Videos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Videos from the Dockentra YouTube channel. A video you add starts as a
          draft; publish it to show it on the Videos page, and choose &ldquo;Show on
          homepage&rdquo; to add it to the homepage too. Removing a video here takes
          it off the website only; it stays on YouTube.
        </p>
        <div className="mt-8">
          <AdminVideosManager supabaseConfig={supabaseConfig} />
        </div>
      </Container>
    </div>
  );
}
