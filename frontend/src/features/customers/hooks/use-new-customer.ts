"use client"

import { useState, useCallback, useEffect } from "react"

// Global state for the new customer sheet
let globalIsOpen = false
const listeners: Set<() => void> = new Set()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setOpen(value: boolean) {
  globalIsOpen = value
  listeners.forEach((listener) => listener())
}

export function useNewCustomer() {
  const [, forceUpdate] = useState({})

  // Subscribe to changes
  useEffect(() => {
    const unsubscribe = subscribe(() => forceUpdate({}))
    return unsubscribe
  }, [])

  const isOpen = globalIsOpen

  const onOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [])

  return {
    isOpen,
    onOpen,
    onClose,
  }
}
