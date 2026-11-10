"""Executed real scenario and optional saved-environment replay; not physical validation."""
import argparse
import json
import time
import tracemalloc
from pathlib import Path
from lunascend.contracts import ScenarioRequest
from lunascend.ephemeris.kernels import PROJECT_ROOT,file_sha256
from .service import analyze_engineering,attach_engineering,restore_environment


def record(saved_environment: Path | None = None) -> dict:
    request = ScenarioRequest.model_validate_json((PROJECT_ROOT/'backend/examples/engineering-request.json').read_text(encoding='utf-8'))
    tracemalloc.start();start=time.perf_counter()
    if saved_environment:
        raw=json.loads(saved_environment.read_text(encoding='utf-8'))
        result=attach_engineering(restore_environment(raw.get('result',raw)),request)
    else:
        result=analyze_engineering(request)
    elapsed=time.perf_counter()-start;_,peak=tracemalloc.get_traced_memory();tracemalloc.stop()
    sources=[*Path(__file__).parent.glob('*.py'),*(PROJECT_ROOT/'backend/src/lunascend/communication').glob('*.py'),
        PROJECT_ROOT/'backend/src/lunascend/contracts/engineering.py',PROJECT_ROOT/'backend/src/lunascend/contracts/models.py',PROJECT_ROOT/'backend/src/lunascend/providers/scientific.py']
    return {'report_id':'step-8-conditional-engineering-v1','classification':'Executed SPICE/LOLA-derived environment with assumed hardware; independently unvalidated engineering',
        'environment_replayed':saved_environment is not None,'runtime_s':elapsed,'parent_python_tracked_peak_bytes':peak,
        'memory_scope':'Tracemalloc excludes GDAL native caches and child-process RSS; not total process memory.',
        'hardware_origin':'All panel, irradiance, load, capacity, efficiency and clearance-margin inputs are modeling assumptions, not site measurements.',
        'source_sha256':{str(p.relative_to(PROJECT_ROOT)).replace('\\','/'):file_sha256(p) for p in sorted(sources)},
        'result':result.model_dump(mode='json')}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--saved-environment',type=Path)
    args=parser.parse_args()
    report=record(args.saved_environment)
    destination=PROJECT_ROOT/'docs/validation'/('step-8-replay-results.json' if args.saved_environment else 'step-8-results.json')
    destination.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({'runtime_s':report['runtime_s'],'parent_python_tracked_peak_bytes':report['parent_python_tracked_peak_bytes'],
        'power_outcome':report['result']['power']['outcome'],'reported_file':str(destination.relative_to(PROJECT_ROOT))}))
