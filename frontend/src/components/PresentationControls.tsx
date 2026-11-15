import type {PropsWithChildren} from 'react'
import {glossary} from '../lib/humanize'

export function PresentationControls(){
  return null
}
export function ScientificDetails({children,title='Show scientific details',reveal=false}:PropsWithChildren<{title?:string;reveal?:boolean}>){
  return <details className="scientific-details" open={reveal}><summary>{title}</summary><div>{children}</div></details>
}
export function Glossary({terms}: {terms?:string[]}) {
  return <details className="context-glossary"><summary>What do these words mean?</summary><dl>{glossary.filter(([term])=>!terms||terms.includes(term)).map(([term,meaning])=><div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl></details>
}
