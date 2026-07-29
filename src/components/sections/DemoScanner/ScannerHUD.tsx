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

}: ScannerHUDProps) {



const modules = [

  "IDENTITY RECON ENGINE",

  "PUBLIC DATA MATRIX",

  "USERNAME CORRELATION",

  "EXPOSURE ANALYSIS",

  "METADATA INSPECTION",

  "RISK INTELLIGENCE CORE",

];



const codeLines = [

"decrypting public identity nodes",

"mapping digital fingerprints",

"correlating open source intelligence",

"analyzing exposure vectors",

"building risk intelligence model",

"generating threat profile",

"finalizing intelligence report"

];



return (

<div

className="

relative

h-screen

w-full

overflow-hidden

bg-black

text-cyan-400

font-mono

"

>



{/* CENTER CORE */}

<div

className="

absolute

inset-0

flex

items-center

justify-center

"

>


<div

className="

relative

w-[420px]

h-[420px]

"

>


{/* outer rings */}

<div

className="

absolute

inset-0

rounded-full

border

border-cyan-400/20

animate-[spin_18s_linear_infinite]

"

/>


<div

className="

absolute

inset-10

rounded-full

border

border-blue-400/30

animate-[spin_12s_linear_infinite_reverse]

"

/>



<div

className="

absolute

inset-20

rounded-full

border

border-cyan-300/20

"

/>



{/* scanning beam */}

<div

className="

absolute

left-1/2

top-0

h-full

w-[2px]

bg-cyan-400/60

shadow-[0_0_30px_#00ffff]

animate-[pulse_1.5s_infinite]

"

/>



<div

className="

absolute

top-1/2

left-1/2

-translate-x-1/2

-translate-y-1/2

text-center

"

>


<div

className="

text-xs

tracking-[.5em]

text-cyan-300/70

mb-4

"

>

SYN|SIGHT AI CORE

</div>



<div

className="

text-4xl

font-bold

tracking-widest

text-white

animate-pulse

"

>

{Math.floor(progress)}%

</div>



<div

className="

mt-3

text-xs

text-cyan-400/70

"

>

ACTIVE ANALYSIS

</div>


</div>



{/* nodes */}

{

Array.from({length:12}).map((_,i)=>(


<div

key={i}

className="

absolute

w-2

h-2

rounded-full

bg-cyan-400

shadow-[0_0_20px_#00ffff]

animate-pulse

"

style={{

left:`${50 + Math.cos(i*30*Math.PI/180)*45}%`,

top:`${50 + Math.sin(i*30*Math.PI/180)*45}%`,

animationDelay:`${i*150}ms`

}}


/>



))

}


</div>


</div>






{/* LEFT MODULE PANEL */}

<div

className="

absolute

left-8

top-20

w-72

space-y-3

"

>


<div

className="

text-xs

tracking-[.4em]

mb-5

"

>

SYSTEM MODULES

</div>



{

modules.map((m,i)=>(


<div

key={m}

className="

flex

items-center

gap-3

border

border-cyan-400/20

bg-cyan-400/5

px-4

py-3

rounded-lg

backdrop-blur

"

>


<div

className="

w-2

h-2

rounded-full

bg-cyan-400

animate-pulse

"


/>


<span

className="

text-xs

text-cyan-200

"

>

{m}

</span>



</div>


))

}


</div>







{/* RIGHT CODE STREAM */}


<div

className="

absolute

right-8

top-20

w-80

"

>


<div

className="

text-xs

tracking-[.4em]

mb-5

"

>

LIVE NEURAL STREAM

</div>



<div

className="

space-y-2

text-xs

text-cyan-300/70

"

>


{

codeLines.map((line,i)=>(


<div

key={line}

className="

animate-[pulse_2s_infinite]

"

style={{

animationDelay:`${i*300}ms`

}}

>

&gt; {line}

</div>


))

}


</div>



</div>







{/* TARGET */}

<div

className="

absolute

bottom-20

left-1/2

-translate-x-1/2

text-center

"

>


<div

className="

text-xs

text-gray-500

tracking-widest

"

>

TARGET

</div>



<div

className="

text-white

mt-2

"

>

{query}

</div>


</div>




{/* Grid nur leicht */}

<div

className="

absolute

inset-0

pointer-events-none

bg-[linear-gradient(rgba(0,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,.04)_1px,transparent_1px)]

bg-[size:60px_60px]

"

/>




</div>

);

}
