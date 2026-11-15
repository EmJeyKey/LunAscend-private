import type {PropsWithChildren} from 'react'

export type PresentationMode='simple'|'advanced'
// One workspace. Keep the small compatibility hook while existing viewers use
// `advanced` to expose supported controls; there is no alternate user mode.
export function PresentationProvider({children}:PropsWithChildren<{initialMode?:PresentationMode}>) {
  return children
}
export function usePresentation(){return {mode:'unified' as const,advanced:true}}
