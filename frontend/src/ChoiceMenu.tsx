import {useEffect,useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react'
import {Check,ChevronDown} from 'lucide-react'

type Choice = {value:string;label:string;icon?:ReactNode}

export function ChoiceMenu({name,value,choices,change,icon,placeholder}:{
  name:string;value:string;choices:Choice[];change:(value:string)=>void;icon?:ReactNode;placeholder?:string
}) {
  const [open,setOpen]=useState(false)
  const [position,setPosition]=useState({top:0,left:0,width:180,maxHeight:280})
  const [focused,setFocused]=useState(0)
  const root=useRef<HTMLDivElement>(null)
  const trigger=useRef<HTMLButtonElement>(null)
  const group=useRef<HTMLDivElement>(null)
  const id=useId()
  const selection=choices.find(choice=>choice.value===value)
  const selected=Math.max(0,choices.findIndex(choice=>choice.value===value))

  function show() {
    const rect=trigger.current!.getBoundingClientRect()
    const width=Math.min(Math.max(rect.width, name==='Doctors'?230:175),window.innerWidth-16)
    const below=window.innerHeight-rect.bottom-12
    const height=Math.min(280,choices.length*38+12)
    const above=below<height && rect.top>below
    const maxHeight=Math.min(280,Math.max(60,above?rect.top-12:below))
    setPosition({width,left:Math.min(rect.left,window.innerWidth-width-8),top:above?rect.top-Math.min(height,maxHeight)-6:rect.bottom+6,maxHeight})
    setFocused(selected)
    setOpen(true)
  }

  useEffect(()=>{
    if(!open)return
    function dismiss(event:PointerEvent) {
      if(!root.current?.contains(event.target as Node))setOpen(false)
    }
    function close(){setOpen(false)}
    document.addEventListener('pointerdown',dismiss)
    window.addEventListener('resize',close)
    window.addEventListener('scroll',close,{passive:true})
    return ()=>{
      document.removeEventListener('pointerdown',dismiss)
      window.removeEventListener('resize',close)
      window.removeEventListener('scroll',close)
    }
  },[open])

  useEffect(()=>{
    if(open)group.current?.querySelectorAll('button')[focused]?.focus({preventScroll:true})
  },[open,focused])

  function navigate(event:KeyboardEvent) {
    if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();return}
    if(event.key==='Tab'){setOpen(false);return}
    const offsets:Record<string,number>={ArrowDown:1,ArrowUp:-1}
    const offset=offsets[event.key]
    if(offset===undefined && event.key!=='Home' && event.key!=='End')return
    event.preventDefault()
    if(!open){show();return}
    setFocused(index=>event.key==='Home'?0:event.key==='End'?choices.length-1:(index+offset+choices.length)%choices.length)
  }

  return <div className={'choice '+(icon?'choice-icon':'')} ref={root}
    onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}} onKeyDown={navigate}>
    <button className={icon?'icon':'choice-trigger'} ref={trigger} type="button" aria-label={name}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined}
      data-selected={!!value} title={icon?name+': '+selection?.label:selection?.label}
      onClick={()=>open?setOpen(false):show()}>
      {icon??<><span>{selection?.label??placeholder}</span><ChevronDown size={13}/></>}
    </button>
    {open&&<div id={id} className="choice-options" style={position} ref={group} role="listbox" aria-label={name}>
      {choices.map((choice,index)=><button key={choice.value} type="button" role="option"
        tabIndex={index===focused?0:-1} aria-selected={choice.value===value} onClick={()=>{
          change(choice.value)
          setOpen(false)
          trigger.current?.focus()
        }}>
        {choice.icon}<span>{choice.label}</span>{choice.value===value&&<Check size={15}/>}
      </button>)}
    </div>}
  </div>
}
