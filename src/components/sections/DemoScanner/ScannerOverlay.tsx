"use client";

import { useEffect, useRef, useState } from "react";

import BackgroundGrid from "./BackgroundGrid";
import ScannerHUD from "./ScannerHUD";
import type { ScannerOverlayProps } from "./types";

import "./scanner.css";


const scanMessages = [
  "Initialisiere SynSight Intelligence Core...",
  "Sichere Verbindung zum Analysecluster hergestellt...",
  "Öffentliche Datenquellen werden abgefragt...",
  "Digitale Spuren werden korreliert...",
  "Metadaten werden analysiert...",
  "Benutzeridentitäten werden abgeglichen...",
  "Öffentliche Profile werden geprüft...",
  "Datenleck-Signaturen werden gesucht...",
  "KI-Risikobewertung wird erstellt...",
  "Analysebericht wird kompiliert...",
];


export default function ScannerOverlay({
  phase,
  target,
  apiResult,
  rawData,
  onClose,
}: ScannerOverlayProps) {

  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const terminalRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {

    if (phase !== "scanning") {
      return;
    }


    let currentProgress = 0;


    const progressInterval = setInterval(() => {

      currentProgress += Math.random() * 4;


      if (currentProgress > 96) {
        currentProgress = 96;
      }


      setProgress(Math.floor(currentProgress));


    }, 180);



    const logInterval = setInterval(() => {

      const message =
        scanMessages[
          Math.floor(Math.random() * scanMessages.length)
        ];


      const time =
        new Date().toLocaleTimeString("de-DE");


      setLogs((previous) => [
        ...previous,
        `[${time}] ${message}`,
      ].slice(-10));


    }, 800);



    return () => {

      clearInterval(progressInterval);
      clearInterval(logInterval);

    };


  }, [phase]);




  useEffect(() => {

    if (terminalRef.current) {

      terminalRef.current.scrollTop =
        terminalRef.current.scrollHeight;

    }

  }, [logs]);




  return (

    <div
      className={`
        fixed
        inset-0
        z-[200]
        overflow-hidden
        bg-black
        font-mono
        ${phase === "closing_crt"
          ? "crt-off"
          : "animate-in fade-in duration-700"
        }
      `}
    >


      <BackgroundGrid />

      <ScannerHUD />



      {/* SCANNING PHASE */}

      {phase === "scanning" && (

        <div
          className="
          relative
          z-20
          h-full
          flex
          flex-col
          items-center
          justify-center
          "
        >


          <div
            className="
            text-cyber-cyan/70
            text-xs
            tracking-[0.6em]
            mb-10
            animate-pulse
            "
          >

            SYNSIGHT GLOBAL SCAN

          </div>



          {/* RADAR */}

          <div
            className="
            relative
            w-80
            h-80
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
              border-cyber-cyan/20
              animate-ping
              "
            />


            <div
              className="
              absolute
              inset-5
              rounded-full
              border
              border-dashed
              border-cyber-cyan/40
              animate-spin
              "
              style={{
                animationDuration: "8s",
              }}
            />


            <div
              className="
              absolute
              inset-12
              rounded-full
              border-t-2
              border-cyber-cyan
              border-transparent
              animate-spin
              "
              style={{
                animationDuration: "2s",
              }}
            />



            <div
              className="
              w-40
              h-40
              rounded-full
              border
              border-cyber-cyan/50
              bg-cyber-cyan/10
              flex
              items-center
              justify-center
              shadow-[0_0_50px_rgba(0,255,255,.35)]
              "
            >

              <span
                className="
                text-5xl
                font-bold
                text-cyber-cyan
                "
              >

                {progress}%

              </span>


            </div>


          </div>





          <div
            className="
            mt-10
            w-full
            max-w-xl
            px-6
            "
          >


            <div
              className="
              text-center
              text-white
              mb-4
              "
            >

              TARGET:

              <span className="text-cyber-cyan ml-2">

                {target}

              </span>

            </div>



            <div
              className="
              h-1
              bg-white/10
              rounded
              overflow-hidden
              "
            >

              <div

                className="
                h-full
                bg-cyber-cyan
                shadow-[0_0_15px_#00ffff]
                transition-all
                "

                style={{
                  width: `${progress}%`,
                }}

              />

            </div>




            <div
              ref={terminalRef}
              className="
              mt-8
              h-32
              overflow-hidden
              bg-black/60
              border
              border-cyber-cyan/20
              rounded
              p-4
              text-xs
              text-cyber-cyan/70
              "
            >

              {logs.map((log, index) => (

                <div key={index}>
                  {log}
                </div>

              ))}


            </div>


          </div>



        </div>

      )}






      {/* RESULT PHASE */}

      {phase === "fullscreen_result" && (

        <div
          className="
          relative
          z-20
          h-full
          overflow-y-auto
          p-8
          flex
          items-center
          justify-center
          "
        >


          <div
            className="
            max-w-5xl
            w-full
            "
          >



            <div
              className="
              flex
              justify-between
              items-center
              border-b
              border-cyber-cyan/30
              pb-5
              mb-8
              "
            >


              <div>

                <h2
                  className="
                  text-2xl
                  text-cyber-cyan
                  tracking-widest
                  "
                >

                  SCAN COMPLETE

                </h2>


                <p
                  className="
                  text-white/40
                  text-sm
                  mt-2
                  "
                >

                  Digital Intelligence Report

                </p>


              </div>



              <button

                onClick={onClose}

                className="
                px-5
                py-3
                border
                border-red-500/50
                text-red-400
                rounded
                hover:bg-red-500/10
                "

              >

                SYSTEM CLOSE

              </button>


            </div>





            <div
              className="
              grid
              md:grid-cols-2
              gap-6
              "
            >



              <div
                className="
                rounded-xl
                p-6
                border
                border-cyber-blue/30
                bg-cyber-blue/10
                "
              >

                <div
                  className="
                  text-xs
                  text-white/40
                  "
                >

                  RISK LEVEL

                </div>


                <div
                  className="
                  text-3xl
                  text-cyber-cyan
                  font-bold
                  mt-3
                  "
                >

                  {apiResult?.riskLevel}

                </div>


                <p
                  className="
                  text-white
                  mt-6
                  leading-relaxed
                  "
                >

                  {apiResult?.summary}

                </p>


              </div>





              <div
                className="
                rounded-xl
                p-6
                bg-black/70
                border
                border-yellow-500/30
                "
              >


                <div
                  className="
                  text-yellow-400
                  mb-4
                  "
                >

                  DATA STREAM

                </div>


                <pre
                  className="
                  text-xs
                  text-yellow-300/70
                  overflow-auto
                  max-h-96
                  "
                >

                  {JSON.stringify(
                    rawData,
                    null,
                    2
                  )}

                </pre>


              </div>



            </div>


          </div>


        </div>


      )}


    </div>

  );

}
