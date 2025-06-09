import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-12 bg-background">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">About FetchSub</h1>
          <p className="text-xl text-muted-foreground">
            The story behind our YouTube subtitle downloader
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="leading-7">
              FetchSub was created with a simple mission: to make YouTube
              subtitles accessible to everyone. Whether you're a content
              creator, researcher, student, or just someone who wants to
              reference video content, we believe that having easy access to
              subtitles can enhance your experience and productivity.
            </p>

            <h3 className="text-2xl font-semibold tracking-tight mt-8">
              What We Offer
            </h3>
            <p className="leading-7">
              Our platform provides a streamlined way to batch download
              subtitles from YouTube videos. Instead of manually downloading
              subtitles one by one, you can provide playlist URLs, channel URLs,
              or upload CSV files containing video links to process multiple
              videos at once.
            </p>

            <h3 className="text-2xl font-semibold tracking-tight mt-8">
              Our Technology
            </h3>
            <p className="leading-7">
              FetchSub uses advanced web technologies to efficiently extract
              subtitles from YouTube videos. We support multiple subtitle
              formats (SRT, VTT, TXT) and languages, giving you flexibility in
              how you use the downloaded content.
            </p>

            <h3 className="text-2xl font-semibold tracking-tight mt-8">
              Who We Are
            </h3>
            <p className="leading-7">
              We're a small team of developers passionate about accessibility
              and productivity tools. FetchSub started as a side project to
              solve our own needs for subtitle extraction and has grown into a
              tool used by thousands of people worldwide.
            </p>
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
