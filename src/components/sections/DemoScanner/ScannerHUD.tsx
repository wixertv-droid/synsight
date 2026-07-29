"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScanPhase } from "./types";


interface ScannerHUDProps {

  phase?: ScanPhase;

  progress:number;

  query:string;

  onClose?:()=>void;

}



const operations = [

"IDENTITY CORE ONLINE",

"PUBLIC DATA STREAM CONNECTED",

"ENTITY MATCHING ACTIVE",

"DIGITAL FOOTPRINT MAPPING",

"NEURAL CORRELATION ENGINE",

"EXPOSURE RISK ANALYSIS",

"INTELLIGENCE REPORT BUILDING"

];



const nodes = [

{x:18,y:22},

{x:35,y:40},

{x:55,y:18},

{x:72,y:35},

{x:82,y:65},

{x:60,y:78},

{x:30,y:70},

{x:45,y:55},

];





export default function ScannerHUD({

progress,

query,

onClose

}:ScannerHUDProps){



const [boot,setBoot]=useState(true);

const [shutdown,setShutdown]=useState(false);



useEffect(()=>{

const t=setTimeout(()=>{

setBoot(false);

},700);


return()=>clearTimeout(t);


},[]);



const activeOperation = useMemo(()=>{


return Math.min(

Math.floor(
(progress/100)*operations.length
),

operations.length-1

);


},[progress]);





const shutdownCRT=()=>{


setShutdown(true);


setTimeout(()=>{

onClose?.();

},600);


};





return (

<>

<style>{`

@keyframes corePulse {

0%,100%{
transform:scale(1);
opacity:.7;
}

50%{
transform:scale(1.08);
opacity:1;
}

}



@keyframes rotate {

from{
transform:rotate(0deg);
}

to{
transform:rotate(360deg);
}

}



@keyframes rotateReverse {

from{
transform:rotate(360deg);
}

to{
transform:rotate(0deg);
}

}



@keyframes nodePulse {

0%,100%{
opacity:.3;
}

50%{
opacity:1;
}

}



@keyframes dataFlow {


from{

stroke-dashoffset:1000;

}

to{

stroke-dashoffset:0;

}


}



@keyframes crtOn {


0%{

transform:
scaleY(.01);

filter:
brightness(8);

opacity:0;

}


100%{

transform:
scaleY(1);

filter:
brightness(1);

opacity:1;

}

}



@keyframes crtOff {


0%{

transform:
scaleY(1);

}


50%{

transform:
scaleY(.01);

filter:
brightness(10);

}


100%{

transform:
scaleY(.001);

opacity:0;

}


}



.hud-on{

animation:
crtOn .7s ease-out;

}



.hud-off{

animation:
crtOff .6s ease-in forwards;

}



`}</style>





<div

className={`
fixed
inset-0
z-[999]
overflow-hidden
bg-[#02050b]
font-mono

${boot?"hud-on":""}

${shutdown?"hud-off":""}

`}

>




{/* Hintergrund Atmosphäre */}


<div className="absolute inset-0

bg-[radial-gradient(circle_at_center,rgba(0,255,255,.15),transparent_45%)]

"/>



{/* neuronales Netzwerk */}


<svg

className="
absolute
inset-0
w-full
h-full
opacity-40
"

>


{

nodes.map((n,i)=>(


<circle

key={i}

cx={`${n.x}%`}

cy={`${n.y}%`}

r="4"

fill="cyan"

className="animate-pulse"

/>


))

}



{

nodes.map((n,i)=>(

nodes.slice(i+1,i+3).map((b,j)=>(


<line

key={`${i}-${j}`}

x1={`${n.x}%`}

y1={`${n.y}%`}

x2={`${b.x}%`}

y2={`${b.y}%`}

stroke="cyan"

strokeWidth="1"

strokeDasharray="8 12"

style={{

animation:

"dataFlow 3s linear infinite"

}}

/>


))

))

}


</svg>
        {/* ZENTRALER SYN|SIGHT CORE */}


      <div

      className="
      absolute
      inset-0
      flex
      items-center
      justify-center
      "

      >



        {/* äußere Rotationsringe */}


        <div

        className="
        absolute
        w-[620px]
        h-[620px]
        rounded-full
        border
        border-cyan-400/20
        "

        style={{

          animation:
          "rotate 18s linear infinite"

        }}

        />



        <div

        className="
        absolute
        w-[520px]
        h-[520px]
        rounded-full
        border
        border-dashed
        border-cyan-300/30
        "

        style={{

          animation:
          "rotateReverse 12s linear infinite"

        }}

        />



        <div

        className="
        absolute
        w-[430px]
        h-[430px]
        rounded-full
        border
        border-blue-400/30
        "

        style={{

          animation:
          "rotate 8s linear infinite"

        }}

        />





        {/* Energie Kern */}


        <div

        className="
        relative
        flex
        items-center
        justify-center
        w-[260px]
        h-[260px]
        rounded-full
        border
        border-cyan-300/50
        bg-cyan-950/40
        shadow-[0_0_80px_rgba(0,255,255,.5)]
        backdrop-blur-xl
        "

        style={{

        animation:
        "corePulse 3s infinite"

        }}

        >



          {/* Core Linien */}


          <div

          className="
          absolute
          inset-8
          rounded-full
          border
          border-cyan-400/30
          "

          />



          <div

          className="
          text-center
          z-10
          "

          >



            <div

            className="
            text-cyan-400
            text-xs
            tracking-[.5em]
            mb-3
            "

            >

            SYN|SIGHT AI

            </div>



            <div

            className="
            text-white
            text-7xl
            font-black
            "

            >

            {progress}

            </div>



            <div

            className="
            text-cyan-300
            text-xs
            tracking-[.4em]
            mt-2
            "

            >

            %

            </div>




            <div

            className="
            mt-5
            text-blue-300
            text-xs
            tracking-[.35em]
            animate-pulse
            "

            >

            ANALYZING

            </div>



          </div>



          {/* Core Scan Strahl */}


          <div

          className="
          absolute
          top-0
          left-1/2
          -translate-x-1/2
          w-[2px]
          h-full
          bg-cyan-400/60
          shadow-[0_0_20px_cyan]
          "

          />



        </div>


      </div>





      {/* OBEN STATUS */}



      <div

      className="
      absolute
      top-8
      left-1/2
      -translate-x-1/2
      text-center
      "

      >


        <div

        className="
        text-cyan-400
        text-xs
        tracking-[.7em]
        "

        >

        SYN|SIGHT INTELLIGENCE SYSTEM

        </div>



        <div

        className="
        mt-3
        text-white
        text-lg
        tracking-[.4em]
        "

        >

        DIGITAL EXPOSURE SCAN

        </div>


      </div>





      {/* LINKES TARGET PANEL */}



      <div

      className="
      absolute
      left-10
      bottom-10
      w-[330px]
      border
      border-cyan-400/30
      bg-black/60
      backdrop-blur-xl
      p-5
      "

      >



        <div

        className="
        text-cyan-400
        text-xs
        tracking-[.4em]
        mb-3
        "

        >

        TARGET ENTITY

        </div>



        <div

        className="
        text-white
        text-xl
        truncate
        "

        >

        {query || "UNKNOWN"}

        </div>




        <div

        className="
        mt-5
        flex
        gap-2
        "

        >


        {

        [1,2,3,4,5].map(i=>(


          <div

          key={i}

          className={`
          h-1
          flex-1
          ${

          progress >
          i*20

          ?

          "bg-cyan-400 shadow-[0_0_10px_cyan]"

          :

          "bg-cyan-900"

          }

          `}

          />


        ))

        }



        </div>


      </div>






      {/* RECHTES LIVE SYSTEM */}



      <div

      className="
      absolute
      right-10
      bottom-10
      w-[390px]
      border
      border-cyan-400/30
      bg-black/60
      backdrop-blur-xl
      p-5
      "

      >


        <div

        className="
        text-cyan-400
        text-xs
        tracking-[.4em]
        mb-4
        "

        >

        LIVE PROCESSING

        </div>




        {

        operations.map((op,index)=>(


        <div

        key={op}

        className={`

        flex
        items-center
        gap-3
        text-xs
        mb-3
        transition-all

        ${

        index===activeOperation

        ?

        "text-cyan-300 scale-105"

        :

        index<activeOperation

        ?

        "text-cyan-700"

        :

        "text-slate-600"

        }

        `}

        >


          <div

          className={`

          w-2
          h-2
          rounded-full

          ${

          index===activeOperation

          ?

          "bg-cyan-300 shadow-[0_0_15px_cyan] animate-pulse"

          :

          "bg-cyan-900"

          }

          `}

          />



          {op}


        </div>


        ))

        }



      </div>

        {/* UNTERES DATENFLUSS HUD */}


      <div

      className="
      absolute
      bottom-10
      left-1/2
      -translate-x-1/2
      w-[420px]
      border
      border-cyan-400/20
      bg-black/50
      backdrop-blur-xl
      p-4
      "

      >



        <div

        className="
        flex
        justify-between
        items-center
        text-[10px]
        tracking-[.35em]
        text-cyan-500
        mb-3
        "

        >

          <span>
          NEURAL ENGINE
          </span>


          <span>
          {progress}% COMPLETE
          </span>


        </div>




        <div

        className="
        h-2
        bg-cyan-950
        overflow-hidden
        relative
        "

        >


          <div

          className="
          absolute
          inset-y-0
          left-0
          bg-cyan-400
          shadow-[0_0_20px_cyan]
          transition-all
          duration-300
          "

          style={{

          width:`${progress}%`

          }}

          />


          <div

          className="
          absolute
          inset-0
          bg-gradient-to-r
          from-transparent
          via-white/40
          to-transparent
          "

          style={{

          animation:
          "dataFlow 1.5s linear infinite"

          }}

          />


        </div>


      </div>





      {/* SCHLIESSEN BUTTON */}



      {

      progress>=100 &&


      <button

      onClick={shutdownCRT}

      className="

      absolute

      top-8

      right-10

      px-6

      py-3

      border

      border-red-400/40

      text-red-300

      text-xs

      tracking-[.4em]

      bg-black/60

      hover:bg-red-500/10

      transition

      "

      >

      CLOSE SYSTEM


      </button>


      }



      {/* CRT Scanlines Overlay */}


      <div

      className="
      pointer-events-none
      absolute
      inset-0
      opacity-[0.06]
      "

      style={{

      background:

      "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.8) 4px)"

      }}

      />



    </div>

  </>

 );

}
