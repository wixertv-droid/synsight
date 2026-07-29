"use client";

import { useEffect, useRef } from "react";
import type { ApiResult, ScanData, ScanPhase } from "./types";


interface Props {
  phase: ScanPhase;
  progress: number;
  logs: string[];
  input: string;
  apiResult: ApiResult | null;
  rawData: ScanData | null;

  closeFullscreen: () => void;
}


export default function ScannerOverlay({
  phase,
  progress,
  logs,
  input,
  apiResult,
  rawData,
  closeFullscreen,
}: Props) {


const terminalRef = useRef<HTMLDivElement>(null);


useEffect(()=>{

if(terminalRef.current){
terminalRef.current.scrollTop =
terminalRef.current.scrollHeight;
}

},[logs]);



return (

<>

<style jsx>{`

@keyframes scanline {

0%{
transform:translateY(-100%);
}

100%{
transform:translateY(100vh);
}

}


@keyframes crtOff {


0%{
transform:scale(1);
opacity:1;
}


45%{

transform:
scale(1,.01);

filter:
brightness(5);

}


70%{

transform:
scale(.01,.01);

}


100%{

transform:
scale(0);

opacity:0;

}

}


.crt-close{

animation:
crtOff .65s ease forwards;

}


.scanline{

position:absolute;
top:0;
left:0;
width:100%;
height:20vh;

background:
linear-gradient(
transparent,
rgba(0,255,255,.25),
transparent
);


animation:
scanline 3s linear infinite;

}



`}</style>



{
(
phase==="scanning" ||
phase==="fullscreen_result" ||
phase==="closing_crt"

)

&&

<div

className={`
fixed inset-0 z-[999]
bg-black
overflow-hidden
font-mono

${phase==="closing_crt"
?
"crt-close"
:
""
}

`}

>


<div className="absolute inset-0

bg-[radial-gradient(circle,rgba(0,255,255,.12),transparent_60%)]

"/>



<div className="scanline"/>



<div className="
absolute inset-8
border
border-cyan-400/20
pointer-events-none
"/>



<div className="
absolute top-10 left-10
text-cyan-400/70
tracking-[.5em]
text-xs
">

SYN|SIGHT
INTELLIGENCE
CORE

</div>




{
phase==="scanning"

&&


<div className="
h-full
flex
flex-col
items-center
justify-center
">


<div className="
text-cyan-400
tracking-[.6em]
text-sm
mb-12
animate-pulse
">

GLOBAL DIGITAL EXPOSURE SCAN

</div>



<div className="
relative
w-96
h-96
flex
items-center
justify-center
">


<div className="
absolute
inset-0
rounded-full
border
border-cyan-400/30
animate-spin
"/>



<div className="
absolute
inset-8
rounded-full
border
border-dashed
border-cyan-300/40
animate-spin
[animation-duration:8s]
"/>



<div className="
w-56
h-56
rounded-full
border-2
border-cyan-400
flex
items-center
justify-center
shadow-[0_0_50px_rgba(0,255,255,.5)]
">


<span className="
text-6xl
font-bold
text-white
">

{progress}%

</span>


</div>


</div>



<div className="
mt-10
text-white
uppercase
tracking-widest
">

TARGET:
{input}

</div>



<div
ref={terminalRef}
className="
mt-6
w-full
max-w-3xl
h-40
bg-black/70
border
border-cyan-400/20
rounded
p-4
text-xs
text-cyan-300/70
overflow-hidden
"
>

{

logs.map(
(log,i)=>(

<div key={i}>
{log}
</div>

)

)

}

</div>


</div>

}





{
phase==="fullscreen_result"

&&


<div className="
h-full
overflow-y-auto
p-10
max-w-6xl
mx-auto
">


<div className="
flex
justify-between
border-b
border-cyan-400/30
pb-5
mb-8
">


<h2 className="
text-cyan-400
tracking-widest
text-xl
">

INTELLIGENCE REPORT

</h2>



<button

onClick={closeFullscreen}

className="
px-5
py-3
border
border-red-500/40
text-red-400
rounded
hover:bg-red-500/10
"

>

SYSTEM SHUTDOWN

</button>


</div>




<div className="
grid
md:grid-cols-3
gap-5
mb-10
">


<Card
title="Digitale Spuren"
value={
String(rawData?.exposure_count ?? "Analyse")
}
/>


<Card
title="Gefundene Quellen"
value={
String(rawData?.sources_found ?? "Öffentlich")
}
/>


<Card
title="Risiko"
value={
apiResult?.riskLevel ??
"Bewertung"
}
/>


</div>




<div className="
border
border-cyan-400/20
bg-cyan-400/5
rounded-xl
p-8
">


<h3 className="
text-cyan-300
mb-4
">

VORLÄUFIGE SYNIGHT BEWERTUNG

</h3>



<p className="
text-white
leading-relaxed
">

{apiResult?.summary}


</p>



</div>




<div className="
mt-8
text-center
text-cyan-300
">

Weitere Sicherheitsinformationen sind nach Registrierung verfügbar.

</div>


</div>


}




</div>

}


</>


)

}



function Card({
title,
value
}:{
title:string;
value:string;
}){

return (

<div className="
bg-white/5
border
border-white/10
rounded-xl
p-5
">


<div className="
text-xs
text-gray-400
mb-2
">

{title}

</div>


<div className="
text-xl
text-cyan-300
font-bold
">

{value}

</div>


</div>

)

}
