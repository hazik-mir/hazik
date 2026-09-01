// Public frontend. NEVER put SECRET_NUMBER or reward codes here.
const API_URL="https://YOUR-RENDER-SERVICE.onrender.com";
const form=document.getElementById("form"),input=document.getElementById("guess"),btn=document.getElementById("submit");
const msg=document.getElementById("msg"),remaining=document.getElementById("remaining"),timer=document.getElementById("timer");
const win=document.getElementById("win"),done=document.getElementById("done"),spin=document.getElementById("spin");
const area=document.getElementById("wheelArea"),wheel=document.getElementById("wheel"),result=document.getElementById("result"),claim=document.getElementById("claim");
let seconds=0,solved=false,finished=false;
function fmt(s){return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
function lock(){const x=Number(remaining.textContent)===0&&seconds>0;input.disabled=x||finished;btn.disabled=x||finished;timer.textContent=x?fmt(seconds):"Ready"}
async function status(){try{const r=await fetch(API_URL+"/api/status",{cache:"no-store"}),d=await r.json();if(d.finished){finished=true;form.classList.add("hidden");done.classList.remove("hidden");return}remaining.textContent=d.remaining;seconds=d.seconds;lock()}catch{msg.textContent="Backend unavailable. Please try again later."}}
status();setInterval(()=>{if(seconds>0){seconds--;lock();if(seconds===0)status()}},1000);
form.addEventListener("submit",async e=>{e.preventDefault();if(btn.disabled)return;btn.disabled=true;input.disabled=true;msg.textContent="Checking...";
try{const r=await fetch(API_URL+"/api/guess",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({guess:Number(input.value)})});const d=await r.json();
if(d.finished){finished=true;form.classList.add("hidden");done.classList.remove("hidden");return}
if(typeof d.remaining==="number")remaining.textContent=d.remaining;
if(d.correct){solved=true;finished=true;form.classList.add("hidden");msg.classList.add("hidden");win.classList.remove("hidden");return}
if(d.limited){seconds=d.seconds;msg.textContent=`You've used all 5 guesses. Try again in ${fmt(seconds)}.`}else{msg.textContent=d.message||"Wrong guess.";input.value=""}lock();if(!btn.disabled)input.focus()
}catch{msg.textContent="Could not contact the server.";input.disabled=false;btn.disabled=false}});
spin.addEventListener("click",async()=>{if(!solved)return;spin.disabled=true;spin.textContent="Spinning...";
area.classList.remove("hidden");try{const r=await fetch(API_URL+"/api/spin",{method:"POST"}),d=await r.json();if(!d.success){result.textContent=d.message||"Could not spin.";spin.disabled=false;spin.textContent="Spin prize wheel";return}
wheel.style.transform=`rotate(${d.rotation}deg)`;setTimeout(()=>{result.textContent=`Prize: ${d.prizeName}`;claim.classList.remove("hidden");spin.classList.add("hidden")},4100)
}catch{result.textContent="Could not contact the server.";spin.disabled=false;spin.textContent="Spin prize wheel"}});