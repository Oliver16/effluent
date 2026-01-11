'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'Is this a budgeting app?',
    answer: 'No — it\'s an operational interface for a financial model.',
  },
  {
    question: 'Do I need to connect accounts?',
    answer: 'No. The model is primary; update balances when it matters.',
  },
  {
    question: 'What does confidence mean?',
    answer: 'A reliability indicator based on freshness and completeness.',
  },
  {
    question: 'Can multiple users share a household?',
    answer: 'Yes.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="px-4 py-12 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6 text-foreground animate-fade-in">
          FAQ
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              delay={i * 50}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
  delay
}: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
  delay: number
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <p className="px-5 pb-4 text-sm text-muted-foreground">
          {answer}
        </p>
      </div>
    </div>
  )
}
