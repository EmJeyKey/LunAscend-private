"""Save bounded official LROC metadata, never a whole DTM archive."""
import json
import re
from hashlib import sha256
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/manifests/apollo-terrain'

def read(url,limit):
    with urlopen(url,timeout=30) as response:
        value=response.read(limit+1)
        if len(value)>limit:raise ValueError('Metadata size limit exceeded')
        return value

def main():
    OUT.mkdir(parents=True,exist_ok=True);records=[]
    for n in [11,12,14,15,16,17]:
        url=f'https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO{n}'
        record={'site_id':f'apollo-{n}','catalog_url':url,'terrain_status':'not_installed'}
        try:
            page=read(url,500000).decode()
            links=[urljoin(url,u) for u in re.findall(r'href\s*=\s*["\']([^"\']+)',page,re.I)]
            readme=next(u for u in links if u.upper().endswith('_README.TXT'))
            record['readme_url']=readme
            raw=read(readme,64000);(OUT/f'apollo-{n}-README.txt').write_bytes(raw)
            product_url=f'https://data.lroc.im-ldi.com/lroc/view_rdr_product/NAC_DTM_APOLLO{n}'
            product=read(product_url,500000).decode()
            product_links=[urljoin(product_url,u) for u in re.findall(r'href\s*=\s*["\']([^"\']+)',product,re.I)]
            label_url=next(u for u in product_links if u.upper().endswith('.LBL'))
            label=read(label_url,64000);(OUT/f'apollo-{n}.LBL').write_bytes(label)
            record['label_url']=label_url
            record['readme_sha256']=sha256(raw).hexdigest();record['label_sha256']=sha256(label).hexdigest()
            record['product_version']=re.search(r'PRODUCT_VERSION_ID\s*=\s*"([^"]+)',label.decode())[1]
            record['raster_url']=next(u for u in product_links if u.upper().endswith('.TIF') and '.PYR.' not in u.upper())
            record['label_summary']=[line.strip() for line in label.decode(errors='replace').splitlines() if any(k in line for k in ['FRAME','PROJECTION','RADIUS','UNIT','OFFSET','SCALING','MINIMUM','MAXIMUM','MISSING','NULL'])]
            text=raw.decode(errors='replace')
            record['readme_summary']=[line.strip() for line in text.splitlines() if any(k in line.lower() for k in ['datum','radius','1737','reference frame','de421','mean earth','projection','elevation'])]
            record['missing_reason']='DTM metadata saved; exact reference-frame registration and local raster extraction not yet accepted.'
        except Exception as error:record['missing_reason']=str(error)
        records.append(record);print(record,flush=True)
    (OUT/'catalog.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
