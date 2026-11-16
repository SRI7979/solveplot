import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Execute the actual server actions and route handlers with only their framework
// boundaries / Supabase client mocked. No network, live accounts, or email.
async function loadHarness() {
const dir = await mkdtemp(join(tmpdir(), "solveplot-auth-tests-"));
after(() => rm(dir, { recursive: true, force: true }));
const fixtureSource = `
export const fixture = { calls: [], jar: new Map(), response: { data: {user:null,session:null}, error:null }, user: {id:'test-user'}, exchangeError:null, configured:true, origin:'https://solveplot.com' };
const invoke = name => async (...args) => { fixture.calls.push({ name, args }); if(fixture.throws)throw Error('private provider details');return fixture.response; };
export const auth = {signUp:invoke('signUp'),resend:invoke('resend'),resetPasswordForEmail:invoke('resetPasswordForEmail'),signInWithPassword:invoke('signInWithPassword'),updateUser:invoke('updateUser'),
 getUser:async()=>({data:{user:fixture.user},error:null}),
 exchangeCodeForSession:async code=>{fixture.calls.push({name:'exchange',args:[code]});return {data:{user:fixture.user,session:fixture.user?{user:fixture.user,access_token:'fixture'}:null},error:fixture.exchangeError}},
 verifyOtp:async value=>{fixture.calls.push({name:'verify',args:[value]});return {error:fixture.exchangeError}},
 signInWithOAuth:async value=>{fixture.calls.push({name:'oauth',args:[value]});return {data:{url:'https://auth.example.test/auth/v1/authorize?provider=google'},error:null}}
};
export const createClient=async()=>({auth});
export const getSupabaseConfig=()=>fixture.configured?{url:'https://auth.example.test',key:'fixture'}:null;
export const getSiteOrigin=()=>fixture.origin;
export const captureSignup=(...args)=>fixture.calls.push({name:'analytics',args});
export const cookies=async()=>({get:name=>fixture.jar.has(name)?{value:fixture.jar.get(name)}:undefined,set:(name,value,options)=>{fixture.jar.set(name,value);fixture.cookieOptions=options;}});
export const revalidatePath=()=>{};
export const redirect=url=>{throw Error('REDIRECT:'+url)};
export const NextResponse={redirect:url=>new Response(null,{status:307,headers:{location:String(url)}})};
`;
await build({
  stdin: { contents: `export {authenticate,signInWithGoogle} from './src/app/auth/actions';export {GET as callback} from './src/app/auth/callback/route';export {GET as confirm} from './src/app/auth/confirm/route';export {fixture} from 'test-auth-fixture';`, resolveDir: process.cwd(), loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: resolve(dir, "auth.mjs"),
  plugins: [{ name: "auth-boundaries", setup(b) {
    b.onResolve({ filter: /^(test-auth-fixture|next\/(headers|cache|navigation|server)|@\/lib\/(supabase\/(config|server)|posthog-server))$/ }, () => ({path:"fixture",namespace:"mock"}));
    b.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:fixtureSource,loader:"js"}));
  }}],
});
return import(pathToFileURL(resolve(dir,"auth.mjs")).href);
}
let api: Awaited<ReturnType<typeof loadHarness>>;
before(async () => { api = await loadHarness(); });
const authenticate = (...args: unknown[]) => api.authenticate(...args);
const signInWithGoogle = (...args: unknown[]) => api.signInWithGoogle(...args);
const callback = (...args: unknown[]) => api.callback(...args);
const confirm = (...args: unknown[]) => api.confirm(...args);
let fixture: Awaited<ReturnType<typeof loadHarness>>["fixture"];
function reset() {
  fixture = api.fixture;
  fixture.calls=[]; fixture.jar.clear(); fixture.response={data:{user:null,session:null},error:null}; fixture.user={id:"test-user"}; fixture.exchangeError=null;fixture.throws=false;fixture.configured=true;fixture.origin="https://solveplot.com";
}
function form(mode="signup", extras: Record<string,string>={}) {
  const f=new FormData();
  for(const [key,value] of Object.entries({mode,email:"learner@example.test",password:"Example-only-123!",next:"/history",presentation:"modal",...extras}))f.set(key,value);
  return f;
}
const request = (query: string) => ({nextUrl:new URL(`https://solveplot.com/auth/callback?${query}`)});

test("new, unconfirmed, and obfuscated existing signups have the same neutral response, never a session",async()=>{
  const states=[];
  for(const identities of [[{id:"new"}],[{id:"unconfirmed"}],[]]){
    reset();fixture.response.data.user={id:"fixture-user",identities};
    const state=await authenticate({},form());
    assert.equal(state.authenticated,undefined);assert.equal(state.resendAvailable,true);
    assert.match(state.message,/does not confirm email delivery/);assert.equal(state.verificationEmail,"learner@example.test");
    assert.ok(state.retryAt>Date.now());assert.ok(!JSON.stringify(state).includes("Example-only"));
    const call=fixture.calls.find((c:{name:string})=>c.name==="signUp");
    assert.equal(call.args[0].options.emailRedirectTo,"https://solveplot.com/auth/callback?next=%2Fhistory");
    states.push(state.message);
  }
  assert.equal(new Set(states).size,1);
});

test("explicit account-existence errors get the same neutral state",async()=>{
  reset();const normal=await authenticate({},form());
  for(const code of ["user_already_exists","email_exists","email_address_not_found","user_not_found"]){
    reset();fixture.response.error={code,status:400,message:"private details"};
    const state=await authenticate({},form("resend"));
    assert.equal(state.message,normal.message);assert.equal(state.error,undefined);assert.equal(state.authenticated,undefined);
  }
});

test("resend is passwordless, retains the safe destination and does not sign in",async()=>{
  reset();const f=form("resend",{next:"https://evil.test"});f.delete("password");
  const state=await authenticate({},f);
  assert.equal(state.resendAvailable,true);assert.equal(state.authenticated,undefined);
  assert.deepEqual(fixture.calls,[{name:"resend",args:[{type:"signup",email:"learner@example.test",options:{emailRedirectTo:"https://solveplot.com/auth/callback?next=%2Fsolve"}}]}]);
});

test("signup and resend share a server cooldown; client state cannot skip it",async()=>{
  reset();const first=await authenticate({},form());
  const second=await authenticate({retryAt:0},form("resend"));
  assert.match(second.error,/wait a minute/);assert.equal(second.retryAt,first.retryAt);
  assert.equal(fixture.calls.filter((c:{name:string})=>c.name==="resend").length,0);
  assert.equal(fixture.cookieOptions.httpOnly,true);assert.equal(fixture.cookieOptions.secure,true);
  fixture.jar.set("solveplot-verification-retry",String(Date.now()-1));
  assert.ok((await authenticate({},form("resend"))).message);
});

test("provider throttling, SMTP errors, exceptions and weak passwords are safe and useful",async()=>{
  for(const mode of ["signup","resend"]){
    for(const error of [{status:429},{status:422,code:"over_email_send_rate_limit"},{status:500,message:"smtp credential private"}]){
      reset();fixture.response.error=error;
      const state=await authenticate({},form(mode));
      assert.ok(state.error);assert.equal(state.message,undefined);assert.equal(state.authenticated,undefined);assert.ok(state.retryAt>Date.now());
      assert.ok(!JSON.stringify(state).includes("credential"));assert.ok(!JSON.stringify(state).includes("private"));
      if(error.status===429 || error.status===422)assert.match(state.error,/Too many email requests/);
    }
  }
  reset();fixture.throws=true;const state=await authenticate({},form("resend"));assert.ok(state.error);assert.equal(state.resendAvailable,true);assert.ok(state.retryAt>Date.now());
  reset();fixture.response.error={code:"weak_password"};assert.match((await authenticate({},form())).error,/stronger password/);
});

test("invalid input never requests mail and unconfirmed sign-in stays unauthenticated",async()=>{
  for(const f of [form("signup",{email:"bad"}),form("signup",{password:"short"}),form("resend",{email:"bad"}),form("invalid")]){
    reset();assert.ok((await authenticate({},f)).error);assert.equal(fixture.calls.length,0);
  }
  reset();fixture.response.error={code:"email_not_confirmed",status:400};
  assert.equal((await authenticate({},form("signin"))).authenticated,undefined);
  reset();fixture.configured=false;assert.ok((await authenticate({},form())).error);assert.equal(fixture.calls.length,0);
});

test("password recovery preserves its existing flow",async()=>{
  reset();assert.ok((await authenticate({},form("forgot"))).message);
  assert.deepEqual(fixture.calls[0],{name:"resetPasswordForEmail",args:["learner@example.test",{redirectTo:"https://solveplot.com/auth/callback?recovery=1"}]});
  reset();assert.equal((await authenticate({},form("reset",{confirmPassword:"Example-only-123!"}))).authenticated,true);
  assert.equal(fixture.calls[0].name,"updateUser");
  reset();fixture.user=null;assert.match((await authenticate({},form("reset",{confirmPassword:"Example-only-123!"}))).error,/expired/);assert.equal(fixture.calls.length,0);
});

test("Google OAuth preserves its existing flow",async()=>{
  reset();await assert.rejects(signInWithGoogle({},form()),/REDIRECT:https:\/\/auth.example.test\/auth\/v1\/authorize/);
  assert.equal(fixture.calls[0].args[0].options.redirectTo,"https://solveplot.com/auth/callback?provider=google&next=%2Fhistory");
});

test("verification callback routes exchange credentials, sanitize next and handle expired links",async()=>{
  for(const [query,destination] of [["code=fixture&next=%2Fhistory","/history"],["code=fixture&next=https://evil.test","/solve"],["code=fixture&recovery=1","/auth/reset-password"],["code=fixture&provider=google&next=%2Fhistory","/history"]]){
    reset();const response=await callback(request(query));
    assert.equal(response.headers.get("location"),"https://solveplot.com"+destination);assert.equal(response.headers.get("cache-control"),"private, no-store");assert.equal(response.headers.get("referrer-policy"),"no-referrer");assert.equal(fixture.calls[0].name,"exchange");
  }
  for(const query of ["","error=access_denied&code=fixture","code=expired"]){
    reset();fixture.exchangeError={message:"expired token private"};const response=await callback(request(query));assert.equal(response.headers.get("location"),"https://solveplot.com/login?notice=link-expired");
  }
  for(const type of ["signup","email","recovery"]){
    reset();const response=await confirm(request(`token_hash=fixture&type=${type}&next=%2Fhistory`));assert.equal(response.headers.get("location"),"https://solveplot.com"+(type==="recovery"?"/auth/reset-password":"/history"));assert.equal(fixture.calls[0].name,"verify");
  }
  reset();fixture.exchangeError={message:"expired"};assert.match((await confirm(request("token_hash=fixture&type=signup"))).headers.get("location"),/link-expired/);
  reset();await confirm(request("token_hash=fixture&type=invite"));assert.equal(fixture.calls.length,0);
});

test("the installed Supabase SDK resend establishes PKCE for the existing code callback",async()=>{
  const { createServerClient } = await import("@supabase/ssr");
  const jar = new Map<string,string>();
  const requests: { path:string; body:Record<string,unknown>; redirect:string|null }[]=[];
  const client = createServerClient("https://auth.example.test","sb_publishable_fixture",{
    global:{fetch:async(input,init)=>{
      const url=new URL(typeof input === "string" || input instanceof URL ? input : input.url);
      assert.equal(url.origin,"https://auth.example.test");assert.equal(url.pathname,"/auth/v1/resend");
      requests.push({path:url.pathname,body:JSON.parse(String(init?.body)),redirect:url.searchParams.get("redirect_to")});
      return Response.json({});
    }},
    cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>{for(const {name,value} of items)jar.set(name,value)}},
  });
  const {error}=await client.auth.resend({type:"signup",email:"learner@example.test",options:{emailRedirectTo:"https://solveplot.com/auth/callback?next=%2Fhistory"}});
  assert.equal(error,null);assert.equal(requests.length,1);
  assert.equal(requests[0].body.type,"signup");assert.ok(requests[0].body.code_challenge);assert.equal(requests[0].body.code_challenge_method,"s256");
  assert.ok([...jar.keys()].some(key=>key.includes("code-verifier")));
  const redirect=new URL(requests[0].redirect!);assert.equal(redirect.pathname,"/auth/callback");assert.equal(redirect.searchParams.get("next"),"/history");
});
