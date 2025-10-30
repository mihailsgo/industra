import type { Applicant, AuthMethod, SubmissionStatus, View } from './types'

export type RateOption = {
  term: string
  months: number
  rate: number
}

export const rateTable: RateOption[] = [
  { term: '3 mēneši', months: 3, rate: 1.75 },
  { term: '6 mēneši', months: 6, rate: 1.75 },
  { term: '1 gads', months: 12, rate: 1.75 },
  { term: '2 gadi', months: 24, rate: 2.0 },
  { term: '3 gadi', months: 36, rate: 2.5 },
  { term: '4 gadi', months: 48, rate: 2.6 },
  { term: '5 gadi', months: 60, rate: 2.75 },
]

export const defaultApplicant: Applicant = {
  fullName: '',
  personalCode: '',
  email: '',
  phone: '',
  residency: 'Latvija',
  depositType: 'Depozīts ar procentu izmaksu termiņa beigās',
  amount: 3000,
  termMonths: 12,
  interestRate: 1.75,
  payoutAccount: '',
  status: 'Draft',
}

export type AppState = {
  currentView: View
  applicant: Applicant
  isAuthenticated: boolean
  authMethod?: AuthMethod
  showAuthModal: boolean
  submittedAt?: Date
  submissionId?: string
  loading: boolean
  lastMessage?: string
  pendingView?: View
}

export const appState: AppState = {
  currentView: 'landing',
  applicant: structuredClone(defaultApplicant),
  isAuthenticated: false,
  showAuthModal: false,
  loading: false,
}

export function resetApplicant() {
  appState.applicant = structuredClone(defaultApplicant)
  delete appState.submittedAt
  delete appState.submissionId
}

export function setApplicantStatus(status: SubmissionStatus) {
  appState.applicant.status = status
}

export function setAuthSession(method: AuthMethod) {
  appState.isAuthenticated = true
  appState.authMethod = method
  appState.showAuthModal = false
  delete appState.pendingView
}

export function clearAuthSession() {
  appState.isAuthenticated = false
  delete appState.authMethod
}

export function requiresAuthentication(view: View) {
  return view === 'apply' || view === 'dashboard'
}
