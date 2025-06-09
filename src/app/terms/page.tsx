import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 bg-background">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xl text-muted-foreground">
            Please read these terms carefully before using FetchSub
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">1. Acceptance of Terms</h3>
              <p className="leading-7">
                By accessing or using FetchSub.com ("the Service"), you agree to
                be bound by these Terms of Service. If you disagree with any
                part of the terms, you may not access the Service.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                2. Description of Service
              </h3>
              <p className="leading-7">
                FetchSub provides tools for downloading subtitles from YouTube
                videos. The Service is provided "as is" and "as available"
                without warranties of any kind, either express or implied.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                3. Fair Use and Copyright
              </h3>
              <p className="leading-7">
                Users are responsible for ensuring their use of downloaded
                subtitles complies with applicable copyright laws. FetchSub is
                designed for legitimate purposes such as research,
                accessibility, and content creation within fair use guidelines.
                We do not endorse or encourage copyright infringement.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">4. User Conduct</h3>
              <p className="leading-7">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Infringe upon intellectual property rights</li>
                <li>
                  Attempt to gain unauthorized access to any part of the Service
                </li>
                <li>
                  Use the Service in any manner that could disable, overburden,
                  or impair the site
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                5. Limitation of Liability
              </h3>
              <p className="leading-7">
                In no event shall FetchSub, its operators, or affiliates be
                liable for any indirect, incidental, special, consequential or
                punitive damages, including without limitation, loss of profits,
                data, use, goodwill, or other intangible losses, resulting from
                your access to or use of or inability to access or use the
                Service.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">6. Changes to Terms</h3>
              <p className="leading-7">
                We reserve the right to modify or replace these Terms at any
                time. It is your responsibility to check the Terms periodically
                for changes. Your continued use of the Service following the
                posting of any changes constitutes acceptance of those changes.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold">7. Contact Us</h3>
              <p className="leading-7">
                If you have any questions about these Terms, please contact us
                at support@fetchsub.com.
              </p>
            </div>
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} FetchSub.com - YouTube Subtitle
            Downloader
          </p>
        </footer>
      </div>
    </main>
  );
}
