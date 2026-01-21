"use client"

import { useQuery } from "@tanstack/react-query"

// Mock customer data for demonstration
const mockCustomers = [
  {
    id: 1,
    name: "TechCorp Industries",
    locationId: 1,
    inclusionType: "Include",
    icon: "building",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    name: "Global Retail Co",
    locationId: 2,
    inclusionType: "Include",
    icon: "store",
    createdAt: "2024-02-20T14:30:00Z",
    updatedAt: "2024-02-20T14:30:00Z",
  },
  {
    id: 3,
    name: "European Electronics",
    locationId: 3,
    inclusionType: "Include",
    icon: "cpu",
    createdAt: "2024-03-10T09:15:00Z",
    updatedAt: "2024-03-10T09:15:00Z",
  },
  {
    id: 4,
    name: "Asia Pacific Trading",
    locationId: 4,
    inclusionType: "Include",
    icon: "globe",
    createdAt: "2024-04-05T11:45:00Z",
    updatedAt: "2024-04-05T11:45:00Z",
  },
  {
    id: 5,
    name: "Latin American Distributors",
    locationId: 5,
    inclusionType: "Include",
    icon: "truck",
    createdAt: "2024-05-18T16:20:00Z",
    updatedAt: "2024-05-18T16:20:00Z",
  },
]

export function useGetCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return mockCustomers
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
