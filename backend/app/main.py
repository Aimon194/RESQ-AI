from __future__ import annotations
import hashlib, json, math, os, re, uuid, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Text, Float, Integer, Boolean, DateTime, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
sys.path.insert(0,str(PROJECT_ROOT))
from ai.duplicate_detection import token_similarity
from ai.evidence_integrity import sha256_bytes, matches_recorded_hash
from ai.priority_scoring import calculate_priority as calculate_priority_score
from ai.report_extraction import extract_report
from ai.resource_allocation import recommend as allocate_resources
DB_URL = os.getenv('DATABASE_URL', f'sqlite:///{ROOT / "resq.db"}')
engine = create_engine(DB_URL, connect_args={'check_same_thread': False} if DB_URL.startswith('sqlite') else {})
Session = sessionmaker(engine, expire_on_commit=False)
class Base(DeclarativeBase): pass
def now(): return datetime.now(timezone.utc)

class Report(Base):
    __tablename__='reports'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    category: Mapped[str]=mapped_column(String)
    description: Mapped[str]=mapped_column(Text)
    location: Mapped[Optional[str]]=mapped_column(String, nullable=True)
    lat: Mapped[Optional[float]]=mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]]=mapped_column(Float, nullable=True)
    people: Mapped[Optional[int]]=mapped_column(Integer, nullable=True)
    trapped: Mapped[bool]=mapped_column(Boolean, default=False)
    injuries: Mapped[bool]=mapped_column(Boolean, default=False)
    danger: Mapped[bool]=mapped_column(Boolean, default=False)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    received_at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    status: Mapped[str]=mapped_column(String, default='Open')
    verification: Mapped[str]=mapped_column(String, default='Awaiting verification')
    extracted: Mapped[str]=mapped_column(Text, default='{}')
    priority_score: Mapped[int]=mapped_column(Integer, default=0)
    priority: Mapped[str]=mapped_column(String, default='Medium')
    duplicate_of: Mapped[Optional[str]]=mapped_column(String, nullable=True)
    human_corrections: Mapped[str]=mapped_column(Text, default='{}')

class Resource(Base):
    __tablename__='resources'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    type: Mapped[str]=mapped_column(String)
    name: Mapped[str]=mapped_column(String)
    capability: Mapped[str]=mapped_column(String)
    status: Mapped[str]=mapped_column(String, default='Available')
    location: Mapped[str]=mapped_column(String, default='Unknown')
    lat: Mapped[Optional[float]]=mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]]=mapped_column(Float, nullable=True)
    capacity: Mapped[Optional[int]]=mapped_column(Integer, nullable=True)
    assignment: Mapped[Optional[str]]=mapped_column(String, nullable=True)

class Audit(Base):
    __tablename__='audit'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    at: Mapped[datetime]=mapped_column(DateTime(timezone=True), default=now)
    event: Mapped[str]=mapped_column(String)
    related_id: Mapped[Optional[str]]=mapped_column(String, nullable=True)
    description: Mapped[str]=mapped_column(Text)
    actor: Mapped[str]=mapped_column(String, default='system')
    data: Mapped[str]=mapped_column(Text, default='{}')

class Evidence(Base):
    __tablename__='evidence'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    report_id: Mapped[str]=mapped_column(String)
    filename: Mapped[str]=mapped_column(String)
    content_type: Mapped[str]=mapped_column(String)
    sha256: Mapped[str]=mapped_column(String)
    size: Mapped[int]=mapped_column(Integer)
    stored_path: Mapped[str]=mapped_column(String)

class Assignment(Base):
    __tablename__='assignments'
    id: Mapped[str]=mapped_column(String, primary_key=True)
    report_id: Mapped[str]=mapped_column(String)
    resource_id: Mapped[str]=mapped_column(String)
    state: Mapped[str]=mapped_column(String, default='Approved')
    rationale: Mapped[str]=mapped_column(Text)

Base.metadata.create_all(engine)
app=FastAPI(title='RESQ AI Prototype API', version='1.0.0', description='Simulated disaster coordination prototype; not connected to emergency services.')
origins=os.getenv('CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=['*'], allow_headers=['*'])

class ReportIn(BaseModel):
    id: str=Field(default_factory=lambda:str(uuid.uuid4()))
    category: str='Other'; description: str=Field(min_length=1, max_length=5000)
    location: Optional[str]=None; lat: Optional[float]=None; lon: Optional[float]=None
    people: Optional[int]=Field(default=None, ge=0, le=100000)
    trapped: bool=False; injuries: bool=False; danger: bool=False
    created_at: Optional[datetime]=None
class PatchIn(BaseModel):
    status: Optional[str]=None; category: Optional[str]=None; location: Optional[str]=None
    people: Optional[int]=Field(default=None, ge=0); trapped: Optional[bool]=None; injuries: Optional[bool]=None; danger: Optional[bool]=None
    description: Optional[str]=None; internal_note: Optional[str]=None
class ResourceIn(BaseModel):
    id: Optional[str]=None; type: str; name: str; capability: str; status: str='Available'; location: str='Unknown'; lat: Optional[float]=None; lon: Optional[float]=None; capacity: Optional[int]=None
def audit(db,event,related,description,data=None,actor='system'):
    db.add(Audit(id=str(uuid.uuid4()),event=event,related_id=related,description=description,data=json.dumps(data or {}),actor=actor,at=now()))
def dto(r):
    return {'id':r.id,'category':r.category,'description':r.description,'location':r.location,'lat':r.lat,'lon':r.lon,'people':r.people,'trapped':r.trapped,'injuries':r.injuries,'danger':r.danger,'created_at':r.created_at,'received_at':r.received_at,'status':r.status,'verification':r.verification,'extracted':json.loads(r.extracted or '{}'),'priority_score':r.priority_score,'priority':r.priority,'duplicate_of':r.duplicate_of,'human_corrections':json.loads(r.human_corrections or '{}')}
def similarity(a,b):
    return token_similarity(a,b)
def score_report(r):
    return calculate_priority_score({'category':r.category,'danger':r.danger,'trapped':r.trapped,'injuries':r.injuries,'people':r.people,'location':r.location,'lat':r.lat})
def extract(r):
    return extract_report({'category':r.category,'description':r.description,'location':r.location,'lat':r.lat,'lon':r.lon,'people':r.people,'trapped':r.trapped,'injuries':r.injuries,'danger':r.danger})
def list_reports(db): return [dto(x) for x in db.scalars(select(Report).order_by(Report.created_at.desc())).all()]

@app.get('/api/health')
def health(): return {'status':'ok','mode':'simulated prototype','emergency_services_connected':False}
@app.post('/api/reports')
def create_report(data:ReportIn):
    with Session.begin() as db:
        old=db.get(Report,data.id)
        if old: return dto(old)
        r=Report(**data.model_dump(exclude={'created_at'}),created_at=data.created_at or now(),received_at=now()); db.add(r)
        r.extracted=json.dumps(extract(r)); p=score_report(r); r.priority_score=p['score']; r.priority=p['priority']
        audit(db,'report_created',r.id,'Report received from citizen',actor='citizen')
        return dto(r)
@app.get('/api/reports')
def get_reports(search:str='',priority:str='',verification:str='',category:str='',offset:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=500)):
    with Session() as db:
        rows=list_reports(db)
        if search: rows=[r for r in rows if search.lower() in (r['description']+' '+str(r['location'] or '')+' '+r['id']).lower()]
        if priority: rows=[r for r in rows if r['priority'].lower()==priority.lower()]
        if verification: rows=[r for r in rows if r['verification']==verification]
        if category: rows=[r for r in rows if r['category']==category]
        return {'items':rows[offset:offset+limit],'total':len(rows),'offset':offset,'limit':limit}
@app.get('/api/reports/{report_id}')
def get_report(report_id:str):
    with Session() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        return dto(r)
@app.patch('/api/reports/{report_id}')
def patch_report(report_id:str,data:PatchIn):
    with Session.begin() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        before={k:getattr(r,k) for k in data.model_fields_set if k not in ('internal_note',)}
        for k,v in data.model_dump(exclude_unset=True).items():
            if k=='internal_note': audit(db,'internal_note',r.id,v,actor='coordinator')
            else: setattr(r,k,v)
        r.human_corrections=json.dumps({**json.loads(r.human_corrections or '{}'),**{k:getattr(r,k) for k in data.model_fields_set if k!='internal_note'}})
        p=score_report(r); r.priority_score=p['score'];r.priority=p['priority']
        audit(db,'human_correction',r.id,'Coordinator updated structured incident fields',{'before':before,'after':data.model_dump(exclude_unset=True)},'coordinator')
        return dto(r)
@app.post('/api/reports/{report_id}/extract')
def do_extract(report_id:str):
    with Session.begin() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        r.extracted=json.dumps(extract(r)); audit(db,'extraction_completed',r.id,'Rule-based report extraction completed'); return json.loads(r.extracted)
@app.post('/api/reports/{report_id}/calculate-priority')
def calculate_priority(report_id:str):
    with Session.begin() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        p=score_report(r);r.priority_score=p['score'];r.priority=p['priority'];audit(db,'priority_recalculated',r.id,p['explanation']);return p
@app.post('/api/reports/{report_id}/find-duplicates')
def find_duplicates(report_id:str):
    with Session.begin() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        result=[]
        for other in db.scalars(select(Report).where(Report.id!=r.id)).all():
            text=similarity(r.description,other.description); samecat=r.category==other.category
            near=False
            if r.lat is not None and other.lat is not None: near=math.hypot(r.lat-other.lat,(r.lon or 0)-(other.lon or 0))*111<5
            timeclose=abs((r.created_at-other.created_at).total_seconds())<6*3600
            s=min(1, text*.7+(0.15 if samecat else 0)+(0.1 if near else 0)+(0.05 if timeclose else 0))
            if s>=float(os.getenv('DUPLICATE_THRESHOLD','0.52')):
                reasons=[]
                if text>.25: reasons.append('Similar report wording')
                if samecat: reasons.append('Same incident category')
                if near: reasons.append('Coordinates within 5 km')
                if timeclose: reasons.append('Reported within 6 hours')
                result.append({'candidate_id':other.id,'similarity':round(s,3),'reasons':reasons,'review_status':'Needs human review'})
                audit(db,'duplicate_candidate',r.id,'Potential duplicate candidate identified',{'candidate':other.id,'similarity':round(s,3)})
        return {'report_id':r.id,'candidates':sorted(result,key=lambda x:x['similarity'],reverse=True)}
@app.post('/api/reports/{report_id}/verify')
def verify(report_id:str,body:dict):
    with Session.begin() as db:
        r=db.get(Report,report_id)
        if not r: raise HTTPException(404,'Report not found')
        value=body.get('status','Verified')
        if value not in ['Verified','Needs review','Awaiting verification','Rejected']: raise HTTPException(422,'Invalid verification status')
        old=r.verification;r.verification=value;audit(db,'verification_changed',r.id,'Verification status changed',{'before':old,'after':value},'coordinator');return dto(r)
@app.post('/api/reports/{report_id}/mark-duplicate')
def mark_duplicate(report_id:str,body:dict):
    with Session.begin() as db:
        r=db.get(Report,report_id); target=db.get(Report,body.get('candidate_id'))
        if not r or not target: raise HTTPException(404,'Report or duplicate candidate not found')
        r.duplicate_of=target.id;audit(db,'duplicate_decision',r.id,'Coordinator confirmed potential duplicate',{'duplicate_of':target.id},'coordinator');return dto(r)
@app.get('/api/resources')
def get_resources():
    with Session() as db:return [{'id':x.id,'type':x.type,'name':x.name,'capability':x.capability,'status':x.status,'location':x.location,'lat':x.lat,'lon':x.lon,'capacity':x.capacity,'assignment':x.assignment} for x in db.scalars(select(Resource)).all()]
@app.post('/api/resources')
def create_resource(data:ResourceIn):
    with Session.begin() as db:
        r=Resource(id=data.id or 'RES-'+uuid.uuid4().hex[:6].upper(),**data.model_dump(exclude={'id'}));db.add(r);audit(db,'resource_created',r.id,f'{r.name} added');return {'id':r.id,'type':r.type,'name':r.name,'capability':r.capability,'status':r.status,'location':r.location,'lat':r.lat,'lon':r.lon,'capacity':r.capacity,'assignment':r.assignment}
@app.patch('/api/resources/{resource_id}')
def update_resource(resource_id:str,body:dict):
    with Session.begin() as db:
        r=db.get(Resource,resource_id)
        if not r: raise HTTPException(404,'Resource not found')
        before=r.status
        for k,v in body.items():
            if k in {'status','location','lat','lon','capacity','capability','assignment'}: setattr(r,k,v)
        if r.status=='Available' and before=='Assigned':
            r.assignment=None
            for a in db.scalars(select(Assignment).where(Assignment.resource_id==r.id,Assignment.state=='Approved')).all():
                a.state='Released'; report=db.get(Report,a.report_id)
                if report and report.status=='Assigned': report.status='Open'
        audit(db,'resource_status_changed',r.id,'Resource updated',{'before_status':before,'after_status':r.status},'coordinator');return {'id':r.id,'type':r.type,'name':r.name,'capability':r.capability,'status':r.status,'location':r.location,'lat':r.lat,'lon':r.lon,'capacity':r.capacity,'assignment':r.assignment}
def recommendations(db):
    reports=db.scalars(select(Report).where(Report.status!='Resolved')).all()
    resources=db.scalars(select(Resource).where(Resource.status=='Available')).all()
    by_id={resource.id:resource for resource in resources}
    plans=allocate_resources([{'id':r.id,'category':r.category,'priority_score':r.priority_score,'status':r.status,'people':r.people} for r in reports],[{'id':x.id,'type':x.type,'capability':x.capability,'status':x.status,'capacity':x.capacity} for x in resources])
    by_report={r.id:r for r in reports};out=[]
    for plan in plans:
        report=by_report[plan['report_id']];resource=by_id.get(plan['resource_id'])
        rec=[] if resource is None else [{'resource_id':resource.id,'resource_name':resource.name,'type':resource.type,'rationale':f"{plan['why']}. Travel time unknown (no routing service).",'estimated_travel_time':None}]
        out.append({'report_id':report.id,'priority':report.priority,'recommendations':rec,'warning':None if rec else 'No suitable available resource'})
    return out
@app.post('/api/allocations/recommend')
def recommend():
    with Session.begin() as db:
        out=recommendations(db);audit(db,'recommendations_generated',None,'Resource recommendations generated',{'count':len(out)});return {'items':out,'method':'transparent priority-ordered greedy assignment; recommendations require coordinator approval'}
@app.post('/api/allocations/approve')
def approve(body:dict):
    with Session.begin() as db:
        rid=body.get('report_id'); resource_id=body.get('resource_id'); r=db.get(Report,rid); x=db.get(Resource,resource_id)
        if not r or not x: raise HTTPException(404,'Incident or resource not found')
        if x.status!='Available': raise HTTPException(409,'Resource is no longer available')
        x.status='Assigned';x.assignment=r.id;r.status='Assigned'; a=Assignment(id=str(uuid.uuid4()),report_id=r.id,resource_id=x.id,rationale=body.get('rationale','Coordinator approved recommendation'));db.add(a);audit(db,'assignment_approved',r.id,f'{x.name} assigned to incident',{'resource_id':x.id},'coordinator');return {'assignment_id':a.id,'report_id':r.id,'resource_id':x.id,'state':a.state}
@app.post('/api/allocations/reject')
def reject(body:dict):
    with Session.begin() as db:audit(db,'assignment_rejected',body.get('report_id'),'Coordinator rejected resource recommendation',body,'coordinator');return {'ok':True}
@app.post('/api/evidence/upload')
async def upload_evidence(report_id:str, file:UploadFile=File(...)):
    content=await file.read(10*1024*1024+1)
    if len(content)>10*1024*1024: raise HTTPException(413,'File exceeds 10 MB limit')
    ext=Path(file.filename or '').suffix.lower(); allowed={'.jpg','.jpeg','.png','.webp','.mp3','.wav','.m4a','.ogg'}
    if ext not in allowed: raise HTTPException(415,'Allowed formats: JPG, PNG, WEBP, MP3, WAV, M4A, OGG')
    signatures={'.jpg':content.startswith(b'\xff\xd8\xff'),'.jpeg':content.startswith(b'\xff\xd8\xff'),'.png':content.startswith(b'\x89PNG\r\n\x1a\n'),'.webp':content.startswith(b'RIFF') and content[8:12]==b'WEBP','.mp3':content.startswith(b'ID3') or (len(content)>1 and content[0]==0xff and content[1]&0xe0==0xe0),'.wav':content.startswith(b'RIFF') and content[8:12]==b'WAVE','.m4a':b'ftyp' in content[:16],'.ogg':content.startswith(b'OggS')}
    if not signatures.get(ext,False): raise HTTPException(415,'File extension does not match a supported file signature')
    with Session.begin() as db:
        if not db.get(Report,report_id): raise HTTPException(404,'Report not found')
        eid=str(uuid.uuid4()); folder=ROOT/'uploads';folder.mkdir(exist_ok=True); path=folder/eid
        path.write_bytes(content); h=sha256_bytes(content);e=Evidence(id=eid,report_id=report_id,filename=Path(file.filename).name,content_type=file.content_type or 'application/octet-stream',sha256=h,size=len(content),stored_path=str(path));db.add(e);audit(db,'evidence_hash_recorded',report_id,'Evidence uploaded and SHA-256 recorded',{'evidence_id':eid,'sha256':h});return {'id':eid,'filename':e.filename,'size':e.size,'sha256':h,'status':'Hash recorded','note':'Hash match does not establish authenticity or truth.'}
@app.post('/api/evidence/{evidence_id}/verify')
def verify_evidence(evidence_id:str):
    with Session() as db:
        e=db.get(Evidence,evidence_id)
        if not e: raise HTTPException(404,'Evidence not found')
        if not Path(e.stored_path).exists(): return {'status':'Verification unavailable'}
        match=matches_recorded_hash(Path(e.stored_path).read_bytes(),e.sha256)
        return {'status':'Hash matches' if match else 'Hash mismatch','sha256':e.sha256,'note':'A matching hash only compares against the stored version; it does not establish authenticity or truth.'}
@app.get('/api/reports/{report_id}/evidence')
def report_evidence(report_id:str):
    with Session() as db:
        if not db.get(Report,report_id): raise HTTPException(404,'Report not found')
        return [{'id':e.id,'filename':e.filename,'content_type':e.content_type,'size':e.size,'sha256':e.sha256} for e in db.scalars(select(Evidence).where(Evidence.report_id==report_id)).all()]
@app.get('/api/audit')
def get_audit(event:str='',limit:int=Query(200,ge=1,le=1000)):
    with Session() as db:
        q=select(Audit).order_by(Audit.at.desc()).limit(limit)
        rows=db.scalars(q).all()
        if event: rows=[x for x in rows if x.event==event]
        return [{'id':x.id,'at':x.at,'event':x.event,'related_id':x.related_id,'description':x.description,'actor':x.actor,'data':json.loads(x.data or '{}')} for x in rows]
@app.post('/api/demo/load')
def load_demo():
    with Session.begin() as db:
        if db.scalar(select(Report).limit(1)): return {'message':'Existing dataset present; reset first to load original demo','reports':len(list_reports(db))}
        samples=[
            ('Flooding','Water rising rapidly near Riverside Market; several families need help.','Riverside Market',22.5726,88.3639,8,False,False,True),
            ('Flooding','Flood water rising at Riverside Market, families are asking for rescue.','Riverside Market',22.5730,88.3642,6,False,False,True),
            ('Building collapse','A wall collapsed after heavy rain. Two people are trapped inside.','Old Town, Ward 4',22.5750,88.3700,2,True,True,True),
            ('Medical emergency','Elderly resident needs urgent medical attention.','Community Hall',22.5680,88.3590,1,False,True,True),
            ('Road blockage','Large tree blocking the road after the storm.',None,None,None,None,False,False,False)]
        for cat,desc,loc,lat,lon,n,tr,inj,danger in samples:
            r=Report(id='INC-'+uuid.uuid4().hex[:8].upper(),category=cat,description=desc,location=loc,lat=lat,lon=lon,people=n,trapped=tr,injuries=inj,danger=danger);r.extracted=json.dumps(extract(r));p=score_report(r);r.priority_score=p['score'];r.priority=p['priority'];db.add(r);audit(db,'report_created',r.id,'Simulated demo incident created',actor='simulation')
        resources=[('boat','Rescue Boat 01','water rescue','Riverside Depot',22.570,88.362,8),('boat','Rescue Boat 02','water rescue','North Bank',22.580,88.370,6),('team','Rescue Team Alpha','search and rescue','Central Station',22.574,88.366,6),('team','Rescue Team Bravo','urban rescue','West Station',22.565,88.350,5),('medical','Medical Team 01','medical triage','Community Hall',22.568,88.359,4),('ambulance','Ambulance 01','medical transport','Central Station',22.574,88.366,3),('shelter','Temporary Shelter A','evacuation shelter','Community Hall',22.568,88.359,120)]
        for typ,name,cap,loc,lat,lon,capacity in resources:db.add(Resource(id='RES-'+uuid.uuid4().hex[:6].upper(),type=typ,name=name,capability=cap,location=loc,lat=lat,lon=lon,capacity=capacity))
        audit(db,'demo_loaded',None,'Simulated flood scenario loaded',{'incidents':5,'resources':7},'simulation')
        return {'message':'Simulated flood scenario loaded','reports':5,'resources':7,'blocked_route':'Simulated blockage: Old Town bridge'}
@app.post('/api/demo/reset')
def reset_demo():
    with Session.begin() as db:
        db.query(Assignment).delete();db.query(Evidence).delete();db.query(Report).delete();db.query(Resource).delete();audit(db,'demo_reset',None,'Original simulated dataset restored','{}','simulation')
    loaded=load_demo()
    return {'message':'Original simulated flood scenario restored','reports':loaded['reports'],'resources':loaded['resources']}
@app.post('/api/demo/simulate-route-change')
def simulate_route_change(body:dict):
    with Session.begin() as db:
        rid=body.get('resource_id')
        if rid:
            r=db.get(Resource,rid)
            if not r: raise HTTPException(404,'Resource not found')
            r.status='Unavailable'
            if r.assignment:
                ass=db.scalars(select(Assignment).where(Assignment.resource_id==rid,Assignment.state=='Approved')).first()
                if ass:ass.state='Reassessment required'; report=db.get(Report,ass.report_id);report.status='Open'
            audit(db,'resource_status_changed',rid,'Simulated resource became unavailable',{'status':'Unavailable'},'simulation')
        else:audit(db,'route_changed',None,'Simulated route blockage changed; estimates remain unknown',{'route':'Old Town bridge'},'simulation')
        return {'message':'Simulated change recorded; regenerate recommendations','reassess':True}
@app.on_event('startup')
def startup(): Base.metadata.create_all(engine)
