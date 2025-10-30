import type { Applicant, AuthMethod, SubmissionResponse, SubmissionStatus } from './types'

const simulatedStatuses: SubmissionStatus[] = ['Submitted', 'In Review', 'Approved']

export async function requestAuthSession(method: AuthMethod) {
  return new Promise<{ success: boolean; message: string }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: `${method} sesija apstiprināta. Identitāte verificēta.`,
      })
    }, 1200)
  })
}

export async function submitApplication(_applicant: Applicant) {
  return new Promise<SubmissionResponse>((resolve) => {
    setTimeout(() => {
      const response: SubmissionResponse = {
        id: `APP-${Date.now().toString().slice(-6)}`,
        status: 'Submitted',
        message: 'Pieteikums nodots CRM manuālai/automatizētai apstrādei.',
      }
      resolve(response)
    }, 1400)
  })
}

export async function refreshApplicationStatus(_submissionId: string) {
  return new Promise<SubmissionResponse>((resolve) => {
    setTimeout(() => {
      const status = simulatedStatuses[Math.floor(Math.random() * simulatedStatuses.length)]
      resolve({
        id: _submissionId,
        status,
        message:
          status === 'Approved'
            ? 'Depozīta konts izveidots WALL sistēmā. Seko līdzi finansējuma instrukcijām.'
            : 'Pieteikums atrodas apstrādes posmā (AML / CRM).',
      })
    }, 900)
  })
}
