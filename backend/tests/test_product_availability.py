import json
from pathlib import Path
import pytest
from lunascend.contracts.models import ScenarioResult
from lunascend.providers.availability import describe_products

def geometry():
    return ScenarioResult.model_validate(json.loads((Path(__file__).resolve().parents[2]/'docs/validation/step-3-example-result.json').read_text()))

def test_geometry_does_not_claim_terrain_or_dte_and_preserves_every_value():
    original=geometry()
    result=describe_products(original)
    assert result.observations==original.observations and result.provenance==original.provenance
    assert result.availability['sun_geometry'].code=='geometric_only'
    assert result.availability['earth_geometry'].code=='geometric_only'
    assert result.availability['sun_terrain_visibility'].code=='not_requested'
    assert result.availability['dte'].code=='not_requested'

@pytest.mark.parametrize('code,message,expected',[
    ('MISSING_DATA','Pinned terrain data is missing.','dataset_not_installed'),
    ('MISSING_DATA','Terrain checksum mismatch.','dataset_unavailable'),
    ('OUTSIDE_COVERAGE','Observer has no valid DEM support.','outside_dataset_coverage'),
    ('FRAME_MISMATCH','Reference frame unsupported.','reference_frame_error'),
    ('CALCULATION_FAILED','Worker failed.','calculation_failed'),
])
def test_structured_failure_reasons_are_not_conflated(code,message,expected):
    original=geometry()
    data={**original.__dict__,'observations':None,'status':'unavailable','errors':({'code':code,'message':message,'module':'terrain'},)}
    result=describe_products(ScenarioResult(**data))
    assert result.availability['sun_geometry'].code==expected
    assert result.availability['earth_geometry'].reason==message
    assert result.observations is None
