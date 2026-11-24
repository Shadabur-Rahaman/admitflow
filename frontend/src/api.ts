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
  const response = await fetch(base+path, {...options, headers:options?.body ? {'Content-Type':'application/json'} : undefined})
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.detail || 'The server could not complete the request.')
  }
  return response.status === 204 ? undefined as T : response.json()
}
export function businessDay() {
  return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date())
}
export const displayDate = (date:string) => new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(date.length === 10 ? date+'T00:00:00+05:30' : date))
export const initials = (name:string) => name.split(/ +/).slice(0,2).map(word=>[...word][0]).join('').toUpperCase()
