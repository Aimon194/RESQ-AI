import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from duplicate_detection import token_similarity
from priority_scoring import calculate_priority
from report_extraction import extract_report
from resource_allocation import recommend
from evidence_integrity import sha256_bytes,matches_recorded_hash

def test_extract_keeps_unknown_fields_null():
    result=extract_report({'category':'Other','description':'Noise in the area'})
    assert result['latitude'] is None and result['people_affected'] is None
    assert 'location' in result['missing_information']

def test_duplicate_and_nonduplicate_similarity():
    assert token_similarity('Flood rising near the market','Flood rising near the market')==1
    assert token_similarity('Flood rising near the market','Clinic needs medical supplies')<.2

def test_priority_rewards_explicit_danger_without_unknown_as_zero():
    critical=calculate_priority({'category':'Building collapse','trapped':True,'danger':True,'people':None})
    assert critical['priority']=='Critical' and 'Number of people affected is unknown' in critical['missing']

def test_resource_assignment_is_capable_exclusive_and_honest_about_routes():
    reports=[{'id':'a','category':'Flooding','priority_score':80},{'id':'b','category':'Flooding','priority_score':40}]
    resources=[{'id':'boat','type':'boat','capability':'water rescue','status':'Available'}]
    result=recommend(reports,resources)
    assert result[0]['resource_id']=='boat' and result[1]['resource_id'] is None
    assert result[0]['travel_time'] is None

def test_sha256_only_checks_bytes():
    digest=sha256_bytes(b'prototype file')
    assert matches_recorded_hash(b'prototype file',digest)
    assert not matches_recorded_hash(b'changed file',digest)
