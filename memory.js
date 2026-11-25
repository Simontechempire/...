// Simon AI Memory - Stay on topic, remember projects
const SimonMemory = {
  getProjects(){
    try{ return JSON.parse(localStorage.getItem("simon_projects")||"[]"); }catch{ return []; }
  },
  addProject(title, gist, topic){
    const p=this.getProjects();
    p.push({title, gist, topic, time:Date.now()});
    localStorage.setItem("simon_projects", JSON.stringify(p));
  },
  saveChat(user, ai){
    const h=JSON.parse(localStorage.getItem("simon_history")||"[]");
    h.push({user, ai, time:Date.now()});
    localStorage.setItem("simon_history", JSON.stringify(h.slice(-100)));
  },
  getHistory(){ return JSON.parse(localStorage.getItem("simon_history")||"[]"); },
  clear(){ localStorage.removeItem("simon_projects"); localStorage.removeItem("simon_history"); localStorage.removeItem("simon_chats"); }
};
window.SimonMemory = SimonMemory;
