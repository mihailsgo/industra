export type View = 'landing' | 'apply' | 'dashboard'

export type AuthMethod = 'Smart-ID' | 'eParaksts'

export type SubmissionStatus = 'Draft' | 'Submitted' | 'In Review' | 'Approved'

export type Applicant = {
  fullName: string
  personalCode: string
  email: string
  phone: string
  residency: string
  depositType: string
  amount: number
  termMonths: number
  interestRate: number
  payoutAccount: string
  status: SubmissionStatus
}

export type SubmissionResponse = {
  id: string
  status: SubmissionStatus
  message: string
}

