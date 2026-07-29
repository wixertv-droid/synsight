"use client";

import type { ScanData } from "./types";


interface ScannerHUDProps {
  progress: number;
  target: string;
  logs: string[];
  scanData?: ScanData | null;
}


export default function ScannerHUD({
  progress,
  target,
  logs,
  scanData
}: ScannerHUDProps) {


return (

<div className="
relative
w-full
h-full
flex
flex-col
items-center
justify-center
px-6
font-mono
">


{/* HEADER */}

<div className="
absolute
top-10
text-center
tracking-[0.45em]
text-cyan-400/80
text-xs
uppercase
animate-pulse
">

S Y N | S I G H T

<br/>

GLOBAL INTELLIGENCE CORE

</div>



{/* RADAR */}

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
border-cyan-400/20
animate-spin
[animation-duration:12s]
"/>



<div className="
absolute
inset-8
rounded-full
border
border-dashed
border-cyan-300/30
animate-spin
[animation-duration:8s]
[animation-direction:reverse]
"/>



<div className="
absolute
inset-16
rounded-full
border
border-cyan-400/40
"/>



<div className="
absolute
w-1/2
h-[1px]
bg-cyan-400/50
left-1/2
top-1/2
origin-left
animate-spin
[animation-duration:3s]
"/>



{/* PROGRESS CORE */}

<div className="
relative
w-56
h-56
rounded-full
border-2
border-cyan-400
bg-black/40
flex
items-center
justify-center
shadow-[0_0_60px_rgba(0,255,255,.35)]
">


<div className="
text-center
">


<div className="
text-6xl
font-bold
text-white
tracking-tight
">

{progress}

%

</div>


<div className="
text-[10px]
tracking-[0.4em]
text-cyan-400
mt-2
">

ANALYZING

</div>


</div>


</div>


</div>





{/* TARGET */}

<div className="
mt-8
text-center
">


<div className="
text-xs
text-gray-500
tracking-[0.4em]
mb-2
">

TARGET IDENTIFIED

</div>


<div className="
text-xl
text-white
tracking-widest
uppercase
">

{target}

</div>


</div>





{/* MODULE STATUS */}

<div className="
mt-8
grid
grid-cols-2
gap-x-12
gap-y-2
text-xs
max-w-xl
w-full
">


<Module text="Identity Resolution"/>

<Module text="Public Source Mapping"/>

<Module text="Username Correlation"/>

<Module text="Metadata Analysis"/>

<Module text="Exposure Detection"/>

<Module 
text={
scanData
?
"Risk Engine Complete"
:
"Risk Engine Running"
}
/>


</div>





{/* LIVE STREAM */}

<div className="
absolute
bottom-8
left-8
right-8
max-w-5xl
mx-auto
">


<div className="
border
border-cyan-400/20
bg-black/60
rounded-lg
p-4
h-36
overflow-hidden
text-xs
text-cyan-300/70
shadow-[inset_0_0_30px_rgba(0,255,255,.05)]
">


<div className="
text-cyan-400
border-b
border-cyan-400/20
pb-2
mb-2
tracking-widest
">

LIVE INTELLIGENCE STREAM

</div>



{

logs.map(
(log,index)=>(

<div
key={index}
className="
animate-in
fade-in
duration-300
"
>

{log}

</div>

)

)

}


</div>


</div>



</div>

);

}




function Module({
text
}:{
text:string;
}){


return (

<div className="
flex
items-center
gap-2
text-cyan-300/80
">


<span className="
w-2
h-2
rounded-full
bg-cyan-400
animate-pulse
"/>


{text}


</div>

);


}
