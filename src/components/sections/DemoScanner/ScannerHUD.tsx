"use client";


export default function ScannerHUD() {


return (

<>


<div className="
absolute
inset-6
border
border-cyber-cyan/20
pointer-events-none
"/>


{/* Ecken */}

<div className="
absolute top-8 left-8
w-20 h-20
border-t-2
border-l-2
border-cyber-cyan/60
"/>


<div className="
absolute top-8 right-8
w-20 h-20
border-t-2
border-r-2
border-cyber-cyan/60
"/>


<div className="
absolute bottom-8 left-8
w-20 h-20
border-b-2
border-l-2
border-cyber-cyan/60
"/>


<div className="
absolute bottom-8 right-8
w-20 h-20
border-b-2
border-r-2
border-cyber-cyan/60
"/>



{/* Header */}

<div
className="
absolute
top-10
left-1/2
-translate-x-1/2
text-center
font-mono
"
>


<div
className="
text-cyber-cyan
tracking-[0.6em]
text-sm
animate-pulse
"
>

SYNSIGHT

</div>


<div
className="
text-white/40
text-xs
tracking-[0.3em]
mt-2
"
>

DIGITAL INTELLIGENCE CORE

</div>


</div>



{/* Linkes System Panel */}

<div
className="
absolute
left-12
top-1/2
-translate-y-1/2
hidden lg:block
font-mono
text-xs
space-y-4
text-cyber-cyan/70
"
>


<div>
SYSTEM
<br/>
<span className="text-white">
ONLINE
</span>
</div>


<div>
AI ENGINE
<br/>
<span className="text-white">
ACTIVE
</span>
</div>


<div>
OSINT NODE
<br/>
<span className="text-white">
CONNECTED
</span>
</div>


</div>




{/* Rechtes Panel */}

<div
className="
absolute
right-12
top-1/2
-translate-y-1/2
hidden lg:block
font-mono
text-xs
space-y-4
text-cyber-cyan/70
"
>


<div>

SECURE LINK

<br/>

<span className="text-white">
ENCRYPTED
</span>

</div>


<div>

THREAT AI

<br/>

<span className="text-white">
READY
</span>

</div>


<div>

NODE

<br/>

<span className="text-white">
DE-01
</span>

</div>



</div>


</>

);


}
