export const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export const csrfHeader = 'x-csrf-token'

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
