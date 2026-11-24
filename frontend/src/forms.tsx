import {cloneElement,useEffect,useRef,useState,type ReactElement,type ReactNode} from 'react'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {X} from 'lucide-react'
import {ApiError,api,businessDay,type Catalog,type Input,type Patient} from './api'

export function Dialog({title,close,drawer=false,children}:{title:string;close:()=>void;drawer?:boolean;children:ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const element = ref.current!
    if (!element.open) element.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return ()=>{element.close();document.body.style.overflow=previous}
  },[])
  return <dialog ref={ref} className={drawer?'drawer':'modal'} aria-labelledby="dialog-title" onCancel={event=>{event.preventDefault();close()}}>
    <header className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon" aria-label="Close" onClick={close}><X size={20}/></button></header>
    {children}
  </dialog>
}

export function admissionSchema(catalog:Catalog) {
  return z.object({
    name:z.string().trim().normalize().refine(value=>[...value].length <= 120 && /^\p{L}+(?: +\p{L}+)*$/u.test(value),'Enter a name with letters and spaces only (up to 120 characters).'),
    age:z.number({error:'Enter an age from 0 to 120.'}).int('Age must be a whole number.').min(0).max(120),
    gender:z.string().refine(value=>catalog.genders.includes(value),'Choose a gender.'),
    ward_id:z.string().refine(value=>Object.hasOwn(catalog.wards,value),'Choose a ward.'),
    department_id:z.string().refine(value=>Object.hasOwn(catalog.departments,value),'Choose a department.'),
    doctor_id:z.string().refine(value=>Object.hasOwn(catalog.doctors,value),'Choose a doctor.'),
    admission_date:z.iso.date({error:'Enter a valid admission date.'}).refine(value=>value<=businessDay(),'Admission date cannot be in the future.')
  }).refine(value=>catalog.doctors[value.doctor_id]?.department_id===value.department_id,{path:['doctor_id'],message:'Choose a doctor from the selected department.'})
}
export function Admission({patient,catalog,close,saved}:{patient?:Patient;catalog:Catalog;close:()=>void;saved:(message:string)=>void}) {
  const [discard,setDiscard]=useState(false)
  const [serverError,setServerError]=useState('')
  const {register,handleSubmit,watch,setValue,setError,formState:{errors,isDirty,isSubmitting}}=useForm<Input>({
    resolver:values=>{
      const result=admissionSchema(catalog).safeParse(values)
      if(result.success)return {values:result.data,errors:{}}
      return {values:{},errors:Object.fromEntries(result.error.issues.map(issue=>[issue.path[0],{type:issue.code,message:issue.message}]))}
    },mode:'onTouched',
    defaultValues:{name:patient?.name||'',age:patient?.age,gender:patient?.gender||'',ward_id:patient?.ward_id||'',
      department_id:patient?.department_id||'',doctor_id:patient?.doctor_id||'',admission_date:patient?.admission_date||businessDay()}
  })
  const department=watch('department_id')
  const closeForm=()=>{if (!isSubmitting) {if(isDirty) setDiscard(true);else close()}}
  async function submit(data:Input) {
    setServerError('')
    try {
      await api(patient?'/patients/'+patient.id:'/patients',{method:patient?'PATCH':'POST',body:JSON.stringify(data)})
      saved(patient?'Patient information updated.':'Patient admitted successfully.')
    } catch(error) {
      if (error instanceof ApiError && Array.isArray(error.detail)) for (const {loc,msg} of error.detail) {
        if (loc[1] && Object.hasOwn(data,loc[1])) setError(loc[1] as keyof Input,{message:msg})
      }
      setServerError(error instanceof ApiError?error.message:'Unable to connect to the server.')
    }
  }
  function field(key:keyof Input,label:string,control:ReactElement<{id?:string}>) {
    return <div className="form-field"><label htmlFor={key}>{label}</label>{cloneElement(control,{id:key})}{errors[key]&&<small id={key+'-error'} className="error">{errors[key]?.message}</small>}</div>
  }
  function select(key:keyof Input,label:string,options:Record<string,string>,onChange?:()=>void) {
    return field(key,label,<select {...register(key,{onChange})} aria-invalid={!!errors[key]} aria-describedby={errors[key]?key+'-error':undefined}><option value="">Select {label.toLowerCase()}</option>{Object.entries(options).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>)
  }
  return <Dialog title={patient?'Edit Patient':'New Patient Admission'} drawer close={closeForm}>
    <form noValidate onSubmit={handleSubmit(submit)} className="admission-form">
      <div className="dialog-body">
        <p className="muted">Use fictional information in this demo workspace.</p>
        <h3>Patient information</h3>
        {field('name','Patient name',<input autoFocus placeholder="e.g. Amara Patel" {...register('name')} aria-invalid={!!errors.name} aria-describedby={errors.name?'name-error':undefined}/>)}
        <div className="form-grid">{field('age','Age',<input type="number" min="0" max="120" {...register('age',{valueAsNumber:true})} aria-invalid={!!errors.age} aria-describedby={errors.age?'age-error':undefined}/>)}
        {select('gender','Gender',Object.fromEntries(catalog.genders.map(value=>[value,value])))}</div>
        <h3>Admission information</h3>
        {select('ward_id','Ward',catalog.wards)}
        {select('department_id','Department',catalog.departments,()=>setValue('doctor_id','',{shouldDirty:true}))}
        {select('doctor_id','Doctor',Object.fromEntries(Object.entries(catalog.doctors).filter(([,doc])=>doc.department_id===department).map(([id,doc])=>[id,doc.name])))}
        {field('admission_date','Admission date',<input type="date" max={businessDay()} {...register('admission_date')} aria-invalid={!!errors.admission_date} aria-describedby={errors.admission_date?'admission_date-error':undefined}/>)}
        {serverError&&<p role="alert" className="error">{serverError}</p>}
        {discard&&<div role="alert" className="notice">Discard your unsaved changes? <button type="button" onClick={()=>setDiscard(false)}>Keep editing</button> <button type="button" onClick={close}>Discard</button></div>}
      </div>
      <footer className="dialog-foot"><button type="button" disabled={isSubmitting} onClick={closeForm}>Cancel</button><button className="primary" disabled={isSubmitting}>{isSubmitting?'Saving…':patient?'Save Changes':'Admit Patient'}</button></footer>
    </form>
  </Dialog>
}
