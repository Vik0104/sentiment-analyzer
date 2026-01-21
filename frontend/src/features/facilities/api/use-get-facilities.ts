"use client"

import { useQuery } from "@tanstack/react-query"

// Mock facility data for demonstration
const mockFacilities = [
  {
    id: 101,
    name: "North America DC",
    locationId: 6,
    type: "DC",
    capacity: 50000,
    capacityUnit: "sq ft",
    inclusionType: "Include",
    createdAt: "2023-06-01T08:00:00Z",
    updatedAt: "2024-01-10T12:00:00Z",
  },
  {
    id: 102,
    name: "European Distribution Hub",
    locationId: 7,
    type: "Warehouse",
    capacity: 35000,
    capacityUnit: "sq ft",
    inclusionType: "Include",
    createdAt: "2023-08-15T10:30:00Z",
    updatedAt: "2024-02-05T09:00:00Z",
  },
  {
    id: 103,
    name: "Asia Manufacturing Plant",
    locationId: 8,
    type: "Factory",
    capacity: 100000,
    capacityUnit: "units/month",
    inclusionType: "Include",
    createdAt: "2022-03-20T07:00:00Z",
    updatedAt: "2024-03-01T14:00:00Z",
  },
  {
    id: 104,
    name: "Mexico Assembly Plant",
    locationId: 9,
    type: "Manufacturing",
    capacity: 75000,
    capacityUnit: "units/month",
    inclusionType: "Include",
    createdAt: "2023-01-10T09:00:00Z",
    updatedAt: "2024-01-20T11:00:00Z",
  },
  {
    id: 105,
    name: "Japan Tech Center",
    locationId: 10,
    type: "DC",
    capacity: 25000,
    capacityUnit: "sq ft",
    inclusionType: "Include",
    createdAt: "2023-09-05T06:00:00Z",
    updatedAt: "2024-02-28T08:00:00Z",
  },
]

export function useGetFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return mockFacilities
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
