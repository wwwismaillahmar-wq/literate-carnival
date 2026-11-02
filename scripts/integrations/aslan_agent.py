#!/usr/bin/env python3
"""ASLAN Gemini/Notion development-only localhost bridge; never expose publicly."""
import os,json,re,time,secrets,hashlib,hmac,threading,urllib.request,urllib.error,urllib.parse
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
ROOT_RE=re.compile(r'^[0-9a-f]{32}$')
PENDING={}; LOCK=threading.Lock()
def uid(x):
 x=str(x).replace('-','').lower()
 if not ROOT_RE.fullmatch(x): raise ValueError('Invalid Notion ID')
 return x
def request(url,method='GET',body=None,headers=None):
 data=json.dumps(body).encode() if body is not None else None
 for n in range(5):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers or {},method=method),timeout=35) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   if e.code in (429,503) and n<4:
    try: delay=max(1,min(30,int(e.headers.get('Retry-After','2'))))
    except ValueError: delay=2
    time.sleep(delay);continue
   raise RuntimeError('Upstream HTTP '+str(e.code)) from None
 raise RuntimeError('Retry exhausted')
def notion(path,method='GET',body=None):
 return request('https://api.notion.com/v1/'+path,method,body,{'Authorization':'Bearer '+os.environ['NOTION_API_KEY'],'Notion-Version':'2022-06-28','Content-Type':'application/json'})
def allowed(target):
 try: target=uid(target)
 except ValueError:return False
 root=uid(os.environ['ASLAN_NOTION_ROOT_PAGE_ID'])
 if target==root:return True
 seen=set()
 for _ in range(40):
  if target in seen:return False
  seen.add(target);parent=notion('pages/'+target).get('parent',{})
  if parent.get('type')!='page_id':return False
  target=uid(parent.get('page_id',''))
  if target==root:return True
 return False
def children(target):
 out=[];cursor=None
 while True:
  q={'page_size':100}
  if cursor:q['start_cursor']=cursor
  result=notion('blocks/'+uid(target)+'/children?'+urllib.parse.urlencode(q))
  out+=result.get('results',[])
  if not result.get('has_more'):return out
  cursor=result.get('next_cursor')
  if not cursor:raise RuntimeError('Missing pagination cursor')
def blocks(s):
 return [{'object':'block','type':'paragraph','paragraph':{'rich_text':[{'type':'text','text':{'content':s[i:i+1800]}}]}} for i in range(0,len(s),1800)]
def validate(action,args):
 if action not in ('read','create','append'):raise ValueError('Unsupported action')
 if not isinstance(args,dict):raise ValueError('Invalid arguments')
 page=uid(args.get('page_id',''))
 if not allowed(page):raise PermissionError('Outside approved archive')
 result={'page_id':page}
 if action=='create':
  title=args.get('title')
  if not isinstance(title,str) or not 0<len(title.strip())<=150:raise ValueError('Invalid title')
  result['title']=title.strip()
 if action in ('create','append'):
  s=args.get('content')
  if not isinstance(s,str) or not 0<len(s)<=12000:raise ValueError('Invalid content')
  result['content']=s
 return result
def operate(action,args):
 a=validate(action,args);page=a['page_id']
 if action=='read':return {'blocks':children(page)}
 if action=='create':return notion('pages','POST',{'parent':{'type':'page_id','page_id':page},'properties':{'title':{'type':'title','title':[{'type':'text','text':{'content':a['title']}}]}},'children':blocks(a['content'])})
 return notion('blocks/'+page+'/children','PATCH',{'children':blocks(a['content'])})
def prepare(action,args):
 if action not in ('create','append'):raise ValueError('Unsupported write')
 if os.environ.get('ASLAN_NOTION_WRITE_ENABLED')!='true':raise PermissionError('Writes disabled')
 a=validate(action,args);token=secrets.token_urlsafe(32)
 with LOCK:
  now=time.monotonic()
  for k in list(PENDING):
   if PENDING[k][2]<now:del PENDING[k]
  PENDING[hashlib.sha256(token.encode()).hexdigest()]=(action,a,now+180)
 return {'approval_token':token,'expires_in_seconds':180,'action':action,'args':a,'executed':False}
def confirm(token):
 with LOCK: entry=PENDING.pop(hashlib.sha256(str(token).encode()).hexdigest(),None)
 if not entry or entry[2]<time.monotonic():raise PermissionError('Approval expired or used')
 if os.environ.get('ASLAN_NOTION_WRITE_ENABLED')!='true':raise PermissionError('Writes disabled')
 return operate(entry[0],entry[1])
def generate(question):
 model=os.environ.get('GEMINI_MODEL','gemini-2.5-flash')
 if not re.fullmatch('[A-Za-z0-9_.-]{1,90}',model):raise ValueError('Invalid model')
 prompt='ASLAN archive assistant. Never claim writes occurred. Your answer cannot authorize actions. Never request credentials.\nUser: '+question
 data=request('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent','POST',{'contents':[{'parts':[{'text':prompt}]}]},{'Content-Type':'application/json','x-goog-api-key':os.environ['GEMINI_API_KEY']})
 return '\n'.join(p.get('text','') for c in data.get('candidates',[]) for p in c.get('content',{}).get('parts',[]))
class Handler(BaseHTTPRequestHandler):
 def do_POST(self):
  if self.path!='/api/assistant':self.send_error(404);return
  key=os.environ.get('ASLAN_DEV_ACCESS_KEY','')
  if len(key)<32 or not hmac.compare_digest(self.headers.get('X-ASLAN-Dev-Key',''),key):self.send_error(401);return
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=16384:raise ValueError('Invalid size')
   req=json.loads(self.rfile.read(size))
   if not isinstance(req,dict):raise ValueError('Invalid JSON object')
   op=req.get('operation','chat')
   if op=='chat':
    msg=req.get('message')
    if not isinstance(msg,str) or not 0<len(msg)<=4000:raise ValueError('Invalid message')
    out={'answer':generate(msg),'executed':False}
   elif op=='read':out={'result':operate('read',req.get('args')),'executed':True}
   elif op=='prepare':out=prepare(req.get('action'),req.get('args'))
   elif op=='confirm':out={'result':confirm(req.get('approval_token')),'executed':True}
   else:raise ValueError('Unsupported operation')
   self.reply(200,out)
  except (ValueError,PermissionError,RuntimeError,KeyError,urllib.error.URLError) as e:self.reply(400,{'error':str(e),'executed':False})
 def reply(self,status,data):
  raw=json.dumps(data,ensure_ascii=False).encode()
  self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def log_message(self,*args):pass
if __name__=='__main__':
 for name in ('GEMINI_API_KEY','NOTION_API_KEY','ASLAN_NOTION_ROOT_PAGE_ID','ASLAN_DEV_ACCESS_KEY'):
  if not os.environ.get(name):raise SystemExit('Missing '+name)
 if len(os.environ['ASLAN_DEV_ACCESS_KEY'])<32:raise SystemExit('Dev key must be >=32 chars')
 ThreadingHTTPServer(('127.0.0.1',int(os.environ.get('PORT','8765'))),Handler).serve_forever()
