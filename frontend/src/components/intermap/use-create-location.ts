"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

interface LocationData {
  name: string
  latitude: number
  longitude: number
  city: string
  country: string
  address?: string
  phone?: string
  email?: string
  website?: string
}

interface CreateLocationResponse {
  data: {
    id: number
    name: string
    latitude: number
    longitude: number
    city: string
    country: string
    address?: string
  }
}

// Mock function to simulate location creation
async function createLocation(data: LocationData): Promise<CreateLocationResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Generate a mock ID
  const newId = Math.floor(Math.random() * 10000) + 100

  return {
    data: {
      id: newId,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      country: data.country,
      address: data.address,
    },
  }
}

export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      // Invalidate and refetch locations
      queryClient.invalidateQueries({ queryKey: ["locations"] })
    },
    onError: (error) => {
      console.error("Failed to create location:", error)
    },
  })
}
