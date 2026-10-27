"""Original procedural sound design. NumPy + stdlib only; no external audio samples."""
from pathlib import Path
import json, wave
import numpy as np

SR=48000
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets'/'audio'
OUT.mkdir(parents=True,exist_ok=True)
RNG=np.random.default_rng(271026)
report=[]
def timeline(seconds): return np.arange(round(seconds*SR))/SR
def noise(seconds,low=70,high=1400):
    n=round(seconds*SR); f=np.fft.rfftfreq(n,1/SR)
    spectrum=np.fft.rfft(RNG.normal(size=n))
    response=1/np.sqrt(1+(f/high)**8)*(1-1/np.sqrt(1+(f/max(low,1))**6))
    x=np.fft.irfft(spectrum*response,n)
    return x/(np.sqrt(np.mean(x*x))+1e-9)
def env(t,attack=.008,decay=.2): return (1-np.exp(-t/attack))*np.exp(-t/decay)
def stereo(x,pan=0):
    if x.ndim==2:return x
    p=np.asarray(pan);return np.column_stack((x*np.sqrt((1-p)/2),x*np.sqrt((1+p)/2)))
def tail(x):
    result=x.copy()
    for seconds,gain in [(.047,.16),(.113,.11),(.229,.07)]:
        k=round(seconds*SR)
        if k<len(x):result[k:]+=x[:-k]*gain
    return result
def drop(seconds=.65,freq=560):
    t=timeline(seconds);phase=2*np.pi*(freq*.14*t+freq*.86*.022*(1-np.exp(-t/.022)))
    return np.sin(phase)*env(t,.002,.12)*.33+noise(seconds,600,3000)*env(t,.001,.023)*.045
def sparkle(seconds=1.1):
    t=timeline(seconds);x=np.zeros(len(t))
    for f,start in [(740,0),(1108,.08),(1480,.16),(1760,.25)]:
        u=np.maximum(0,t-start);x+=(t>=start)*np.sin(2*np.pi*f*u+1.6*np.sin(2*np.pi*f*1.997*u)*np.exp(-u/.04))*env(u,.014,.22)*.038
    return tail(x)
def sweep(seconds,pan=0):
    t=timeline(seconds);p=t/seconds
    x=noise(seconds,80,1300)*(.025+.065*np.sin(np.pi*p)**2)
    x*=np.minimum(1,t/.12)*np.minimum(1,(seconds-t)/.45)
    x+=np.sin(2*np.pi*(110*t-28*t*t/seconds))*np.sin(np.pi*p)**2*.014
    return stereo(tail(x),pan)
def put(track,clip,at,gain=1):
    clip=stereo(clip);a=round(at*SR);n=min(len(clip),len(track)-a)
    if n>0:track[a:a+n]+=clip[:n]*gain
def save(name,x,description):
    x=stereo(x);peak=float(np.max(np.abs(x)));assert np.isfinite(x).all()
    if peak>.85:x*=.85/peak
    with wave.open(str(OUT/(name+'.wav')),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((np.clip(x,-1,1)*32767).astype('<i2').tobytes())
    report.append({'name':name,'file':'assets/audio/'+name+'.wav','seconds':len(x)/SR,'sample_rate':SR,'channels':2,'peak_dbfs':round(20*np.log10(max(float(np.max(np.abs(x))),1e-9)),2),'rms_dbfs':round(20*np.log10(max(float(np.sqrt(np.mean(x*x))),1e-9)),2),'description':description})
    return x

t=timeline(20)
ambient=np.column_stack([noise(20,35,650),noise(20,35,650)])
ambient*=((.028+.008*np.sin(2*np.pi*t/20)+.005*np.sin(2*np.pi*t*3/20))[:,None])
ambient+=np.sin(2*np.pi*62*t)[:,None]*.006
save('underwater_bed',ambient,'짙고 부드러운 수중 공간음. 주기 신호를 사용한 20초 반복.')
save('bubble_pop',tail(drop(.65,620)),'선택한 비눗막이 터지는 짧은 물방울과 잔향.')
save('word_catch',tail(drop(1.1,830)*.45+sparkle(1.1)),'단어를 붙잡았을 때의 밝고 절제된 금빛 반짝임.')
t=timeline(.85);splash=tail(noise(.85,200,2300)*env(t,.007,.13)*.10+drop(.85,430)*.36)
save('water_touch',splash,'놓친 단어가 수면에 닿을 때의 작은 물 튀김.')
save('descent',sweep(6),'수중으로 내려가는 6초 물살.')
gather=sweep(6);put(gather,sparkle(1.1),4.1,1.3);put(gather,drop(.65,740),4.8,.35)
save('gather',gather,'입자들이 한 점으로 모이는 물살과 은은한 광택.')
for name,direction in [('move_left',-1),('move_right',1)]:
    t=timeline(10/.65);p=t/(10/.65)
    pan=np.where(p<.3,np.sin(p/.3*2*np.pi)*.16,direction*np.clip((p-.3)/.48,0,1)*.72)
    x=sweep(10/.65,pan)
    for at in [4.6,6.1,7.8,10.0]:put(x,sparkle(1.1),at,.45)
    save(name,x,'균형에서 방향 결정으로 이어지는 15.38초 물살. 선택 방향으로 스테레오 이동.')
path=sweep(4);put(path,sparkle(1.1),.4,.9);save('light_path',path,'구슬의 빛이 길로 흩어지는 4초 잔향.')

# Ending events follow the supplied revised cut, not a wall-clock timer in the app.
ending=np.zeros((round(22.11*SR),2));put(ending,ambient,0,.8)
for at,gain in [(0,.7),(2.4,.5),(4.2,.7),(7.2,.6)]:put(ending,sparkle(1.1),at,gain)
put(ending,sweep(4),5.0,.55)
t=timeline(14.2);shore=np.column_stack([noise(14.2,90,2500),noise(14.2,90,2500)])
shore*=((.012+.014*np.sin(t*.8)**2)*np.minimum(1,t/1.2))[:,None]
put(ending,shore,7.8)
t=timeline(.45);foot=noise(.45,90,1450)*env(t,.002,.045)*.11+np.sin(2*np.pi*115*t)*env(t,.001,.045)*.06
put(ending,tail(foot),17.65,.85);put(ending,noise(.5,350,2000)*env(timeline(.5),.015,.10)*.014,17.15)
ending*=np.clip((22.11-timeline(22.11))/1.5,0,1)[:,None]
save('ending_design',ending,'수중 빛 → 육지 파도 → 17.65초의 부드러운 한 발걸음. 기존 영상 음성과 혼합.')
(ROOT/'sound-manifest.json').write_text(json.dumps({'method':'Original local procedural synthesis; no Artlist samples and no paid AI generation','master_default':.65,'ending_footstep_seconds':17.65,'files':report},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Created {len(report)} original stereo sound assets.')
