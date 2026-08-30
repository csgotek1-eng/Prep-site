import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminLeadsManager from "@/components/AdminLeadsManager";
import AdminNav from "@/components/AdminNav";
import { getSupabasePublicConfig } from "@/lib/supabase-config";

export const metadata: Metadata = {
  title: "Admin — Leads",
  robots: {
    index: false,
    follow: false,
  },
};

// The page shell is public UX only; every lead read and status change
// goes through /api/admin/leads*, which enforces the server-side admin
// check on each request. Hiding this page is not the security boundary.
export default function AdminLeadsPage() {
  const supabaseConfig = getSupabasePublicConfig();
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <AdminNav active="/admin/leads" />
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          Lead inbox
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Every quote request and enquiry submitted through the website,
          newest first. Access requires an administrator sign-in.
        </p>
        <div className="mt-8">
          <AdminLeadsManager supabaseConfig={supabaseConfig} />
        </div>
      </Container>
    </div>
  );
}
