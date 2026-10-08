import { createClient } from '@/lib/supabase/server';
import { validateMediaUpload } from './media-policy';

export async function uploadPlatformMedia(input:{ownerId:string;entityType:string;entityId:string;file:File}) {
  validateMediaUpload(input.file);
  const ext=input.file.name.split('.').pop()?.toLowerCase()||'bin';
  const path=`${input.ownerId}/${input.entityType}/${input.entityId}/${crypto.randomUUID()}.${ext}`;
  const db=await createClient();
  const bytes=Buffer.from(await input.file.arrayBuffer());
  const {error}=await db.storage.from('aslan-media').upload(path,bytes,{contentType:input.file.type,upsert:false});
  if(error) throw error;
  return {bucketId:'aslan-media',objectPath:path};
}

export async function deletePlatformMedia(bucketId:string,objectPath:string) {
  const db=await createClient();
  const {error}=await db.storage.from(bucketId).remove([objectPath]);
  if(error) throw error;
}
