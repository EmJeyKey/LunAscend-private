import {useEffect,useRef} from 'react'
import {useNavigate} from 'react-router'
import {SiteChooser} from '../components/SiteChooser'
import {LunarExplorer} from '../components/LunarExplorer'
export function Dashboard(){
 const navigate=useNavigate(),explorer=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  let previous=window.scrollY,leaving=false,armed=false
  const onIntent=(event:Event)=>{const target=event.target as Element|null;if(target?.closest?.('.catalog-options,input,select,textarea'))return;if(event.type==='keydown'&&!['PageDown','ArrowDown',' '].includes((event as KeyboardEvent).key))return;armed=true}
  const onScroll=()=>{
   const down=window.scrollY>previous;previous=window.scrollY
   if(armed&&!leaving&&down&&window.scrollY>32&&explorer.current&&explorer.current.getBoundingClientRect().top<window.innerHeight*.8){leaving=true;navigate('/sites#moon-viewer')}
  }
  window.addEventListener('scroll',onScroll,{passive:true});for(const type of ['wheel','touchstart','keydown'])window.addEventListener(type,onIntent,{passive:true});return()=>{window.removeEventListener('scroll',onScroll);for(const type of ['wheel','touchstart','keydown'])window.removeEventListener(type,onIntent)}
 },[navigate])
 return <><SiteChooser/><div ref={explorer} className="dashboard-workbench"><LunarExplorer compact/></div></>
}
