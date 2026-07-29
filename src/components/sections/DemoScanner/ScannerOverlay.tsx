"use client";

import BackgroundGrid from "./BackgroundGrid";
import ScannerHUD from "./ScannerHUD";
import type { ApiResult, ScanData, ScanPhase } from "./types";


interface ScannerOverlayProps {

  phase: ScanPhase;

  progress: number;

  target: string;

  logs: string[];

  apiResult: ApiResult | null;

  rawData: ScanData | null;

  onClose: () => void;

}




export default function ScannerOverlay({

phase,

progress,

target,

logs,

apiResult,

rawData,

onClose


}: ScannerOverlayProps) {



if(

phase !== "scanning" &&
phase !== "fullscreen_result" &&
phase !== "closing_crt"

){

return null;

}




return (


<div

className={`
fixed
inset-0
z-[999]
bg-black
overflow-hidden

${
  phase === "closing_crt"
    ? "crt-off"
    : "animate-in fade-in duration-700"
}

`}

  
>



{/* Hintergrund */}

<BackgroundGrid />



{/* HUD Scan */}

{

phase==="scanning"

&&

<ScannerHUD

progress={progress}

target={target}

logs={logs}

/>

}




{/* Ergebnis */}

{

phase==="fullscreen_result"

&&


<div className="

relative

z-20

h-full

overflow-y-auto

p-10

max-w-6xl

mx-auto

font-mono

">


<div className="

flex

justify-between

items-center

border-b

border-cyan-400/30

pb-5

mb-8

">


<div>


<div className="

text-cyan-400

text-xs

tracking-[.5em]

mb-2

">

SYN|SIGHT REPORT

</div>



<h1 className="

text-3xl

text-white

">

DIGITAL EXPOSURE ANALYSIS

</h1>


</div>



<button

onClick={onClose}

className="

border

border-red-500/40

text-red-400

px-6

py-3

rounded-lg

hover:bg-red-500/10

transition

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


<InfoCard

title="Digitale Spuren"

value={
String(
rawData?.exposure_count ?? 
"Erkannt"
)
}

/>


<InfoCard

title="Öffentliche Quellen"

value={
String(
rawData?.sources_found ??
"Analysiert"
)
}

/>


<InfoCard

title="Risiko Status"

value={
apiResult?.riskLevel ??
"Berechnet"
}

/>



</div>





<div className="

border

border-cyan-400/30

rounded-xl

bg-cyan-400/5

p-8

shadow-[0_0_40px_rgba(0,255,255,.08)]

">


<div className="

text-cyan-400

tracking-widest

text-sm

mb-4

">

SYN|SIGHT AI ASSESSMENT

</div>




<p className="

text-white

leading-relaxed

whitespace-pre-line

">

{

apiResult?.summary ??

"Analyse abgeschlossen."

}


</p>



</div>





<div className="

mt-10

border

border-white/10

rounded-xl

bg-black/50

p-6

">


<div className="

text-gray-400

text-xs

tracking-widest

mb-3

">

FREE SCAN LIMITATION

</div>



<p className="

text-gray-300

text-sm

leading-relaxed

">


Diese kostenlose Analyse zeigt erste öffentlich erkennbare digitale Spuren.

Eine vollständige Sicherheitsbewertung mit tiefer Datenkorrelation,
Leak-Analyse und kontinuierlicher Überwachung ist nach Registrierung verfügbar.


</p>



</div>




</div>


}



</div>


);

}




function InfoCard({

title,

value


}:{

title:string;

value:string;


}){


return (

<div className="

rounded-xl

border

border-cyan-400/20

bg-white/[0.03]

p-5

">


<div className="

text-gray-400

text-xs

mb-2

tracking-widest

">

{title}

</div>



<div className="

text-cyan-300

text-2xl

font-bold

">

{value}

</div>



</div>

);


}
