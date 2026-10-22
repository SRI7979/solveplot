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
const fixture = JSON.parse(await readFile("/tmp/solveplot-auto-solve-fixture.json", "utf8"));
const png = await sharp("public/demo/quadratic-question.svg", { density: 216 }).png().toBuffer();
await writeFile("public/demo/quadratic-question.png", png);
const evidence = [];
const out = "docs/auto-solve-video-review";
await mkdir(out, { recursive: true });
const variants = [["desktop", 1200, 750], ["phone", 420, 780]].filter(([variant]) => !process.env.DEMO_VARIANT || variant === process.env.DEMO_VARIANT);
assert.ok(variants.length, "DEMO_VARIANT must be desktop or phone");
const staging = "/tmp/solveplot-auto-solve-capture";
await mkdir(staging, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", headless: true });
try {
  for (const [variant, width, height] of variants) {
    // Native 3× capture leaves resolution for the camera close-ups. The app
    // and its graph are re-rendered; the previous recording is never upscaled.
    const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:3});
    await page.addInitScript(() => {
      localStorage.setItem("solveplot-sidebar-collapsed", "true");
      localStorage.setItem("solveplot-theme", "light");
      sessionStorage.setItem("solveplot-appearance", JSON.stringify({
        palette: "candy", colorAmount: "colorful", text: "Modern",
        button: "Raised", corners: "Round",
      }));
    });
    let pending = null;
    let requests = 0;
    const errors = [];
    let currentFrame = -1;
    page.on("framenavigated", frame => { if(frame===page.mainFrame())console.log(variant, "navigation", currentFrame, frame.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/calculator.js?*", async route => {
      const response = await route.fetch();
      await route.fulfill({response,body:(await response.text())+';{const original=Desmos.GraphingCalculator;Desmos.GraphingCalculator=(...args)=>{const c=original(...args);if(!args[0].hasAttribute("data-solveplot-preflight"))window.demoCalculator=c;return c;}}'});
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
    await page.addStyleTag({content:'nextjs-portal{display:none!important}html{scroll-behavior:auto!important}html,body{overflow:hidden!important;background:#fff!important}'});
    const appearance = await page.locator('.solveplot-shell').evaluate(el => ({
      palette: el.dataset.palette, colorAmount: el.dataset.colorAmount,
      typography: el.dataset.typography, mode: el.dataset.colorMode,
    }));
    assert.deepEqual(appearance, { palette: 'candy', colorAmount: 'colorful', typography: 'modern', mode: 'light' });
    const zone = page.locator('#question-panel [class*="uploadZone"]');
    const z = await zone.boundingBox();
    const drop = {x:z.x+z.width*.5,y:z.y+z.height*.42};
    const source = {x:width<700?width/2-15:185,y:Math.min(z.y+z.height+55,height-110)};
    const tabBox=width<700?await page.getByRole('tab',{name:'Calculator',exact:true}).boundingBox():null;
    const tabPoint=tabBox?{x:tabBox.x+tabBox.width/2,y:tabBox.y+tabBox.height/2}:null;
    await page.evaluate(({image,source,width,height})=>{
      const stage=document.querySelector('#question-panel').closest('[class*="recording"]');
      stage.id='demo-camera-stage';stage.style.cssText='position:relative;width:'+width+'px;height:'+height+'px;transform-origin:0 0;will-change:transform';
      const card=document.createElement('div');card.id='demo-drag-card';card.innerHTML='<img alt="Practice question" src="'+image+'" />';
      card.style.cssText='position:absolute;z-index:999;pointer-events:none;width:'+(width<700?380:340)+'px;padding:10px;background:#fff;border:1px solid #cadde1;border-radius:14px;box-shadow:0 6px 20px #17323d18;transform:translate(-50%,-50%);left:'+source.x+'px;top:'+source.y+'px';card.firstChild.style.cssText='display:block;width:100%;height:auto';stage.append(card);
      const cursor=document.createElement('div');cursor.id='demo-cursor';cursor.style.cssText='position:fixed;left:0;top:0;z-index:1000;pointer-events:none;width:28px;height:33px;transform-origin:4px 3px;filter:drop-shadow(0 2px 2px #172d3520)';cursor.innerHTML='<svg width="27" height="33" viewBox="0 0 27 33"><path d="M2 1v25l6-6 5 11 5-2-5-10h10z" fill="#1c3b43" stroke="white" stroke-width="1.8" stroke-linejoin="round"/></svg>';document.body.append(cursor);
    },{image:'data:image/png;base64,'+png.toString('base64'),source,width,height});
    const fps=24, duration=11;
    const encoder=spawn(process.env.FFMPEG,["-y","-f","image2pipe","-c:v","mjpeg","-r",String(fps),"-i","pipe:0","-c:v","libvpx","-b:v","10000k","-crf","4","-deadline","good","-cpu-used","0","-screen-content-mode","1","-sharpness","4","-threads","4","-g","48","-pix_fmt","yuv420p",`${staging}/auto-solve-${variant}.webm`],{stdio:["pipe","ignore","pipe"]});
    let log='';encoder.stderr.on('data',chunk=>{log+=chunk});const finished=once(encoder,'close');
    let solvePoint=drop, graphPoint=null, expressionPoint=null;
    for(let index=0;index<fps*duration;index++){
      currentFrame=index;
      if(index%48===0)console.log(variant, "frame", index);
      const t=index/fps;
      if(index===54)await zone.dispatchEvent('dragover',{dataTransfer:await page.evaluateHandle(()=>new DataTransfer())});
      if(index===68){
        const transfer=await page.evaluateHandle(base64=>{const data=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));const dt=new DataTransfer();dt.items.add(new File([data],'question.png',{type:'image/png'}));return dt;},png.toString('base64'));
        await zone.dispatchEvent('drop',{dataTransfer:transfer});
        const button=await page.getByRole('button',{name:'Solve',exact:true}).boundingBox();solvePoint={x:button.x+button.width*.5,y:button.y+button.height*.5};
      }
      if(index===80){
        await page.getByRole('button',{name:'Solve',exact:true}).click();
        await page.locator('#question-panel').evaluate(el => { el.scrollTop = 0; });
      }
      if(index===95){
        if(!pending)throw Error('The real Solve handler did not issue a request');
        const events=[{type:'methods',...fixture.payload},{type:'solution',methodId:fixture.payload.selectedMethodId,solution:fixture.solution},{type:'done'}];
        await pending.fulfill({contentType:'application/x-ndjson',body:events.map(event=>JSON.stringify(event)).join('\n')+'\n'});
        await page.getByTestId('explanation-line').first().waitFor();
        await page.waitForFunction(()=>window.demoCalculator.expressionAnalysis.solveplot_6?.evaluation?.value===143);
        if(width>=700){
          const button = await page.getByRole('button',{name:'Expressions',exact:true}).boundingBox();
          expressionPoint = {x:button.x+button.width/2,y:button.y+button.height/2};
        }
        graphPoint={x:width-110,y:height*.45};
      }
      if(index===148 && width<700){
        await page.getByRole('tab',{name:'Calculator',exact:true}).click();
        const button = await page.getByRole('button',{name:'Expressions',exact:true}).boundingBox();
        expressionPoint = {x:button.x+button.width/2,y:button.y+button.height/2};
      }
      if(index===(width<700?162:136))await page.getByRole('button',{name:'Expressions',exact:true}).click();
      if(index>=176 && index<200)await page.evaluate(step=>{const panel=document.querySelector('#calculator-panel .dcg-exppanel');if(panel)panel.scrollTop+=step;},width<700?24:9);
      const park=width<700?{x:350,y:670}:{x:815,y:640};
      await page.evaluate(({t,source,drop,solvePoint,park,graphPoint,tabPoint,expressionPoint,mobile,width,height})=>{
        const ease=p=>{p=Math.max(0,Math.min(1,p));return p*p*p*(p*(6*p-15)+10)};
        const blend=(a,b,k)=>a+(b-a)*k;
        const initialScale=mobile?1.08:1.85;
        const pullback=ease((t-1.05)/.95), pushin=ease((t-7.35)/1.35);
        const scale=t<2?blend(initialScale,1,pullback):blend(1,mobile?1.06:1.4,pushin);
        const inputX=width/2-source.x*initialScale, inputY=height/2-source.y*initialScale;
        const focus=mobile?{x:width/2,y:420}:{x:850,y:405};
        const targetScale=mobile?1.06:1.4;
        const tx=t<2?blend(inputX,0,pullback):(width/2-focus.x*targetScale)*pushin;
        const ty=t<2?blend(inputY,0,pullback):(height/2-focus.y*targetScale)*pushin;
        document.querySelector('#demo-camera-stage').style.transform=`translate3d(${tx}px,${ty}px,0) scale(${scale})`;
        const start={x:source.x+80,y:source.y+70};
        const rest=mobile?{x:350,y:650}:{x:1100,y:620};
        const scrollPoint=mobile?{x:260,y:560}:{x:715,y:450};
        const poses=[[0,start],[.5,start],[1.2,source],[1.95,source],[2.85,drop],[3,drop],[3.25,solvePoint],[3.45,solvePoint],[4.6,rest],[5.1,rest],[5.65,mobile?rest:expressionPoint||rest],[5.85,mobile?rest:expressionPoint||rest],[6.12,mobile?tabPoint:scrollPoint],[6.3,mobile?tabPoint:scrollPoint],[6.72,mobile?expressionPoint||tabPoint:scrollPoint],[6.85,mobile?expressionPoint||tabPoint:scrollPoint],[7.35,scrollPoint],[8.35,scrollPoint],[8.7,mobile?park:graphPoint||park],[9.2,park],[11,park]];
        let i=0;while(i<poses.length-2&&t>poses[i+1][0])i++;
        const [a,p]=poses[i],[b,q]=poses[i+1],k=ease((t-a)/(b-a));const x=p.x+(q.x-p.x)*k,y=p.y+(q.y-p.y)*k;
        // A small bowed path and a quiet press feel like a deliberate mouse
        // movement. The cursor stays one size while the camera moves beneath it.
        const length=Math.hypot(q.x-p.x,q.y-p.y), bow=Math.min(18,length*.075)*Math.sin(Math.PI*k);
        const px=x+(length?(q.y-p.y)/length*bow:0),py=y-(length?(q.x-p.x)/length*bow:0);
        const pressed=(t>=3.3&&t<3.42)||(mobile?(t>=6.14&&t<6.25)||(t>=6.73&&t<6.86):(t>=5.64&&t<5.78))?.9:1;
        document.querySelector('#demo-cursor').style.transform=`translate(${tx+px*scale}px,${ty+py*scale}px) scale(${pressed})`;
        const card=document.querySelector('#demo-drag-card');if(t>=1.95&&t<2.9){card.style.left=px+'px';card.style.top=py+'px';card.style.transform='translate(-50%,-50%) rotate(-.7deg)';card.style.boxShadow='0 12px 28px #17323d20';}
        card.style.opacity=t<2.85?'1':String(1-ease((t-2.85)/.16));
      },{t,source,drop,solvePoint,park,graphPoint,tabPoint,expressionPoint,mobile:width<700,width,height});
      const image=await page.screenshot({type:'png',caret:'initial'});
      // The available recorder FFmpeg accepts MJPEG input. Start from a
      // lossless screenshot and use 4:4:4/Q100 input to avoid smearing text.
      const encoderFrame=await sharp(image).jpeg({quality:100,chromaSubsampling:'4:4:4'}).toBuffer();
      if(!encoder.stdin.write(encoderFrame))await once(encoder.stdin,'drain');
      if([0,36,64,88,96,125,230,263].includes(index))await sharp(image).png().toFile(`${staging}/${variant}-${index}.png`);
      // A complete workspace makes the clearest desktop still; on phones the
      // final graph/result is more readable than the preceding explanation tab.
      if(index===(variant==='desktop'?164:230))await sharp(image).webp({lossless:true}).toFile(`${staging}/auto-solve-${variant}.webp`);
      if(index===230){
        const result=await page.evaluate(()=>({rows:window.demoCalculator.getExpressions().map(({id,latex})=>({id,latex})),answer:window.demoCalculator.expressionAnalysis.solveplot_6.evaluation.value}));
        assert.equal(result.answer,143);
        assert.equal(result.rows.filter(row=>row.latex).length,6);
        const normalize = latex => latex.replace(/\\(?:left|right)/g, '').replace(/[{}\s]/g, '');
        assert.equal(normalize(result.rows.find(row=>row.id==='solveplot_5').latex), 'f(x)=ax^2+bx+c');
        assert.equal(normalize(result.rows.find(row=>row.id==='solveplot_6').latex), 'f(10)');
        evidence.push({variant,width:width*3,height:height*3,fps,appearance,camera:'problem close-up → full workspace → result close-up',dragFrom:'left',ending:'hold then direct loop',requests,liveModelCalls:0,result,errors});
      }
    }
    encoder.stdin.end();const [code]=await finished;if(code!==0)throw Error(log);
    assert.deepEqual(errors,[]);assert.equal(requests,1);
    console.log(`Recorded ${variant}: actual UI, automatic insertion, 143`);await page.close();
  }
  for(const [variant] of variants){
    for(const ext of ["webm", "webp"])await copyFile(`${staging}/auto-solve-${variant}.${ext}`,`public/demo/auto-solve-${variant}.${ext}`);
    for(const index of [0,36,64,88,96,125,230,263])await copyFile(`${staging}/${variant}-${index}.png`,`${out}/${variant}-${index}.png`);
  }
  const previous = process.env.DEMO_VARIANT ? JSON.parse(await readFile(`${out}/checks.json`, "utf8")).filter(item => !variants.some(([variant]) => variant === item.variant)) : [];
  await writeFile(`${out}/checks.json`,JSON.stringify([...previous, ...evidence].sort((a,b)=>a.variant.localeCompare(b.variant)),null,2));
}finally{await browser.close()}
