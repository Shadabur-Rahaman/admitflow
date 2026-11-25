import {useEffect,useState} from 'react'
import {Link,NavLink,Route,Routes,useNavigate,useSearchParams} from 'react-router-dom'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {Activity,ArrowDownToLine,ArrowRight,BedDouble,CalendarDays,ChartNoAxesColumn,ChevronLeft,ChevronRight,CircleCheck,ClipboardList,HeartPulse,LayoutGrid,Plus,Search,Users,Ellipsis,X} from 'lucide-react'
import {motion,useReducedMotion} from 'motion/react'
import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {api,base,businessDay,displayDate,initials,type Catalog,type Page,type Patient,type Summary} from './api'
import {Admission,Dialog} from './forms'
import {ThemeControl} from './theme'

const nav = [['/','Overview',LayoutGrid],['/patients','Patients',Users],['/wards','Wards',BedDouble],['/reports','Reports',ChartNoAxesColumn]] as const
type Overlay = {kind:'new'} | {kind:'edit'|'detail'|'delete'|'discharge';patient:Patient}
type Open = (overlay:Overlay)=>void
const itemsPerPage = 10

function Status({patient}:{patient:Patient}) {
  return <span className={'status '+patient.status.toLowerCase()}>{patient.status}</span>
}
function Avatar({name}:{name:string}) {
  return <span className="avatar" aria-hidden="true">{initials(name)}</span>
}
function Export({query=''}:{query?:string}) {
  return <a className="button" href={base+'/reports/patients.csv'+(query?'?'+query:'')}><ArrowDownToLine size={16}/> Export CSV</a>
}
function New({open}:{open:Open}) {
  return <button className="primary" onClick={()=>open({kind:'new'})}><Plus size={17}/> New Admission</button>
}
function DataState({error,retry}:{error:boolean;retry:()=>void}) {
  return error?<div role="alert" className="panel empty">Could not load admissions. <button onClick={retry}>Try again</button></div>:<div className="panel loading" role="status">Loading…</div>
}
function Heading({title,description,children}:{title:string;description:string;children?:React.ReactNode}) {
  return <div className="heading"><div><h1>{title}</h1><p>{description}</p></div><div className="row">{children}</div></div>
}
function Metrics({summary}:{summary:Summary}) {
  const metrics=[['Total Patients',summary.total,'Across all wards',Users],['Currently Admitted',summary.admitted,'Active admissions',BedDouble],['Discharged Patients',summary.discharged,'Completed stays',CircleCheck],["Today's Admissions",summary.today,displayDate(businessDay()),CalendarDays]] as const
  return <div className="metrics">{metrics.map(([label,value,subtitle,Icon])=><section key={label} className="panel metric"><span className="metric-icon"><Icon size={19}/></span><span>{label}</span><strong>{value}</strong><small>{subtitle}</small></section>)}</div>
}
function Trend({summary}:{summary:Summary}) {
  return <section className="panel"><h2>Admission Trends</h2><p className="muted">Patient admissions by date</p><div className="chart" role="img" aria-label={summary.trend.map(point=>point.date+': '+point.count).join(', ') || 'No admissions in this period'}><ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.trend.map(point=>({...point,day:point.date.slice(5)}))} margin={{left:-20,right:12,top:12}}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4"/><XAxis dataKey="day" tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:"var(--surface)",borderColor:"var(--line)",color:"var(--ink)"}} itemStyle={{color:"var(--ink)"}}/><Area type="monotone" dataKey="count" name="Admissions" fill="var(--chart-fill)" stroke="var(--chart-stroke)" strokeWidth={2.5} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div></section>
}
function Distribution({title,entries}:{title:string;entries:[string,number][]}) {
  const highest=Math.max(1,...entries.map(([,number])=>number))
  return <section className="panel"><h2>{title}</h2><div className="distribution">{entries.map(([label,count])=><div key={label}><div className="spread"><span>{label}</span><strong>{count}</strong></div><progress max={highest} value={count} aria-label={label}/></div>)}</div></section>
}
function PatientRows({rows,catalog,open,sort,onSort}:{rows:Patient[];catalog:Catalog;open:Open;sort?:{by:string;order:string};onSort?:(key:string)=>void}) {
  if(!rows.length)return <div className="empty"><ClipboardList size={25}/><h3>No patients found</h3><p>Adjust your search or filters, or admit a new patient.</p></div>
  return <table className="patients-table"><thead><tr>{[['Patient','name'],['Age / Gender','age'],['Ward',''],['Department',''],['Doctor',''],['Admission Date','admission_date'],['Status',''],['Actions','']].map(([label,key])=><th key={label} scope="col" aria-sort={key&&sort?.by===key?(sort.order==='asc'?'ascending':'descending'):undefined}>{key&&onSort?<button className="text-button" onClick={()=>onSort(key)}>{label}{sort?.by===key?(sort.order==='asc'?' ↑':' ↓'):''}</button>:label}</th>)}</tr></thead><tbody>{rows.map(patient=><tr key={patient.id}>
    <td data-label="Patient"><button className="identity" onClick={()=>open({kind:'detail',patient})}><Avatar name={patient.name}/><span><strong>{patient.name}</strong><small title={patient.patient_code}>{patient.patient_code}</small></span></button></td>
    <td data-label="Age / Gender">{patient.age} · {patient.gender}</td><td data-label="Ward">{catalog.wards[patient.ward_id]}</td><td data-label="Department">{catalog.departments[patient.department_id]}</td><td data-label="Doctor">{catalog.doctors[patient.doctor_id]?.name}</td><td data-label="Admission Date">{displayDate(patient.admission_date)}</td><td data-label="Status"><Status patient={patient}/></td><td data-label="Actions"><details className="action-menu"><summary aria-label={'Actions for '+patient.name}><Ellipsis size={19}/></summary><div className="menu">{(['detail','edit','discharge','delete'] as const).filter(kind=>kind!=='discharge'||patient.status==='Admitted').map(kind=><button className={kind==='delete'?'error':''} key={kind} onClick={e=>{e.currentTarget.closest('details')!.open=false;open({kind,patient})}}>{{detail:'View Details',edit:'Edit Patient',discharge:'Discharge Patient',delete:'Delete Patient'}[kind]}</button>)}</div></details></td>
  </tr>)}</tbody></table>
}
function Overview({summary,catalog,open}:{summary:Summary;catalog:Catalog;open:Open}) {
  const activeShare=summary.total ? Math.round(summary.admitted / summary.total * 100) : 0
  const recent=useQuery({queryKey:['patients','recent'],queryFn:()=>api<Page>('/patients?page_size=5&sort_by=created_at')})
  return <>
    <Heading title="Hospital Overview" description="Monitor patient admissions and hospital operations.">
      <span className="date-label"><CalendarDays size={15}/>{displayDate(businessDay())}</span>
    </Heading>
    <div className="overview-workspace">
      <aside className="overview-queue">
        <section className="panel priority">
          <div className="priority-content">
            <div><h2>Active admissions</h2><strong>{summary.admitted}</strong><p>Of {summary.total} patient records</p></div>
            <div className="admission-ring" style={{background: 'conic-gradient(var(--accent) '+activeShare+'%, var(--ring-track) 0)'}}>
              <span aria-label={activeShare+'% of records are active'}>{activeShare}%</span>
            </div>
          </div>
          <New open={open}/>
        </section>
        <section className="panel queue-links">
          <h2>Patient activity</h2>
          <Link to="/patients"><Users size={17}/><span>All patients</span><strong>{summary.total}</strong></Link>
          <Link to="/patients?status=Discharged"><CircleCheck size={17}/><span>Discharged</span><strong>{summary.discharged}</strong></Link>
          <Link to={'/patients?admission_from='+businessDay()+'&admission_to='+businessDay()}><CalendarDays size={17}/><span>Admitted today</span><strong>{summary.today}</strong></Link>
        </section>
      </aside>
      <div className="overview-center">
        <Trend summary={summary}/>
        <Distribution title="Active Admissions by Ward" entries={Object.entries(catalog.wards).map(([id,name])=>[name,summary.wards[id].Admitted])}/>
      </div>
      <aside className="overview-recent">
        <section className="panel recent-feed">
          <div className="section-head"><h2>Recent Patients</h2><Link to="/patients" aria-label="View all patients"><ArrowRight size={17}/></Link></div>
          {recent.data ? recent.data.items.length ? <ul>
            {recent.data.items.map(patient=><li key={patient.id}>
              <button className="identity" onClick={()=>open({kind:'detail',patient})}>
                <Avatar name={patient.name}/><span><strong>{patient.name}</strong><small>{catalog.wards[patient.ward_id]}</small></span>
              </button>
              <Status patient={patient}/>
            </li>)}
          </ul> : <p className="muted">No recent admissions</p> : <DataState error={recent.isError} retry={()=>void recent.refetch()}/>}
        </section>
        <Distribution title="Patients by Department" entries={Object.entries(catalog.departments).map(([id,name])=>[name,summary.departments[id]||0])}/>
      </aside>
    </div>
  </>
}
const filterKeys=['ward_id','department_id','doctor_id','status','admission_from','admission_to'] as const
function FilterSelect({name,value,options,change}:{name:string;value:string;options:Record<string,string>;change:(value:string)=>void}) {
  return <select aria-label={name} value={value} onChange={event=>change(event.target.value)}><option value="">All {name.toLowerCase()}</option>{Object.entries(options).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
}
function Directory({catalog,summary,open}:{catalog:Catalog;summary:Summary;open:Open}) {
  const [params,setParams]=useSearchParams()
  const urlSearch=params.get('search')||''
  const [search,setSearch]=useState(urlSearch)
  const [sort,setSort]=useState({by:'admission_date',order:'desc'})
  const [size,setSize]=useState(itemsPerPage)
  const [page,setPage]=useState(1)
  useEffect(()=>setSearch(urlSearch),[urlSearch])
  useEffect(()=>setPage(1),[params])
  useEffect(()=>{
    const timeout=setTimeout(()=>{
      if(search.trim()===urlSearch)return
      setParams(old=>{const next=new URLSearchParams(old);if(search.trim())next.set('search',search.trim());else next.delete('search');return next},{replace:true})
    },300)
    return ()=>clearTimeout(timeout)
  },[search,urlSearch,setParams])
  const query=new URLSearchParams(params)
  query.set('page',String(page));query.set('page_size',String(size));query.set('sort_by',sort.by);query.set('sort_order',sort.order)
  const list=useQuery({queryKey:['patients',query.toString()],queryFn:()=>api<Page>('/patients?'+query)})
  const filterCount=filterKeys.filter(key=>params.has(key)).length
  const current=list.data
  const update=(key:string,value:string)=>setParams(old=>{
    const next=new URLSearchParams(old)
    if(value)next.set(key,value);else next.delete(key)
    if(key==='department_id'&&next.has('doctor_id')&&catalog.doctors[next.get('doctor_id')!]?.department_id!==value&&value)next.delete('doctor_id')
    return next
  })
  return <><Heading title="Patients" description="Search, filter and manage patient admissions."><Export query={params.toString()}/><New open={open}/></Heading><div className="directory-workspace"><aside className="directory-metrics" aria-label="Patient activity"><Metrics summary={summary}/></aside>
    <section className="panel table-panel directory-panel"><div className="section-head"><h2>Patient Directory</h2><span className="muted">{current?.total ?? '…'} matching records</span></div>
      <div className="filters directory-filters">
        <div className="search"><Search size={17}/><input aria-label="Search by patient name" placeholder="Search by patient name" value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon" aria-label="Clear search" onClick={()=>setSearch('')}><X size={16}/></button>}</div>
        <FilterSelect name="Wards" value={params.get('ward_id')||''} options={catalog.wards} change={value=>update('ward_id',value)}/>
        <FilterSelect name="Departments" value={params.get('department_id')||''} options={catalog.departments} change={value=>update('department_id',value)}/>
        <FilterSelect name="Doctors" value={params.get('doctor_id')||''} options={Object.fromEntries(Object.entries(catalog.doctors).filter(([,doctor])=>!params.get('department_id')||doctor.department_id===params.get('department_id')).map(([id,doc])=>[id,doc.name]))} change={value=>update('doctor_id',value)}/>
        <FilterSelect name="Statuses" value={params.get('status')||''} options={{Admitted:'Admitted',Discharged:'Discharged'}} change={value=>update('status',value)}/>
        <button onClick={()=>{setSearch('');setParams({})}}>Clear Filters{filterCount>0?' ('+filterCount+')':''}</button>
      </div>
      <div className="filters date-filters">{(['admission_from','admission_to'] as const).map((key,i)=><label key={key}>{i===0?'Admitted from':'Admitted through'}<input type="date" value={params.get(key)||''} onChange={e=>update(key,e.target.value)}/></label>)}</div>
      {current?<><PatientRows rows={current.items} catalog={catalog} open={open} sort={sort} onSort={key=>{setPage(1);setSort({by:key,order:sort.by===key&&sort.order==='asc'?'desc':'asc'})}}/><div className="pagination">
        <label>Rows per page <select value={size} onChange={e=>{setSize(+e.target.value);setPage(1)}}>{[5,10,25,50].map(n=><option key={n}>{n}</option>)}</select></label>
        <div className="row"><button className="icon" aria-label="Previous page" disabled={current.page===1} onClick={()=>setPage(current.page-1)}><ChevronLeft size={18}/></button><span>Page {current.page} of {Math.max(1,Math.ceil(current.total/current.page_size))}</span><button className="icon" aria-label="Next page" disabled={current.page*current.page_size>=current.total} onClick={()=>setPage(current.page+1)}><ChevronRight size={18}/></button></div>
      </div></>:<DataState error={list.isError} retry={()=>void list.refetch()}/>}
    </section></div></>
}
function Wards({catalog,summary,open}:{catalog:Catalog;summary:Summary;open:Open}) {
  return <><Heading title="Ward Management" description="Review active and completed admissions across wards."/><div className="ward-grid">{Object.entries(catalog.wards).map(([id,name])=><Ward key={id} id={id} name={name} counts={summary.wards[id]} open={open}/>)}</div></>
}
function Ward({id,name,counts,open}:{id:string;name:string;counts:Summary['wards'][string];open:Open}) {
  const patients=useQuery({queryKey:['patients','ward',id],queryFn:()=>api<Page>('/patients?status=Admitted&page_size=3&ward_id='+id)})
  return <section className="panel ward"><span className="metric-icon"><BedDouble size={20}/></span><h2>{name}</h2><div className="spread"><span><strong>{counts.Admitted}</strong> admitted</span><span><strong>{counts.Discharged}</strong> discharged</span></div>
    <div className="ward-preview">{patients.data?(patients.data.items.length?patients.data.items.map(patient=><button key={patient.id} className="identity" onClick={()=>open({kind:'detail',patient})}><Avatar name={patient.name}/>{patient.name}</button>):<p className="muted">No active admissions</p>):<DataState error={patients.isError} retry={()=>void patients.refetch()}/>}</div><Link className="button" to={'/patients?ward_id='+id}>View Patients <ArrowRight size={15}/></Link></section>
}
function Reports({catalog}:{catalog:Catalog}) {
  const [dates,setDates]=useState({admission_from:'',admission_to:''})
  const query=new URLSearchParams(Object.entries(dates).filter(([,value])=>value)).toString()
  const report=useQuery({queryKey:['reports',query],queryFn:()=>api<Summary>('/reports/summary?'+query)})
  const summary=report.data
  return <><Heading title="Reports" description="Explore admission activity and export the underlying records."><Export query={query}/></Heading>
    <section className="panel row report-filters">{Object.entries(dates).map(([key,value],i)=><label key={key}>{i===0?'From date':'Through date'}<input type="date" value={value} onChange={e=>setDates(old=>({...old,[key]:e.target.value}))}/></label>)}<button onClick={()=>setDates({admission_from:'',admission_to:''})}>Clear dates</button></section>
    {summary?<><Metrics summary={summary}/><div className="dashboard-grid"><Trend summary={summary}/><Distribution title="Admission Status" entries={ [['Admitted',summary.admitted],['Discharged',summary.discharged]]}/><Distribution title="Admissions by Ward" entries={Object.entries(catalog.wards).map(([id,name])=>[name,summary.wards[id].Admitted+summary.wards[id].Discharged])}/><Distribution title="Admissions by Department" entries={Object.entries(catalog.departments).map(([id,name])=>[name,summary.departments[id]||0])}/></div></>:<DataState error={report.isError} retry={()=>void report.refetch()}/>}</>
}
function Details({patient,catalog,open,close}:{patient:Patient;catalog:Catalog;open:Open;close:()=>void}) {
  return <Dialog title="Patient Details" drawer close={close}><div className="dialog-body"><div className="row"><Avatar name={patient.name}/><div><h2>{patient.name}</h2><small>{patient.patient_code}</small></div><Status patient={patient}/></div><dl className="details-list">{Object.entries({'Age':patient.age,'Gender':patient.gender,'Ward':catalog.wards[patient.ward_id],'Department':catalog.departments[patient.department_id],'Assigned doctor':catalog.doctors[patient.doctor_id]?.name,'Admission date':displayDate(patient.admission_date)}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><h3>Admission lifecycle</h3><p>Admitted · {displayDate(patient.admission_date)}</p>{patient.discharged_at&&<p>Discharged · {displayDate(patient.discharged_at)}</p>}</div><footer className="dialog-foot"><button onClick={()=>open({kind:'edit',patient})}>Edit Patient</button>{patient.status==='Admitted'&&<button className="primary" onClick={()=>open({kind:'discharge',patient})}>Discharge Patient</button>}</footer></Dialog>
}
function Confirm({kind,patient,close,saved}:{kind:'delete'|'discharge';patient:Patient;close:()=>void;saved:(message:string)=>void}) {
  const [pending,setPending]=useState(false)
  const [error,setError]=useState('')
  const deletion=kind==='delete'
  async function apply() {
    setPending(true);setError('')
    try {await api('/patients/'+patient.id+(deletion?'':'/discharge'),{method:deletion?'DELETE':'POST'});saved(deletion?'Patient deleted successfully.':'Patient discharged successfully.')}
    catch(error){setError(error instanceof Error?error.message:'Request failed.');setPending(false)}
  }
  return <Dialog title={deletion?'Delete Patient':'Discharge Patient'} close={()=>{if(!pending)close()}}><div className="dialog-body"><p><strong>{patient.name}</strong> · {patient.patient_code}</p><p>{deletion?'This permanently deletes the patient record.':'This marks the patient as discharged and keeps their record in the directory.'}</p>{error&&<p role="alert" className="error">{error}</p>}</div><footer className="dialog-foot"><button disabled={pending} onClick={close}>Cancel</button><button disabled={pending} className={deletion?'danger':'primary'} onClick={()=>void apply()}>{pending?'Working…':deletion?'Delete Patient':'Discharge Patient'}</button></footer></Dialog>
}
export default function App() {
  const [overlay,open]=useState<Overlay|null>(null)
  const [notice,setNotice]=useState('')
  const reduced=useReducedMotion()
  const cache=useQueryClient()
  const navigate=useNavigate()
  const catalog=useQuery({queryKey:['catalog'],queryFn:()=>api<Catalog>('/lookups'),staleTime:Infinity})
  const summary=useQuery({queryKey:['summary'],queryFn:()=>api<Summary>('/dashboard/summary')})
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return ()=>clearTimeout(timer)},[notice])
  const close=()=>open(null)
  const saved=(message:string)=>{close();setNotice(message);for(const key of ['patients','summary','reports'])void cache.invalidateQueries({queryKey:[key]})}
  const lookups=catalog.data
  return <><a className="skip" href="#main" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus()}}>Skip to content</a><header className="top"><div className="top-inner"><Link to="/" className="brand"><span><HeartPulse size={22}/></span>AdmitFlow</Link><nav aria-label="Primary navigation" className="desktop-nav">{nav.map(([href,label])=><NavLink key={href} to={href} end={href==='/'}>{label}</NavLink>)}</nav><div className="row top-actions"><button className="icon" aria-label="Search patients" onClick={()=>{navigate('/patients');requestAnimationFrame(()=>document.querySelector<HTMLInputElement>('.search input')?.focus())}}><Search size={18}/></button><ThemeControl/><New open={open}/></div></div></header>
    <motion.main id="main" tabIndex={-1} initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.2}}><div className="demo"><Activity size={15}/> Sample records only. Never enter real patient information.</div>
    {lookups&&summary.data?<Routes><Route path="/" element={<Overview catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/patients" element={<Directory catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/wards" element={<Wards catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/reports" element={<Reports catalog={lookups}/>}/><Route path="*" element={<Heading title="Page not found" description="Return to the overview to continue."><Link className="button" to="/">Overview</Link></Heading>}/></Routes>:<DataState error={catalog.isError||summary.isError} retry={()=>{void catalog.refetch();void summary.refetch()}}/>}</motion.main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{nav.map(([href,label,Icon],i)=><div key={href}>{i===2&&<button className="mobile-admit" onClick={()=>open({kind:'new'})}><Plus size={21}/>Admit</button>}<NavLink to={href} end={href==='/'}><Icon size={19}/>{label}</NavLink></div>)}</nav>
    {overlay&&((overlay.kind==='delete'||overlay.kind==='discharge')?<Confirm key={overlay.kind} kind={overlay.kind} patient={overlay.patient} close={close} saved={saved}/>:lookups?overlay.kind==='detail'?<Details patient={overlay.patient} catalog={lookups} open={open} close={close}/>:<Admission key={overlay.kind} patient={overlay.kind==='new'?undefined:overlay.patient} catalog={lookups} close={close} saved={saved}/>:<Dialog title="New Patient Admission" close={close}><div className="dialog-body"><DataState error={catalog.isError} retry={()=>void catalog.refetch()}/></div></Dialog>)}
    <div className="toast-region" aria-live="polite">{notice&&<div className="toast"><CircleCheck size={19}/>{notice}<button className="icon" aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={17}/></button></div>}</div></>
}
