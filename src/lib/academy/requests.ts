export const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function sameOrigin(request: Request): boolean {
 const origin=request.headers.get('origin'); if(!origin)return true;
 try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}
export const academyAssetTypes=new Set(['video/mp4','video/webm','application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain']);
export const academyAssetLimit=50*1024*1024;
