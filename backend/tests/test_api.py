import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app, Session, Evidence
from sqlalchemy import select

client=TestClient(app)

def test_health_explicitly_says_prototype():
    response=client.get('/api/health')
    assert response.status_code==200
    assert response.json()['emergency_services_connected'] is False

def test_report_create_idempotency_and_read():
    payload={'id':'test-offline-idempotent','category':'Flooding','description':'Water rising near the market','location':None,'people':None}
    first=client.post('/api/reports',json=payload)
    second=client.post('/api/reports',json=payload)
    assert first.status_code==200 and second.status_code==200
    assert first.json()['id']==second.json()['id']
    assert client.get('/api/reports/test-offline-idempotent').json()['location'] is None

def test_priority_and_duplicate_prompt():
    a=client.post('/api/reports',json={'id':'test-dupe-a','category':'Flooding','description':'Flood water rising near Riverside Market, families need rescue','trapped':True,'danger':True}).json()
    b=client.post('/api/reports',json={'id':'test-dupe-b','category':'Flooding','description':'Flood water rising near Riverside Market, families need rescue','trapped':True,'danger':True}).json()
    assert a['priority_score']>=75
    candidates=client.post('/api/reports/test-dupe-b/find-duplicates').json()['candidates']
    assert any(x['candidate_id']=='test-dupe-a' for x in candidates)
    other=client.post('/api/reports',json={'id':'test-not-dupe','category':'Road blockage','description':'A fallen tree on a distant road'}).json()
    assert not any(x['candidate_id']==other['id'] for x in candidates)
    low=client.post('/api/reports',json={'id':'test-unknown-low','category':'Other','description':'Something happened'}).json()
    assert low['priority_score'] < a['priority_score'] and low['location'] is None

def test_report_update_verification_audits():
    client.post('/api/reports',json={'id':'test-update','category':'Other','description':'A tree is down'})
    updated=client.patch('/api/reports/test-update',json={'location':'Ward 3','people':4}).json()
    assert updated['location']=='Ward 3' and updated['people']==4
    assert client.post('/api/reports/test-update/verify',json={'status':'Verified'}).json()['verification']=='Verified'
    assert any(e['related_id']=='test-update' for e in client.get('/api/audit').json())

def test_demo_scenario_load_and_reset():
    client.post('/api/demo/reset')
    loaded=client.post('/api/demo/load').json()
    assert loaded['reports']==5
    assert client.get('/api/reports').json()['total']==5
    reset=client.post('/api/demo/reset').json()
    assert reset['reports']==5
    assert client.get('/api/reports').json()['total']==5

def test_resource_recommendation_and_approval_rechecks_availability():
    client.post('/api/demo/reset');client.post('/api/demo/load')
    items=client.post('/api/allocations/recommend').json()['items']
    suggestion=next(x for x in items if x['recommendations'])
    resource_id=suggestion['recommendations'][0]['resource_id']
    client.patch(f'/api/resources/{resource_id}',json={'status':'Unavailable'})
    response=client.post('/api/allocations/approve',json={'report_id':suggestion['report_id'],'resource_id':resource_id})
    assert response.status_code==409
    client.post('/api/demo/reset')

def test_evidence_hash_checks_consistency(tmp_path,monkeypatch):
    client.post('/api/reports',json={'id':'test-evidence','category':'Other','description':'Evidence test'})
    response=client.post('/api/evidence/upload',params={'report_id':'test-evidence'},files={'file':('evidence.jpg',b'\xff\xd8\xfffake-image-data','image/jpeg')})
    assert response.status_code==200
    evidence=response.json()
    assert client.post(f"/api/evidence/{evidence['id']}/verify").json()['status']=='Hash matches'
    with Session() as db:
        row=db.get(Evidence,evidence['id'])
        with open(row.stored_path,'wb') as changed: changed.write(b'changed-file-bytes')
        stored_path=row.stored_path
    assert client.post(f"/api/evidence/{evidence['id']}/verify").json()['status']=='Hash mismatch'
    Path(stored_path).unlink(missing_ok=True)
    client.post('/api/demo/reset')
