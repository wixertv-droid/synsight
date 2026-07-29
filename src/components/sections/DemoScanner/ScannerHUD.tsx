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



const codeLines = [

"INITIALIZING NEURAL IDENTITY GRAPH",

"CONNECTING PUBLIC DATA NODES",

"CORRELATING DIGITAL FOOTPRINTS",

"ANALYZING USERNAME PATTERNS",

"SEARCHING OPEN INTELLIGENCE SOURCES",

"BUILDING EXPOSURE MAP",

"CALCULATING RISK VECTOR",

"GENERATING SYN|SIGHT MODEL"

];




export default function ScannerHUD({

phase,

progress,

query,

data

}:ScannerHUDProps){



return (

<div

className="

relative

h-full

flex

items-center

justify-center

overflow-hidden

bg-black

"

>



{/* Network Background */}

<div className="absolute inset-0 opacity-40">


{

Array.from({length:18}).map((_,i)=>(

<div

key={i}

className="

absolute

w-2

h-2

rounded-full

bg-cyan-400

animate-pulse

"

style={{

left:`${Math.random()*90}%`,

top:`${Math.random()*90}%`,

animationDelay:`${i*120}ms`

}}

/>

))

}


</div>






{/* Animated Neural Lines */}

<div

className="

absolute

inset-0

"

>

<svg

width="100%"

height="100%"

>

{

Array.from({length:15}).map((_,i)=>(

<line

key={i}

x1={`${Math.random()*100}%`}

y1={`${Math.random()*100}%`}

x2={`${Math.random()*100}%`}

y2={`${Math.random()*100}%`}

stroke="currentColor"

className="

text-cyan-500/30

animate-pulse

"

/>

))

}

</svg>


</div>







<div

className="

relative

z-10

w-full

max-w-5xl

px-10

"

>




<div

className="

border

border-cyan-400/30

rounded-2xl

bg-black/70

backdrop-blur-xl

p-8

shadow-[0_0_80px_rgba(0,200,255,.15)]

"

>




<div

className="

flex

justify-between

mb-8

"

>


<div>


<div

className="

text-cyan-400

font-mono

text-xs

tracking-[0.5em]

"

>

SYN|SIGHT INTELLIGENCE CORE

</div>



<div

className="

text-white

text-2xl

mt-3

font-semibold

"

>

DIGITAL RECON SCAN

</div>


</div>



<div

className="

font-mono

text-cyan-300

"

>

{progress}%

</div>



</div>






<div

className="

mb-8

"

>

<div

className="

text-gray-400

text-xs

mb-2

tracking-widest

"

>

TARGET ENTITY

</div>


<div

className="

text-white

font-mono

text-lg

"

>

{query}

</div>


</div>








{/* Code Stream */}

<div

className="

h-48

overflow-hidden

border

border-cyan-400/20

rounded-xl

bg-black

p-5

font-mono

text-sm

"

>


{

codeLines.map((line,index)=>(


<div

key={line}

className="

text-cyan-300

animate-pulse

mb-2

"

style={{

animationDelay:`${index*150}ms`

}}

>

<span className="text-gray-600">

[{String(index+1).padStart(2,"0")}]

</span>

{" "}

{line}

<span className="text-white">

_

</span>


</div>



))

}


</div>








<div

className="

mt-8

grid

grid-cols-3

gap-4

"

>


<StatusBox

title="NEURAL LINKS"

value="ACTIVE"

/>


<StatusBox

title="DATA STREAM"

value="CONNECTED"

/>


<StatusBox

title="RISK ENGINE"

value="RUNNING"

/>


</div>




</div>



</div>


</div>


);


}







function StatusBox({

title,

value

}:{

title:string;

value:string;

}){


return (

<div

className="

border

border-cyan-400/20

rounded-xl

p-4

bg-cyan-400/5

"

>


<div

className="

text-gray-500

text-xs

tracking-widest

"

>

{title}

</div>



<div

className="

text-cyan-300

font-mono

mt-2

"

>

{value}

</div>


</div>


);


}
