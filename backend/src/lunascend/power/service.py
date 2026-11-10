"""Explicit composition and replay from saved environment; no HTTP dependencies."""
from hashlib import sha256
from lunascend.contracts import ScenarioRequest, ScenarioResult, DataProvenance
from lunascend.ephemeris.kernels import GeometryError, KernelConfiguration
from .engine import analyze_power, METHOD as POWER_METHOD, ASSUMPTIONS as POWER_ASSUMPTIONS
from lunascend.communication.engine import analyze_communication, METHOD as DTE_METHOD, ASSUMPTIONS as DTE_ASSUMPTIONS

VERSION = "engineering-assumptions-v1"


def environmental_request(request: ScenarioRequest) -> ScenarioRequest:
    s = request.settings
    if (request.provider_mode != "scientific" or not s.terrain_enabled or not s.terrain_options
        or (s.power_enabled and s.power_options is None) or (s.communication_enabled and s.communication_options is None)):
        raise GeometryError("INVALID_REQUEST", "Engineering requires scientific terrain analysis and explicit configuration for each enabled model; no hardware or mock fallback.")
    values = request.model_dump()
    values['settings'].update(power_enabled=False,communication_enabled=False,power_options=None,communication_options=None)
    return ScenarioRequest.model_validate(values)


def attach_engineering(environment: ScenarioResult, request: ScenarioRequest) -> ScenarioResult:
    expected = environmental_request(request)
    terrain = environment.terrain_visibility
    if environment.request != expected or environment.provider_mode != "scientific" or terrain is None:
        raise GeometryError("FRAME_MISMATCH", "Saved environment must match the requested site, UTC interval, height, frame and terrain configuration exactly.")
    if tuple(r.time_utc for r in environment.observations or ()) != tuple(r.time_utc for r in terrain.observations):
        raise GeometryError("INVALID_REQUEST", "Geometry and terrain timelines must match before engineering composition.")
    power = analyze_power(terrain,request.settings.power_options,request.start_utc,request.end_utc,request.sample_step_s) if request.settings.power_enabled else None
    communication = analyze_communication(terrain,request.settings.communication_options,request.start_utc,request.end_utc,request.sample_step_s) if request.settings.communication_enabled else None
    sources = list(environment.provenance)
    for enabled,identifier,method,assumptions,config in (
        (power,"power-model",POWER_METHOD,POWER_ASSUMPTIONS,request.settings.power_options),
        (communication,"dte-model",DTE_METHOD,DTE_ASSUMPTIONS,request.settings.communication_options)):
        if enabled is not None:
            sources.append(DataProvenance(id=identifier,provider_name="ConditionalEngineeringModel",provider_mode="scientific",
                data_source="Derived SPICE/LOLA center classifications plus user-configured hardware assumptions",
                source_version=method,calculation_method=method,reference_frame="MOON_ME_DE421",terrain_dataset=terrain.dataset_id,
                sha256=sha256(config.model_dump_json().encode()).hexdigest(),assumptions=assumptions))
    warnings = (*environment.warnings,
        "ENGINEERING ASSUMPTIONS: tested cases are not guaranteed bounds, statistical confidence intervals or mission-safety conclusions.",
        "Left-sample holds use actual UTC intervals; unresolved data break the battery trajectory and withhold full-period energy totals.",
        "Hourly or coarser sampling can hide short outages/depletion; no high-resolution accuracy claim.",
        "DTE access is conditional Earth-center clearance; link budget, antenna/ground-station performance and resilience optimization are deferred.")
    identity = sha256((environment.scenario_id+request.model_dump_json()+VERSION).encode()).hexdigest()[:32]
    return ScenarioResult(**{**environment.model_dump(exclude={"visibility_windows"}),"visibility_windows":environment.visibility_windows,
        "request":request,"scenario_id":identity,"model_version":VERSION,"status":"partial",
        "power":power,"communication":communication,"provenance":tuple(sources),"warnings":warnings})


def analyze_engineering(request: ScenarioRequest, configuration: KernelConfiguration | None = None) -> ScenarioResult:
    from lunascend.visibility.engine import analyze_visibility
    environment = analyze_visibility(environmental_request(request),configuration)
    return attach_engineering(environment,request)


def restore_environment(data: dict) -> ScenarioResult:
    """Accept the existing saved JSON, excluding its read-only computed duration fields."""
    return ScenarioResult.model_validate({**data,"visibility_windows":tuple({k:v for k,v in w.items() if k != 'duration_s'} for w in data.get('visibility_windows') or ())})
