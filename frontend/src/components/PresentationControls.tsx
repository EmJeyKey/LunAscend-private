import type {PropsWithChildren} from 'react'
import {usePresentation} from '../state/PresentationContext'
import {glossary} from '../lib/humanize'

export function PresentationControls(){
  const {mode,setMode}=usePresentation()
  return <div className="presentation-controls"><div role="group" aria-label="Detail level"><button aria-pressed={mode==='simple'} onClick={()=>setMode('simple')}>Simple view</button><button aria-pressed={mode==='advanced'} onClick={()=>setMode('advanced')}>Advanced view</button></div><span>{mode==='simple'?'Explained results, with scientific details available below.':'Original measurements, assumptions and technical controls.'}</span></div>
}
export function ScientificDetails({children,title='Show scientific details',reveal=false}:PropsWithChildren<{title?:string;reveal?:boolean}>){
  const {advanced}=usePresentation()
  return <details className="scientific-details" open={advanced||reveal}><summary>{title}</summary><div>{children}</div></details>
}
export function Glossary({terms}: {terms?:string[]}) {
  return <details className="context-glossary"><summary>What do these words mean?</summary><dl>{glossary.filter(([term])=>!terms||terms.includes(term)).map(([term,meaning])=><div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl></details>
}
