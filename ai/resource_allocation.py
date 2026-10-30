"""Transparent priority-first greedy matcher; estimates no travel time."""
NEEDS={'Flooding':{'boat','rescue'},'Trapped people':{'boat','rescue'},'Building collapse':{'rescue','medical'},'Fire':{'rescue','medical'},'Medical emergency':{'medical','ambulance'},'Landslide':{'rescue','medical'},'Road blockage':{'rescue'}}

def recommend(reports: list[dict],resources: list[dict]) -> list[dict]:
    taken=set(); result=[]
    for report in sorted((r for r in reports if r.get('status')!='Resolved'),key=lambda r:r.get('priority_score',0),reverse=True):
        need=NEEDS.get(report.get('category'),{'rescue'})
        people=report.get('people')
        matches=[x for x in resources if x.get('status')=='Available' and x.get('id') not in taken and (people is None or x.get('capacity') is None or x.get('capacity')>=people) and (x.get('type','').lower() in need or any(n in x.get('capability','').lower() for n in need))]
        if matches:
            resource=matches[0];taken.add(resource.get('id'));result.append({'report_id':report['id'],'resource_id':resource['id'],'why':f"Matches {report.get('category')} capability; currently available",'travel_time':None})
        else:result.append({'report_id':report['id'],'resource_id':None,'why':'No suitable available resource','travel_time':None})
    return result
