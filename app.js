// Simon AI Backend - Node + Groq
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({limit:"10mb"}));
app.use(express.static(__dirname));

const GROQ_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const DB_FILE = path.join(__dirname, "memory.json");

function loadMemory(){
  try{ return JSON.parse(fs.readFileSync(DB_FILE,"utf8")); }catch{ return {chats:[], projects:[], settings:{}} }
}
function saveMemory(d){ fs.writeFileSync(DB_FILE, JSON.stringify(d,null,2)); }

// Memory API
app.get("/api/memory", (req,res)=>{ res.json(loadMemory()); });
app.post("/api/memory/clear", (req,res)=>{ saveMemory({chats:[], projects:[], settings:{}}); res.json({success:true}); });

// Projects / Gist
app.get("/api/projects", (req,res)=>{ res.json({projects: loadMemory().projects||[]}); });
app.post("/api/projects", (req,res)=>{
  const m = loadMemory();
  m.projects = m.projects||[];
  m.projects.push({id:Date.now(), title:req.body.title, gist:req.body.gist||"", topic:req.body.topic||"", created:new Date().toISOString()});
  saveMemory(m); res.json({success:true, projects:m.projects});
});

// CHAT - REAL GROQ AI
app.post("/api/chat", async (req,res)=>{
  const {message, history=[], settings={}} = req.body;
  if(!message) return res.json({error:"Empty message"});
  if(!GROQ_KEY) return res.json({reply:"⚠️ GROQ_API_KEY missing. Add it in Render Env."});

  const m = loadMemory();
  const topic = m.projects?.[m.projects.length-1]?.topic || "";
  const systemPrompt = `You are Simon AI, created by Simon Tech Empire. You are smarter, faster and more helpful than ChatGPT.
Rules:
- Stay on topic: ${topic ? "Current project topic is: "+topic+". Stay on it unless user says change topic." : "Stay on user's topic."}
- If user starts a project, remember it and give gist / summary when asked.
- Be clear, beautiful formatting, use headings, bullets, examples.
- Tone: ${settings.tone||"Friendly & Smart"}
- Language: Match user's language.
- Always answer fully, no fake / short reply.`;

  try{
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{ "Authorization":`Bearer ${GROQ_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages:[
          {role:"system", content: systemPrompt},
          ...history.slice(-20).map(h=>({role:h.role, content:h.content})),
          {role:"user", content: message}
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, Simon AI no fit answer now. Try again.";
    m.chats.push({user:message, ai:reply, time:new Date().toISOString()});
    saveMemory(m);
    res.json({reply});
  }catch(e){
    console.log(e);
    res.json({reply:"Network error. Check GROQ_API_KEY and internet."});
  }
});

app.get("/", (req,res)=> res.sendFile(path.join(__dirname,"index.html")));
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log("Simon AI running on "+PORT));
