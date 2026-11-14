import pytest
from pydantic import ValidationError
from lunascend.terrain.screening import ScreeningCriteria, classify_cell, screening_layer


def test_hard_failure_precedes_missing_evidence():
    rules=ScreeningCriteria(maximum_slope_deg=10)
    code,reasons=classify_cell(.1,.8,0,rules)
    assert code==1 and 'solar_below_threshold' in reasons and 'slope_at_scale_unavailable' in reasons


def test_unknown_critical_evidence_never_green():
    assert classify_cell(.8,.8,0,ScreeningCriteria())[0]==2
    assert classify_cell(None,None,None,ScreeningCriteria())[0]==0
    assert classify_cell(.8,.8,0,ScreeningCriteria(require_mission_engineering=False,maximum_slope_deg=10))[0]==2
    assert classify_cell(.8,.8,0,ScreeningCriteria(require_mission_engineering=False))[0]==3


def test_permanent_shadow_and_constraints_are_explicit():
    assert classify_cell(.8,.8,1,ScreeningCriteria(require_mission_engineering=False))[0]==1
    for patch in [{'minimum_solar_fraction':1.1},{'maximum_slope_deg':float('nan')},{'unknown_score':2}]:
        with pytest.raises(ValidationError):ScreeningCriteria(**patch)


def test_real_cells_remain_traceable_and_not_date_specific():
    rules=ScreeningCriteria()
    layer=screening_layer(rules)
    assert layer['mode']=='long_term_environment' and layer['layer']=='screening'
    assert len(layer['values'])==len(layer['reasons'])==len(layer['cell_evidence'])==4225
    assert 3 not in layer['values']  # Date-specific engineering is mandatory and unavailable.
    for values,code,reasons in zip(layer['cell_evidence'],layer['values'],layer['reasons']):
        assert classify_cell(*values,rules)==(code,reasons)
