import numpy as np
from fastapi.testclient import TestClient
from lunascend.api.exploration import apollo_context, CATALOG
from lunascend.main import create_app


def test_native_catalog_and_no_apollo_13():
    assert [s['id'] for s in CATALOG['sites']] == ['apollo-11','apollo-12','apollo-14','apollo-15','apollo-16','apollo-17']
    assert CATALOG['sites'][0]['latitude'] == 0.67416
    assert CATALOG['sites'][1]['longitude'] == -23.42190


def test_apollo_uses_inverse_exact_bridge_not_frame_alias(monkeypatch):
    from lunascend.terrain import frames
    matrix = np.array([[0.,-1.,0.],[1.,0.,0.],[0.,0.,1.]])
    monkeypatch.setattr(frames, 'frame_rotation', lambda request: (matrix, {'method':'synthetic rotation fixture'}))
    apollo_context.cache_clear()
    try:
        result = apollo_context('2026-11-14T00:00:00+00:00')
        for source,pin in zip(CATALOG['sites'],result['sites']):
            assert abs(pin['context_latitude']-source['latitude']) < 1e-10
            assert abs(pin['context_longitude']-(source['longitude']-90)) < 1e-10
    finally:
        apollo_context.cache_clear()


def test_epoch_validation_and_failure_explicit(monkeypatch):
    import lunascend.api.exploration as module
    client = TestClient(create_app())
    body = {'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':'1969-07-20T20:17:40Z'}
    assert client.post('/api/v1/exploration/apollo',json=body).status_code == 422
    monkeypatch.setattr(module, 'apollo_context', lambda epoch: (_ for _ in ()).throw(RuntimeError('missing kernel')))
    body['coordinate_epoch_utc']='2026-11-14T00:00:00Z'
    assert client.post('/api/v1/exploration/apollo',json=body).status_code == 503
