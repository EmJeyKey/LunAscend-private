"""Two-entry process-local environment reuse; verify pinned sources before every hit."""
from typing import Callable
from collections import OrderedDict
from hashlib import sha256
import json
from threading import RLock
from lunascend.contracts import ScenarioRequest, ScenarioResult
from lunascend.ephemeris.kernels import KernelConfiguration, GeometryError, PROJECT_ROOT, file_sha256

_cache: OrderedDict[str, ScenarioResult] = OrderedDict()
_lock = RLock()

def source_identity(request: ScenarioRequest, configuration: KernelConfiguration) -> str:
    from lunascend.terrain.dem import DatasetConfiguration
    _, fingerprint = configuration.verify()
    if request.settings.terrain_options is None:
        raise GeometryError("INVALID_REQUEST","Environment reuse requires explicit terrain options.")
    terrain = DatasetConfiguration.selected(request.settings.terrain_options.dataset_id)
    terrain.verify()
    bridge_configuration = KernelConfiguration.from_environment()
    bridge_fingerprint = fingerprint if bridge_configuration == configuration else bridge_configuration.verify()[1]
    extra = json.loads((PROJECT_ROOT/'data/manifests/terrain-frame-kernels.json').read_text(encoding='utf-8'))
    for record in extra['kernels']:
        try:
            actual = file_sha256(bridge_configuration.kernel_dir/record['filename'])
        except OSError as exc:
            raise GeometryError('MISSING_DATA','Required frame kernel is missing; cached results withheld.') from exc
        if actual != record['sha256']:
            raise GeometryError('MISSING_DATA','Frame kernel checksum mismatch; cached results withheld.')
    return sha256(json.dumps([fingerprint,configuration.manifest(),bridge_fingerprint,bridge_configuration.manifest(),terrain.manifest,extra],sort_keys=True).encode()).hexdigest()

def environment(request: ScenarioRequest, configuration: KernelConfiguration, calculate: Callable[[ScenarioRequest, KernelConfiguration], ScenarioResult]) -> ScenarioResult:
    with _lock:
        key=sha256((request.model_dump_json()+source_identity(request,configuration)).encode()).hexdigest()
        if key in _cache:
            _cache.move_to_end(key)
            return _cache[key]
        result=calculate(request,configuration)
        if result.provider_mode=='scientific' and result.status in ('complete','partial') and result.terrain_visibility is not None:
            _cache[key]=result
            while len(_cache)>2:_cache.popitem(last=False)
        return result
