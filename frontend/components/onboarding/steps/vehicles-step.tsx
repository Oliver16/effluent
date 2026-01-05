'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Car } from 'lucide-react'
import type { StepProps } from './index'

interface Vehicle {
  name: string
  type: string
  year: string
  make: string
  model: string
  value: string
}

const VEHICLE_TYPE_OPTIONS = [
  { value: 'vehicle', label: 'Car/Truck' },
  { value: 'boat', label: 'Boat/RV' },
]

export function VehiclesStep({ formData, setFormData }: StepProps) {
  const vehicles = (formData.vehicles as Vehicle[]) || []

  const addVehicle = () => {
    const newVehicles = [...vehicles, {
      name: '',
      type: 'vehicle',
      year: '',
      make: '',
      model: '',
      value: '',
    }]
    setFormData({ ...formData, vehicles: newVehicles })
  }

  const updateVehicle = (index: number, field: keyof Vehicle, value: string) => {
    const newVehicles = [...vehicles]
    newVehicles[index] = { ...newVehicles[index], [field]: value }
    setFormData({ ...formData, vehicles: newVehicles })
  }

  const removeVehicle = (index: number) => {
    const newVehicles = vehicles.filter((_, i) => i !== index)
    setFormData({ ...formData, vehicles: newVehicles })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add vehicles you own. This step is optional.
      </p>

      {vehicles.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No vehicles added</p>
          <Button onClick={addVehicle}>
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      ) : (
        <>
          {vehicles.map((vehicle, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Vehicle {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVehicle(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Year</Label>
                  <Input
                    value={vehicle.year}
                    onChange={(e) => updateVehicle(index, 'year', e.target.value)}
                    placeholder="2022"
                  />
                </div>

                <div>
                  <Label>Make</Label>
                  <Input
                    value={vehicle.make}
                    onChange={(e) => updateVehicle(index, 'make', e.target.value)}
                    placeholder="e.g., Toyota"
                  />
                </div>

                <div>
                  <Label>Model</Label>
                  <Input
                    value={vehicle.model}
                    onChange={(e) => updateVehicle(index, 'model', e.target.value)}
                    placeholder="e.g., Camry"
                  />
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={vehicle.type}
                    onChange={(e) => updateVehicle(index, 'type', e.target.value)}
                    options={VEHICLE_TYPE_OPTIONS}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Estimated Current Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={vehicle.value}
                      onChange={(e) => updateVehicle(index, 'value', e.target.value)}
                      placeholder="25000"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addVehicle} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Vehicle
          </Button>
        </>
      )}
    </div>
  )
}
