const STARTUP_DATA_CONCURRENCY=2;
const STARTUP_IDLE_TIMEOUT=180;
const startupRuntime={
  ready:true,active:false,total:0,started:0,completed:0,failed:0,running:0,
  maxConcurrent:0,visibilityPauses:0,idleYields:0,lastTask:"—",timeline:[],promise:null
};

function waitForStartupVisibility(){
  if(!document.hidden)return Promise.resolve();
  startupRuntime.visibilityPauses++;
  return new Promise(resolve=>{
    const resume=()=>{
      if(document.hidden)return;
      document.removeEventListener("visibilitychange",resume);
      resolve();
    };
    document.addEventListener("visibilitychange",resume);
  });
}

function yieldStartupIdle(){
  startupRuntime.idleYields++;
  return new Promise(resolve=>{
    if(typeof requestIdleCallback==="function")requestIdleCallback(()=>resolve(),{timeout:STARTUP_IDLE_TIMEOUT});
    else setTimeout(resolve,0);
  });
}

async function runStartupQueue(tasks,{concurrency=STARTUP_DATA_CONCURRENCY,reason="startup"}={}){
  const queue=(Array.isArray(tasks)?tasks:[]).filter(task=>task&&typeof task.run==="function");
  if(!queue.length)return [];
  const limit=clamp(Math.round(concurrency)||1,1,queue.length),results=new Array(queue.length);
  let cursor=0;
  startupRuntime.active=true;startupRuntime.total+=queue.length;
  const worker=async()=>{
    while(true){
      const index=cursor++;if(index>=queue.length)return;
      const task=queue[index],id=String(task.id||`task-${index+1}`);
      await waitForStartupVisibility();
      await yieldStartupIdle();
      startupRuntime.started++;startupRuntime.running++;startupRuntime.lastTask=id;
      startupRuntime.maxConcurrent=Math.max(startupRuntime.maxConcurrent,startupRuntime.running);
      startupRuntime.timeline.push({id,event:"start",at:Math.round(performance.now()),reason});
      try{
        const value=await task.run();
        results[index]={status:"fulfilled",value,id};
      }catch(error){
        startupRuntime.failed++;results[index]={status:"rejected",reason:error,id};
        console.warn(`Chargement initial ${id} indisponible`,error);
      }finally{
        startupRuntime.running--;startupRuntime.completed++;
        startupRuntime.timeline.push({id,event:"end",at:Math.round(performance.now()),reason});
        if(startupRuntime.timeline.length>32)startupRuntime.timeline.splice(0,startupRuntime.timeline.length-32);
      }
    }
  };
  await Promise.all(Array.from({length:limit},worker));
  startupRuntime.active=false;
  return results;
}

function runStartupDataLoad(){
  if(startupRuntime.promise)return startupRuntime.promise;
  const tasks=[
    {id:"osm",run:()=>fetchOverpass()},
    {id:"adresse",run:()=>fetchAddress()},
    {id:"cavités",run:()=>fetchCavities()},
    {id:"relief",run:()=>fetchElevation()},
    {id:"cadastre",run:()=>fetchCadastre()}
  ];
  startupRuntime.promise=runStartupQueue(tasks,{reason:"boot"})
    .finally(()=>{updateSnapshotUI();updateDebugPanel()});
  return startupRuntime.promise;
}
