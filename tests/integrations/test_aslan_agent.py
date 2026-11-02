import importlib.util,os,pathlib,unittest
from unittest.mock import patch
path=pathlib.Path(__file__).resolve().parents[2]/'scripts/integrations/aslan_agent.py'
spec=importlib.util.spec_from_file_location('aslan_agent',path)
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
ROOT='a'*32;OTHER='b'*32
class Tests(unittest.TestCase):
 def setUp(self):
  self.env=patch.dict(os.environ,{'ASLAN_NOTION_ROOT_PAGE_ID':ROOT,'ASLAN_NOTION_WRITE_ENABLED':'true'});self.env.start();a.PENDING.clear()
 def tearDown(self):self.env.stop()
 def test_invalid_id(self):
  with self.assertRaises(ValueError):a.uid('bad')
 def test_no_delete(self):
  with self.assertRaises(ValueError):a.operate('delete',{})
 def test_outside(self):
  with patch.object(a,'notion',return_value={'parent':{'type':'workspace'}}):
   with self.assertRaises(PermissionError):a.prepare('append',{'page_id':OTHER,'content':'test'})
 def test_write_disabled(self):
  os.environ['ASLAN_NOTION_WRITE_ENABLED']='false'
  with self.assertRaises(PermissionError):a.prepare('append',{'page_id':ROOT,'content':'test'})
 def test_approval_one_time(self):
  with patch.object(a,'notion',return_value={'id':OTHER}) as n:
   p=a.prepare('create',{'page_id':ROOT,'title':'Test','content':'hello'})
   n.assert_not_called()
   self.assertEqual(a.confirm(p['approval_token'])['id'],OTHER)
   with self.assertRaises(PermissionError):a.confirm(p['approval_token'])
 def test_reject_oversize(self):
  with self.assertRaises(ValueError):a.validate('append',{'page_id':ROOT,'content':'x'*12001})
 def test_pagination(self):
  with patch.object(a,'notion',side_effect=[{'results':[1],'has_more':True,'next_cursor':'next'},{'results':[2],'has_more':False}]) as n:
   self.assertEqual(a.children(ROOT),[1,2])
   self.assertIn('start_cursor=next',n.call_args_list[1].args[0])
 def test_nested_scope(self):
  with patch.object(a,'notion',return_value={'parent':{'type':'page_id','page_id':ROOT}}):
   self.assertTrue(a.allowed(OTHER))
 def test_chunk(self):self.assertEqual(len(a.blocks('x'*4001)),3)
 def test_expired(self):
  p=a.prepare('append',{'page_id':ROOT,'content':'hello'})
  with patch.object(a.time,'monotonic',return_value=float('inf')):
   with self.assertRaises(PermissionError):a.confirm(p['approval_token'])
if __name__=='__main__':unittest.main()
