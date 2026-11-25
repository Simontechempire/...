let chats = JSON.parse(localStorage.getItem("simon_chats")||"[]");
let currentTopic = localStorage.getItem("simon_topic")||"General";
let history = [];

function save(){ localStorage.setItem("simon_chats", JSON.stringify(chats)); renderList(); }
function renderList(){
  const list = document.getElementById("chat-list");
  list.innerHTML = "";
  chats.slice().reverse().forEach((c,i)=>{
    const d=document.createElement("div"); d.className="chat-item"; d.textContent="💬 "+c.title;
    d.onclick=()=>loadChat(chats.length-1-i);
    list.appendChild(d);
  });
  document.getElementById("current-topic").textContent = currentTopic;
  document.getElementById("set-topic").value = currentTopic;
  const pl=document.getElementById("project-list");
  pl.innerHTML="";
  SimonMemory.getProjects().forEach(p=>{
    const d=document.createElement("div"); d.className="chat-item"; d.textContent="📁 "+p.title+" - "+p.gist.slice(0,30);
    pl.appendChild(d);
  });
}
function loadChat(idx){
  const c=chats[idx]; if(!c) return;
  document.getElementById("welcome").style.display="none";
  const box=document.getElementById("chat-box"); box.innerHTML="";
  c.messages.forEach(m=> addMsg(m.text, m.role));
}
function newChat(){
  document.getElementById("chat-box").innerHTML="";
  document.getElementById("welcome").style.display="block";
  history=[];
  document.getElementById("msg").focus();
}
function toggleSidebar(){ document.getElementById("sidebar").classList.toggle("hidden"); }
function toggleSettings(){ document.getElementById("settings").classList.toggle("open"); }
function changeTheme(){
  const t=document.getElementById("set-theme").value;
  document.body.classList.toggle("dark", t==="dark");
  localStorage.setItem("simon_theme", t);
}
function quickAsk(t){ document.getElementById("msg").value=t; sendChat(); }
function changeTopic(){ const t=prompt("Enter topic to stay on:", currentTopic); if(t){ currentTopic=t; localStorage.setItem("simon_topic",t); renderList(); } }
function saveTopic(){ currentTopic=document.getElementById("set-topic").value||"General"; localStorage.setItem("simon_topic",currentTopic); renderList(); alert("Topic saved: "+currentTopic); }
function openProject(){
  const title=prompt("Project name:"); if(!title) return;
  const gist=prompt("Gist / summary of project:"); if(gist===null) return;
  SimonMemory.addProject(title, gist, currentTopic);
  renderList(); alert("Project saved!");
}
function addMsg(text, role){
  const box=document.getElementById("chat-box");
  const d=document.createElement("div");
  d.className="msg "+role;
  d.innerHTML = role==="ai" ? formatAI(text) : text.replace(/</g,"&lt;");
  box.appendChild(d);
  document.getElementById("center").scrollTop=document.getElementById("center").scrollHeight;
  return d;
}
function formatAI(t){
  return t.replace(/</g,"&lt;").replace(/\*\*(.*?)\*\*/g,"<b>$1</b>").replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h3>$1</h3>").replace(/\n/g,"<br>");
}
async function sendChat(){
  const input=document.getElementById("msg");
  const text=input.value.trim(); if(!text) return;
  document.getElementById("welcome").style.display="none";
  addMsg(text,"user"); input.value="";
  history.push({role:"user", content:text});
  const loading=addMsg("Simon AI is thinking... ✨","ai");
  const settings={ tone:document.getElementById("set-tone").value, topic:currentTopic };
  try{
    const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text, history, settings})});
    const data=await res.json();
    loading.innerHTML=formatAI(data.reply||"Error");
    history.push({role:"assistant", content:data.reply});
    let cur=chats[chats.length-1];
    if(!cur || cur.done){ cur={title:text.slice(0,40), messages:[], done:false}; chats.push(cur); }
    cur.messages.push({text, role:"user"}, {text:data.reply, role:"ai"});
    SimonMemory.saveChat(text, data.reply);
    save();
  }catch(e){ loading.textContent="Network error. Check GROQ_API_KEY."; }
}
function downloadChat(){
  const txt=chats.map(c=> c.title+"\n"+c.messages.map(m=> (m.role==="user"?"You: ":"Simon: ")+m.text).join("\n") ).join("\n\n---\n\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"})); a.download="simon-ai-chat.txt"; a.click();
}
function downloadImage(){
  const box=document.getElementById("chat-box");
  const canvas=document.createElement("canvas"); canvas.width=760; canvas.height=Math.max(600, box.scrollHeight+100);
  const ctx=canvas.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#000"; ctx.font="bold 22px Arial"; ctx.fillText("Simon AI - Chat Export",20,40);
  ctx.font="14px Arial"; let y=80;
  chats.slice(-1).forEach(c=> c.messages.forEach(m=>{ ctx.fillStyle=m.role==="user"?"#555":"#000"; const lines=(m.text||"").match(/.{1,90}/g)||[]; lines.forEach(l=>{ ctx.fillText(l,20,y); y+=20; }); y+=10; }));
  const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download="simon-ai.png"; a.click();
}
function clearAll(){ if(confirm("Clear all chats & memory?")){ localStorage.clear(); chats=[]; history=[]; SimonMemory.clear(); location.reload(); } }

document.getElementById("msg").addEventListener("keydown",e=>{ if(e.key==="Enter") sendChat(); });
if(localStorage.getItem("simon_theme")==="dark"){ document.body.classList.add("dark"); document.getElementById("set-theme").value="dark"; }
renderList();
