import {useEffect,useId,useRef,useState} from 'react'
import {Link,NavLink,Route,Routes,useLocation,useNavigate,useSearchParams} from 'react-router-dom'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {Activity,ArrowDownToLine,ArrowRight,BedDouble,CalendarDays,ChartNoAxesColumn,ChevronLeft,ChevronRight,CircleCheck,ClipboardList,House,Plus,Search,Users,Ellipsis,X,Stethoscope,SlidersHorizontal,ArrowDown,ArrowUp,Copy,TriangleAlert} from 'lucide-react'
import {Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {api,base,businessDay,displayDate,initials,type Catalog,type Page,type Patient,type Summary} from './api'
import {Admission,Dialog} from './forms'
import {ThemeControl} from './theme'
import {ChoiceMenu} from './ChoiceMenu'
import {AdmissionArt,BrandMark,ClipboardArt,EmptyArt,WardMark} from './illustrations'

const nav = [['/','Overview',House],['/patients','Patients',Users],['/wards','Wards',BedDouble],['/reports','Reports',ChartNoAxesColumn]] as const
type Overlay = {kind:'new'} | {kind:'edit'|'detail'|'delete'|'discharge';patient:Patient}
type Open = (overlay:Overlay)=>void
const itemsPerPage = 10

function displayCode(code:string) {
  return code.length>17?code.slice(0,11)+'…'+code.slice(-4):code
}
function Status({patient}:{patient:Patient}) {
  return <span className={'status '+patient.status.toLowerCase()}>{patient.status}</span>
}
function Avatar({name}:{name:string}) {
  return <span className="avatar" data-tone={name.codePointAt(0)!%4} aria-hidden="true">{initials(name)}</span>
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
function Trend({summary,compact=false}:{summary:Summary;compact?:boolean}) {
  const dayLength=86_400_000
  const first=Date.parse(summary.trend[0]?.date)
  const last=Date.parse(summary.trend.at(-1)?.date??'')
  const span=Math.floor((last-first)/dayLength)+1
  const interval=Math.max(1,Math.ceil(span/28))
  const iso=(instant:number)=>new Date(instant).toISOString().slice(0,10)
  const points=Number.isFinite(span)?Array.from({length:Math.ceil(span/interval)},(_,index)=>{
    const start=first+index*interval*dayLength
    const end=Math.min(last,start+(interval-1)*dayLength)
    const date=iso(start)
    return {day:date.slice(5),range:start===end?date:date+' to '+iso(end),count:0}
  }):[]
  for(const point of summary.trend)points[Math.floor((Date.parse(point.date)-first)/dayLength/interval)].count+=point.count
  return <section className={compact?'panel trend compact':'panel trend'}>
    <h2>Admission Trends</h2><p className="muted">{compact?'Last 7 days':interval>1?'Admissions per '+interval+'-day interval':'Patient admissions by date'}</p>
    {points.length?<div className="chart" role="img" aria-label={points.map(point=>point.range+': '+point.count).join(', ')}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{left:-23,right:8,top:6}}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4"/>
        <XAxis dataKey="day" minTickGap={compact?7:19} tickLine={false} axisLine={false}/>
        <YAxis allowDecimals={false} tickLine={false} axisLine={false}/>
        <Tooltip labelFormatter={(_,items)=>items[0]?.payload.range} contentStyle={{background:'var(--surface)',borderColor:'var(--line)',color:'var(--ink)'}} itemStyle={{color:'var(--ink)'}}/>
        <Bar dataKey="count" name="Admissions" fill="var(--chart-stroke)" maxBarSize={32} radius={[5,5,0,0]} isAnimationActive={false}/>
      </BarChart></ResponsiveContainer>
    </div>:<div className="empty"><EmptyArt/><p>No admissions in this period.</p></div>}
  </section>
}
function Distribution({title,entries}:{title:string;entries:[string,number][]}) {
  const highest=Math.max(1,...entries.map(([,number])=>number))
  return <section className="panel"><h2>{title}</h2><div className="distribution">{entries.map(([label,count])=><div key={label}><div className="spread"><span>{label}</span><strong>{count}</strong></div><progress max={highest} value={count} aria-label={label}/></div>)}</div></section>
}
function PatientRows({rows,catalog,open,sort,onSort}:{rows:Patient[];catalog:Catalog;open:Open;sort?:{by:string;order:string};onSort?:(key:string)=>void}) {
  if(!rows.length)return <div className="empty"><EmptyArt/><h3>No patients found</h3><p>Adjust your search or filters, or admit a new patient.</p></div>
  return <table className="patients-table"><thead><tr>{[['Patient','name'],['Age / Gender','age'],['Ward',''],['Department',''],['Doctor',''],['Admission Date','admission_date'],['Status',''],['Actions','']].map(([label,key])=><th key={label} scope="col" aria-sort={key&&sort?.by===key?(sort.order==='asc'?'ascending':'descending'):undefined}>{key&&onSort?<button className="text-button" onClick={()=>onSort(key)}>{label}{sort?.by===key?(sort.order==='asc'?' ↑':' ↓'):''}</button>:label}</th>)}</tr></thead><tbody>{rows.map(patient=><tr key={patient.id}>
    <td data-label="Patient"><button className="identity" onClick={()=>open({kind:'detail',patient})}><Avatar name={patient.name}/><span><strong>{patient.name}</strong><small title={patient.patient_code}>{displayCode(patient.patient_code)}</small></span></button></td>
    <td data-label="Age / Gender">{patient.age} · {patient.gender}</td><td data-label="Ward">{catalog.wards[patient.ward_id]}</td><td data-label="Department">{catalog.departments[patient.department_id]}</td><td data-label="Doctor">{catalog.doctors[patient.doctor_id]?.name}</td><td data-label="Admission Date">{displayDate(patient.admission_date)}</td><td data-label="Status"><Status patient={patient}/></td><td data-label="Actions"><details className="action-menu"><summary aria-label={'Actions for '+patient.name}><Ellipsis size={19}/></summary><div className="menu">{(['detail','edit','discharge','delete'] as const).filter(kind=>kind!=='discharge'||patient.status==='Admitted').map(kind=><button className={kind==='delete'?'error':''} key={kind} onClick={e=>{const menu=e.currentTarget.closest('details')!;menu.open=false;menu.querySelector('summary')?.focus();open({kind,patient})}}>{{detail:'View Details',edit:'Edit Patient',discharge:'Discharge Patient',delete:'Delete Patient'}[kind]}</button>)}</div></details></td>
  </tr>)}</tbody></table>
}
function SearchPatients() {
  const [search,setSearch]=useState('')
  const navigate=useNavigate()
  return <form role="search" className="global-search" onSubmit={event=>{
    event.preventDefault()
    const query=search.trim()
    navigate('/patients'+(query?'?'+new URLSearchParams({search:query}):''))
    setSearch('')
  }}>
    <Search size={17}/><input type="search" aria-label="Search patients" placeholder="Search patients" maxLength={120} value={search} onChange={event=>setSearch(event.target.value)}/><button aria-label="Search directory"><ArrowRight size={16}/></button>
  </form>
}

function ActivityMix({summary}:{summary:Summary}) {
  const percent=summary.total?Math.round(100*summary.admitted/summary.total):0
  return <div className="activity-mix">
    <div className="mix-track" aria-hidden="true"><span style={{width:percent+'%'}}/></div>
    <div className="spread"><span><i className="legend-dot green"/> Admitted <strong>{summary.admitted}</strong></span><span><i className="legend-dot slate"/> Discharged <strong>{summary.discharged}</strong></span></div>
  </div>
}

function RecordLink({patient,subtitle,open}:{patient:Patient;subtitle:string;open:Open}) {
  return <button className="identity record-link" onClick={()=>open({kind:'detail',patient})}>
    <Avatar name={patient.name}/><span><strong>{patient.name}</strong><small>{subtitle}</small></span>
    <ChevronRight size={15} className="record-arrow"/>
  </button>
}

function RecentPatients({catalog,open}:{catalog:Catalog;open:Open}) {
  const [feed,setFeed]=useState('All')
  const recent=useQuery({
    queryKey:['patients','recent',feed],
    queryFn:()=>api<Page>('/patients?'+new URLSearchParams({
      page_size:'4',sort_by:feed==='Admitted'?'admission_date':'created_at',...(feed==='All'?{}:{status:feed}),
    })),
  })
  const rows=recent.data?.items
  return <section className="panel recent-feed">
    <div className="section-head"><h2>Recent patients</h2><Link to="/patients" aria-label="View all patients"><ArrowRight size={17}/></Link></div>
    <div className="feed-tabs" aria-label="Recent patient activity">{['All','Admitted','Discharged'].map(label=>
      <button key={label} aria-pressed={feed===label} onClick={()=>setFeed(label)}>{label}</button>)}</div>
    {rows ? rows.length ? <ul>{rows.map(patient=><li key={patient.id}><RecordLink patient={patient} subtitle={catalog.wards[patient.ward_id]+' · '+patient.status} open={open}/></li>)}</ul>
      : <p className="muted feed-empty">No matching patient records</p>
      : <DataState error={recent.isError} retry={()=>void recent.refetch()}/>}
  </section>
}

function Overview({summary,catalog,open}:{summary:Summary;catalog:Catalog;open:Open}) {
  const activeShare=summary.total ? Math.round(summary.admitted / summary.total * 100) : 0
  const recent=useQuery({queryKey:['patients','latest'],queryFn:()=>api<Page>('/patients?page_size=1&sort_by=created_at')})
  const latest=recent.data?.items[0]
  const steps=[
    ['Admission recorded',latest?displayDate(latest.admission_date):'No admission record',ClipboardList],
    ['Ward assigned',latest?catalog.wards[latest.ward_id]:'Pending',BedDouble],
    ['Doctor assigned',latest?catalog.doctors[latest.doctor_id]?.name:'Pending',Stethoscope],
    ['Admission status',latest?.status??'Pending',Activity],
    ['Discharge',latest?.discharged_at?displayDate(latest.discharged_at):'Pending',CircleCheck],
  ] as const
  const departments=Object.entries(catalog.departments).map(([id,name])=>[name,summary.departments[id]||0] as const)
    .sort((a,b)=>b[1]-a[1]).slice(0,4)

  return <>
    <Heading title="Hospital Overview" description="Admissions, patient activity and ward operations.">
      <span className="date-label"><CalendarDays size={15}/>{displayDate(businessDay())}</span>
    </Heading>
    <div className="mobile-search"><SearchPatients/></div>
    <div className="overview-workspace">
      <section className="panel priority">
        <div className="priority-content">
          <div><h2>Active admissions</h2><strong>{summary.admitted}</strong><p>{summary.total} total patient records</p></div>
          <div className="admission-ring" style={{background:'conic-gradient(var(--accent) '+activeShare+'%, #42464b 0)'}}>
            <span aria-label={activeShare+'% of records are active'}>{activeShare}%</span>
          </div>
        </div>
        <New open={open}/>
      </section>
      <section className="panel queue-links">
        <h2>Daily operations</h2>
        <Link to={'/patients?admission_from='+businessDay()+'&admission_to='+businessDay()}><CalendarDays size={17}/><span>Admitted today</span><strong>{summary.today}</strong></Link>
        <Link to="/patients?status=Admitted"><BedDouble size={17}/><span>Currently admitted</span><strong>{summary.admitted}</strong></Link>
        <Link to="/patients?status=Discharged"><CircleCheck size={17}/><span>Completed discharges</span><strong>{summary.discharged}</strong></Link>
      </section>
      <Link className="panel ward-promo" to="/wards">
        <div><h2>Ward operations</h2><small>{Object.keys(catalog.wards).length} wards</small></div>
        <ClipboardArt/><span>Open ward board <ArrowRight size={15}/></span>
      </Link>
      {latest&&<section className="panel mobile-recent">
        <small className="recent-label">Recent patient</small><RecordLink patient={latest} subtitle={catalog.wards[latest.ward_id]} open={open}/>
      </section>}
      <section className="panel mobile-activity"><h2>Admission activity</h2><ActivityMix summary={summary}/></section>
      <section className="panel journey">
        <div className="section-head"><div><h2>Patient admission journey</h2><p className="muted">Latest patient record</p></div>
          {latest&&<button className="journey-patient" onClick={()=>open({kind:'detail',patient:latest})}><Avatar name={latest.name}/>{latest.name}<ArrowRight size={14}/></button>}
        </div>
        <div className="journey-field">
          <ol className="timeline">
            {steps.map(([label,detail,Icon],index)=><li key={label} data-stage={index===3&&latest?'current':!latest||(index===4&&!latest.discharged_at)?'pending':'complete'}>
              <span className="timeline-icon"><Icon size={16}/></span><div><strong>{label}</strong><small>{detail}</small></div>
            </li>)}
          </ol>
          <div className="journey-figure"><AdmissionArt/><span className="figure-tag"><BedDouble size={14}/> {summary.admitted} active</span></div>
        </div>
        <ActivityMix summary={summary}/>
        {!recent.data&&<DataState error={recent.isError} retry={()=>void recent.refetch()}/>}
      </section>
      <div className="overview-trend"><Trend summary={summary} compact/></div>
      <RecentPatients catalog={catalog} open={open}/>
      <section className="panel department-feed"><h2>Department activity</h2><p className="muted">Departments with the most records</p>
        {departments.map(([name,count],i)=><div className="department-line" key={name}><i className={'legend-dot tone-'+i}/><span>{name}</span><strong>{count}</strong></div>)}
      </section>
      <section className="overview-wards">
        <div className="section-head"><h2>Explore wards</h2><Link to="/wards">Ward board <ArrowRight size={15}/></Link></div>
        <div className="ward-tiles">{Object.entries(catalog.wards).map(([id,name])=><Link key={id} className="ward-tile" data-ward={id} to={'/patients?ward_id='+id}>
          <WardMark id={id} size={29}/><span><strong>{name}</strong><small>{summary.wards[id].Admitted} active</small></span><ArrowRight size={14}/>
        </Link>)}</div>
      </section>
    </div>
  </>
}


const filterKeys=['ward_id','department_id','doctor_id','status','admission_from','admission_to'] as const
function FilterSelect({name,value,options,change}:{name:string;value:string;options:Record<string,string>;change:(value:string)=>void}) {
  return <ChoiceMenu name={name} value={value} change={change}
    choices={[{value:'',label:'All '+name.toLowerCase()},...Object.entries(options).map(([id,label])=>({value:id,label}))]}/>
}
function Directory({catalog,summary,open}:{catalog:Catalog;summary:Summary;open:Open}) {
  const [params,setParams]=useSearchParams()
  const urlSearch=params.get('search')||''
  const [search,setSearch]=useState(urlSearch)
  const [sort,setSort]=useState({by:'admission_date',order:'desc'})
  const [size,setSize]=useState(itemsPerPage)
  const [datesOpen,setDatesOpen]=useState(false)
  const datePanelId=useId()
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
  return <><Heading title="Patients" description="Search, filter and manage patient admissions."><Export query={params.toString()}/></Heading><div className="directory-workspace"><Metrics summary={summary}/>
    <section className="panel table-panel directory-panel"><div className="section-head"><h2>Patient Directory</h2><span className="muted">{current?.total ?? '…'} matching records</span></div>
      <div className="filters directory-filters">
        <div className="search"><Search size={17}/><input aria-label="Search by patient name" placeholder="Search by patient name" value={search} maxLength={120} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="icon" aria-label="Clear search" onClick={()=>setSearch('')}><X size={16}/></button>}</div>
        <FilterSelect name="Wards" value={params.get('ward_id')||''} options={catalog.wards} change={value=>update('ward_id',value)}/>
        <FilterSelect name="Departments" value={params.get('department_id')||''} options={catalog.departments} change={value=>update('department_id',value)}/>
        <FilterSelect name="Doctors" value={params.get('doctor_id')||''} options={Object.fromEntries(Object.entries(catalog.doctors).filter(([,doctor])=>!params.get('department_id')||doctor.department_id===params.get('department_id')).map(([id,doc])=>[id,doc.name]))} change={value=>update('doctor_id',value)}/>
        <FilterSelect name="Statuses" value={params.get('status')||''} options={{Admitted:'Admitted',Discharged:'Discharged'}} change={value=>update('status',value)}/>
        <button aria-expanded={datesOpen} aria-controls={datePanelId} onClick={()=>setDatesOpen(!datesOpen)}><SlidersHorizontal size={15}/> Dates</button>
      </div>
      <div id={datePanelId} className="date-filters" hidden={!datesOpen}>{(['admission_from','admission_to'] as const).map((key,i)=><label key={key}>{i===0?'Admitted from':'Admitted through'}<input type="date" value={params.get(key)||''} onChange={e=>update(key,e.target.value)}/></label>)}</div>
      {(filterCount>0||urlSearch)&&<div className="active-filters"><span>{filterCount+(urlSearch?1:0)} active filters</span>{params.get('admission_from')&&<span>From {params.get('admission_from')}</span>}{params.get('admission_to')&&<span>Through {params.get('admission_to')}</span>}<button onClick={()=>{setSearch('');setParams({})}}>Clear filters</button></div>}
      {current?<><div className="mobile-sort"><FilterSelect name="Sort order" value={sort.by+':'+sort.order} options={{'admission_date:desc':'Newest admission','admission_date:asc':'Oldest admission','name:asc':'Name A to Z','name:desc':'Name Z to A','age:asc':'Age ascending','age:desc':'Age descending'}} change={value=>{if(!value)return;const [by,order]=value.split(':');setSort({by,order});setPage(1)}}/></div><PatientRows rows={current.items} catalog={catalog} open={open} sort={sort} onSort={key=>{setPage(1);setSort({by:key,order:sort.by===key&&sort.order==='asc'?'desc':'asc'})}}/><div className="pagination">
        <label>Rows per page <select value={size} onChange={e=>{setSize(+e.target.value);setPage(1)}}>{[5,10,25,50].map(n=><option key={n}>{n}</option>)}</select></label>
        <div className="row"><button className="icon" aria-label="Previous page" disabled={current.page===1} onClick={()=>setPage(current.page-1)}><ChevronLeft size={18}/></button><span>Page {current.page} of {Math.max(1,Math.ceil(current.total/current.page_size))}</span><button className="icon" aria-label="Next page" disabled={current.page*current.page_size>=current.total} onClick={()=>setPage(current.page+1)}><ChevronRight size={18}/></button></div>
      </div></>:<DataState error={list.isError} retry={()=>void list.refetch()}/>}
    </section></div></>
}
function Wards({catalog,summary,open}:{catalog:Catalog;summary:Summary;open:Open}) {
  const [status,setStatus]=useState('Admitted')
  return <><Heading title="Ward Management" description="Follow admissions across the hospital.">
    <ChoiceMenu name="Board status" value={status} choices={[{value:'Admitted',label:'Active admissions'},{value:'Discharged',label:'Completed discharges'}]} change={setStatus}/>
  </Heading>
  <div className="ward-board">
    <div className="ward-grid">{Object.entries(catalog.wards).map(([id,name])=>
      <Ward key={id} id={id} name={name} counts={summary.wards[id]} status={status} catalog={catalog} open={open}/>)}</div>
    <aside className="board-rail">
      <section className="panel"><h2>Board at a glance</h2><p className="muted">{Object.keys(catalog.wards).length} wards</p><ActivityMix summary={summary}/></section>
      <RecentPatients catalog={catalog} open={open}/>
    </aside>
  </div></>
}
function Ward({id,name,counts,status,catalog,open}:{id:string;name:string;counts:Summary['wards'][string];status:string;catalog:Catalog;open:Open}) {
  const patients=useQuery({
    queryKey:['patients','ward',id,status],
    queryFn:()=>api<Page>('/patients?'+new URLSearchParams({status,page_size:'3',ward_id:id})),
  })
  return <section className="ward" data-ward={id}>
    <header><span className="ward-symbol"><WardMark id={id}/></span><h2>{name}</h2>
      <p><strong>{counts.Admitted}</strong> active <span>·</span> <strong>{counts.Discharged}</strong> completed</p>
    </header>
    <div className="ward-preview">{patients.data?(patients.data.items.length?patients.data.items.map(patient=><article key={patient.id}>
      <RecordLink patient={patient} subtitle={catalog.doctors[patient.doctor_id]?.name||catalog.departments[patient.department_id]} open={open}/>
      <div className="spread"><small>{displayDate(patient.admission_date)}</small><Status patient={patient}/></div>
    </article>):<div className="ward-empty"><EmptyArt/><p>No {status==='Admitted'?'active admissions':'completed discharges'}</p></div>):<DataState error={patients.isError} retry={()=>void patients.refetch()}/>}</div>
    <Link className="ward-all" to={'/patients?ward_id='+id}>View Patients <ArrowRight size={15}/></Link>
  </section>
}

function StatusDistribution({summary}:{summary:Summary}) {
  const percent=summary.total?Math.round(summary.admitted/summary.total*100):0
  return <section className="panel status-distribution">
    <h2>Admission status</h2><p className="muted">Share of records in this period</p>
    <div className="status-donut" style={{background:summary.total?'conic-gradient(var(--green) '+percent+'%, var(--slate) 0)':'var(--secondary)'}}>
      <div><strong>{summary.total}</strong><small>Total records</small></div>
    </div>
    <ActivityMix summary={summary}/>
  </section>
}

function Reports({catalog}:{catalog:Catalog}) {
  const [dates,setDates]=useState({admission_from:'',admission_to:''})
  const query=new URLSearchParams(Object.entries(dates).filter(([,value])=>value)).toString()
  const invalid=!!(dates.admission_from&&dates.admission_to&&dates.admission_from>dates.admission_to)
  const report=useQuery({queryKey:['reports',query],queryFn:()=>api<Summary>('/reports/summary?'+query),enabled:!invalid})
  const summary=report.data
  const wards=summary?Object.entries(catalog.wards).map(([id,name]):[string,number]=>[name,summary.wards[id].Admitted+summary.wards[id].Discharged]):[]
  const departments=summary?Object.entries(catalog.departments).map(([id,name]):[string,number]=>[name,summary.departments[id]||0]).sort((a,b)=>b[1]-a[1]):[]
  const busiest=wards.reduce<[string,number]|undefined>((highest,entry)=>!highest||entry[1]>highest[1]?entry:highest,undefined)
  return <><Heading title="Reports" description="Review admissions over time and export the same records.">{!invalid&&<Export query={query}/>}</Heading>
    <section className="row report-filters" aria-label="Report dates">{Object.entries(dates).map(([key,value],i)=><label key={key}>{i===0?'From date':'Through date'}<input type="date" value={value} onChange={e=>setDates(old=>({...old,[key]:e.target.value}))}/></label>)}<button onClick={()=>setDates({admission_from:'',admission_to:''})}>Clear dates</button></section>
    {invalid?<p className="panel error" role="alert">The through date must be on or after the from date.</p>:summary?<><Metrics summary={summary}/><div className="dashboard-grid">
      <Trend summary={summary}/><div className="report-rail"><StatusDistribution summary={summary}/>
      <section className="panel report-summary"><Activity size={21}/><div><h2>Operational summary</h2>
        <p>{busiest?.[1]?'Highest ward volumes: '+wards.filter(([,count])=>count===busiest[1]).map(([name])=>name).join(', ')+' ('+busiest[1]+' each).':'No admissions match this period.'}</p></div></section></div>
      <Distribution title="Admissions by Ward" entries={wards}/>
      <section className="panel department-ranking"><h2>Admissions by Department</h2><p className="muted">Ranked by recorded admissions</p>
        {departments.map(([name,count],index)=><div key={name} className="department-line"><i className={'legend-dot tone-'+index%4}/><span>{name}</span><strong>{count}</strong></div>)}
      </section>
    </div></>:<DataState error={report.isError} retry={()=>void report.refetch()}/>}</>
}

function Details({patient,catalog,open,close}:{patient:Patient;catalog:Catalog;open:Open;close:()=>void}) {
  const [copy,setCopy]=useState('')
  async function copyId() {
    try { await navigator.clipboard.writeText(patient.patient_code);setCopy('Patient ID copied.') }
    catch { setCopy('Copy the full patient ID from the field.') }
  }
  return <Dialog title="Patient Details" drawer wide close={close}>
    <div className="dialog-body detail-body">
      <section className="details-identity"><Avatar name={patient.name}/><div><h2>{patient.name}</h2><p>{displayCode(patient.patient_code)} · {patient.age} years · {patient.gender}</p></div><Status patient={patient}/></section>
      <div className="detail-workspace">
        <section className="panel"><h3>Care assignment</h3><dl className="details-list">
          <div><dt>Ward</dt><dd>{catalog.wards[patient.ward_id]}</dd></div>
          <div><dt>Department</dt><dd>{catalog.departments[patient.department_id]}</dd></div>
          <div><dt>Assigned doctor</dt><dd>{catalog.doctors[patient.doctor_id]?.name}</dd></div>
        </dl></section>
        <section className="panel"><h3>Admission timeline</h3><ol className="timeline">
          <li data-stage="complete"><span className="timeline-icon"><ClipboardList size={16}/></span><div><strong>Admitted</strong><small>{displayDate(patient.admission_date)}</small></div></li>
          <li data-stage={patient.discharged_at?'complete':'pending'}><span className="timeline-icon"><CircleCheck size={16}/></span><div><strong>Discharge</strong><small>{patient.discharged_at?displayDate(patient.discharged_at):'Inpatient stay open'}</small></div></li>
        </ol></section>
      </div>
      <section className="panel detail-code"><label htmlFor="full-patient-code">Full patient ID</label><div className="row"><input id="full-patient-code" readOnly value={patient.patient_code}/><button aria-label="Copy full patient ID" onClick={()=>void copyId()}><Copy size={16}/></button></div><small role="status">{copy}</small></section>
    </div>
    <footer className="dialog-foot"><button className="delete-link" onClick={()=>open({kind:'delete',patient})}>Delete Patient</button><button onClick={()=>open({kind:'edit',patient})}>Edit Patient</button>{patient.status==='Admitted'&&<button className="primary" onClick={()=>open({kind:'discharge',patient})}>Discharge Patient</button>}</footer>
  </Dialog>
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
  return <Dialog title={deletion?'Delete Patient':'Discharge Patient'} close={()=>{if(!pending)close()}}><div className="dialog-body"><div className="confirm-profile"><span className={deletion?'confirm-icon error':'confirm-icon'}>{deletion?<TriangleAlert size={21}/>:<CircleCheck size={21}/>}</span><div><strong>{patient.name}</strong><small>{displayCode(patient.patient_code)}</small></div><Status patient={patient}/></div><p>{deletion?'This permanently deletes the patient record.':'This marks the patient as discharged and keeps their record in the directory.'}</p>{error&&<p role="alert" className="error">{error}</p>}</div><footer className="dialog-foot"><button disabled={pending} onClick={close}>Cancel</button><button disabled={pending} className={deletion?'danger':'primary'} onClick={()=>void apply()}>{pending?'Working…':deletion?'Delete Patient':'Discharge Patient'}</button></footer></Dialog>
}
export default function App() {
  const [overlay,setOverlay]=useState<Overlay|null>(null)
  const opener=useRef<HTMLElement|null>(null)
  const open:Open=next=>{
    if(!overlay && document.activeElement instanceof HTMLElement)opener.current=document.activeElement
    setOverlay(next)
  }
  const [notice,setNotice]=useState('')
  const cache=useQueryClient()
  const location=useLocation()
  const catalog=useQuery({queryKey:['catalog'],queryFn:()=>api<Catalog>('/lookups'),staleTime:Infinity})
  const summary=useQuery({queryKey:['summary'],queryFn:()=>api<Summary>('/dashboard/summary')})
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return ()=>clearTimeout(timer)},[notice])
  const close=()=>{
    setOverlay(null)
    const target=opener.current
    opener.current=null
    requestAnimationFrame(()=>{if(target?.isConnected)target.focus({preventScroll:true})})
  }
  const saved=(message:string)=>{close();setNotice(message);for(const key of ['patients','summary','reports'])void cache.invalidateQueries({queryKey:[key]})}
  const lookups=catalog.data
  return <><a className="skip" href="#main" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus()}}>Skip to content</a>
    <header className="top"><div className="top-inner">
      <Link to="/" className="brand"><BrandMark/>AdmitFlow</Link>
      <nav aria-label="Primary navigation" className="desktop-nav">{nav.map(([href,label,Icon])=><NavLink key={href} to={href} end={href==='/'}><Icon size={16}/>{label}</NavLink>)}</nav>
      <div className="top-actions"><SearchPatients/><ThemeControl/><New open={open}/></div>
    </div></header>
    <main id="main" tabIndex={-1}>
    <div className="route-content" key={location.pathname}>
    <div className="demo"><Activity size={13}/> Sample records only. Never enter real patient information.</div>
    {lookups&&summary.data?<Routes><Route path="/" element={<Overview catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/patients" element={<Directory catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/wards" element={<Wards catalog={lookups} summary={summary.data} open={open}/>}/><Route path="/reports" element={<Reports catalog={lookups}/>}/><Route path="*" element={<Heading title="Page not found" description="Return to the overview to continue."><Link className="button" to="/">Overview</Link></Heading>}/></Routes>:<DataState error={catalog.isError||summary.isError} retry={()=>{void catalog.refetch();void summary.refetch()}}/>}</div></main>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {nav.slice(0,2).map(([href,label,Icon])=><NavLink key={href} to={href} end={href==='/'}><Icon size={21}/>{label}</NavLink>)}
      <button className="mobile-admit" aria-label="New Admission" onClick={()=>open({kind:'new'})}><Plus size={25}/></button>
      {nav.slice(2).map(([href,label,Icon])=><NavLink key={href} to={href}><Icon size={21}/>{label}</NavLink>)}
    </nav>
    {overlay&&((overlay.kind==='delete'||overlay.kind==='discharge')?<Confirm key={overlay.kind} kind={overlay.kind} patient={overlay.patient} close={close} saved={saved}/>:lookups?overlay.kind==='detail'?<Details patient={overlay.patient} catalog={lookups} open={open} close={close}/>:<Admission key={overlay.kind} patient={overlay.kind==='new'?undefined:overlay.patient} catalog={lookups} close={close} saved={saved}/>:<Dialog title="New Patient Admission" close={close}><div className="dialog-body"><DataState error={catalog.isError} retry={()=>void catalog.refetch()}/></div></Dialog>)}
    <div className="toast-region" aria-live="polite">{notice&&<div className="toast"><CircleCheck size={19}/>{notice}<button className="icon" aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={17}/></button></div>}</div></>
}
