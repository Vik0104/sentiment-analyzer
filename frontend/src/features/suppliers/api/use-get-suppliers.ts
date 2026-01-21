"use client"

import { useQuery } from "@tanstack/react-query"

// Mock supplier data for demonstration
const mockSuppliers = [
  {
    id: 201,
    name: "China Components Ltd",
    locationId: 11,
    inclusionType: "Include",
    icon: "factory",
    createdAt: "2022-05-10T08:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: 202,
    name: "German Precision Parts",
    locationId: 12,
    inclusionType: "Include",
    icon: "cog",
    createdAt: "2022-07-22T09:30:00Z",
    updatedAt: "2024-02-10T11:00:00Z",
  },
  {
    id: 203,
    name: "India Tech Solutions",
    locationId: 13,
    inclusionType: "Include",
    icon: "chip",
    createdAt: "2023-02-14T07:00:00Z",
    updatedAt: "2024-03-05T08:00:00Z",
  },
  {
    id: 204,
    name: "Brazilian Raw Materials",
    locationId: 14,
    inclusionType: "Include",
    icon: "mining",
    createdAt: "2023-04-18T10:00:00Z",
    updatedAt: "2024-01-25T09:00:00Z",
  },
]

export function useGetSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return mockSuppliers
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
