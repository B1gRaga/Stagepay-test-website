'use client'

import { useEffect, useRef, useState } from 'react'
import { RevealObserver } from '@/components/landing/RevealObserver'
import { DotGridBackground } from '@/components/landing/DotGridBackground'
import { LogoFull } from '@/components/Logo'

const CSS = `
:root{
  --ink:#1F2A44; --ink-2:#2B3756; --ink-3:#18213A;
  --amber:#F2A900; --amber-soft:#FCEFC7; --paper:#FAF7F0; --paper-2:#F1ECE1; --white:#FFFFFF;
  --muted:#5B6475; --on-ink:#FAF7F0; --on-ink-muted:#C9CED8; --line:#E4DDCF;
  --note-fg:#6B4A00; --error:#A4281B;
  --font:var(--font-manrope),'Segoe UI',Arial,sans-serif;
  --r-lg:24px; --r-md:16px;
  --sh-1:0 2px 6px rgba(31,42,68,.06),0 10px 24px rgba(31,42,68,.08);
  --sh-2:0 6px 14px rgba(31,42,68,.10),0 28px 60px rgba(31,42,68,.18);
  --sh-3:0 10px 24px rgba(0,0,0,.25),0 40px 80px rgba(0,0,0,.35);
}
.lp *{box-sizing:border-box}
.lp{background:var(--paper);color:var(--ink);font-family:var(--font);font-size:17px;line-height:1.55;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.lp h1,.lp h2,.lp h3{margin:0;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.lp p{margin:0}
.lp a{color:inherit}
.lp button{font-family:inherit}
.lp :focus-visible{outline:3px solid var(--amber);outline-offset:3px;border-radius:8px}
.band{padding:88px clamp(20px,5vw,48px);position:relative}
.wrap{max-width:1120px;margin-inline:auto;position:relative;z-index:1}
.dotfx{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none}
.ink{background:var(--ink);color:var(--on-ink)}
.p2{background:var(--paper-2)}
.mark{display:flex;align-items:flex-end;height:10px;width:60px;margin-bottom:18px}
.mark i{flex:1;background:var(--ink);transform:scaleY(0);transform-origin:bottom;transition:transform .5s ease}
.mark i:nth-child(1){height:4px;transition-delay:0s}.mark i:nth-child(2){height:7px;transition-delay:.08s}.mark i:nth-child(3){height:10px;background:var(--amber);transition-delay:.16s}
.ink .mark i:nth-child(1),.ink .mark i:nth-child(2){background:var(--on-ink)}
.reveal.in .mark i{transform:scaleY(1)}
.h2{font-size:clamp(30px,6vw,48px)}
.lead{font-size:clamp(17px,2.2vw,20px);color:var(--muted);max-width:60ch}
.ink .lead{color:var(--on-ink-muted)}
.btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border-radius:999px;border:0;font:700 17px/1 var(--font);cursor:pointer;text-decoration:none;transition:transform .18s ease, box-shadow .18s ease}
.btn-amber{background:var(--amber);color:var(--ink);box-shadow:0 6px 0 #C98C00, 0 14px 28px rgba(242,169,0,.28)}
.btn-amber:hover{transform:translateY(-2px);box-shadow:0 8px 0 #C98C00, 0 18px 34px rgba(242,169,0,.36)}
.btn-amber:active{transform:translateY(4px);box-shadow:0 2px 0 #C98C00, 0 6px 12px rgba(242,169,0,.25)}
.btn-ghost{background:transparent;color:var(--ink);border:2px solid var(--ink)}
.btn-ghost:hover{background:var(--ink);color:var(--on-ink)}
.ink .btn-ghost{color:var(--on-ink);border-color:var(--on-ink)}
.btn .arr{transition:transform .18s ease}.btn:hover .arr{transform:translateX(4px)}
.caption{font-size:13px;color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:800;padding:7px 14px;border-radius:999px;background:var(--amber-soft);color:var(--note-fg)}
.chip.neutral{background:#E3E7EF;color:var(--ink)}
.progress{position:fixed;left:0;right:0;top:0;height:3px;background:var(--amber);transform-origin:0 50%;transform:scaleX(0);z-index:70;pointer-events:none;transition:transform .1s linear}

/* reveal-on-scroll (RevealObserver toggles .in) */
.reveal{opacity:0;transform:translateY(32px);transition:opacity .6s ease,transform .6s ease}
.reveal.in{opacity:1;transform:none}

/* hero on-load entrance (no JS needed) */
@keyframes heroIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.hero .eyebrow{animation:heroIn .7s .05s ease both}
.hero .lead{animation:heroIn .7s .3s ease both}
.hero .ctas{animation:heroIn .7s .42s ease both}
.hero .small{animation:heroIn .7s .52s ease both}

/* word-by-word hero heading stagger (JS-enhanced; plain text is the no-JS fallback) */
.hero h1 .w{display:inline-block;will-change:transform}
@keyframes wordIn{from{opacity:0;transform:translateY(.6em) rotate(4deg)}to{opacity:1;transform:none}}

/* cursor glow (fine-pointer only, added by JS) */
.hero .glow{position:absolute;left:0;top:0;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:radial-gradient(circle, rgba(242,169,0,.18), rgba(242,169,0,0) 60%);pointer-events:none;opacity:0;transition:opacity .4s ease;z-index:0}
.hero .glow.on{opacity:1}

/* magnetic buttons (JS sets transform on pointermove; .btn's existing transition smooths it) */
.btn.mag{will-change:transform}

/* nav */
.nav{position:sticky;top:0;z-index:50;background:rgba(250,247,240,.9);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid rgba(228,221,207,.8);padding:0 clamp(20px,5vw,48px)}
.nav .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;height:68px}
.nav .logo svg{height:30px;width:auto;display:block}
.nav nav{display:none;gap:28px;font-weight:600;font-size:15px}
.nav nav a{text-decoration:none;color:var(--muted);position:relative}
.nav nav a:hover{color:var(--ink)}
.nav .btn{min-height:44px;padding:0 20px;font-size:15px;box-shadow:0 4px 0 #C98C00}
@media (min-width:900px){.nav nav{display:flex}}

/* hero */
.hero{padding:56px clamp(20px,5vw,48px) 96px;overflow:hidden;position:relative}
.hero::before{content:"";position:absolute;width:720px;height:720px;right:-220px;top:-260px;background:radial-gradient(circle, rgba(242,169,0,.22), rgba(242,169,0,0) 62%);pointer-events:none}
.hero .stairs{position:absolute;right:0;bottom:0;width:min(520px,70vw);height:200px;display:flex;align-items:flex-end;opacity:.5;pointer-events:none;transition:transform .2s ease-out;will-change:transform}
.hero .stairs i{flex:1;background:var(--ink-2)}.hero .stairs i:nth-child(1){height:34%}.hero .stairs i:nth-child(2){height:67%}.hero .stairs i:nth-child(3){height:100%;background:#33405F}
.hero .wrap{display:grid;gap:56px;align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin-bottom:20px}
.eyebrow .dot{width:8px;height:8px;border-radius:50%;background:var(--amber);box-shadow:0 0 0 0 rgba(242,169,0,.6);animation:ping 2.4s infinite}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(242,169,0,.6)}70%{box-shadow:0 0 0 12px rgba(242,169,0,0)}100%{box-shadow:0 0 0 0 rgba(242,169,0,0)}}
.hero h1{font-size:clamp(42px,8.6vw,72px);letter-spacing:-.04em}
.hero h1 .wa{color:var(--amber);position:relative;white-space:nowrap}
.hero h1 .wa::after{content:"";position:absolute;left:0;right:0;bottom:.02em;height:.12em;background:var(--amber);opacity:.35;transform-origin:left;animation:draw 1s .8s ease both}
@keyframes draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.hero .lead{margin-top:22px}
.hero .ctas{display:flex;flex-direction:column;gap:18px;margin-top:32px;align-items:stretch}
.hero .small{font-size:14px;color:var(--on-ink-muted);margin-top:16px}
.hero .small b{color:var(--amber)}
.textlink{font-weight:700;font-size:15px;text-decoration:none;color:var(--on-ink);align-self:center}
.textlink:hover{text-decoration:underline}
@media (min-width:600px){.hero .ctas{flex-direction:row;align-items:center}.textlink{align-self:auto}}
@media (min-width:900px){.hero{padding-block:96px 120px}.hero .wrap{grid-template-columns:1.02fr .98fr}}

/* hero stage: layered cards */
.stage{position:relative;height:540px;max-width:480px;width:100%;margin-inline:auto;perspective:1200px}
.stage .layer{position:absolute;transition:transform .25s ease-out}
.stage .toast{transition:transform .25s ease-out}
.back{left:14%;top:30px;width:78%;transform:rotate(5deg)}
.front{left:2%;top:58px;width:86%}
.float{animation:bob 6s ease-in-out infinite}
@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -8px}}
.toast{position:absolute;display:flex;align-items:center;gap:10px;background:var(--white);color:var(--ink);border-radius:14px;padding:10px 14px;box-shadow:var(--sh-2);font-size:13px;font-weight:700;white-space:nowrap;opacity:0;animation:pop .5s cubic-bezier(.2,1.4,.4,1) both}
.toast small{display:block;font-weight:500;color:var(--muted);font-size:11.5px}
.toast .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--ink);flex:none}
.toast .ic svg{width:16px;height:16px}
.t1{left:-4%;top:6px;animation-delay:1.6s}
.t2{right:-2%;top:300px;animation-delay:2.2s}
.t3{left:4%;bottom:6px;animation-delay:2.8s}
.t3 .ic{background:var(--amber)}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.9)}to{opacity:1;transform:none}}
@media (max-width:420px){.stage{height:500px}.t2{right:0}}

/* invoice */
.invoice{width:100%;background:var(--white);color:var(--ink);border-radius:18px;overflow:hidden;box-shadow:var(--sh-3);font-size:13px}
.invoice.dim{filter:saturate(.7);opacity:.92}
.steps-bar{display:flex;align-items:flex-end;height:9px}
.steps-bar i{flex:1;background:var(--ink)}.steps-bar i:nth-child(1){height:4px}.steps-bar i:nth-child(2){height:6px}.steps-bar i:nth-child(3){height:9px;background:var(--amber)}
.inv-body{padding:20px 22px 18px}
.inv-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.inv-biz{font-weight:800;font-size:15.5px}
.inv-sub{font-size:11px;color:var(--muted);margin-top:2px}
.inv-tag{background:var(--ink);color:var(--on-ink);font-weight:800;font-size:10px;letter-spacing:.2em;padding:5px 10px;border-radius:5px}
.inv-meta{display:flex;gap:26px;margin:14px 0 10px}
.lbl{font-size:9px;font-weight:800;letter-spacing:.16em;color:var(--muted);text-transform:uppercase}
.val{font-weight:700;font-size:13px;margin-top:2px}
.inv-rows{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}
.inv-rows td{padding:6px 0}
.inv-rows td:last-child{text-align:right}
.inv-rows tr.rule td{border-top:1px solid var(--line)}
.inv-rows tr.muted td{color:var(--muted)}
.build .inv-rows tr{opacity:0;animation:rowin .45s ease both}
.build .inv-rows tr:nth-child(1){animation-delay:.25s}.build .inv-rows tr:nth-child(2){animation-delay:.4s}.build .inv-rows tr:nth-child(3){animation-delay:.55s}.build .inv-rows tr:nth-child(4){animation-delay:.7s}.build .inv-rows tr:nth-child(5){animation-delay:.85s}.build .inv-rows tr:nth-child(6){animation-delay:.95s}
@keyframes rowin{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.inv-total{display:flex;justify-content:space-between;align-items:center;background:var(--ink);border-radius:10px;padding:12px 14px;margin-top:8px}
.inv-total span{color:var(--on-ink);font-weight:800;font-size:10px;letter-spacing:.2em}
.inv-total b{color:var(--amber);font-size:20px;font-variant-numeric:tabular-nums}
.inv-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:10px;color:var(--muted)}
.inv-foot svg{height:16px;width:auto}
.stamp{position:absolute;right:18px;top:92px;transform:rotate(-12deg);border:3px solid var(--amber);color:var(--ink);background:rgba(242,169,0,.14);font-weight:800;font-size:22px;letter-spacing:.2em;padding:3px 12px;border-radius:8px}

/* problem before/after */
.split{display:grid;gap:44px;align-items:center}
@media (min-width:900px){.split{grid-template-columns:1fr 1fr;gap:72px}}
.split .lead{margin-top:18px}
.pains{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:12px}
.pains li{display:flex;gap:12px;align-items:flex-start;font-weight:600}
.pains li::before{content:"";flex:none;width:22px;height:22px;margin-top:2px;border-radius:7px;background:var(--amber-soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 7l10 10M17 7L7 17' stroke='%236B4A00' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E") center/14px no-repeat}
.compare{background:var(--white);border:1px solid var(--line);border-radius:28px;padding:18px;box-shadow:var(--sh-2)}
.tabs{display:grid;grid-template-columns:1fr 1fr;background:var(--paper-2);border-radius:999px;padding:5px;position:relative}
.tabs button{position:relative;z-index:1;border:0;background:none;padding:12px 10px;border-radius:999px;font-weight:700;font-size:15px;color:var(--muted);cursor:pointer;min-height:46px}
.tabs button[aria-selected="true"]{color:var(--on-ink)}
.tabs .pill{position:absolute;top:5px;bottom:5px;left:5px;width:calc(50% - 5px);background:var(--ink);border-radius:999px;transition:transform .35s cubic-bezier(.3,1.3,.5,1);box-shadow:var(--sh-1)}
.tabs.after .pill{transform:translateX(100%)}
.panel{height:330px;position:relative;margin-top:16px;border-radius:18px;overflow:hidden;background:var(--paper)}
.panel > div{position:absolute;inset:0;display:grid;place-items:center;padding:20px;transition:opacity .35s ease, transform .35s ease}
.panel .before{background:repeating-linear-gradient(0deg,#F3EEE3 0 28px,#EFE8DA 28px 29px)}
.panel [aria-hidden="true"]{opacity:0;transform:scale(.96);pointer-events:none}
.paper{width:78%;max-width:300px;background:#FFFDF7;border:1px solid var(--line);border-radius:6px;box-shadow:var(--sh-1);padding:18px;transform:rotate(-3deg);display:grid;gap:8px;position:relative}
.paper .hand{font-family:'Segoe Script','Bradley Hand','Comic Sans MS',cursive;color:#3E4A63;font-size:15px}
.paper .hand s{color:#A4281B}
.paper .ln{height:1px;background:#CFC6B4}
.paper .stub{margin-top:6px;border-top:2px dashed #CFC6B4;padding-top:8px;display:flex;justify-content:space-between;color:#9AA3B5;font-size:11px}
.paper.two{position:absolute;transform:rotate(5deg) translate(26px,-18px);opacity:.7;z-index:-1}
.mini{width:84%;max-width:320px;transform:rotate(-1.5deg)}
.mini .invoice{box-shadow:var(--sh-2)}
.badge-ok{position:absolute;right:8%;top:14%;background:var(--ink);color:var(--on-ink);font-size:12px;font-weight:800;padding:7px 12px;border-radius:999px;display:flex;gap:6px;align-items:center;box-shadow:var(--sh-2)}
.badge-ok i{width:8px;height:8px;border-radius:50%;background:var(--amber)}

/* features */
.grid-4{display:grid;gap:16px;margin-top:40px}
@media (min-width:720px){.grid-4{grid-template-columns:1fr 1fr;gap:20px}}
.card{background:var(--white);border:1px solid var(--line);border-radius:var(--r-lg);padding:26px;display:flex;gap:20px;align-items:flex-start;box-shadow:var(--sh-1);transition:transform .2s ease, box-shadow .2s ease}
.card:hover{transform:translateY(-4px);box-shadow:var(--sh-2)}
/* .reveal sets its own transition shorthand (opacity+transform) — a plain .card
   rule of equal specificity declared later would otherwise win the whole
   transition-property list and silently drop opacity from it */
.card.reveal{transition:opacity .6s ease,transform .6s ease,box-shadow .2s ease}
.card svg{width:60px;height:60px;flex:none;transition:transform .3s cubic-bezier(.3,1.5,.5,1)}
.card:hover svg{transform:rotate(-6deg) scale(1.06)}
.card h3{font-size:20px;margin-bottom:6px}
.card p{color:var(--muted);font-size:16px}
.note-line{margin-top:22px;font-size:15px;color:var(--muted);display:flex;gap:10px;align-items:center}

/* how: stepper + phone */
.how-grid{display:grid;gap:48px;margin-top:40px;align-items:center}
@media (min-width:900px){.how-grid{grid-template-columns:1.1fr .9fr}}
.steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.step{width:100%;text-align:left;display:grid;grid-template-columns:52px 1fr;gap:16px;align-items:start;background:transparent;border:1px solid transparent;border-radius:20px;padding:16px;cursor:pointer;color:var(--ink);transition:background .2s ease, border-color .2s ease, box-shadow .2s ease}
.step:hover{background:var(--white)}
.step[aria-selected="true"]{background:var(--white);border-color:var(--line);box-shadow:var(--sh-2)}
.num{width:52px;height:52px;border-radius:50%;background:var(--paper-2);color:var(--ink);display:grid;place-items:center;font-weight:800;font-size:18px;transition:background .2s ease,color .2s ease}
.step[aria-selected="true"] .num{background:var(--ink);color:var(--on-ink)}
.step .h3{display:block;font-size:21px;font-weight:800;letter-spacing:-.02em;margin-top:4px}
.step .p{display:block;color:var(--muted);font-size:16px}
.prog{grid-column:2;height:3px;background:var(--paper-2);border-radius:3px;overflow:hidden;margin-top:12px;display:none}
.step[aria-selected="true"] .prog{display:block}
.prog i{display:block;height:100%;width:0;background:var(--amber)}
.running .step[aria-selected="true"] .prog i{animation:fill 4s linear forwards}
@keyframes fill{to{width:100%}}
.phone{width:100%;max-width:300px;margin-inline:auto;background:var(--ink);border-radius:40px;padding:12px;box-shadow:var(--sh-2), inset 0 0 0 2px #33405F;position:relative;transition:transform .2s ease-out;will-change:transform}
.phone::before{content:"";position:absolute;top:18px;left:50%;width:70px;height:6px;border-radius:6px;background:#33405F;transform:translateX(-50%);z-index:2}
.phone .scr{background:#EFE9DD;border-radius:30px;overflow:hidden;height:470px;position:relative}
.screen{position:absolute;inset:0;display:flex;flex-direction:column;transition:opacity .35s ease, transform .35s ease}
.screen[aria-hidden="true"]{opacity:0;transform:translateX(20px);pointer-events:none}
.phone .bar{background:var(--white);padding:30px 14px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line)}
.phone .bar svg{width:30px;height:30px}
.phone .who{font-weight:700;font-size:13px}
.phone .sub{font-size:11px;color:var(--muted)}
.ph-form{padding:16px 14px;display:grid;gap:10px;font-size:12px}
.ph-field{background:var(--white);border:1.5px solid #CFC6B4;border-radius:10px;padding:9px 10px}
.ph-field span{display:block;font-size:9.5px;font-weight:800;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
.ph-field b{font-weight:700;font-size:13px}
.ph-btn{background:var(--amber);color:var(--ink);border-radius:999px;text-align:center;font-weight:800;padding:11px;margin-top:4px}
.msgs{padding:14px 12px 16px;display:flex;flex-direction:column;gap:9px;font-size:12.5px;line-height:1.45;justify-content:flex-end;flex:1}
.bub{max-width:88%;background:var(--white);border-radius:14px 14px 14px 4px;padding:9px 11px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.bub.me{align-self:flex-end;background:var(--amber-soft);border-radius:14px 14px 4px 14px}
.bub.rem{border-left:3px solid var(--amber)}
.att{margin-top:7px;display:flex;gap:8px;align-items:center;background:var(--paper);border:1px solid var(--line);border-radius:9px;padding:7px}
.att svg{width:26px;height:26px}
.att b{font-size:11.5px;display:block}.att span{font-size:10.5px;color:var(--muted)}

/* try it */
.try{display:grid;gap:32px;margin-top:40px;align-items:start}
@media (min-width:900px){.try{grid-template-columns:.95fr 1.05fr;gap:56px}}
.panel-card{background:var(--white);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;box-shadow:var(--sh-2)}
.demo-grid{display:grid;gap:14px}
.row2{display:grid;grid-template-columns:1fr 110px;gap:10px}
.field{display:grid;gap:6px;min-width:0}
.field label{font-weight:700;font-size:14px}
.field input,.field select,.field textarea{font:500 16px var(--font);color:var(--ink);background:var(--white);border:1.5px solid #CFC6B4;border-radius:12px;padding:12px 13px;min-height:48px;width:100%;min-width:0}
.field textarea{min-height:90px;resize:vertical}
.field input:focus,.field select:focus,.field textarea:focus{outline:none;border-color:var(--ink);box-shadow:0 0 0 3px rgba(242,169,0,.45)}
.toggle{display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px;cursor:pointer}
.toggle input{appearance:none;width:46px;height:28px;border-radius:999px;background:#CFC6B4;position:relative;cursor:pointer;transition:background .2s ease;flex:none;margin:0}
.toggle input::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:var(--white);box-shadow:var(--sh-1);transition:transform .2s ease}
.toggle input:checked{background:var(--ink)}.toggle input:checked::after{transform:translateX(18px)}
.demo-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.demo-actions .btn{flex:1;min-width:150px}
.preview{position:relative}
.preview .invoice{box-shadow:var(--sh-2)}
.preview .flash{animation:glow 1.1s ease}
@keyframes glow{0%{box-shadow:0 0 0 0 rgba(242,169,0,.7),var(--sh-2)}100%{box-shadow:0 0 0 22px rgba(242,169,0,0),var(--sh-2)}}
.demo-note{margin-top:12px;font-size:13px;color:var(--muted)}
.sentbox{margin-top:14px;display:flex;gap:12px;align-items:center;background:var(--ink);color:var(--on-ink);border-radius:16px;padding:14px 16px;box-shadow:var(--sh-2);animation:pop .45s ease both}
.sentbox .ic{width:34px;height:34px;border-radius:10px;background:var(--amber);display:grid;place-items:center;flex:none}
.sentbox small{display:block;color:var(--on-ink-muted);font-size:12.5px}

/* pricing */
.plans{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px 4px 22px;margin-top:24px;-webkit-overflow-scrolling:touch}
.plan{scroll-snap-align:start;flex:0 0 78%;max-width:320px;background:var(--white);border:1px solid var(--line);border-radius:var(--r-lg);padding:28px 24px;display:flex;flex-direction:column;gap:10px;box-shadow:var(--sh-1);transition:transform .2s ease, box-shadow .2s ease}
.plan.reveal{transition:opacity .6s ease,transform .6s ease,box-shadow .2s ease}
.plan:hover{transform:translateY(-4px);box-shadow:var(--sh-2)}
.plan .name{font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.plan .price{font-size:40px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}
.plan .price small{font-size:16px;font-weight:600;color:var(--muted);letter-spacing:0}
.plan .desc{color:var(--muted);font-size:15px;flex:1}
.plan .btn{width:100%;margin-top:8px}
.plan.hi{background:var(--ink);color:var(--on-ink);border-color:var(--ink);box-shadow:var(--sh-2), 0 0 0 4px rgba(242,169,0,.35)}
.plan.hi .name{color:var(--amber)}.plan.hi .desc,.plan.hi .price small{color:var(--on-ink-muted)}
.badge{align-self:flex-start;background:var(--amber);color:var(--ink);font-size:12px;font-weight:800;padding:5px 11px;border-radius:999px}
@media (min-width:960px){.plans{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible}.plan{max-width:none}.plan.hi{transform:translateY(-12px)}.plan.hi:hover{transform:translateY(-16px)}}
.swipe{font-size:13px;color:var(--muted)}
@media (min-width:960px){.swipe{display:none}}

/* faq */
.faq{margin-top:32px;display:grid;gap:12px;max-width:820px}
.faq details{background:var(--white);border:1px solid var(--line);border-radius:var(--r-md);padding:4px 22px;box-shadow:var(--sh-1);transition:box-shadow .2s ease}
.faq details.reveal{transition:opacity .6s ease,transform .6s ease,box-shadow .2s ease}
.faq details[open]{box-shadow:var(--sh-2)}
.faq summary{cursor:pointer;list-style:none;font-weight:700;font-size:18px;padding:18px 0;display:flex;justify-content:space-between;align-items:center;gap:16px}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"";flex:none;width:30px;height:30px;border-radius:50%;background:var(--paper-2) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' fill='none' stroke='%231F2A44' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat;transition:transform .25s ease}
.faq details[open] summary::after{transform:rotate(180deg)}
.faq p{padding:0 0 20px;color:var(--muted);max-width:65ch}

/* final */
.final{overflow:hidden;position:relative}
.final::before{content:"";position:absolute;left:-200px;bottom:-300px;width:700px;height:700px;background:radial-gradient(circle, rgba(242,169,0,.18), rgba(242,169,0,0) 62%);pointer-events:none}
.final .stairs{position:absolute;right:clamp(20px,5vw,48px);top:50%;transform:translateY(-50%);width:min(320px,40vw);height:min(320px,40vw);display:flex;align-items:flex-end;opacity:.9;pointer-events:none}
.final .stairs i{flex:1;background:var(--ink-2);transition:transform .2s ease-out;will-change:transform;transform-origin:bottom}.final .stairs i:nth-child(1){height:34%}.final .stairs i:nth-child(2){height:67%}.final .stairs i:nth-child(3){height:100%;background:var(--amber)}
@media (max-width:700px){.final .stairs{opacity:.25}}
.final .wrap{display:grid;gap:26px}
.final svg.logo-r{height:34px;width:auto}
.final h2{font-size:clamp(34px,6.4vw,56px);max-width:14ch}
.contact{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:15px;color:var(--on-ink-muted)}
.contact .pillc{display:inline-flex;align-items:center;gap:8px;background:var(--ink-2);border-radius:999px;padding:8px 8px 8px 14px;color:var(--on-ink);font-weight:700;user-select:all}
.contact button{border:0;background:var(--on-ink);color:var(--ink);font-weight:700;font-size:12px;border-radius:999px;padding:6px 10px;cursor:pointer}
.lp footer{background:var(--ink-3);color:var(--on-ink-muted);font-size:14px;padding:28px clamp(20px,5vw,48px) calc(28px + 76px)}
.lp footer .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
.lp footer details summary{cursor:pointer;color:var(--on-ink)}
.lp footer details p{margin-top:8px;max-width:60ch}
@media (min-width:900px){.lp footer{padding-block:28px}}

/* sticky mobile cta */
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(31,42,68,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:12px clamp(20px,5vw,48px);display:flex;align-items:center;justify-content:space-between;gap:12px;transform:translateY(110%);transition:transform .3s cubic-bezier(.3,1.3,.5,1)}
.sticky.show{transform:none}
.sticky span{color:var(--on-ink);font-weight:700;font-size:14px}
.sticky .btn{min-height:46px;padding:0 22px;box-shadow:0 4px 0 #C98C00}
@media (min-width:900px){.sticky{display:none}}

@media (prefers-reduced-motion:reduce){
  .lp *,.lp *::before,.lp *::after{animation:none!important;transition:none!important}
}
`

const CONTACT = { whatsapp: '73205678', email: 'getstagepay@gmail.com' }

function fmt(n: number) {
  return 'P' + Math.round(n).toLocaleString('en-US')
}

function BrandCardIcon() {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="28" fill="#1F2A44" />
      <path d="M38 26 H70 L84 40 V94 H38 Z" fill="#FAF7F0" />
      <rect x="48" y="52" width="24" height="6" rx="3" fill="#1F2A44" />
      <rect x="48" y="64" width="28" height="6" rx="3" fill="#1F2A44" />
      <rect x="48" y="76" width="16" height="6" rx="3" fill="#F2A900" />
    </svg>
  )
}
function WhatsAppCardIcon() {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="28" fill="#1F2A44" />
      <path d="M26 58 L92 30 L72 92 L58 68 Z" fill="#FAF7F0" />
      <path d="M58 68 L92 30 L64 74 Z" fill="#D9D2C3" />
      <circle cx="32" cy="82" r="5" fill="#F2A900" />
      <circle cx="44" cy="90" r="3.5" fill="#F2A900" />
    </svg>
  )
}
function ReminderCardIcon() {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="28" fill="#1F2A44" />
      <path d="M28 36 H92 Q96 36 96 40 V76 Q96 80 92 80 H56 L40 94 V80 H28 Q24 80 24 76 V40 Q24 36 28 36 Z" fill="#FAF7F0" />
      <circle cx="44" cy="58" r="5" fill="#1F2A44" />
      <circle cx="60" cy="58" r="5" fill="#1F2A44" />
      <circle cx="76" cy="58" r="5" fill="#F2A900" />
    </svg>
  )
}
function RecurringCardIcon() {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="28" fill="#1F2A44" />
      <path d="M60 30 A30 30 0 1 1 31 52" fill="none" stroke="#FAF7F0" strokeWidth="9" strokeLinecap="round" />
      <path d="M20 46 L32 62 L44 46 Z" fill="#FAF7F0" />
      <circle cx="60" cy="60" r="9" fill="#F2A900" />
    </svg>
  )
}
function VatIcon() {
  return (
    <svg aria-hidden focusable="false" style={{ width: 28, height: 28, flex: 'none' }} viewBox="0 0 120 120">
      <rect width="120" height="120" rx="28" fill="#1F2A44" />
      <circle cx="44" cy="44" r="11" fill="none" stroke="#FAF7F0" strokeWidth="8" />
      <circle cx="76" cy="78" r="11" fill="none" stroke="#FAF7F0" strokeWidth="8" />
      <path d="M82 32 L38 90" stroke="#F2A900" strokeWidth="9" strokeLinecap="round" />
    </svg>
  )
}
function PhoneBarIcon() {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 120 120">
      <rect width="120" height="120" rx="26.4" fill="#1F2A44" />
      <path d="M26.4 93.6 V71.2 H48.8 V48.8 H71.2 V93.6 Z" fill="#FAF7F0" />
      <rect x="71.2" y="26.4" width="22.4" height="67.2" fill="#F2A900" />
    </svg>
  )
}
function WhatsAppCheckIcon({ stroke = '#F2A900' }: { stroke?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 12l16-8-6 16-3-7-7-1z" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Counts up from 0 to `to` once the span scrolls into view. Jumps straight
// to the final value under prefers-reduced-motion.
function Counter({ to }: { to: number }) {
  const [val, setVal] = useState(0)
  const spanRef = useRef<HTMLSpanElement>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setVal(to); return }
    const el = spanRef.current
    if (!el || !('IntersectionObserver' in window)) { setVal(to); return }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !firedRef.current) {
        firedRef.current = true
        const t0 = performance.now()
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / 1200)
          setVal(Math.round(to * (1 - Math.pow(1 - k, 3))))
          if (k < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        obs.disconnect()
      }
    }, { threshold: 0.6 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [to])

  return <span ref={spanRef}>{fmt(val)}</span>
}

type Row = { label: string; amount: number }

export default function Home() {
  const [tab, setTab] = useState<'before' | 'after'>('before')
  const [step, setStep] = useState(0)
  const [stickyShown, setStickyShown] = useState(false)
  const [heroTotal, setHeroTotal] = useState(0)

  const [bizName, setBizName] = useState('Thuto Tutoring Centre')
  const [clientName, setClientName] = useState('Thato M.')
  const [items, setItems] = useState<Row[]>([
    { label: 'Mathematics', amount: 300 },
    { label: 'English', amount: 300 },
    { label: 'Registration fee', amount: 150 },
  ])
  const [vat, setVat] = useState(true)
  const [previewTotal, setPreviewTotal] = useState(0)
  const [flash, setFlash] = useState(false)
  const [sent, setSent] = useState(false)

  const heroRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const h1Ref = useRef<HTMLHeadingElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const heroStairsRef = useRef<HTMLDivElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const finalStairsRef = useRef<HTMLDivElement>(null)

  const subtotal = items.reduce((s, r) => s + (r.amount || 0), 0)
  const vatAmount = vat ? Math.round(subtotal * 0.14) : 0

  // scroll progress bar
  useEffect(() => {
    function onScroll() {
      const h = document.documentElement
      const p = h.scrollHeight > h.clientHeight ? h.scrollTop / (h.scrollHeight - h.clientHeight) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // word-by-word hero heading stagger — splits the live text node into spans,
  // each with a staggered inline animation. Plain text (no JS) stays fully
  // visible, so this only enhances, never hides, the heading.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const h1 = h1Ref.current
    if (reduce || !h1) return
    let i = 0
    function wrapWords(node: ChildNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment()
        const parts = (node.textContent || '').split(/(\s+)/)
        parts.forEach(part => {
          if (!part) return
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return }
          const span = document.createElement('span')
          span.className = 'w'
          span.textContent = part
          span.style.animation = `wordIn .8s ${(i * 55)}ms cubic-bezier(.2,1,.3,1) both`
          i++
          frag.appendChild(span)
        })
        node.parentNode?.replaceChild(frag, node)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // existing element children (e.g. the amber "WhatsApp." span) animate as one atomic word
        ;(node as HTMLElement).classList.add('w')
        ;(node as HTMLElement).style.animation = `wordIn .8s ${(i * 55)}ms cubic-bezier(.2,1,.3,1) both`
        i++
      }
    }
    Array.from(h1.childNodes).forEach(wrapWords)
  }, [])

  // cursor glow + magnetic buttons + scroll parallax (fine-pointer, motion-allowed only)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const fine = window.matchMedia?.('(pointer: fine)').matches
    const cleanups: Array<() => void> = []

    if (fine) {
      const hero = heroRef.current, glow = glowRef.current, stage = stageRef.current
      if (hero && glow) {
        const onMove = (e: PointerEvent) => {
          const r = hero.getBoundingClientRect()
          glow.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`
          glow.classList.add('on')
        }
        hero.addEventListener('pointermove', onMove)
        cleanups.push(() => hero.removeEventListener('pointermove', onMove))
      }
      if (stage) {
        const layers = Array.from(stage.querySelectorAll<HTMLElement>('[data-depth]'))
        const onMove = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect()
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          layers.forEach(l => {
            const d = +(l.getAttribute('data-depth') || 0)
            const base = l.classList.contains('back') ? ' rotate(5deg)' : ''
            l.style.transform = `translate(${(-x * d).toFixed(1)}px, ${(-y * d).toFixed(1)}px)${base}`
          })
        }
        const onLeave = () => layers.forEach(l => { l.style.transform = l.classList.contains('back') ? 'rotate(5deg)' : '' })
        stage.addEventListener('pointermove', onMove)
        stage.addEventListener('pointerleave', onLeave)
        cleanups.push(() => { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave) })
      }
      const magButtons = Array.from(document.querySelectorAll<HTMLElement>('.btn-amber'))
      magButtons.forEach(b => {
        b.classList.add('mag')
        const onMove = (e: PointerEvent) => {
          const r = b.getBoundingClientRect()
          b.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px)`
        }
        const onLeave = () => { b.style.transform = '' }
        b.addEventListener('pointermove', onMove)
        b.addEventListener('pointerleave', onLeave)
        cleanups.push(() => { b.removeEventListener('pointermove', onMove); b.removeEventListener('pointerleave', onLeave) })
      })
    }

    // scroll-linked parallax — stairs rise/fall and the phone tilts a little; runs on all devices
    function onScroll() {
      const hero = heroRef.current
      if (hero && heroStairsRef.current) {
        const r = hero.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)))
        heroStairsRef.current.style.transform = `translateY(${(p * -40).toFixed(1)}px)`
      }
      const final = finalRef.current
      if (final) {
        const r = final.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, 1 - r.top / Math.max(1, window.innerHeight)))
        finalRef.current?.querySelectorAll<HTMLElement>('.stairs i').forEach((bar, n) => {
          const k = Math.min(1, p * 1.6)
          bar.style.transform = `scaleY(${Math.max(.15, Math.min(1, k * (1.4 - n * .2))).toFixed(3)})`
        })
      }
      if (fine && phoneRef.current) {
        const r = phoneRef.current.getBoundingClientRect()
        const mid = r.top + r.height / 2
        const p = 1 - mid / window.innerHeight
        phoneRef.current.style.transform = `perspective(900px) rotateY(${((0.5 - p) * 16).toFixed(2)}deg) rotateX(${((p - 0.5) * 6).toFixed(2)}deg)`
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    cleanups.push(() => window.removeEventListener('scroll', onScroll))

    return () => cleanups.forEach(fn => fn())
  }, [])

  // hero total count-up on load
  useEffect(() => {
    const target = 1425
    const t0 = performance.now()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setHeroTotal(target); return }
    let raf = 0
    function step_(t: number) {
      const k = Math.min(1, (t - t0) / 900)
      const e = 1 - Math.pow(1 - k, 3)
      setHeroTotal(Math.round(target * e))
      if (k < 1) raf = requestAnimationFrame(step_)
    }
    const id = setTimeout(() => { raf = requestAnimationFrame(step_) }, 300)
    return () => { clearTimeout(id); cancelAnimationFrame(raf) }
  }, [])

  // before/after tabs auto-rotate
  useEffect(() => {
    tabTimer.current = setInterval(() => {
      if (!document.hidden) setTab(t => (t === 'before' ? 'after' : 'before'))
    }, 3800)
    return () => { if (tabTimer.current) clearInterval(tabTimer.current) }
  }, [])

  // stepper auto-rotate
  useEffect(() => {
    stepTimer.current = setInterval(() => {
      if (!document.hidden) setStep(s => (s + 1) % 3)
    }, 4000)
    return () => { if (stepTimer.current) clearInterval(stepTimer.current) }
  }, [])

  // sticky CTA once hero scrolls out of view
  useEffect(() => {
    const el = heroRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(([e]) => setStickyShown(!e.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function stopTabAuto(next: 'before' | 'after') {
    setTab(next)
    if (tabTimer.current) clearInterval(tabTimer.current)
  }
  function stopStepAuto(next: number) {
    setStep(next)
    if (stepTimer.current) clearInterval(stepTimer.current)
  }

  function updateItem(i: number, field: 'label' | 'amount', value: string) {
    setItems(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: field === 'amount' ? (parseFloat(value.replace(/[^\d.]/g, '')) || 0) : value } : r))
  }
  function generate() {
    setFlash(false)
    setSent(false)
    requestAnimationFrame(() => setFlash(true))
    const target = subtotal + vatAmount
    const t0 = performance.now()
    function step_(t: number) {
      const k = Math.min(1, (t - t0) / 700)
      setPreviewTotal(Math.round(target * (1 - Math.pow(1 - k, 3))))
      if (k < 1) requestAnimationFrame(step_)
    }
    requestAnimationFrame(step_)
    setTimeout(() => setFlash(false), 1100)
  }
  function sendDemo() {
    setPreviewTotal(subtotal + vatAmount)
    setSent(false)
    requestAnimationFrame(() => setSent(true))
  }

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <RevealObserver />
      <DotGridBackground />

      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#top" aria-label="StagePay home"><LogoFull /></a>
          <nav aria-label="Sections">
            <a href="#how">How it works</a><a href="#try">Try it</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a className="textlink" href="/auth/login" style={{ fontSize: 15, color: 'var(--ink)' }}>Sign in</a>
            <a className="btn btn-amber" href="/auth/signup">Try it free</a>
          </div>
        </div>
      </header>

      <div ref={progressRef} className="progress" aria-hidden="true" />

      <main id="top">
        <section className="band ink hero" id="hero" ref={heroRef}>
          <div className="glow" ref={glowRef} aria-hidden="true"></div>
          <div className="stairs" ref={heroStairsRef} aria-hidden="true"><i></i><i></i><i></i></div>
          <div className="wrap">
            <div>
              <p className="eyebrow"><span className="dot"></span>For tutors and education businesses in Botswana</p>
              <h1 ref={h1Ref}>You do the work. We send the invoice on <span className="wa">WhatsApp.</span></h1>
              <p className="lead">Fill in a few simple details. StagePay organises a professional invoice, sends it on WhatsApp and follows up until you&apos;re paid.</p>
              <div className="ctas">
                <a className="btn btn-amber" href="/auth/signup">Try it free <span className="arr">→</span></a>
                <a className="textlink" href="#how">See how it works →</a>
              </div>
              <p className="small"><b>First 100 users</b> get Pro free for one month.</p>
            </div>
            <div>
              <div className="stage" ref={stageRef} aria-label="Sample StagePay invoice for May tuition fees, total due P1,425, with delivery and reminder notifications" role="img">
                <div className="layer back" data-depth="10"><div className="invoice dim"><div className="steps-bar"><i></i><i></i><i></i></div><div className="inv-body"><div className="inv-top"><div><div className="inv-biz">Thuto Tutoring Centre</div><div className="inv-sub">Receipt · April</div></div><div className="inv-tag">RECEIPT</div></div><div style={{ height: 150 }}></div><div className="inv-total"><span>TOTAL PAID</span><b>P1,425</b></div></div><div className="stamp">PAID</div></div></div>
                <div className="layer front" data-depth="22"><div className="float"><div className="invoice build">
                  <div className="steps-bar"><i></i><i></i><i></i></div>
                  <div className="inv-body">
                    <div className="inv-top"><div><div className="inv-biz">Thuto Tutoring Centre</div><div className="inv-sub">Sample issuer · Gaborone</div></div><div className="inv-tag">INVOICE</div></div>
                    <div className="inv-meta"><div><div className="lbl">Bill to</div><div className="val">Thato M.</div></div><div><div className="lbl">Due date</div><div className="val">03 Jun 2026</div></div></div>
                    <table className="inv-rows">
                      <tbody>
                        <tr><td>Mathematics</td><td>P300</td></tr>
                        <tr><td>Science Double Award</td><td>P500</td></tr>
                        <tr><td>English</td><td>P300</td></tr>
                        <tr><td>Registration fee</td><td>P150</td></tr>
                        <tr className="rule muted"><td>Subtotal</td><td>P1,250</td></tr>
                        <tr className="muted"><td>VAT (14%)</td><td>P175</td></tr>
                      </tbody>
                    </table>
                    <div className="inv-total"><span>TOTAL DUE</span><b>{fmt(heroTotal)}</b></div>
                    <div className="inv-foot"><span>Sent and followed up with</span><LogoFull tone="default" /></div>
                  </div>
                </div></div></div>
                <div className="toast t1" data-depth="34"><span className="ic"><WhatsAppCheckIcon /></span><span>Sent on WhatsApp<small>to Thato M.</small></span></div>
                <div className="toast t2" data-depth="40"><span className="ic"><svg viewBox="0 0 24 24" aria-hidden><path d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" fill="none" stroke="#F2A900" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Reminder on WhatsApp<small>to Thato M.</small></span></div>
                <div className="toast t3" data-depth="30"><span className="ic"><svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#1F2A44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Repeats monthly<small>June invoice ready</small></span></div>
              </div>
              <p className="caption" style={{ textAlign: 'center', marginTop: 10 }}>Sample invoice. Names are illustrative.</p>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap split">
            <div className="reveal">
              <div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Still writing an invoice for every student, every month?</h2>
              <p className="lead">Receipt books get rewritten by hand every month. Spreadsheets help, but you still make every invoice and chase every payment yourself.</p>
              <ul className="pains">
                <li>Same details rewritten every month</li>
                <li>Chasing payments one by one</li>
                <li>Records spread across books and files</li>
              </ul>
            </div>
            <div className="compare reveal">
              <div className="tabs" role="tablist" aria-label="Compare">
                <span className="pill" aria-hidden="true" style={{ transform: tab === 'after' ? 'translateX(100%)' : 'none' }}></span>
                <button role="tab" aria-selected={tab === 'before'} onClick={() => stopTabAuto('before')}>Receipt book</button>
                <button role="tab" aria-selected={tab === 'after'} onClick={() => stopTabAuto('after')}>With StagePay</button>
              </div>
              <div className="panel">
                <div className="before" role="tabpanel" aria-hidden={tab !== 'before'}>
                  <div style={{ position: 'relative', width: '100%', display: 'grid', placeItems: 'center' }}>
                    <div className="paper two" aria-hidden="true"><div className="hand">Received from …</div><div className="ln"></div><div className="ln"></div></div>
                    <div className="paper">
                      <div className="hand">Received from Thato M.</div><div className="ln"></div>
                      <div className="hand">Maths, Science, <s>Eng</s> English</div><div className="ln"></div>
                      <div className="hand">the sum of P1,4<s>2</s>25</div><div className="ln"></div>
                      <div className="stub"><span>No. 0412</span><span>Date __/__</span></div>
                    </div>
                  </div>
                </div>
                <div className="after" role="tabpanel" aria-hidden={tab !== 'after'}>
                  <div className="mini"><div className="invoice"><div className="steps-bar"><i></i><i></i><i></i></div><div className="inv-body"><div className="inv-top"><div><div className="inv-biz">Thuto Tutoring Centre</div><div className="inv-sub">INV-202605-015</div></div><div className="inv-tag">INVOICE</div></div><table className="inv-rows" style={{ marginTop: 10 }}><tbody><tr><td>Mathematics</td><td>P300</td></tr><tr><td>Science Double Award</td><td>P500</td></tr><tr><td>English</td><td>P300</td></tr></tbody></table><div className="inv-total"><span>TOTAL DUE</span><b>P1,425</b></div></div></div></div>
                  <div className="badge-ok"><i></i>Sent on WhatsApp</div>
                </div>
              </div>
              <p className="caption" style={{ marginTop: 10, textAlign: 'center' }}>Illustration</p>
            </div>
          </div>
        </section>

        <section className="band p2">
          <div className="wrap">
            <div className="reveal"><div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Everything you need to bill and get paid</h2></div>
            <div className="grid-4">
              <div className="card reveal" style={{ transitionDelay: '0ms' }}><BrandCardIcon /><div><h3>Professional invoices</h3><p>Fill in the client, items and amounts; StagePay organises the rest.</p></div></div>
              <div className="card reveal" style={{ transitionDelay: '90ms' }}><WhatsAppCardIcon /><div><h3>WhatsApp delivery</h3><p>Invoices go straight to your client&apos;s WhatsApp.</p></div></div>
              <div className="card reveal" style={{ transitionDelay: '180ms' }}><ReminderCardIcon /><div><h3>Automatic reminders</h3><p>Follow-ups continue until the invoice is paid.</p></div></div>
              <div className="card reveal" style={{ transitionDelay: '270ms' }}><RecurringCardIcon /><div><h3>Recurring invoices</h3><p>Monthly fees go out for every student without retyping.</p></div></div>
            </div>
            <p className="note-line reveal"><VatIcon /> VAT is worked out on every invoice, and a receipt goes out once it&apos;s marked paid.</p>
          </div>
        </section>

        <section className="band" id="how">
          <div className="wrap">
            <div className="reveal"><div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Three steps from details to sent invoice</h2></div>
            <div className="how-grid">
              <div>
                <div className="steps running" role="tablist" aria-label="How it works">
                  <button className="step" role="tab" aria-selected={step === 0} onClick={() => stopStepAuto(0)}><span className="num">1</span><span><span className="h3">Fill in details</span><span className="p">Client, items and amounts.</span></span><span className="prog"><i key={step === 0 ? 'a' : 'b'}></i></span></button>
                  <button className="step" role="tab" aria-selected={step === 1} onClick={() => stopStepAuto(1)}><span className="num">2</span><span><span className="h3">Generate</span><span className="p">Your invoice is organised for you.</span></span><span className="prog"><i key={step === 1 ? 'a' : 'b'}></i></span></button>
                  <button className="step" role="tab" aria-selected={step === 2} onClick={() => stopStepAuto(2)}><span className="num">3</span><span><span className="h3">Send on WhatsApp</span><span className="p">StagePay follows up until it&apos;s paid.</span></span><span className="prog"><i key={step === 2 ? 'a' : 'b'}></i></span></button>
                </div>
                <p style={{ marginTop: 16 }}><span className="chip neutral">↻ Set it to repeat monthly</span></p>
              </div>
              <figure style={{ margin: 0, display: 'grid', gap: 12, justifyItems: 'center' }}>
                <div className="phone" ref={phoneRef} role="img" aria-label="Illustrative phone screens: filling in details, the generated invoice, and the WhatsApp chat with reminder and payment">
                  <div className="scr">
                    <div className="screen" aria-hidden={step !== 0}>
                      <div className="bar"><PhoneBarIcon /><div><div className="who">New invoice</div><div className="sub">StagePay</div></div></div>
                      <div className="ph-form">
                        <div className="ph-field"><span>Client</span><b>Thato M.</b></div>
                        <div className="ph-field"><span>WhatsApp</span><b>+267 7• ••• •••</b></div>
                        <div className="ph-field"><span>Item</span><b>Mathematics · P300</b></div>
                        <div className="ph-field"><span>Item</span><b>English · P300</b></div>
                        <div className="ph-btn">Generate invoice</div>
                      </div>
                    </div>
                    <div className="screen" aria-hidden={step !== 1}>
                      <div className="bar"><PhoneBarIcon /><div><div className="who">Invoice ready</div><div className="sub">INV-202605-016</div></div></div>
                      <div style={{ padding: 14 }}><div className="invoice"><div className="steps-bar"><i></i><i></i><i></i></div><div className="inv-body"><div className="inv-top"><div><div className="inv-biz" style={{ fontSize: 13 }}>Thuto Tutoring Centre</div><div className="inv-sub">Bill to Thato M.</div></div><div className="inv-tag">INVOICE</div></div><table className="inv-rows" style={{ marginTop: 8 }}><tbody><tr><td>Mathematics</td><td>P300</td></tr><tr><td>English</td><td>P300</td></tr><tr className="rule muted"><td>Subtotal</td><td>P600</td></tr><tr className="muted"><td>VAT (14%)</td><td>P84</td></tr></tbody></table><div className="inv-total"><span>TOTAL DUE</span><b>P684</b></div></div></div><div className="ph-btn" style={{ marginTop: 12 }}>Send on WhatsApp</div></div>
                    </div>
                    <div className="screen" aria-hidden={step !== 2}>
                      <div className="bar"><PhoneBarIcon /><div><div className="who">Thuto Tutoring Centre</div><div className="sub">Business chat</div></div></div>
                      <div className="msgs">
                        <div className="bub">Hello, your May tuition invoice is ready.<div className="att"><BrandCardIcon /><div><b>INV-202605-016.pdf</b><span>Total due P684 · 03 Jun</span></div></div></div>
                        <div className="bub rem">Reminder: P684 is due on 03 Jun.</div>
                        <div className="bub me">Paid this morning, thanks!</div>
                        <div className="bub">Thank you. Your receipt is attached.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <figcaption className="caption">Illustrative screens</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="band p2" id="try">
          <div className="wrap">
            <div className="reveal"><div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Try it: make a sample invoice</h2>
              <p className="lead" style={{ marginTop: 14 }}>Change the details and watch the invoice update. This is a demo; nothing is saved or sent.</p></div>
            <div className="try">
              <div className="panel-card reveal">
                <div className="demo-grid">
                  <div className="field"><label htmlFor="d-biz">Your business name</label><input id="d-biz" value={bizName} maxLength={40} onChange={e => setBizName(e.target.value)} /></div>
                  <div className="field"><label htmlFor="d-client">Client name</label><input id="d-client" value={clientName} maxLength={30} onChange={e => setClientName(e.target.value)} /></div>
                  {items.map((row, i) => (
                    <div className="row2" key={i}>
                      <div className="field">{i === 0 && <label htmlFor={`d-i${i}`}>Item</label>}<input id={`d-i${i}`} value={row.label} maxLength={30} aria-label={`Item ${i + 1}`} onChange={e => updateItem(i, 'label', e.target.value)} /></div>
                      <div className="field">{i === 0 && <label htmlFor={`d-a${i}`}>Amount (P)</label>}<input id={`d-a${i}`} inputMode="decimal" value={row.amount} aria-label={`Amount ${i + 1}`} onChange={e => updateItem(i, 'amount', e.target.value)} /></div>
                    </div>
                  ))}
                  <label className="toggle"><input type="checkbox" checked={vat} onChange={e => setVat(e.target.checked)} /> Add VAT (14%, sample rate)</label>
                  <div className="demo-actions">
                    <button className="btn btn-amber" type="button" onClick={generate}>Generate</button>
                    <button className="btn btn-ghost" type="button" onClick={sendDemo}>Send on WhatsApp</button>
                  </div>
                </div>
              </div>
              <div className="preview reveal">
                <div className={`invoice ${flash ? 'flash' : ''}`}>
                  <div className="steps-bar"><i></i><i></i><i></i></div>
                  <div className="inv-body">
                    <div className="inv-top"><div><div className="inv-biz">{bizName || 'Your business name'}</div><div className="inv-sub">INV-0001 · auto-numbered</div></div><div className="inv-tag">INVOICE</div></div>
                    <div className="inv-meta"><div><div className="lbl">Bill to</div><div className="val">{clientName || 'Client name'}</div></div><div><div className="lbl">Repeats</div><div className="val">Monthly</div></div></div>
                    <table className="inv-rows"><tbody>
                      {items.filter(r => r.label || r.amount).map((r, i) => <tr key={i}><td>{r.label || 'Item'}</td><td>{fmt(r.amount)}</td></tr>)}
                      <tr className="rule muted"><td>Subtotal</td><td>{fmt(subtotal)}</td></tr>
                      {vat && <tr className="muted"><td>VAT (14%)</td><td>{fmt(vatAmount)}</td></tr>}
                    </tbody></table>
                    <div className="inv-total"><span>TOTAL DUE</span><b>{fmt(previewTotal)}</b></div>
                    <div className="inv-foot"><span>Sent and followed up with</span><LogoFull tone="default" /></div>
                  </div>
                </div>
                {sent && <div className="sentbox"><span className="ic"><WhatsAppCheckIcon stroke="#1F2A44" /></span><span><b>In the real app, this goes to your client&apos;s WhatsApp.</b><small>StagePay then follows up until it&apos;s paid.</small></span></div>}
                <p className="demo-note">Demo preview. <a href="/auth/signup" style={{ color: 'var(--ink)', fontWeight: 700 }}>Sign up free</a> to send real invoices.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap reveal">
            <div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
            <h2 className="h2">Built in Botswana, and just getting started</h2>
            <p className="lead" style={{ marginTop: 18 }}>StagePay is new. We built it after seeing tutors still invoice from paper receipt books. We&apos;re looking for our first users, and your feedback will shape what comes next.</p>
            <a className="btn btn-ghost" href="mailto:getstagepay@gmail.com?subject=StagePay%20feedback" style={{ marginTop: 24 }}>Share feedback</a>
          </div>
        </section>

        <section className="band p2" id="pricing">
          <div className="wrap">
            <div className="reveal"><div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Simple plans</h2></div>
            <div className="plans">
              <div className="plan reveal" style={{ transitionDelay: '0ms' }}><div className="name">Free</div><div className="price"><Counter to={0} /></div><p className="desc">Up to 2 invoices a month.</p><a className="btn btn-ghost" href="/auth/signup">Get started</a></div>
              <div className="plan hi reveal" style={{ transitionDelay: '90ms' }}><div className="name">Pro</div><span className="badge">First 100 users: 1 month free</span><div className="price"><Counter to={100} /> <small>/ month</small></div><p className="desc">Unlimited invoices. For tutors and small businesses.</p><a className="btn btn-amber" href="/auth/signup">Get started</a></div>
              <div className="plan reveal" style={{ transitionDelay: '180ms' }}><div className="name">Business</div><div className="price"><Counter to={400} /> <small>/ month</small></div><p className="desc">For teams with multiple users.</p><a className="btn btn-ghost" href="/auth/signup">Get started</a></div>
            </div>
            <p className="swipe">Swipe to see all plans →</p>
          </div>
        </section>

        <section className="band" id="faq">
          <div className="wrap">
            <div className="reveal"><div className="mark" aria-hidden="true"><i></i><i></i><i></i></div>
              <h2 className="h2">Questions</h2></div>
            <div className="faq">
              <details className="reveal" style={{ transitionDelay: '0ms' }}><summary>Do my clients need an app?</summary><p>No. Invoices arrive in their normal WhatsApp.</p></details>
              <details className="reveal" style={{ transitionDelay: '90ms' }}><summary>Is StagePay VAT-ready?</summary><p>VAT is calculated on every invoice. We&apos;re still confirming our invoices meet every BURS requirement, so please check with your accountant for now.</p></details>
              <details className="reveal" style={{ transitionDelay: '180ms' }}><summary>What happens after the free month?</summary><p>You choose a plan: Pro at P100 a month for tutors and small businesses, or Business at P400 a month for teams.</p></details>
            </div>
          </div>
        </section>

        <section className="band ink final" ref={finalRef}>
          <div className="stairs" ref={finalStairsRef} aria-hidden="true"><i></i><i></i><i></i></div>
          <div className="wrap">
            <LogoFull tone="on-ink" className="logo-r" />
            <h2>Send your next invoice the easy way.</h2>
            <div><a className="btn btn-amber" href="/auth/signup">Try it free <span className="arr">→</span></a></div>
            <ContactPills />
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>© 2026 StagePay</span>
          <details><summary>Privacy</summary><p>We only use your details to run your StagePay account and keep you updated. We don&apos;t sell them. Email {CONTACT.email} at any time with questions.</p></details>
        </div>
      </footer>

      <div className={`sticky ${stickyShown ? 'show' : ''}`} aria-hidden={!stickyShown}>
        <span>Free month of Pro</span>
        <a className="btn btn-amber" tabIndex={stickyShown ? 0 : -1} href="/auth/signup">Try it free</a>
      </div>
    </div>
  )
}

function ContactPills() {
  const [copied, setCopied] = useState<string | null>(null)
  function copy(key: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }
  return (
    <div className="contact">
      <span className="pillc">WhatsApp {CONTACT.whatsapp}<button type="button" onClick={() => copy('wa', CONTACT.whatsapp)}>{copied === 'wa' ? 'Copied' : 'Copy'}</button></span>
      <span className="pillc">Email {CONTACT.email}<button type="button" onClick={() => copy('email', CONTACT.email)}>{copied === 'email' ? 'Copied' : 'Copy'}</button></span>
    </div>
  )
}
