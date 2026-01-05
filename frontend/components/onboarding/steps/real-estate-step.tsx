'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Home } from 'lucide-react'
import type { StepProps } from './index'

interface Property {
  name: string
  type: string
  address: string
  value: string
  purchase_price: string
}

const PROPERTY_TYPE_OPTIONS = [
  { value: 'primary_residence', label: 'Primary Residence' },
  { value: 'rental_property', label: 'Rental Property' },
  { value: 'vacation_property', label: 'Vacation Property' },
  { value: 'land', label: 'Land' },
  { value: 'commercial_property', label: 'Commercial Property' },
]

export function RealEstateStep({ formData, setFormData }: StepProps) {
  const properties = (formData.properties as Property[]) || []

  const addProperty = () => {
    const newProperties = [...properties, {
      name: '',
      type: 'primary_residence',
      address: '',
      value: '',
      purchase_price: '',
    }]
    setFormData({ ...formData, properties: newProperties })
  }

  const updateProperty = (index: number, field: keyof Property, value: string) => {
    const newProperties = [...properties]
    newProperties[index] = { ...newProperties[index], [field]: value }
    setFormData({ ...formData, properties: newProperties })
  }

  const removeProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index)
    setFormData({ ...formData, properties: newProperties })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add any real estate you own. This step is optional - you can skip it if you rent.
      </p>

      {properties.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No properties added</p>
          <Button onClick={addProperty}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </div>
      ) : (
        <>
          {properties.map((property, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Property {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProperty(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Property Name</Label>
                  <Input
                    value={property.name}
                    onChange={(e) => updateProperty(index, 'name', e.target.value)}
                    placeholder="e.g., Main House, Beach Condo"
                  />
                </div>

                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={property.type}
                    onChange={(e) => updateProperty(index, 'type', e.target.value)}
                    options={PROPERTY_TYPE_OPTIONS}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Address (optional)</Label>
                  <Input
                    value={property.address}
                    onChange={(e) => updateProperty(index, 'address', e.target.value)}
                    placeholder="123 Main St, City, ST 12345"
                  />
                </div>

                <div>
                  <Label>Estimated Current Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={property.value}
                      onChange={(e) => updateProperty(index, 'value', e.target.value)}
                      placeholder="450000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Original Purchase Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={property.purchase_price}
                      onChange={(e) => updateProperty(index, 'purchase_price', e.target.value)}
                      placeholder="350000"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addProperty} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Property
          </Button>
        </>
      )}
    </div>
  )
}
