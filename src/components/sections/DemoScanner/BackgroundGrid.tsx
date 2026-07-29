"use client";

import "./scanner.css";


export default function BackgroundGrid() {

  return (

    <>

      <div
      className="
      absolute inset-0
      bg-black
      "
      />


      <div
      className="
      absolute inset-0
      cyber-grid
      "
      />


      <div
      className="
      absolute inset-0
      scan-lines
      "
      />


      <div
      className="
      absolute inset-0
      bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.12),transparent_45%)]
      "
      />


      <div
      className="
      absolute inset-0
      pointer-events-none
      "
      >

        <div className="
        absolute
        top-0
        left-1/2
        -translate-x-1/2
        w-[800px]
        h-[800px]
        rounded-full
        border
        border-cyber-cyan/10
        animate-pulse
        "
        />

      </div>


    </>

  );

}
