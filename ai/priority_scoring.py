WEIGHTS={'immediate_danger':30,'trapped_people':30,'injuries':20}
TYPE_WEIGHT={'Building collapse':20,'Fire':18,'Flooding':15,'Landslide':17,'Medical emergency':18,'Trapped people':22,'Road blockage':8,'Other':8}

def calculate_priority(report: dict) -> dict:
    score=0; factors=[]
    for key,label in [('danger','Immediate danger'),('trapped','People reported trapped'),('injuries','Injuries reported')]:
        if report.get(key): score+=WEIGHTS[{'danger':'immediate_danger','trapped':'trapped_people','injuries':'injuries'}[key]];factors.append({'factor':label,'points':WEIGHTS[{'danger':'immediate_danger','trapped':'trapped_people','injuries':'injuries'}[key]]})
    people=report.get('people')
    if people is not None:
        points=round(15*min(people,20)/20);score+=points
        if points:factors.append({'factor':f'{people} people reported affected','points':points})
    category=report.get('category') or 'Other';points=TYPE_WEIGHT.get(category,8);score+=points;factors.append({'factor':f'{category} incident type','points':points})
    score=min(score,100); priority='Critical' if score>=75 else 'High' if score>=50 else 'Medium' if score>=25 else 'Low'
    missing=[]
    if not report.get('location') and report.get('lat') is None:missing.append('Location is unknown')
    if people is None:missing.append('Number of people affected is unknown')
    return {'score':score,'priority':priority,'factors':factors,'missing':missing,'explanation':f'{priority} priority ({score}/100) from explicit safety indicators and incident category. Unknown fields are flagged for review.','next_action':'Verify location and dispatch appropriate help' if score>=50 else 'Review and verify report'}
