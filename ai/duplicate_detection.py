import re

def token_similarity(a: str,b: str) -> float:
    tokens=lambda s:set(re.findall(r'[a-z0-9]+',s.lower()))
    x,y=tokens(a or ''),tokens(b or '')
    return len(x&y)/len(x|y) if x|y else 0.0

def score_candidate(report: dict,candidate: dict) -> dict:
    text=token_similarity(report.get('description',''),candidate.get('description',''))
    same_type=report.get('category')==candidate.get('category')
    near=False
    if report.get('lat') is not None and candidate.get('lat') is not None:
        near=((report['lat']-candidate['lat'])**2+((report.get('lon') or 0)-(candidate.get('lon') or 0))**2)**.5*111<5
    score=min(1,text*.7+(.15 if same_type else 0)+(.1 if near else 0))
    return {'score':round(score,3),'text_similarity':round(text,3),'same_category':same_type,'nearby_coordinates':near}
