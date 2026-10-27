// Compatibility for already-open old tabs; new page visits use the static redirect.
export async function forwardLegacyApi(request,upstream=fetch){
  const source=new URL(request.url),target=new URL(source.pathname+source.search,'https://sugung-roomb.vercel.app');
  if(!source.pathname.startsWith('/api/'))return Response.redirect(target,302);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==source.origin)return new Response('Forbidden',{status:403});
  const headers=new Headers(request.headers);headers.delete('host');headers.set('Origin',target.origin);
  return upstream(new Request(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half',redirect:'manual'}));
}
export default {fetch:request=>forwardLegacyApi(request)};
