import { depositConstraints, rateTable } from './config'
import type {
  Applicant,
  ApplicantField,
  ApplicantInputField,
  AuthMethod,
  FormErrors,
  SubmissionStatus,
  View,
} from './types'

const applicantInputFieldOrder: ApplicantInputField[] = [
  'fullName',
  'personalCode',
  'email',
  'phone',
  'residency',
  'depositType',
  'amount',
  'termMonths',
  'interestRate',
  'payoutAccount',
]

const defaultTermMonths = 12
const defaultRate = rateTable.find((item) => item.months === defaultTermMonths)?.rate ?? 1.75

export const defaultApplicant: Applicant = {
  fullName: '',
  personalCode: '',
  email: '',
  phone: '',
  residency: 'Latvija',
  depositType: 'Depozīts ar procentu izmaksu termiņa beigās',
  amount: Math.max(depositConstraints.min, 3000),
  termMonths: defaultTermMonths,
  interestRate: Number(defaultRate.toFixed(2)),
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
  formErrors: FormErrors
  touchedFields: Partial<Record<ApplicantField, boolean>>
  termsAccepted: boolean
  submissionAttempted: boolean
}

export const appState: AppState = {
  currentView: 'landing',
  applicant: structuredClone(defaultApplicant),
  isAuthenticated: false,
  showAuthModal: false,
  loading: false,
  formErrors: {},
  touchedFields: {},
  termsAccepted: false,
  submissionAttempted: false,
}

export function resetApplicant() {
  appState.applicant = structuredClone(defaultApplicant)
  delete appState.submittedAt
  delete appState.submissionId
  appState.formErrors = {}
  appState.touchedFields = {}
  appState.termsAccepted = false
  appState.submissionAttempted = false
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

export function setFormErrors(errors: FormErrors) {
  appState.formErrors = errors
}

export function setFieldError(field: ApplicantField, message?: string) {
  if (!message) {
    const { [field]: _removed, ...rest } = appState.formErrors
    appState.formErrors = rest
    return
  }
  appState.formErrors = {
    ...appState.formErrors,
    [field]: message,
  }
}

export function markFieldTouched(field: ApplicantField) {
  appState.touchedFields = {
    ...appState.touchedFields,
    [field]: true,
  }
}

export function markAllFieldsTouched() {
  const touched: Partial<Record<ApplicantField, boolean>> = {}
  applicantInputFieldOrder.forEach((field) => {
    touched[field] = true
  })
  touched.terms = true
  appState.touchedFields = touched
}

export function setSubmissionAttempted(attempted: boolean) {
  appState.submissionAttempted = attempted
}

export function setApplicant(updates: Partial<Applicant>) {
  appState.applicant = {
    ...appState.applicant,
    ...updates,
  }
}

export function setTermsAccepted(accepted: boolean) {
  appState.termsAccepted = accepted
}

export function getApplicantInputFields(): ApplicantInputField[] {
  return [...applicantInputFieldOrder]
}
