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
    <section className="border-t border-border">
      <div className="px-6 sm:px-8 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-[-0.02em]">
                Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === i}
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                />
              ))}
            </div>
          </div>
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
}: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <div className="border-b border-border pb-4">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <span className="text-lg font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0 ml-4',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <p className="text-muted-foreground leading-relaxed pt-2">
          {answer}
        </p>
      </div>
    </div>
  )
}
