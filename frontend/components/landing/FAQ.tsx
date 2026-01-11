'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'Is this a budgeting app?',
    answer: 'Not really. Budgeting apps track what you spent. Effluent helps you model what\'s ahead—your baseline, your scenarios, your runway.',
  },
  {
    question: 'Do I need to connect my bank accounts?',
    answer: 'No. You enter your flows manually (income, recurring expenses, etc). This keeps the model in your control and avoids the complexity of syncing.',
  },
  {
    question: 'What does "confidence" mean?',
    answer: 'It\'s a measure of how fresh and complete your data is. If you haven\'t updated your balances in a while, confidence drops to remind you.',
  },
  {
    question: 'Can I share with my partner?',
    answer: 'Yes. You can invite other users to your household. Everyone sees the same data and can run their own scenarios.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="px-4 py-12 bg-muted/30">
      <div className="max-w-xl mx-auto">
        <h2 className="text-lg font-semibold text-center mb-6 text-foreground">
          Questions
        </h2>
        <div className="space-y-2">
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
      className="rounded-md border border-border bg-card overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium text-foreground">{question}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-2',
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
        <p className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  )
}
