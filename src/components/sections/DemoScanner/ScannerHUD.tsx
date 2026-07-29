"use client";

import type {
  ScanPhase,
  ScanData
} from "./types";


interface ScannerHUDProps {

  phase: ScanPhase;

  progress:number;

  query:string;

  data?:ScanData;

}



const operations = [

"IDENTITY MATRIX INITIALIZED",

"PUBLIC INTELLIGENCE CHANNELS ONLINE",

"ENTITY RESOLUTION RUNNING",

"DIGITAL FOOTPRINT MAPPING",

"CORRELATION ENGINE ACTIVE",

"RISK MODEL CALCULATING",

"AI ASSESSMENT GENERATING"

];




export default function ScannerHUD({

progress,

query

}:ScannerHUDProps){


return (

<div

className="

relative

h-full

w-full

overflow-hidden

bg-[#02070d]

flex

items-center

justify-center

"

>



{/* Deep Space Grid */}

<div

className="

absolute

inset-0

opacity-20

bg-[linear-gradient(rgba(0,200,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(0,200,255,.12)_1px,transparent_1px)]

bg-[size:80px_80px]

"

/>





{/* Scanner Core */}

<div

className="

relative

z-10

w-[650px]

h-[650px]

flex

items-center

justify-center

"

>



<div

className="

absolute

inset-0

rounded-full

border

border-cyan-400/20

animate-[spin_18s_linear_infinite]

"

>



<div

className="

absolute

top-0

left-1/2

w-2

h-2

rounded-full

bg-cyan-400

shadow-[0_0_30px_#22d3ee]

"

/>


</div>







<div

className="

absolute

w-[420px]

h-[420px]

rounded-full

border

border-cyan-400/20

"

>



<div

className="

absolute

inset-10

rounded-full

bg-cyan-400/5

blur-xl

animate-pulse

"

/>



</div>









{/* AI Core */}

<div

className="

relative

w-52

h-52

rounded-full

border

border-cyan-300/50

bg-cyan-400/10

backdrop-blur-xl

flex

items-center

justify-center

shadow-[0_0_100px_rgba(34,211,238,.35)]

"

>


<div

className="

text-center

font-mono

"

>

<div

className="

text-cyan-300

text-xs

tracking-[.5em]

"

>

AI CORE

</div>


<div

className="

text-white

text-4xl

font-bold

mt-3

"

>

{progress}%

</div>


</div>



</div>






</div>








{/* HUD Panel */}

<div

className="

absolute

z-20

bottom-10

left-10

right-10

grid

lg:grid-cols-3

gap-5

"

>





<div

className="

border

border-cyan-400/20

bg-black/70

backdrop-blur-xl

rounded-xl

p-5

"

>


<div

className="

text-xs

text-gray-500

tracking-[.3em]

"

>

TARGET

</div>


<div

className="

text-white

font-mono

mt-3

truncate

"

>

{query}

</div>


</div>








<div

className="

border

border-cyan-400/20

bg-black/70

backdrop-blur-xl

rounded-xl

p-5

"

>


<div

className="

text-xs

text-gray-500

tracking-[.3em]

"

>

SYSTEM STATUS

</div>


<div

className="

text-cyan-300

font-mono

mt-3

"

>

ONLINE / ANALYZING

</div>


</div>







<div

className="

border

border-cyan-400/20

bg-black/70

backdrop-blur-xl

rounded-xl

p-5

overflow-hidden

"

>


<div

className="

text-xs

text-gray-500

tracking-[.3em]

"

>

LIVE PROCESS

</div>


<div

className="

mt-3

space-y-1

font-mono

text-xs

text-cyan-300

"

>


{

operations.map((item,index)=>(


<div

key={item}

className="opacity-80"

>

<span className="text-gray-600">

0{index+1}

</span>

{" "}

{item}

</div>


))


}



</div>


</div>



</div>





</div>

);


}
