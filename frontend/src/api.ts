export const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '') + '/api/v1'

export type Status = 'Admitted' | 'Discharged'
export type Input = {
  name: string
  age: number
  gender: string
  ward_id: string
  department_id: string
  doctor_id: string
  admission_date: string
}
export type Patient = Input & { id: string; patient_code: string; status: Status; created_at: string; updated_at: string; discharged_at: string | null }
export type Catalog = { wards: Record<string,string>; departments: Record<string,string>; doctors: Record<string,{name:string;department_id:string}>; genders: string[] }
export type Summary = {total:number;admitted:number;discharged:number;today:number;wards:Record<string,Record<Status,number>>;departments:Record<string,number>;trend:{date:string;count:number}[]}
export type Page = {items:Patient[];total:number;page:number;page_size:number}
type Issue = {loc:string[];msg:string}
export class ApiError extends Error {
  constructor(public detail: string | Issue[]) {
    super(typeof detail === 'string' ? detail : detail[0]?.msg || 'Check your form fields.')
  }
}
export async function api<T>(path:string, options?:RequestInit):Promise<T> {
  const headers = new Headers(options?.headers)
  if (options?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(base + path, {...options, headers})
  } catch (error) {
    if (options?.signal?.aborted) throw error
    throw new ApiError('Could not reach the admissions service. Check your connection and try again.')
  }
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    const issues = Array.isArray(detail) && detail.every(issue =>
      issue && Array.isArray(issue.loc) && typeof issue.msg === 'string')
    throw new ApiError(typeof detail === 'string' || issues ? detail : 'The admissions service could not complete the request. Try again.')
  }
  if (payload === null) throw new ApiError('The admissions service returned an unexpected response. Try again shortly.')
  return payload as T
}
export function businessDay() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date())
}
export const displayDate = (date:string) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(date.length === 10 ? date+'T00:00:00+05:30' : date))
export const initials = (name:string) => name.split(/ +/).slice(0,2).map(word=>[...word][0]).join('').toUpperCase()
