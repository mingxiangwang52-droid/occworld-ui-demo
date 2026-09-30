const $ = (id) => document.getElementById(id);
const times = [0.5, 1, 1.5, 2, 2.5, 3];
const scenes = {
  junction: { label: '示例 A · 城市路口', short: '城市路口', code: 'A' },
  arterial: { label: '示例 B · 城市主路', short: '城市主路', code: 'B' },
  bend: { label: '示例 C · 转弯路段', short: '转弯路段', code: 'C' }
};
const state = { view: 'input', scene: 'junction', frame: 8, time: 0, mapMode: 'bev', training: 0, trainingTimer: null, playbackTimer: null, playbackView: null, images: { input: null, training: null, future: [], planning: null } };

function setText(id, value) { $(id).textContent = value; }
function formatTime(index = state.time) { return `+${times[index].toFixed(1)} s`; }
function updateLabels() {
  const scene = scenes[state.scene];
  setText('context-scene', scene.label);
  setText('context-frame', `${String(state.frame).padStart(2, '0')} / 24`);
  setText('input-frame-value', String(state.frame).padStart(2, '0'));
  setText('scene-id', `DEMO-${scene.code} / ${String(state.frame).padStart(2, '0')}`);
  setText('scene-time', `T = ${(state.frame * 0.5).toFixed(1)} s`);
  setText('prediction-scene', scene.label);
  setText('prediction-frame', String(state.frame).padStart(2, '0'));
  setText('planning-scene', scene.label);
  setText('future-time-chip', formatTime());
  setText('planning-time-chip', formatTime());
  setText('prediction-time-detail', formatTime());
  setText('planning-time-detail', formatTime());
  const turn = state.scene === 'bend' ? 1 : state.scene === 'junction' ? -0.35 : 0;
  setText('planning-x', `${(turn * times[state.time] * times[state.time] * 0.85).toFixed(1)} m`);
  setText('planning-y', `${(times[state.time] * 4.2).toFixed(1)} m`);
  $('history-strip').replaceChildren(...Array.from({ length: 4 }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'history-frame';
    el.textContent = `T-${3 - i}`;
    return el;
  }));
  for (const id of ['prediction-times', 'planning-times']) {
    $(id).replaceChildren(...times.map((time, i) => {
      const button = document.createElement('button');
      button.className = `time-point${i === state.time ? ' active' : ''}`;
      button.type = 'button';
      button.textContent = `+${time.toFixed(1)} s`;
      button.setAttribute('aria-pressed', String(i === state.time));
      button.addEventListener('click', () => setTime(i));
      return button;
    }));
  }
}
function setTime(index) { state.time = index; updateLabels(); updateFutureImage(); render(); }
function stopPlayback() {
  if (state.playbackTimer) clearInterval(state.playbackTimer);
  state.playbackTimer = null;
  state.playbackView = null;
  setText('prediction-play', '播放');
  setText('planning-play', '播放');
}
function play(view) {
  if (state.playbackTimer) { stopPlayback(); return; }
  if (state.time === times.length - 1) setTime(0);
  state.playbackView = view;
  setText(`${view}-play`, '暂停');
  state.playbackTimer = setInterval(() => {
    if (state.time === times.length - 1) { stopPlayback(); return; }
    setTime(state.time + 1);
  }, 850);
}
function switchView(view) {
  if (state.playbackView && state.playbackView !== view) stopPlayback();
  state.view = view;
  document.querySelectorAll('.module-tab').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.querySelectorAll('.view').forEach(section => {
    const active = section.id === `view-${view}`;
    section.classList.toggle('active', active);
    section.hidden = !active;
  });
  requestAnimationFrame(render);
}

function sizeCanvas(canvas) {
  if (!canvas || !canvas.offsetWidth) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.offsetWidth, height = canvas.offsetHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}
function rounded(ctx, x, y, width, height, color, radius = 3) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}
function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function drawScene(id, offset, options = {}) {
  const sized = sizeCanvas($(id));
  if (!sized) return;
  const { ctx, width: w, height: h } = sized;
  ctx.save(); ctx.scale(w / 640, h / 440);
  ctx.fillStyle = '#dce8e5'; ctx.fillRect(0, 0, 640, 440);
  const junction = state.scene === 'junction';
  const bend = state.scene === 'bend';
  const road = state.mapMode === 'grid' ? '#b8d5cb' : '#a9c7bf';
  ctx.fillStyle = road;
  ctx.fillRect(bend ? 202 : 220, 0, bend ? 252 : 200, 440);
  if (junction) ctx.fillRect(0, 172, 640, 105);
  if (bend) {
    ctx.fillStyle = '#dce8e5';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(205, 0); ctx.quadraticCurveTo(225, 145, 205, 240); ctx.lineTo(0, 245); ctx.fill();
  }
  ctx.strokeStyle = '#eff6ec'; ctx.lineWidth = 2; ctx.setLineDash([12, 13]);
  for (const x of [270, 370]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 440); ctx.stroke(); }
  if (junction) { ctx.beginPath(); ctx.moveTo(0, 224); ctx.lineTo(640, 224); ctx.stroke(); }
  ctx.setLineDash([]);
  const blocks = junction ? [[28,22,158,120],[472,20,137,131],[30,300,156,115],[474,301,132,111]] : [[24,25,148,165],[480,22,131,152],[25,267,144,143],[480,270,132,135]];
  blocks.forEach(([x,y,bh,bw],i) => { rounded(ctx,x,y,bh,bw,'#77918f',5); rounded(ctx,x+9,y+8,bh-18,bw-16,i%2?'#93a9a3':'#859f9a',3); });
  ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1;
  for (let x=0; x<640; x+=32) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,440);ctx.stroke(); }
  for (let y=0; y<440; y+=32) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(640,y);ctx.stroke(); }
  const t = (offset || 0) + (state.frame - 8) * 0.5;
  const drift = state.scene === 'bend' ? t * 8 : junction ? -t * 3 : 0;
  if (options.history) {
    ctx.strokeStyle = '#5eaaa4'; ctx.lineWidth = 4; ctx.setLineDash([6,6]);
    ctx.beginPath(); ctx.moveTo(320,420); ctx.lineTo(320,333); ctx.stroke(); ctx.setLineDash([]);
  }
  if (options.route) {
    const turn = state.scene === 'bend' ? 1 : junction ? -0.35 : 0;
    const points = times.map(time => [320 + turn * time * time * 0.85 * 12, 330 - time * 4.2 * 12]);
    ctx.strokeStyle = '#f2c35c';ctx.lineWidth = 5;ctx.lineCap = 'round';
    ctx.beginPath();ctx.moveTo(320,330);
    points.forEach(([x,y]) => ctx.lineTo(x,y));
    ctx.stroke();
    points.forEach(([x,y],i) => dot(ctx,x,y,i===state.time?8:4,i===state.time?'#125e5b':'#ffe7a5'));
  }
  const vehicles = [[317+drift,214-t*23],[388,109+t*9],[273,87+t*12],[376,316-t*16],[271,346+t*8]];
  if (options.occupancy !== false) vehicles.forEach(([x,y],i)=>rounded(ctx,x-9,y-16,18,32,i===0?'#2d7774':'#e78f61',3));
  rounded(ctx,310,312,20,36,'#185e5b',4);
  dot(ctx,167,265+t*7,5,'#edbf62');dot(ctx,450,220-t*6,5,'#edbf62');
  if (state.mapMode === 'grid') {
    ctx.globalAlpha = .32;
    for(let x=0;x<640;x+=20) for(let y=0;y<440;y+=20) {ctx.strokeStyle='#fff';ctx.strokeRect(x,y,20,20);}
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function render() {
  drawScene('input-canvas', 0, { history: true });
  drawScene('prediction-current-canvas', 0, { history: true });
  drawScene('prediction-future-canvas', times[state.time]);
  drawScene('planning-canvas', times[state.time], { history: $('show-history').checked, route: $('show-route').checked, occupancy: $('show-occupancy').checked });
}
function setImage(file, target, key) {
  if (!file || !file.type.startsWith('image/')) return;
  if (state.images[key]) URL.revokeObjectURL(state.images[key]);
  state.images[key] = URL.createObjectURL(file);
  $(target).src = state.images[key];
  $(target).hidden = false;
  if (key === 'input') { $('prediction-current-image').src = state.images[key]; $('prediction-current-image').hidden = false; }
  if (key === 'training') setText('training-upload-name', file.name);
  if (key === 'planning') ['show-occupancy','show-route','show-history'].forEach(id => { $(id).disabled = true; });
}
function updateFutureImage() {
  const image = $('prediction-future-image');
  const url = state.images.future[state.time];
  image.hidden = !url;
  if (url) image.src = url;
  document.querySelector('#view-prediction .detail-panel .scene-stat:nth-of-type(3) strong').textContent = url ? '本地导入图片' : '前端示意数据';
  setText('prediction-play-status', url ? `已导入图片 · 第 ${state.time + 1} 张` : state.images.future.length ? '此时间点没有导入图片，显示前端示意' : '前端示意 · 非实时推理');
}
function clearImage(key, targets, input) {
  if (state.images[key]) URL.revokeObjectURL(state.images[key]);
  state.images[key] = null;
  targets.forEach(id => { $(id).hidden = true; $(id).removeAttribute('src'); });
  $(input).value = '';
  if (key === 'planning') ['show-occupancy','show-route','show-history'].forEach(id => { $(id).disabled = false; });
}
function clearImportedResults() {
  clearImage('input', ['input-image', 'prediction-current-image'], 'input-upload');
  clearImage('planning', ['planning-image'], 'planning-upload');
  state.images.future.forEach(url => URL.revokeObjectURL(url));
  state.images.future = [];
  $('future-upload').value = '';
  updateFutureImage();
  setText('nav-prediction-state', '待演示');
  setText('nav-planning-state', '待演示');
  setText('input-feedback', '输入已更改，请确认当前演示输入。');
  setText('nav-input-state', '待确认');
}
function updateTraining() {
  const p = Math.round(state.training);
  $('training-progress').style.width = `${p}%`;
  setText('training-percent', `${p}%`);
  const stages = [
    ['数据准备', '展示数据整理与时序样本准备。'],
    ['VQVAE 表示学习', '展示三维占用场景的离线编码阶段。'],
    ['OccWorld 时序训练', '展示未来占用与自车运动建模阶段。'],
    ['验证与整理', '展示离线验证及产物整理阶段。']
  ];
  const index = Math.min(3, Math.floor(p / 25));
  setText('training-stage-title', p === 0 ? '等待开始' : p === 100 ? '演示完成' : stages[index][0]);
  setText('training-stage-desc', p === 0 ? '点击下方按钮播放训练阶段，不会启动服务器训练。' : p === 100 ? '训练流程回放结束；此页面尚未接入真实权重。' : stages[index][1]);
  document.querySelectorAll('#stage-row .stage').forEach((el,i)=>{el.classList.toggle('active',i===index && p<100);el.classList.toggle('done',p===100 || i<index);});
  setText('nav-training-state', p===100?'回放完成':p>0?(state.trainingTimer?'回放中':'已暂停'):'未播放');
  setText('start-training', state.trainingTimer?'暂停回放':p===100?'重新播放':'播放训练流程');
}
function startTraining() {
  if (state.trainingTimer) { clearInterval(state.trainingTimer); state.trainingTimer=null; updateTraining(); return; }
  if (state.training >= 100) state.training=0;
  state.trainingTimer=setInterval(()=>{
    state.training=Math.min(100,state.training+1);
    updateTraining();
    if(state.training===100){clearInterval(state.trainingTimer);state.trainingTimer=null;updateTraining();}
  },110);
  updateTraining();
}

document.querySelectorAll('.module-tab').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));
$('scene-select').addEventListener('change',e=>{state.scene=e.target.value;clearImportedResults();updateLabels();render();});
$('input-frame').addEventListener('input',e=>{state.frame=Number(e.target.value);clearImportedResults();updateLabels();render();});
$('confirm-input').addEventListener('click',()=>{setText('input-feedback','已确认当前演示输入。');setText('nav-input-state','已确认');});
document.querySelectorAll('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>{state.mapMode=button.dataset.mapMode;document.querySelectorAll('[data-map-mode]').forEach(item=>item.classList.toggle('active',item===button));render();}));
$('start-training').addEventListener('click',startTraining);
$('reset-training').addEventListener('click',()=>{if(state.trainingTimer)clearInterval(state.trainingTimer);state.trainingTimer=null;state.training=0;updateTraining();});
$('run-demo').addEventListener('click',()=>{switchView('prediction');setTime(0);setText('prediction-play-status','前端演示序列已加载');setText('nav-prediction-state','演示已加载');play('prediction');});
$('prediction-play').addEventListener('click',()=>play('prediction'));
$('planning-play').addEventListener('click',()=>play('planning'));
$('prediction-next').addEventListener('click',()=>{stopPlayback();setTime((state.time+1)%times.length);});
$('planning-next').addEventListener('click',()=>{stopPlayback();setTime((state.time+1)%times.length);});
['show-occupancy','show-route','show-history'].forEach(id=>$(id).addEventListener('change',render));
$('input-upload').addEventListener('change',e=>setImage(e.target.files[0],'input-image','input'));
$('training-upload').addEventListener('change',e=>setImage(e.target.files[0],'training-image','training'));
$('planning-upload').addEventListener('change',e=>setImage(e.target.files[0],'planning-image','planning'));
$('clear-input-image').addEventListener('click',()=>clearImage('input',['input-image','prediction-current-image'],'input-upload'));
$('clear-planning-image').addEventListener('click',()=>clearImage('planning',['planning-image'],'planning-upload'));
$('future-upload').addEventListener('change',e=>{
  state.images.future.forEach(url=>URL.revokeObjectURL(url));
  state.images.future=Array.from(e.target.files).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).slice(0,6).map(file=>URL.createObjectURL(file));
  updateFutureImage();setText('nav-prediction-state',state.images.future.length?'图片已导入':'待演示');
});
$('clear-future-images').addEventListener('click',()=>{state.images.future.forEach(url=>URL.revokeObjectURL(url));state.images.future=[];$('future-upload').value='';updateFutureImage();setText('nav-prediction-state','待演示');});
$('download-demo').addEventListener('click',()=>{
  const trajectory=times.map((time,i)=>({time_s:time,x_m:Number(((state.scene==='bend'?1:state.scene==='junction'?-0.35:0)*time*time*.85).toFixed(2)),y_m:Number((time*4.2).toFixed(2))}));
  const content={source:'frontend_demo_only',model:'OccWorld (not connected)',scene:state.scene,frame:state.frame,trajectory};
  const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`occworld-demo-${state.scene}-${state.frame}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('resize',render);
updateLabels();updateTraining();switchView('input');
