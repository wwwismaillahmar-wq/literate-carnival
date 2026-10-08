export type ContentEntity='post'|'contribution';
export interface FeaturedContent { id:string; contentType:ContentEntity; contentId:string; featuredAt:string; featuredBy:string|null; featuredOrder:number; }
