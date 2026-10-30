import re

def extract_report(report: dict) -> dict:
    text=(report.get('description') or '').lower()
    indicators=[]
    if re.search(r'\b(trapped|stuck|cannot escape)\b',text) and not report.get('trapped'): indicators.append('Possible trapped people mentioned in narrative')
    if re.search(r'\b(injur|hurt|wounded)\b',text) and not report.get('injuries'): indicators.append('Possible injuries mentioned in narrative')
    missing=[]
    if not report.get('location') and report.get('lat') is None: missing.append('location')
    if report.get('people') is None: missing.append('people_affected')
    return {'category':report.get('category') or 'Other','description':report.get('description') or '', 'location_description':report.get('location'), 'latitude':report.get('lat'),'longitude':report.get('lon'),'people_affected':report.get('people'),'trapped_people':bool(report.get('trapped')),'injuries':bool(report.get('injuries')),'immediate_danger':bool(report.get('danger')),'urgency_indicators':indicators,'missing_information':missing,'confidence':0.72 if len(missing)<2 else 0.55,'method':'deterministic rules; indicators are suggestions for human review'}
