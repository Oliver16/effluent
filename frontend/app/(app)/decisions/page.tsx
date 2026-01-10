'use client'

/**
 * @deprecated This page redirects to /life-events.
 * The Decisions feature has been consolidated into Life Events.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function DecisionsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/life-events')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Redirecting to Life Events...</span>
      </div>
    </div>
  )
}
