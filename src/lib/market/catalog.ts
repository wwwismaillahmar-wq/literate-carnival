export type MarketStore={id:string;name:string;slug:string;description:string;region:string;logo_url:string;status:string};
export type MarketProduct={id:number;slug:string;name:string;description:string;category:string;categoryId:string;price:number|null;stock:number;images:string[];createdAt:string;storeId:string;minimumOrder:number;specifications:Record<string,string>;featured:boolean};
export const aslanStore:MarketStore={id:'aslan',name:'ASLAN Modelling Group',slug:'aslan',description:'تنجيد • خياطة • تفصيل — منتجات المؤسسة والتصنيع حسب الطلب.',region:'',logo_url:'',status:'approved'};
export function safeImage(value:unknown):string {if(typeof value!=='string'||value.length>1500)return '';try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}}
export function money(value:number|null){return value===null?'اطلب عرض سعر':new Intl.NumberFormat('ar-DZ').format(value)+' دج';}
export function normalizeMarketProduct(row:Record<string,unknown>,media:string[]=[]):MarketProduct {
 const features=row.features&&typeof row.features==='object'&&!Array.isArray(row.features)?row.features as Record<string,unknown>:{};
 const cat=Array.isArray(row.category)?row.category[0]:row.category;
 const category=cat&&typeof cat==='object'?cat as Record<string,unknown>:{};
 const price=row.price_dzd===null||row.price_dzd===undefined?null:Number(row.price_dzd);
 const specs=features.specifications&&typeof features.specifications==='object'&&!Array.isArray(features.specifications)?Object.fromEntries(Object.entries(features.specifications).filter((pair):pair is [string,string]=>typeof pair[1]==='string').slice(0,20)):{};
 const legacy=Array.isArray(row.images)?row.images.map(safeImage).filter(Boolean):[];
 const minimum=Number(features.minimum_order);
 return {id:Number(row.id),slug:String(row.slug||''),name:String(row.name||''),description:typeof row.description==='string'?row.description:'',category:typeof category.name==='string'?category.name:'غير مصنف',categoryId:String(row.category_id||''),price:price!==null&&Number.isFinite(price)&&price>=0?price:null,stock:Math.max(0,Number(row.stock)||0),images:[...new Set([...media,...legacy])],createdAt:String(row.created_at||''),storeId:typeof features.market_store_id==='string'&&features.market_store_id?features.market_store_id:'aslan',minimumOrder:Number.isInteger(minimum)&&minimum>0&&minimum<=10000?minimum:1,specifications:specs,featured:row.home_featured===true};
}
export type MarketFilters={query:string;category:string;store:string;availability:string;minimum:string;maximum:string;sort:string;ids?:number[]};
export function filterMarket(products:MarketProduct[],filters:MarketFilters) {
 const query=filters.query.trim().toLocaleLowerCase('ar').normalize('NFKC');const min=filters.minimum.trim()===''?null:Number(filters.minimum);const max=filters.maximum.trim()===''?null:Number(filters.maximum);
 return products.filter(product=>{
  const text=(product.name+' '+product.description+' '+product.category).toLocaleLowerCase('ar').normalize('NFKC');
  return (!query||text.includes(query))&&(!filters.category||product.categoryId===filters.category)&&(!filters.store||product.storeId===filters.store)&&
   (filters.availability!=='stock'||product.stock>0&&product.price!==null&&product.price>0)&&
   (filters.availability!=='quote'||product.price===null||product.stock===0)&&
   (min===null||Number.isFinite(min)&&product.price!==null&&product.price>=min)&&(max===null||Number.isFinite(max)&&product.price!==null&&product.price<=max)&&
   (!filters.ids||filters.ids.includes(product.id));
 }).sort((a,b)=>filters.sort==='price-low'?(a.price??Infinity)-(b.price??Infinity):filters.sort==='price-high'?(b.price??-Infinity)-(a.price??-Infinity):filters.sort==='featured'?Number(b.featured)-Number(a.featured):Date.parse(b.createdAt)-Date.parse(a.createdAt));
}
export function validateStore(body:Record<string,unknown>){const name=typeof body.name==='string'?body.name.trim():'';const slug=typeof body.slug==='string'?body.slug.trim().toLowerCase():'';const description=typeof body.description==='string'?body.description.trim():'';const region=typeof body.region==='string'?body.region.trim():'';const logo=typeof body.logoUrl==='string'?body.logoUrl.trim():'';if(name.length<2||name.length>160||!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)||slug==='aslan'||description.length>4000||region.length>120||(logo&&!safeImage(logo)))return null;return {name,slug,description,region,logo_url:logo};}
export function validateListing(body:Record<string,unknown>){
 const name=typeof body.name==='string'?body.name.trim():'';const description=typeof body.description==='string'?body.description.trim():'';
 const price=body.price===null||body.price===''?null:Number(body.price);const stock=Number(body.stock);const minimum=Number(body.minimumOrder||1);
 const images=Array.isArray(body.images)?body.images:[];const categoryId=body.categoryId?Number(body.categoryId):null;
 if(name.length<2||name.length>180||description.length>10000||(price!==null&&(!Number.isFinite(price)||price<0||price>1e9))||!Number.isInteger(stock)||stock<0||stock>1e6||!Number.isInteger(minimum)||minimum<1||minimum>10000||images.length>8||images.some(url=>!safeImage(url))||(categoryId!==null&&(!Number.isSafeInteger(categoryId)||categoryId<1)))return null;
 const specifications=body.specifications&&typeof body.specifications==='object'&&!Array.isArray(body.specifications)?body.specifications as Record<string,unknown>:{};
 if(Object.keys(specifications).length>20||Object.entries(specifications).some(([key,value])=>key.length>120||typeof value!=='string'||value.length>500))return null;
 return {name,description,price_dzd:price,stock,minimum_order:minimum,images,category_id:categoryId,specifications};
}
