"use client"

import { useQuery } from "@tanstack/react-query"

// Mock location data for demonstration
const mockLocations = [
  // Customer locations
  {
    id: 1,
    name: "San Francisco, USA",
    latitude: 37.7749,
    longitude: -122.4194,
    city: "San Francisco",
    country: "United States",
    address: "100 Market Street",
    phone: "+1-415-555-0100",
    email: "sf@techcorp.com",
  },
  {
    id: 2,
    name: "New York, USA",
    latitude: 40.7128,
    longitude: -74.006,
    city: "New York",
    country: "United States",
    address: "350 Fifth Avenue",
    phone: "+1-212-555-0200",
    email: "ny@globalretail.com",
  },
  {
    id: 3,
    name: "London, UK",
    latitude: 51.5074,
    longitude: -0.1278,
    city: "London",
    country: "United Kingdom",
    address: "10 Downing Street",
    phone: "+44-20-7930-0000",
    email: "london@euroelec.com",
  },
  {
    id: 4,
    name: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    city: "Singapore",
    country: "Singapore",
    address: "1 Raffles Place",
    phone: "+65-6555-0400",
    email: "sg@aptrading.com",
  },
  {
    id: 5,
    name: "Sao Paulo, Brazil",
    latitude: -23.5505,
    longitude: -46.6333,
    city: "Sao Paulo",
    country: "Brazil",
    address: "Av. Paulista 1000",
    phone: "+55-11-5555-0500",
    email: "sp@latdist.com",
  },
  // Distribution Center locations
  {
    id: 6,
    name: "Chicago, USA",
    latitude: 41.8781,
    longitude: -87.6298,
    city: "Chicago",
    country: "United States",
    address: "500 Industrial Blvd",
    phone: "+1-312-555-0600",
  },
  {
    id: 7,
    name: "Amsterdam, Netherlands",
    latitude: 52.3676,
    longitude: 4.9041,
    city: "Amsterdam",
    country: "Netherlands",
    address: "Schiphol Logistics Park",
    phone: "+31-20-555-0700",
  },
  // Factory locations
  {
    id: 8,
    name: "Shenzhen, China",
    latitude: 22.5431,
    longitude: 114.0579,
    city: "Shenzhen",
    country: "China",
    address: "Tech Industrial Zone",
    phone: "+86-755-555-0800",
  },
  {
    id: 9,
    name: "Monterrey, Mexico",
    latitude: 25.6866,
    longitude: -100.3161,
    city: "Monterrey",
    country: "Mexico",
    address: "Parque Industrial Norte",
    phone: "+52-81-555-0900",
  },
  {
    id: 10,
    name: "Tokyo, Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    city: "Tokyo",
    country: "Japan",
    address: "Shibuya Tech District",
    phone: "+81-3-555-1000",
  },
  // Supplier locations
  {
    id: 11,
    name: "Guangzhou, China",
    latitude: 23.1291,
    longitude: 113.2644,
    city: "Guangzhou",
    country: "China",
    address: "Manufacturing District",
    phone: "+86-20-555-1100",
  },
  {
    id: 12,
    name: "Munich, Germany",
    latitude: 48.1351,
    longitude: 11.582,
    city: "Munich",
    country: "Germany",
    address: "Precision Parts Strasse 45",
    phone: "+49-89-555-1200",
  },
  {
    id: 13,
    name: "Bangalore, India",
    latitude: 12.9716,
    longitude: 77.5946,
    city: "Bangalore",
    country: "India",
    address: "Electronic City Phase 1",
    phone: "+91-80-555-1300",
  },
  {
    id: 14,
    name: "Rio de Janeiro, Brazil",
    latitude: -22.9068,
    longitude: -43.1729,
    city: "Rio de Janeiro",
    country: "Brazil",
    address: "Porto Industrial",
    phone: "+55-21-555-1400",
  },
]

export function useGetLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))
      return mockLocations
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
