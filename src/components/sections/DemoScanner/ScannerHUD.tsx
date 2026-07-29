"use client";

import {
  ScanPhase,
  ScanData,
} from "./types";


interface ScannerHUDProps {

  phase: ScanPhase;

  progress: number;

  query: string;

  data?: ScanData;

}


export default function ScannerHUD({

  phase,

  progress,

  query,

  data,

}: ScannerHUDProps) {


const modules = [

"IDENTITY RECON ENGINE",

"PUBLIC DATA MATRIX",

"USERNAME CORRELATION",

"EXPOSURE ANALYSIS",

"METADATA INSPECTION",

"RISK INTELLIGENCE CORE",

];


return (

<div
className="
absolute
inset-0
flex
flex-col
p-6
text-cyan-400
font-mono
pointer-events-none
"
>


{/* HEADER */}

<div
className="
flex
justify-between
items-center
border-b
border-cyan-500/30
pb-3
"
>

<div>

<div
className="
text-xl
tracking-[0.35em]
font-bold
"
>
SYNSIGHT
</div>


<div
className="
text-xs
opacity-70
tracking-widest
"
>
CYBER IDENTITY INTELLIGENCE SYSTEM
</div>


</div>


<div
className="
text-right
text-xs
"
>

<div>
STATUS:
{" "}
<span
className="text-green-400"
>
ONLINE
</span>
</div>


<div>
PHASE:
{" "}
{phase.toUpperCase()}
</div>


</div>


</div>



{/* QUERY */}

<div
className="
mt-6
bg-black/40
border
border-cyan-500/30
rounded-lg
p-4
"
>

<div
className="text-xs opacity-60"
>
TARGET IDENTIFIER
</div>


<div
className="
text-lg
mt-1
text-white
"
>
{query || "WAITING INPUT"}
</div>


</div>




{/* MODULE STREAM */}


<div
className="
mt-6
space-y-2
text-xs
"
>

{
modules.map(
(module,index)=>(

<div
key={module}
className="
flex
justify-between
border-b
border-cyan-500/10
pb-1
"
>

<span>
{module}
</span>


<span
className={
progress >
index * 15
?
"text-green-400"
:
"text-cyan-700"
}
>

{
progress >
index * 15
?
"COMPLETE"
:
"WAITING"
}

</span>


</div>

))
}


</div>




{/* PROGRESS */}

<div
className="
mt-auto
"
>


<div
className="
flex
justify-between
text-xs
mb-2
"
>

<span>
SCANNING DEPTH
</span>


<span>
{progress}%
</span>


</div>


<div
className="
h-2
bg-cyan-950
rounded-full
overflow-hidden
"
>

<div

style={{
width:`${progress}%`
}}

className="
h-full
bg-cyan-400
shadow-[0_0_20px_#00ffff]
transition-all
duration-500
"

/>

</div>


</div>





{/* RESULT PREVIEW */}

{
data &&

<div
className="
mt-5
border
border-red-500/40
bg-red-950/20
rounded-lg
p-4
"
>

<div
className="
text-red-400
text-xs
tracking-widest
"
>
INTELLIGENCE SUMMARY
</div>


<div
className="
text-white
mt-2
text-sm
"
>

Risk Level:
{" "}
{data.riskLevel}


</div>


<div
className="
text-xs
opacity-80
mt-2
"
>

{data.summary.slice(0,180)}
...

</div>


</div>

}



</div>

);

}
