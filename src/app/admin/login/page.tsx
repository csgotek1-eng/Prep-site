import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminLogin from "@/components/AdminLogin";

export const metadata: Metadata = {
  title: "Admin Sign-in",
  robots: {
    index: false,
    follow: false,
  },
};

// UX shell only: real authorization happens server-side on every
// /api/admin/* request via AdminAuthProvider.
export default function AdminLoginPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
            Admin sign-in
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in with your administrator account to manage calculator
            services and prices.
          </p>
          <div className="mt-6">
            <AdminLogin />
          </div>
        </div>
      </Container>
    </div>
  );
}
