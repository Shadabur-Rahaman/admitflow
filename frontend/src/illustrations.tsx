import {useId} from 'react'
import {Activity, Baby, BedDouble, HeartPulse, Hospital, ShieldPlus, Stethoscope, Syringe} from 'lucide-react'

export function BrandMark() {
  return <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <rect width="34" height="34" rx="11" fill="currentColor"/>
    <path d="M7 24 14 10h5l8 14h-5l-5.5-10L11 24Z" fill="#fff"/>
    <path d="M13 21h8" stroke="#ff9477" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
}

const wardIcons = {
  general: BedDouble, private: Hospital, icu: Activity, emergency: ShieldPlus,
  pediatric: Stethoscope, surgical: Syringe, maternity: Baby,
}

export function WardMark({id, size = 21}:{id:string;size?:number}) {
  const Icon = wardIcons[id as keyof typeof wardIcons] ?? HeartPulse
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true"/>
}

export function AdmissionArt() {
  const id = useId()
  const paint = (name:string) => 'url(#'+id+name+')'
  return <svg className="clinical-art" viewBox="0 0 430 300" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id+'body'} x1="84" y1="44" x2="345" y2="241" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f8fffc"/><stop offset=".54" stopColor="#c8dfd8"/><stop offset="1" stopColor="#79a99a"/>
      </linearGradient>
      <linearGradient id={id+'green'} x1="150" y1="103" x2="353" y2="250" gradientUnits="userSpaceOnUse">
        <stop stopColor="#b4dfce"/><stop offset="1" stopColor="#447d72"/>
      </linearGradient>
      <linearGradient id={id+'metal'} x1="91" y1="82" x2="246" y2="272" gradientUnits="userSpaceOnUse">
        <stop stopColor="#edf8f3"/><stop offset="1" stopColor="#819e9a"/>
      </linearGradient>
      <radialGradient id={id+'shadow'}>
        <stop stopColor="#315e54" stopOpacity=".37"/><stop offset="1" stopColor="#315e54" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={id+'coral'} x1="291" y1="19" x2="362" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb099"/><stop offset="1" stopColor="#e35d43"/>
      </linearGradient>
    </defs>
    <ellipse cx="223" cy="246" rx="188" ry="42" fill={paint('shadow')}/>
    <path d="M41 212 167 132l213 83-127 73Z" fill="currentColor" opacity=".08"/>
    <path d="m41 212 126-80 213 83-127 73-212-76Zm51 18 126-79m-72 99 126-78m-72 98 128-76M113 166l210 82M79 189l209 80" stroke="currentColor" opacity=".18"/>
    <path d="M118 180v35m194 4v26m43-48v24m-191-17v30" stroke="#476b64" strokeWidth="8" strokeLinecap="round"/>
    <ellipse cx="118" cy="219" rx="9" ry="6" fill="#365551"/><ellipse cx="164" cy="237" rx="9" ry="6" fill="#365551"/><ellipse cx="312" cy="247" rx="9" ry="6" fill="#365551"/><ellipse cx="355" cy="224" rx="9" ry="6" fill="#365551"/>
    <path d="m94 153 61-33 211 75v13l-61 34-211-77Z" fill="#6c9288"/>
    <path d="m94 153 61-33 211 75-61 34Z" fill={paint('metal')}/>
    <path d="m111 137 53-28 195 70c7 3 9 8 3 12l-57 33-202-73c-6-2-3-9 8-14Z" fill={paint('body')}/>
    <path d="m164 109 39 14 143 51c13 5 19 10 10 15l-51 35-124-45-44-52Z" fill={paint('green')}/>
    <path d="m177 146 123 46c8 3 16 3 24-2l24-14m-158-22 42 16m50 19 15 5" stroke="#daf4e8" strokeOpacity=".66" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M101 153v-57a8 8 0 0 1 12-7l45 17a10 10 0 0 1 6 9v23l-10 5v-24l-43-16v54Z" fill={paint('metal')} stroke="#648f83" strokeWidth="1.5"/>
    <path d="m122 119 21 8c6 3 7 8 2 11l-15 9-26-10c-5-2-4-7 1-10l11-7a8 8 0 0 1 6-1Z" fill="#f5fff9" stroke="#bed6ce" strokeWidth="2"/>
    <path d="M300 230v-34a8 8 0 0 1 4-7l54-31a6 6 0 0 1 9 5v34l-9 5v-34l-49 28v34Z" fill={paint('metal')} stroke="#648f83" strokeWidth="1.5"/>
    <path d="M230 159v-22l50 18v22m-38-36v22m12-17v22m13-18v22" stroke="#d7eee4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M271 91v57m-19 10 19-10 18 7m-54-56c2 23 12 26 24 23 15-4 13-15 30-15" stroke="#749b90" strokeWidth="3" strokeLinecap="round"/>
      <path d="M217 53a10 10 0 0 1 10-10h64a10 10 0 0 1 10 10v39a10 10 0 0 1-10 10h-64a10 10 0 0 1-10-10Z" fill="#537b72"/>
      <rect x="222" y="42" width="77" height="53" rx="9" fill="#24443f" stroke="#b5d2c9" strokeWidth="3"/>
      <path d="M232 70h11l4-6 6 11 8-19 6 14h22" stroke="#adf5d3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="343" cy="62" r="34" fill={paint('coral')}/>
      <path d="M343 49v26m-13-13h26" stroke="#fff" strokeWidth="6" strokeLinecap="round"/>
      <path d="m323 112 19 9 32-19M76 72v18m-9-9h18" stroke="currentColor" opacity=".43" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="196" cy="41" r="5" fill="#7eb3a2"/><circle cx="388" cy="151" r="5" fill="#e88c72"/>
  </svg>
}

export function EmptyArt() {
  return <svg width="65" height="56" viewBox="0 0 65 56" fill="none" aria-hidden="true">
    <ellipse cx="32" cy="49" rx="25" ry="5" fill="currentColor" opacity=".1"/>
    <rect x="16" y="7" width="32" height="41" rx="8" fill="currentColor" opacity=".14"/>
    <path d="M26 8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4H26V8Zm-2 16h16m-16 7h16m-16 7h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="49" cy="38" r="8" fill="var(--surface)" stroke="currentColor" strokeWidth="2"/>
    <path d="m55 44 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
}

export function ClipboardArt() {
  return <svg className="clinical-mini" viewBox="0 0 200 165" aria-hidden="true">
    <ellipse cx="110" cy="144" rx="79" ry="16" fill="currentColor" opacity=".1"/>
    <g transform="rotate(-13 109 82)">
      <rect x="63" y="27" width="96" height="124" rx="13" fill="#527486"/>
      <rect x="57" y="21" width="96" height="124" rx="13" fill="#9ab7c5"/>
      <rect x="65" y="28" width="80" height="108" rx="9" fill="#f3f9f8"/>
      <path d="M88 27v-7a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v9H88Z" fill="#587887"/>
      <path d="M79 57h52m-52 20h52m-52 20h52m-52 20h29" stroke="#bfd2d7" strokeWidth="4" strokeLinecap="round"/>
      <path d="M84 51v9m-4-4h8" stroke="#4a836f" strokeWidth="2" strokeLinecap="round"/>
    </g>
    <circle cx="156" cy="113" r="23" fill="#76a891"/>
    <path d="m147 112 6 6 12-12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}
