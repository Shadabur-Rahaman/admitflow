import {useState} from 'react'
import {Monitor, Moon, Sun} from 'lucide-react'
import {ChoiceMenu} from './ChoiceMenu'

const modes = {system:Monitor,light:Sun,dark:Moon}
type Mode = keyof typeof modes

export function ThemeControl() {
  const [mode,setMode]=useState<Mode>(()=>{
    const current=document.documentElement.dataset.theme
    return current==='light'||current==='dark'?current:'system'
  })
  const CurrentIcon=modes[mode]

  return <ChoiceMenu name="Appearance" value={mode} icon={<CurrentIcon size={18}/>}
    choices={Object.entries(modes).map(([value,Icon])=>({value,label:value[0].toUpperCase()+value.slice(1),icon:<Icon size={16}/>}))}
    change={value=>{
      const next=value as Mode
      setMode(next)
      document.documentElement.dataset.theme=next
      try {localStorage.setItem('admitflow-theme',next)} catch {}
    }}/>
}
