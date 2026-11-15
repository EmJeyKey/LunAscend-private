import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {DirectionCompass} from '../components/DirectionCompass'
import {markerWorldRadius} from '../lib/lunarScene'

describe('scientific direction and marker presentation',()=>{
  it('distinguishes a genuine zero bearing from missing directions',()=>{
    const html=renderToStaticMarkup(<DirectionCompass sun={{azimuth:0,elevation:0}} earth={{azimuth:null,elevation:null}} frame="DE421"/>)
    expect(html).toContain('Sun azimuth 0.00 degrees, elevation 0.00 degrees')
    expect(html).toContain('M90 76L90 30')
    expect(html).not.toContain('Earth azimuth')
    expect(html).toContain('direction unavailable')
    expect(html).toContain('not map axes')
  })
  it('updates cardinal bearings and preserves below-horizon elevations without implying visibility',()=>{
    const html=renderToStaticMarkup(<DirectionCompass sun={{azimuth:90,elevation:-5}} earth={{azimuth:180,elevation:12}} frame="DE440/ME421"/>)
    expect(html).toContain('M90 76L136 76')
    expect(html).toContain('Earth azimuth 180.00 degrees, elevation 12.00 degrees')
    expect(html).toContain('el -5.00°')
    expect(html).toContain('Not a visibility or radio-link result')
  })
  it('keeps catalog marker radius at eight CSS pixels across zoom and viewport changes',()=>{
    for(const depth of [.3,1,4])for(const height of [400,800]){
      const world=markerWorldRadius(depth,42,height)
      const pixels=world/(2*depth*Math.tan(42*Math.PI/360))*height
      expect(pixels).toBeCloseTo(8,10)
    }
    expect(markerWorldRadius(2,42,800,11)/markerWorldRadius(2,42,800,8)).toBeCloseTo(11/8)
  })
})
