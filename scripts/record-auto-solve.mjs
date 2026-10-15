// Records the actual solver through its real upload/solve handlers.
// Only the API response is a validated fixture; native Desmos runs normally.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.DEMO_ORIGIN || "http://localhost:3000";
const fixture = JSON.parse(await readFile("/tmp/desmo-auto-solve-fixture.json", "utf8"));
const png = await sharp("public/demo/quadratic-question.svg").png().toBuffer();
await writeFile("public/demo/quadratic-question.png", png);
const evidence = [];
const out = "docs/auto-solve-video-review";
await mkdir(out, { recursive: true });
const staging = "/tmp/desmo-auto-solve-capture";
await mkdir(staging, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", headless: true });
try {
  for (const [variant, width, height] of [["desktop", 1200, 750], ["phone", 420, 780]]) {
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.addInitScript(() => {localStorage.setItem("desmo-sidebar-collapsed","true");localStorage.setItem("desmo-theme","light");});
    let pending = null;
    let requests = 0;
    const errors = [];
    let currentFrame = -1;
    page.on("framenavigated", frame => { if(frame===page.mainFrame())console.log(variant, "navigation", currentFrame, frame.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/calculator.js?*", async route => {
      const response = await route.fetch();
      await route.fulfill({response,body:(await response.text())+';{const original=Desmos.GraphingCalculator;Desmos.GraphingCalculator=(...args)=>{const c=original(...args);if(!args[0].hasAttribute("data-desmo-preflight"))window.demoCalculator=c;return c;}}'});
    });
    await page.route("**/api/solve**", route => {
      if(new URL(route.request().url()).pathname.endsWith("preflight"))return route.fulfill({json:{status:"ready",payload:fixture.payload}});
      requests++;
      pending = route;
      // Deliberately keep the real spinner visible until the recording releases it.
    });
    await page.route("**/api/tutor**", route => route.abort());
    await page.goto(origin+"/demo-recording");
    await page.waitForFunction(()=>window.demoCalculator);
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'nextjs-portal{display:none!important}html{scroll-behavior:auto!important}'});
    const zone = page.locator('#question-panel [class*="uploadZone"]');
    const z = await zone.boundingBox();
    const drop = {x:z.x+z.width*.5,y:z.y+z.height*.42};
    const source = {x:width<700?width-120:width-245,y:width<700?135:255};
    await page.evaluate(({image,source})=>{
      const card=document.createElement('div');card.id='demo-drag-card';card.innerHTML='<img alt="Practice question" src="'+image+'" />';
      card.style.cssText='position:fixed;z-index:999;pointer-events:none;width:240px;padding:10px;background:#fff;border:1px solid #cadde1;border-radius:14px;box-shadow:0 6px 20px #17323d18;transform:translate(-50%,-50%);left:'+source.x+'px;top:'+source.y+'px';card.firstChild.style.cssText='display:block;width:100%;height:auto';document.body.append(card);
      const cursor=document.createElement('div');cursor.id='demo-cursor';cursor.style.cssText='position:fixed;left:0;top:0;z-index:1000;pointer-events:none;width:28px;height:33px';cursor.innerHTML='<svg width="27" height="33" viewBox="0 0 27 33"><path d="M2 1v25l6-6 5 11 5-2-5-10h10z" fill="#1c3b43" stroke="white" stroke-width="1.8" stroke-linejoin="round"/></svg>';document.body.append(cursor);
    },{image:'data:image/png;base64,'+png.toString('base64'),source});
    const fps=24, duration=11;
    const encoder=spawn(process.env.FFMPEG,["-y","-f","image2pipe","-c:v","mjpeg","-r",String(fps),"-i","pipe:0","-c:v","libvpx","-b:v","1000k","-crf","12","-pix_fmt","yuv420p",`${staging}/auto-solve-${variant}.webm`],{stdio:["pipe","ignore","pipe"]});
    let log='';encoder.stderr.on('data',chunk=>{log+=chunk});const finished=once(encoder,'close');
    let solvePoint=drop, initialFrame;
    for(let index=0;index<fps*duration;index++){
      currentFrame=index;
      if(index%48===0)console.log(variant, "frame", index);
      const t=index/fps;
      if(index===35)await zone.dispatchEvent('dragover',{dataTransfer:await page.evaluateHandle(()=>new DataTransfer())});
      if(index===46){
        const transfer=await page.evaluateHandle(base64=>{const data=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([data],'question.png',{type:'image/png'}));return dt;},png.toString('base64'));
        await zone.dispatchEvent('drop',{dataTransfer:transfer});
        const button=await page.getByRole('button',{name:'Solve',exact:true}).boundingBox();solvePoint={x:button.x+button.width*.5,y:button.y+button.height*.5};
      }
      if(index===58)await page.getByRole('button',{name:'Solve',exact:true}).click();
      if(index===73){
        if(!pending)throw Error('The real Solve handler did not issue a request');
        const events=[{type:'methods',...fixture.payload},{type:'solution',methodId:fixture.payload.selectedMethodId,solution:fixture.solution},{type:'done'}];
        await pending.fulfill({contentType:'application/x-ndjson',body:events.map(event=>JSON.stringify(event)).join('\n')+'\n'});
        await page.getByTestId('explanation-line').first().waitFor();
        await page.waitForFunction(()=>window.demoCalculator.expressionAnalysis.desmo_6?.evaluation?.value===143);
      }
      if(index===126 && width<700)await page.getByRole('tab',{name:'Calculator',exact:true}).click();
      if(index>=130 && index<154)await page.evaluate(step=>{const panel=document.querySelector('#calculator-panel .dcg-exppanel');if(panel)panel.scrollTop+=step;},width<700?20:7);
      if(index===240){
        await page.locator('#demo-cursor').evaluate(el=>el.style.visibility='hidden');
        const finalFrame=await page.screenshot({type:'jpeg',quality:93,caret:'initial'});
        await page.locator('#demo-cursor').evaluate(el=>el.style.visibility='visible');
        await page.evaluate(async ({first,last})=>{for(const [id,image,z]of[['demo-loop-start',first,899],['demo-loop-overlay',last,900]]){const overlay=document.createElement('img');overlay.id=id;overlay.src=image;overlay.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:'+z+';pointer-events:none';document.body.append(overlay);await overlay.decode();}}, {first:'data:image/jpeg;base64,'+initialFrame.toString('base64'),last:'data:image/jpeg;base64,'+finalFrame.toString('base64')});
      }
      const graphPoint=await page.evaluate(()=>{const host=document.querySelector('#calculator-panel [class*="graph"]');return host?{x:host.getBoundingClientRect().right-100,y:host.getBoundingClientRect().top+220}:null;});
      const park=width<700?{x:340,y:700}:{x:1100,y:620};
      await page.evaluate(({t,source,drop,solvePoint,park,graphPoint,mobile})=>{
        const ease=p=>{p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)};
        const start={x:mobile?365:1100,y:mobile?650:620};
        const scrollPoint=mobile?{x:260,y:560}:{x:715,y:450};
        const poses=[[0,start],[.75,source],[.95,source],[1.9,drop],[2.04,drop],[2.38,solvePoint],[2.6,solvePoint],[3.3,park],[5.1,scrollPoint],[6.4,scrollPoint],[7.1,graphPoint||park],[8.4,park],[10,park],[10.958,start],[11,start]];
        let i=0;while(i<poses.length-2&&t>poses[i+1][0])i++;
        const [a,p]=poses[i],[b,q]=poses[i+1],k=ease((t-a)/(b-a));const x=p.x+(q.x-p.x)*k,y=p.y+(q.y-p.y)*k;
        document.querySelector('#demo-cursor').style.transform=`translate(${x}px,${y}px)`;
        const card=document.querySelector('#demo-drag-card');if(t>.82&&t<1.98){card.style.left=x+'px';card.style.top=y+'px';card.style.transform='translate(-50%,-50%) rotate(-1.5deg)';card.style.boxShadow='0 12px 28px #17323d20';}
        card.style.opacity=t>=10?'0':t<1.96?'1':String(1-ease((t-1.96)/.18));
        if(t>=10){card.style.left=source.x+'px';card.style.top=source.y+'px';card.style.transform='translate(-50%,-50%)';card.style.boxShadow='0 6px 20px #17323d18';const overlay=document.querySelector('#demo-loop-overlay');if(overlay)overlay.style.opacity=String(1-ease((t-10)/.958));}
      },{t,source,drop,solvePoint,park,graphPoint,mobile:width<700});
      if(index===0){await page.locator('#demo-cursor').evaluate(el=>el.style.visibility='hidden');initialFrame=await page.screenshot({type:'jpeg',quality:93,caret:'initial'});await page.locator('#demo-cursor').evaluate(el=>el.style.visibility='visible');}
      const image=await page.screenshot({type:'jpeg',quality:93,caret:'initial'});
      if(!encoder.stdin.write(image))await once(encoder.stdin,'drain');
      if([0,36,64,96,230,263].includes(index))await sharp(image).png().toFile(`${staging}/${variant}-${index}.png`);
      if(index===230){await sharp(image).webp({quality:92}).toFile(`${staging}/auto-solve-${variant}.webp`);const result=await page.evaluate(()=>({rows:window.demoCalculator.getExpressions().map(({id,latex})=>({id,latex})),answer:window.demoCalculator.expressionAnalysis.desmo_6.evaluation.value}));assert.equal(result.answer,143);assert.equal(result.rows.filter(row=>row.latex).length,6);evidence.push({variant,requests,liveModelCalls:0,result,errors});}
    }
    encoder.stdin.end();const [code]=await finished;if(code!==0)throw Error(log);
    assert.deepEqual(errors,[]);assert.equal(requests,1);
    console.log(`Recorded ${variant}: actual UI, automatic insertion, 143`);await page.close();
  }
  for(const variant of ["desktop", "phone"]){
    for(const ext of ["webm", "webp"])await copyFile(`${staging}/auto-solve-${variant}.${ext}`,`public/demo/auto-solve-${variant}.${ext}`);
    for(const index of [0,36,64,96,230,263])await copyFile(`${staging}/${variant}-${index}.png`,`${out}/${variant}-${index}.png`);
  }
  await writeFile(`${out}/checks.json`,JSON.stringify(evidence,null,2));
}finally{await browser.close()}
