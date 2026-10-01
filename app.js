'use strict';
const $ = id => document.getElementById(id);
const times = [.5,1,1.5,2,2.5,3];
const root = 'assets/occworld/instance/';
const state = { view:'input', case:'official', time:0, playback:null, training:0, trainingTimer:null, custom:{ input:[], prediction:[], gt:[], trajectory:[], training:[] } };
const label = () => `+${times[state.time].toFixed(1)} s`;
function showImage(id, source, alt) {
  const img=$(id);
  const empty=img.parentElement.querySelector('.empty-image');
  img.hidden=!source;
  if(empty) empty.hidden=!!source;
  if(alt) img.alt=alt;
  if(source) { if(img.getAttribute('src')!==source) img.src=source; }
  else img.removeAttribute('src');
}
document.querySelectorAll('.case-image img').forEach(img=>img.addEventListener('error',()=>{
  img.hidden=true;
  const msg=img.parentElement.querySelector('.empty-image');
  if(msg){msg.hidden=false;msg.textContent='图片加载失败，请刷新页面或重新导入。';}
}));
function render() {
  const official=state.case==='official', n=state.time+1;
  const input=official?root+'observations.png':state.custom.input[0];
  const prediction=official?root+`prediction-${n}.png`:state.custom.prediction[state.time];
  const gt=official?root+`gt-${n}.png`:state.custom.gt[state.time];
  const trajectory=official?root+`trajectory-${n}.png`:state.custom.trajectory[state.custom.trajectory.length===1?0:state.time];
  showImage('prediction-input',input,official?'与预测结果对应的官方历史观测拼图':'用户导入的当前环境');
  showImage('prediction-image',prediction,`${label()} 的 ${official?'官方':'用户导入'}预测占用`);
  showImage('gt-image',gt,`${label()} 的 ${official?'官方':'用户导入'}真实未来占用 GT`);
  showImage('planning-occupancy',prediction,`${label()} 的预测占用`);
  showImage('trajectory-image',trajectory,official?`${label()} 按官方图中位移标注累加重绘的轨迹`:'用户导入的轨迹图片');
  $('prediction-time').textContent=label();$('planning-time').textContent=label();
  document.querySelectorAll('[data-time]').forEach(el=>el.textContent=label());
  document.querySelectorAll('.time-point').forEach(button=>{
    const active=Number(button.dataset.index)===state.time;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  });
  document.querySelectorAll('[data-play]').forEach(button=>button.textContent=state.playback?'暂停':'播放');
  $('case-mode').textContent=['input','training'].includes(state.view)?'训练权重待接入 · 可直接查看预测与规划':official?'预生成结果 · OccWorld 官方示例':'预生成结果 · 本地导入';
  $('result-name').textContent=official?'OccWorld 官方示例':'我的结果图片';
  $('prediction-input-note').textContent=official?'官方历史观测拼图，与右侧预测和 GT 来自同一总览图。':'请确保三组图片来自同一场景、同一次实验和相同时间范围。';
  $('prediction-source').textContent=official?'官方预生成结果':'导入的已有结果';
  $('prediction-note').textContent=official?'图中保留了作者的位移标注与圈注。+3 秒可对比道路和周边车辆的差异；这些差异不等同于本系统计算的评估指标。':'缺少的时间点显示空状态，不用官方案例或示意图填充。页面不计算准确率或轨迹误差。';
  $('planning-tag').textContent=official?'临时轨迹示意 · 标注重绘':'已有轨迹结果';
  $('planning-note').textContent=official?'官方未提供该案例独立轨迹图片。此图人工抄录同一总览图的逐步位移，并按官方评估代码的累加方式重绘；数值有舍入，不能用于精确评估或道路碰撞判断。':'轨迹图片由用户提供，页面不从占用图片反推轨迹或重新规划。一张图片时按完整静态轨迹展示，多张时按时间点切换。';
  $('trajectory-subtitle').textContent=official?'辅助重绘 · 非重新推理 · 坐标轴等比例':state.custom.trajectory.length===1?'完整静态轨迹 · 不随时间变化':'按时间点浏览导入图片';
  document.querySelectorAll('.custom-tools').forEach(el=>el.hidden=official);
}
function stopPlayback() { if(state.playback) clearInterval(state.playback);state.playback=null;render(); }
function switchView(view) {
  const changed=state.view!==view;
  if(changed) stopPlayback();
  state.view=view;
  document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!==`view-${view}`;});
  document.querySelectorAll('.module-tab').forEach(button=>{
    const active=button.dataset.view===view;
    button.classList.toggle('active',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  render();
  if(changed) window.scrollTo({top:0,behavior:'auto'});
}
for(const id of ['prediction-times','planning-times']) {
  times.forEach((time,index)=>{
    const button=document.createElement('button');button.type='button';button.className='time-point';button.dataset.index=String(index);button.textContent=`+${time.toFixed(1)} s`;
    button.addEventListener('click',()=>{stopPlayback();state.time=index;render();});$(id).append(button);
  });
}
document.querySelectorAll('.module-tab').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.go)));
document.querySelectorAll('[data-play]').forEach(button=>button.addEventListener('click',()=>{
  if(state.playback){stopPlayback();return;}
  if(state.time===5)state.time=0;
  state.playback=setInterval(()=>{if(state.time===5){stopPlayback();return;}state.time++;render();},1200);render();
}));
document.querySelectorAll('[data-next]').forEach(button=>button.addEventListener('click',()=>{stopPlayback();state.time=(state.time+1)%6;render();}));
$('case-select').addEventListener('change',e=>{stopPlayback();state.case=e.target.value;state.time=0;$('status').textContent='';render();});
$('confirm-input').addEventListener('click',()=>{$('input-feedback').textContent='已保存界面配置。数据读取待接入，可继续查看训练流程或直接进入预测。';});
function importImages(id,key,max) {
  $(id).addEventListener('change',event=>{
    const files=Array.from(event.target.files);
    if(!files.length)return;
    const accepted=files.filter(file=>['image/png','image/jpeg','image/webp'].includes(file.type));
    if(!accepted.length){$('status').textContent='请选择 PNG、JPG 或 WebP 图片。';return;}
    if(accepted.some(file=>file.size>20*1024*1024)){$('status').textContent='单张图片请控制在 20 MB 内。';return;}
    accepted.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    state.custom[key].forEach(url=>URL.revokeObjectURL(url));
    state.custom[key]=accepted.slice(0,max).map(file=>URL.createObjectURL(file));
    $('status').textContent=accepted.length>max?`已读取前 ${max} 张图片，其余未导入。`:`已导入 ${Math.min(max,accepted.length)} 张图片，仅本地展示。`;
    if(key==='training'){
      $('training-image').src=state.custom.training[0];$('training-image').hidden=false;$('training-upload-name').textContent=accepted[0].name;
    }else {stopPlayback();render();}
  });
}
importImages('input-upload','input',1);importImages('future-upload','prediction',6);importImages('gt-upload','gt',6);importImages('planning-upload','trajectory',6);importImages('training-upload','training',1);
function renderTraining(){
  const p=state.training,index=Math.min(3,Math.floor(p/25)),names=['数据准备','VQVAE 表示学习','OccWorld 时序训练','验证与整理'];
  $('training-percent').textContent=p+'%';$('training-progress').style.width=p+'%';$('progress-track').setAttribute('aria-valuenow',String(p));
  $('training-stage-title').textContent=p===0?'等待开始':p===100?'流程演示完成':names[index];
  $('training-stage-desc').textContent=p===100?'回放结束，未启动真实训练或加载权重。':'仅演示训练阶段，不生成模型或评估指标。';
  $('start-training').textContent=state.trainingTimer?'暂停回放':p===100?'重新播放':'播放训练流程';
  $('training-nav').textContent=p===100?'回放完成':state.trainingTimer?'回放中':p?'已暂停':'流程回放';
  document.querySelectorAll('.stage').forEach((el,i)=>{el.classList.toggle('active',i===index&&p<100);el.classList.toggle('done',p===100||i<index);});
}
$('start-training').addEventListener('click',()=>{
  if(state.trainingTimer){clearInterval(state.trainingTimer);state.trainingTimer=null;renderTraining();return;}
  if(state.training===100)state.training=0;
  state.trainingTimer=setInterval(()=>{state.training++;if(state.training>=100){state.training=100;clearInterval(state.trainingTimer);state.trainingTimer=null;}renderTraining();},110);renderTraining();
});
$('reset-training').addEventListener('click',()=>{clearInterval(state.trainingTimer);state.trainingTimer=null;state.training=0;renderTraining();});
render();renderTraining();switchView('input');
