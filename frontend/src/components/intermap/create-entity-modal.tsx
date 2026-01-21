"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useNewCustomer } from "@/features/customers/hooks/use-new-customer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { useGetLocations } from "@/features/locations/api/use-get-locations"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function NewCustomerSheet() {
  const { isOpen, onClose } = useNewCustomer()
  const { data: locations = [] } = useGetLocations()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: "",
    locationId: "",
    inclusionType: "Include",
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        id: Math.floor(Math.random() * 10000) + 1000,
        ...data,
        locationId: parseInt(data.locationId),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast.success("Customer created successfully!")
      onClose()
      setFormData({ name: "", locationId: "", inclusionType: "Include" })
    },
    onError: () => {
      toast.error("Failed to create customer")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.locationId) {
      toast.error("Please fill in all required fields")
      return
    }
    createCustomerMutation.mutate(formData)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New Customer</SheetTitle>
          <SheetDescription>
            Create a new customer for the supply chain map.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Select
              value={formData.locationId}
              onValueChange={(value) =>
                setFormData({ ...formData, locationId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location: { id: number; name: string }) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inclusionType">Inclusion Type</Label>
            <Select
              value={formData.inclusionType}
              onValueChange={(value) =>
                setFormData({ ...formData, inclusionType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Include">Include</SelectItem>
                <SelectItem value="Exclude">Exclude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
