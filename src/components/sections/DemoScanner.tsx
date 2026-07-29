"use client";

import {
  useState,
  useCallback,
  useEffect,
} from "react";

import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";

import {
  ScanPhase,
  ApiResult,
  ScanData,
} from "./DemoScanner/types";

import ScannerOverlay from "./DemoScanner/ScannerOverlay";

import { useScrollAnimation } from "@/hooks/useScrollAnimation";



const scanStages = [

"Initialisiere SynSight Intelligence Core",

"Analysiere öffentliche Identitätsdaten",

"Suche digitale Erwähnungen",

"Korreliere Benutzernamen und Profile",

"Prüfe öffentliche Datenquellen",

"Analysiere technische Spuren",

"Bewerte mögliche Exposure-Faktoren",

"Berechne digitales Risikoprofil",

"Generiere Voranalyse"

];




export default function DemoScanner(){


const router = useRouter();


const {
ref,
isVisible

}=useScrollAnimation();



const [input,setInput]=useState("");

const [phase,setPhase]=useState<ScanPhase>("idle");

const [progress,setProgress]=useState(0);

const [logs,setLogs]=useState<string[]>([]);

const [apiResult,setApiResult]=useState<ApiResult|null>(null);

const [rawData,setRawData]=useState<ScanData|null>(null);



const addLog=(text:string)=>{


const time =
new Date()
.toLocaleTimeString(
"de-DE",
{
hour12:false
}
);


setLogs(prev=>[

...prev,

`[${time}] ${text}`

].slice(-12));


};






const startScan=useCallback(async()=>{


if(
!input.trim() ||
phase==="scanning"
)
return;



setPhase("scanning");

setProgress(0);

setLogs([]);

setApiResult(null);

setRawData(null);



addLog(
"SYN|SIGHT CORE ONLINE"
);



/*
 Scan Ablauf Simulation
*/

let current=0;


const scanInterval=setInterval(()=>{


current += Math.random()*3;


if(current>=92){

current=92;

}


setProgress(
Math.floor(current)
);



const stageIndex =
Math.floor(
(current/100)
*
scanStages.length
);



if(scanStages[stageIndex]){

addLog(
scanStages[stageIndex]
);

}


},700);





try{


const apiRequest = fetch(
"/api/scan",
{

method:"POST",

headers:{
"Content-Type":
"application/json"
},


body:
JSON.stringify({
query:input
})

}

)
.then(
res=>res.json()
);





/*
 Mindestdauer damit der Kunde
 den Scan wahrnimmt
*/


const delay =
new Promise(
resolve=>
setTimeout(
resolve,
35000
)
);





const [data]=
await Promise.all([
apiRequest,
delay
]);



clearInterval(scanInterval);



setProgress(100);



addLog(
"Analyse abgeschlossen"
);



setRawData(data);



if(data.status==="success"){



setApiResult({

riskLevel:
data.risk_level ??
"Analyse abgeschlossen",


summary:
data.summary ??
"Keine Zusammenfassung verfügbar"

});



}

else{


setApiResult({

riskLevel:
"Keine vollständige Bewertung",


summary:
"Die öffentliche Analyse konnte nicht vollständig abgeschlossen werden."

});


}



setTimeout(()=>{


setPhase(
"fullscreen_result"
);


},1200);





}
catch(error){


clearInterval(scanInterval);



setProgress(100);



addLog(
"Verbindung zum Analysemodul fehlgeschlagen"
);



setApiResult({

riskLevel:
"Offline",


summary:
"Der Analyse-Dienst ist aktuell nicht erreichbar."

});



setTimeout(()=>{

setPhase(
"fullscreen_result"
);


},1000);



}



},[
input,
phase
]);







const closeFullscreen=()=>{


setPhase(
"closing_crt"
);



setTimeout(()=>{


setPhase(
"complete"
);


},700);


};







const reset=()=>{


setPhase("idle");

setInput("");

setProgress(0);

setLogs([]);

setApiResult(null);

setRawData(null);


};







return (

<>


<ScannerOverlay


phase={phase}


progress={progress}


target={input}


logs={logs}


apiResult={apiResult}


rawData={rawData}


onClose={closeFullscreen}


/>





<section

id="demo-scanner"

className="
section-shell
relative
section-padding
overflow-hidden
"

>



<div className="
absolute
inset-0

bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.12),transparent_42rem)]

pointer-events-none

"/>





<div className="
relative
max-w-5xl
mx-auto

">


<div

ref={ref}

className={`
text-center
mb-12
transition-all
duration-1000

${
isVisible
?
"opacity-100 translate-y-0"
:
"opacity-0 translate-y-8"
}

`}

>


<span className="hud-label">

03 / FREE INTELLIGENCE SCAN

</span>



<h2 className="
text-balance
text-4xl
md:text-6xl
font-semibold
tracking-[-.045em]
mt-5
mb-7
">

Erkennen Sie Ihre

<span className="
cyber-gradient
">

digitale Angriffsfläche.

</span>


</h2>



<p className="
max-w-3xl
mx-auto
text-gray-400
text-lg
leading-relaxed

">


SynSight analysiert öffentlich sichtbare Informationen,
digitale Spuren und mögliche Risikoindikatoren.

Erhalten Sie in wenigen Sekunden eine erste Einschätzung
Ihrer digitalen Präsenz.


</p>


</div>








<GlassCard
hover={false}
className="
glass-strong
relative
overflow-hidden
"

>


<div className="p-8">



{

phase==="idle"

&&


<>


<div className="
mb-6
">

<h3 className="
text-white
text-xl
mb-2
">

Kostenloser Sicherheitscheck

</h3>


<p className="
text-gray-500
text-sm
">

E-Mail, Benutzername oder Name eingeben und erste digitale Spuren entdecken.

</p>


</div>




<div className="
flex
flex-col
sm:flex-row
gap-4
">

<input


value={input}


onChange={
e=>setInput(e.target.value)
}


onKeyDown={
e=>
e.key==="Enter"
&&
startScan()
}


placeholder="
E-Mail, Username oder Name
"


className="
flex-1
px-5
py-4
rounded-lg
bg-black/40
border
border-cyan-400/20
text-white
font-mono

focus:outline-none
focus:border-cyan-400

"


/>




<Button

size="lg"

onClick={startScan}

disabled={!input.trim()}

>

INTELLIGENCE SCAN STARTEN

</Button>


</div>


</>

}







{

phase==="complete"

&&


<div className="
animate-fade-in
text-center
">


<div className="
text-cyan-400
font-mono
mb-6
">

SCAN ABGESCHLOSSEN

</div>



<div className="
border
border-cyan-400/20
rounded-xl
p-6
bg-cyan-400/5
mb-6
">


<p className="
text-white
leading-relaxed
">

{

apiResult?.summary

}


</p>


</div>




<Button

onClick={
()=>router.push("/register")
}

>

VOLLSTÄNDIGE ANALYSE AKTIVIEREN

</Button>



<Button

variant="ghost"

onClick={reset}

>

Neuer Scan

</Button>



</div>


}



</div>


</GlassCard>



</div>


</section>


</>

);


}
