import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Demo — Effluent',
  description: 'Watch a walkthrough of Effluent, the financial control plane for your household.',
}

/**
 * Demo video configuration:
 *
 * Set the NEXT_PUBLIC_DEMO_VIDEO_URL environment variable to specify the video source.
 *
 * Supported formats:
 * - YouTube: https://www.youtube.com/embed/VIDEO_ID
 * - Vimeo: https://player.vimeo.com/video/VIDEO_ID
 * - Direct video file: https://example.com/video.mp4
 * - Loom: https://www.loom.com/embed/VIDEO_ID
 *
 * Example in .env.local:
 *   NEXT_PUBLIC_DEMO_VIDEO_URL=https://www.youtube.com/embed/dQw4w9WgXcQ
 */
const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL

export default function DemoPage() {
  const isEmbeddedVideo = DEMO_VIDEO_URL && (
    DEMO_VIDEO_URL.includes('youtube.com/embed') ||
    DEMO_VIDEO_URL.includes('player.vimeo.com') ||
    DEMO_VIDEO_URL.includes('loom.com/embed')
  )

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Watch the walkthrough
        </h1>
        <p className="text-muted-foreground mb-8">
          See how Effluent transforms household finances into an operational system.
        </p>

        {/* Video player */}
        <div className="relative aspect-video rounded-xl border border-border bg-muted/50 overflow-hidden mb-8">
          {DEMO_VIDEO_URL ? (
            isEmbeddedVideo ? (
              <iframe
                src={DEMO_VIDEO_URL}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Effluent Demo Video"
              />
            ) : (
              <video
                src={DEMO_VIDEO_URL}
                className="absolute inset-0 w-full h-full object-cover"
                controls
                playsInline
              />
            )
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Play className="w-6 h-6 ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
                Video coming soon
              </div>
            </>
          )}
        </div>

        <Button asChild>
          <Link href="/login">
            Launch the control plane
          </Link>
        </Button>
      </div>
    </main>
  )
}
