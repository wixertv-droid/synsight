"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

import ScannerOverlay from "./DemoScanner/ScannerOverlay";
import type { ApiResult, ScanData, ScanPhase } from "./DemoScanner/types";


export default function DemoScanner() {
  const router = useRouter();

  const { ref, isVisible } = useScrollAnimation();

  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");

  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [rawData, setRawData] = useState<ScanData | null>(null);


  const startScan = useCallback(async () => {

    if (!input.trim()) return;

    setPhase("scanning");
    setApiResult(null);
    setRawData(null);


    try {

      const response = await fetch("/api/scan", {
        method: "POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          query: input
        })
      });


      const data: ScanData = await response.json();


      setRawData(data);


      if(data.status === "success"){

        setApiResult({
          summary:data.summary || 
          "Keine Zusammenfassung verfügbar.",

          riskLevel:data.risk_level ||
          "Erhöhtes Risiko"
        });

      } else {

        setApiResult({
          summary:
          data.message ||
          "Analyse konnte nicht abgeschlossen werden.",

          riskLevel:"Fehler"
        });

      }


      setTimeout(()=>{

        setPhase("fullscreen_result");

      },800);



    } catch(error){

      setRawData({
        error:"Netzwerkfehler"
      });


      setApiResult({

        summary:
        "Analyse-Server nicht erreichbar.",

        riskLevel:"Offline"

      });


      setPhase("fullscreen_result");

    }


  },[input]);




  const closeFullscreen = ()=>{

    setPhase("closing_crt");


    setTimeout(()=>{

      setPhase("complete");

    },700);

  };



  const reset = ()=>{

    setPhase("idle");
    setInput("");
    setApiResult(null);
    setRawData(null);

  };



  return (

    <>

      {
      phase !== "idle" &&
      phase !== "complete" &&

      <ScannerOverlay

        phase={phase}

        target={input}

        apiResult={apiResult}

        rawData={rawData}

        onClose={closeFullscreen}

      />

      }



      <section
      id="demo-scanner"
      className="section-shell relative section-padding overflow-hidden"
      >


        <div
        className="
        absolute inset-0
        bg-[radial-gradient(ellipse_at_50%_38%,rgba(20,122,174,.09),transparent_42rem)]
        pointer-events-none
        "
        />



        <div className="relative max-w-4xl mx-auto">


          <div
          ref={ref}
          className={`
          text-center mb-12 transition-all duration-1000
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
              03 / Ihr Risiko-Check
            </span>


            <h2
            className="
            text-balance text-4xl md:text-6xl
            font-semibold
            tracking-[-.045em]
            leading-[1.02]
            mt-5 mb-7
            "
            >

              Entdecken Sie Ihre{" "}

              <span className="cyber-gradient">
                digitale Spur.
              </span>


            </h2>


          </div>





          <GlassCard
          hover={false}
          className="
          glass-strong
          relative overflow-hidden
          ring-1 ring-white/[0.025]
          "
          >


            <div className="relative z-10 p-6">



            {
            phase === "idle" &&

            <div>

              <p className="text-white font-semibold mb-2">
                System-Check initialisieren
              </p>


              <p className="text-gray-500 text-sm mb-6">

                Geben Sie eine E-Mail,
                einen Namen oder Benutzernamen ein.

              </p>




              <div
              className="
              flex flex-col sm:flex-row gap-4
              "
              >


                <input

                value={input}

                onChange={
                  e=>setInput(e.target.value)
                }

                onKeyDown={
                  e=>{
                    if(e.key==="Enter")
                    startScan();
                  }
                }


                placeholder="Ziel eingeben..."

                className="
                flex-1
                px-5 py-4
                bg-space-black/60
                border border-cyber-blue/20
                rounded-lg
                text-white
                font-mono
                focus:outline-none
                focus:border-cyber-cyan
                "

                />



                <Button

                size="lg"

                onClick={startScan}

                disabled={!input.trim()}

                >

                  GLOBAL SCAN STARTEN

                </Button>


              </div>


            </div>

            }



            {
            phase === "complete" &&

            <div>


              <div
              className="
              text-cyber-cyan
              font-mono
              mb-6
              "
              >

                ANALYSE BEENDET

              </div>




              {
              apiResult &&

              <div
              className="
              glass rounded-xl
              p-6 mb-8
              border border-cyber-blue/30
              "
              >

                <div
                className="
                text-cyber-cyan
                text-xl
                font-bold
                "
                >

                  {apiResult.riskLevel}

                </div>


                <p className="text-white mt-3">

                  {apiResult.summary}

                </p>


              </div>

              }



              <div className="flex gap-3">


              <Button
              onClick={()=>
              router.push("/register")
              }
              >

                Vollständigen Schutz öffnen

              </Button>


              <Button
              variant="ghost"
              onClick={reset}
              >

                Neuer Scan

              </Button>


              </div>


            </div>

            }



            </div>


          </GlassCard>


        </div>


      </section>


    </>

  );

}
