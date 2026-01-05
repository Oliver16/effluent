'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, CreditCard } from 'lucide-react'
import type { StepProps } from './index'

interface CreditCardType {
  name: string
  institution: string
  balance: string
  limit: string
  rate: string
  min_payment: string
}

export function CreditCardsStep({ formData, setFormData }: StepProps) {
  const cards = (formData.credit_cards as CreditCardType[]) || []

  const addCard = () => {
    const newCards = [...cards, {
      name: '',
      institution: '',
      balance: '',
      limit: '',
      rate: '',
      min_payment: '',
    }]
    setFormData({ ...formData, credit_cards: newCards })
  }

  const updateCard = (index: number, field: keyof CreditCardType, value: string) => {
    const newCards = [...cards]
    newCards[index] = { ...newCards[index], [field]: value }
    setFormData({ ...formData, credit_cards: newCards })
  }

  const removeCard = (index: number) => {
    const newCards = cards.filter((_, i) => i !== index)
    setFormData({ ...formData, credit_cards: newCards })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add credit cards with a balance. Cards paid in full monthly can be skipped.
      </p>

      {cards.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No credit cards with balances</p>
          <Button onClick={addCard}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credit Card
          </Button>
        </div>
      ) : (
        <>
          {cards.map((card, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Credit Card {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCard(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Card Name</Label>
                  <Input
                    value={card.name}
                    onChange={(e) => updateCard(index, 'name', e.target.value)}
                    placeholder="e.g., Chase Sapphire"
                  />
                </div>

                <div>
                  <Label>Issuer</Label>
                  <Input
                    value={card.institution}
                    onChange={(e) => updateCard(index, 'institution', e.target.value)}
                    placeholder="e.g., Chase, Amex"
                  />
                </div>

                <div>
                  <Label>Current Balance</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={card.balance}
                      onChange={(e) => updateCard(index, 'balance', e.target.value)}
                      placeholder="5000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Credit Limit</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={card.limit}
                      onChange={(e) => updateCard(index, 'limit', e.target.value)}
                      placeholder="15000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>APR (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={card.rate}
                    onChange={(e) => updateCard(index, 'rate', e.target.value)}
                    placeholder="19.99"
                  />
                </div>

                <div>
                  <Label>Minimum Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={card.min_payment}
                      onChange={(e) => updateCard(index, 'min_payment', e.target.value)}
                      placeholder="100"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addCard} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Credit Card
          </Button>
        </>
      )}
    </div>
  )
}
