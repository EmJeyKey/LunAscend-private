import {createContext,useContext,useMemo,useState,type PropsWithChildren} from 'react'

export type PresentationMode='simple'|'advanced'
const PresentationContext=createContext<{mode:PresentationMode;setMode:(mode:PresentationMode)=>void}>({mode:'simple',setMode:()=>{}})

export function PresentationProvider({children,initialMode='simple'}:PropsWithChildren<{initialMode?:PresentationMode}>) {
  const [mode,setMode]=useState<PresentationMode>(initialMode)
  const value=useMemo(()=>({mode,setMode}),[mode])
  return <PresentationContext.Provider value={value}>{children}</PresentationContext.Provider>
}
export function usePresentation(){const context=useContext(PresentationContext);return {...context,advanced:context.mode==='advanced'}}
