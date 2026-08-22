import type { Metadata } from "next";
import Container from "@/components/Container";
import AdminPricingManager from "@/components/AdminPricingManager";

export const metadata: Metadata = {
  title: "Admin — Pricing",
  robots: {
    index: false,
    follow: false,
  },
};

// The page shell is public (it renders only a token prompt); every data
// read and mutation happens through /api/admin/* routes, which enforce
// the server-side token check. Hiding this page is not the security
// boundary — requireAdmin() on the API is.
export default function AdminPricingPage() {
  return (
    <div className="py-12 sm:py-16">
      <Container>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          Pricing administration
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage the services and prices shown in the public fulfilment
          cost calculator. Access requires the server-configured admin
          token.
        </p>
        <div className="mt-8">
          <AdminPricingManager />
        </div>
      </Container>
    </div>
  );
}
