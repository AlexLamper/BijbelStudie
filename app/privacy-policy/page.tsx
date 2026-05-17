import { Button } from "../../components/ui/button"
import Link from "next/link"
import { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, fallbackLng } from "../i18n/settings";
import { generatePageMetadata } from "../../lib/pageMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const lng = cookieStore.get(cookieName)?.value || fallbackLng;
  return generatePageMetadata('privacyPolicy', lng);
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-12 bg-background">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <div className="shadow-md rounded-lg p-6 mb-8 bg-gray-200 dark:bg-[#3d3d3ff2]">
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, such as when you create an account, participate in
            community features, or contact us for support. This may include your name, email address, and any other
            information you choose to provide.
          </p>

          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide, maintain, and improve our services, to communicate with you,
            and to personalize your experience on BijbelStudie.
          </p>

          <h2 className="text-2xl font-semibold mb-4">3. Information Sharing and Disclosure</h2>
          <p className="mb-4">
            We do not share your personal information with third parties except as described in this policy. We may
            share information with service providers who perform services on our behalf, or when required by law.
          </p>

          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p className="mb-4">
            We take reasonable measures to help protect your personal information from loss, theft, misuse, and
            unauthorized access, disclosure, alteration, and destruction.
          </p>

          <h2 className="text-2xl font-semibold mb-4">5. Your Choices</h2>
          <p className="mb-4">
            You can access and update certain information about your account by logging into your BijbelStudie account
            settings. You can also opt-out of receiving promotional communications from us by following the instructions
            in those communications.
          </p>

          <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
          <p className="mb-4">
            We use cookies and similar technologies to collect information about your activity, browser, and device. You
            can manage your cookie preferences through your browser settings.
          </p>

          <h2 className="text-2xl font-semibold mb-4">7. Changes to This Policy</h2>
          <p className="mb-4">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new
            privacy policy on this page.
          </p>

          <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at privacy@bijbelstudie.com.
          </p>
        </div>
        <div className="text-center">
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

