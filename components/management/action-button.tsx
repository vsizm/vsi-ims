"use client";

import { useState } from "react";

export default function ActionButton({ label, endpoint, method="POST", body, onDone, variant="primary" }: { label:string; endpoint:string; method?:string; body?:unknown; onDone:()=>void; variant?:"primary"|"danger"|"soft" }) {
  const [busy,setBusy]=useState(false);
  async function run(){
    setBusy(true);
    try{
      const r=await fetch(endpoint,{method,headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d.error||`Request failed (${r.status})`);
      onDone();
    }catch(e){ window.alert(e instanceof Error?e.message:"Unable to complete the request."); }
    finally{setBusy(false);}
  }
  return <button type="button" className={`ims-action ${variant}`} onClick={run} disabled={busy}>{busy?"Working…":label}</button>;
}
