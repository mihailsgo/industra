import type { RateOption } from './types'

export const rateTable: RateOption[] = [
  { term: '3 mēneši', months: 3, rate: 1.75 },
  { term: '6 mēneši', months: 6, rate: 1.75 },
  { term: '1 gads', months: 12, rate: 1.75 },
  { term: '2 gadi', months: 24, rate: 2.0 },
  { term: '3 gadi', months: 36, rate: 2.5 },
  { term: '4 gadi', months: 48, rate: 2.6 },
  { term: '5 gadi', months: 60, rate: 2.75 },
]

export const depositConstraints = {
  min: 1000,
  max: 500000,
  step: 50,
}
