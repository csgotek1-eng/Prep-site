import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How the Dockentra website handles information from the quote form, pricing calculator and contact details.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-brand-navy">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              What this website actually does with the information you
              share with it.
            </p>
          </div>
        </Container>
      </section>

      <section aria-label="Privacy policy" className="bg-white">
        <Container className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl space-y-10 text-base leading-7 text-slate-700">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Who operates this website
              </h2>
              <p className="mt-3">
                This website is operated by Dockentra, an Irish e-commerce
                fulfilment and prep business. You can reach Dockentra
                using the details on the{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  Contact page
                </Link>
                .
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Information you provide to us
              </h2>
              <p className="mt-3">
                When you use the quote form or the pricing calculator&apos;s
                &quot;request this quote&quot; action, you may provide your
                name, business name, email address, phone number, website,
                sales channels, approximate stock/order figures, the
                services you are interested in and a free-text message.
                All fields are optional except your name and a valid email
                address.
              </p>
              <p className="mt-3">
                If you contact Dockentra directly by phone, WhatsApp or
                social media instead of the website form, that
                conversation happens on that platform and is not
                controlled by this website.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                The pricing calculator
              </h2>
              <p className="mt-3">
                The pricing calculator stores your selected services
                temporarily in your browser&apos;s session storage, only
                on your own device, so that your estimate can be carried
                over if you choose to send it as a quote request. This is
                cleared when you submit or leave the quote form, and
                automatically when you close your browser session. To
                calculate an estimate, your selected services, quantities
                and monthly order volume are sent to this website&apos;s
                own server, which prices them and returns the result;
                they contain no personal details and are not kept unless
                you choose to submit a quote request.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Why we use this information
              </h2>
              <p className="mt-3">
                Information submitted through the quote form is used only
                to respond to your enquiry and prepare a fulfilment
                proposal. It is not used for advertising, sold, or shared
                with third parties for marketing purposes.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                How enquiries are delivered
              </h2>
              <p className="mt-3">
                Submissions are protected by a spam filter and a request
                rate limit, then stored securely in Dockentra&apos;s own
                systems so your enquiry cannot be lost, and reviewed by
                Dockentra. Depending on how the website is configured at
                any given time, a copy may also be sent securely to a
                delivery endpoint Dockentra controls. Submissions are
                never published publicly and are only accessible to
                Dockentra.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Contacting us via WhatsApp or social media
              </h2>
              <p className="mt-3">
                Links to WhatsApp, Instagram, Facebook and TikTok on this
                website open those platforms directly in a new tab. Any
                information you choose to share there is handled under
                that platform&apos;s own privacy terms, not this
                website&apos;s. Where this website generates a pre-filled
                WhatsApp message for you (for example, from a pricing
                calculator result), it only includes the service selection
                and estimate you built — never your name, email, phone or
                address unless you type them into the WhatsApp
                conversation yourself.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Hosting and technical processing
              </h2>
              <p className="mt-3">
                This website is hosted on Vercel&apos;s infrastructure,
                which processes standard web request data (such as IP
                address) as part of serving the site and is used
                internally to apply a short-lived rate limit against
                abusive form submissions. This website does not load
                third-party analytics, advertising or tracking scripts.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Data retention
              </h2>
              <p className="mt-3">
                Quote and enquiry submissions are retained only for as
                long as needed to respond to your enquiry and manage the
                resulting business relationship. You can ask for your
                submission to be deleted at any time using the contact
                details on this website.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Security
              </h2>
              <p className="mt-3">
                Form submissions are transmitted over HTTPS. Delivery to
                Dockentra&apos;s systems, where configured, is
                authenticated so that only Dockentra can receive it.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Your rights
              </h2>
              <p className="mt-3">
                You can ask what information Dockentra holds about you, or
                ask for it to be corrected or deleted, by contacting
                Dockentra using the details on the{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand-green-dark underline-offset-2 hover:underline"
                >
                  Contact page
                </Link>
                {siteConfig.legal.privacyEmail
                  ? ` or by emailing ${siteConfig.legal.privacyEmail}`
                  : ""}
                .
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                Changes to this notice
              </h2>
              <p className="mt-3">
                This notice may be updated as the website&apos;s actual
                functionality changes. Check back here for the current
                version.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
