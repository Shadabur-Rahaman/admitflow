// @vitest-environment jsdom
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {Admission,admissionSchema} from '../src/forms'
import {businessDay,type Catalog} from '../src/api'

const catalog:Catalog={
  wards:{general:'General Ward'},
  departments:{medicine:'General Medicine',cardiology:'Cardiology'},
  doctors:{first:{name:'Dr. Sen',department_id:'medicine'},second:{name:'Dr. Rao',department_id:'cardiology'}},
  genders:['Female']
}
const input={name:'Amara Test',age:33,gender:'Female',ward_id:'general',department_id:'medicine',doctor_id:'first',admission_date:businessDay()}
beforeAll(()=>{
  HTMLDialogElement.prototype.showModal=function(){this.open=true}
  HTMLDialogElement.prototype.close=function(){this.open=false}
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('admission schema',()=>{
  it('accepts a Unicode name and trims whitespace',()=>{
    expect(admissionSchema(catalog).parse({...input,name:'  Élodie Test  '}).name).toBe('Élodie Test')
  })
  it.each([{age:-1},{age:121},{age:1.5},{name:'John123'},{admission_date:'9999-01-01'},{doctor_id:'second'}])('rejects %o',override=>{
    expect(admissionSchema(catalog).safeParse({...input,...override}).success).toBe(false)
  })
})
it('renders the admission drawer and marks empty fields on submission',async()=>{
  render(<Admission catalog={catalog} close={vi.fn()} saved={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'Admit Patient'}))
  expect(await screen.findByText('Choose a ward.')).toBeTruthy()
  expect(screen.getByLabelText('Patient name').getAttribute('aria-invalid')).toBe('true')
})
it('preserves values and maps structured API validation errors',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({detail:[{loc:['body','name'],msg:'Server rejected this name.'}]}),{status:422})))
  render(<Admission patient={{...input,id:'sample',patient_code:'PT-SAMPLE',status:'Admitted',created_at:'',updated_at:'',discharged_at:null}} catalog={catalog} close={vi.fn()} saved={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button',{name:'Save Changes'}))
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Server rejected this name.'))
  expect((screen.getByLabelText('Patient name') as HTMLInputElement).value).toBe('Amara Test')
})
