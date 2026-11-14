"""Explicit hard-constraint screening of installed NASA averages, never a score."""
from typing import Annotated
from pydantic import Field
from lunascend.contracts.common import Contract, Number


class ScreeningCriteria(Contract):
    minimum_solar_fraction: Annotated[Number, Field(ge=0,le=1)] = .5
    minimum_earth_fraction: Annotated[Number, Field(ge=0,le=1)] = .5
    exclude_permanent_shadow: bool = True
    require_mission_engineering: bool = True
    maximum_slope_deg: Annotated[Number, Field(ge=0,le=90)] | None = None


def classify_cell(solar,earth,shadow,rules: ScreeningCriteria):
    reasons=[];failed=False;unknown=False
    for name,value,minimum in [('solar',solar,rules.minimum_solar_fraction),('earth',earth,rules.minimum_earth_fraction)]:
        if value is None:unknown=True;reasons.append(name+'_missing')
        elif value<minimum:failed=True;reasons.append(name+'_below_threshold')
    if rules.exclude_permanent_shadow:
        if shadow is None:unknown=True;reasons.append('shadow_missing')
        elif shadow==1:failed=True;reasons.append('permanent_shadow_excluded')
    if rules.maximum_slope_deg is not None:unknown=True;reasons.append('slope_at_scale_unavailable')
    if rules.require_mission_engineering:unknown=True;reasons.append('date_specific_engineering_not_evaluated')
    if failed:return 1,reasons
    if solar is None and earth is None and shadow is None:return 0,reasons
    if unknown:return 2,reasons
    return 3,['meets_selected_long_term_requirements_only']


def screening_layer(rules: ScreeningCriteria):
    from .polar_screening import polar_layer
    layers=[polar_layer(id) for id in ('solar','earth','shadow')]
    base=layers[0]
    if any(layer['corners']!=base['corners'] for layer in layers):raise ValueError('Misregistered screening rasters')
    evidence=list(zip(*(layer['values'] for layer in layers)))
    classes=[classify_cell(*values,rules) for values in evidence]
    return {**base,'layer':'screening','product':'NASA long-term hard-constraint screening','units':'screening_class',
        'values':[row[0] for row in classes],'reasons':[row[1] for row in classes],
        'criteria':rules.model_dump(),'cell_evidence':evidence,'source_hashes':[layer['source_sha256'] for layer in layers],
        'legend':{'0':'gray: insufficient data','1':'red: fails an evaluated mandatory criterion','2':'amber: critical criterion unknown','3':'green: promising for evaluated long-term criteria only'},
        'limitations':[*base['limitations'],'Green is not landing-safety certification. Mission-date engineering and slope cannot pass unless separately evaluated; no region ranking or interpolation.']}
