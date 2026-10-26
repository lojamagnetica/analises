import json, subprocess, os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); os.chdir(D)
pl=json.load(open('plano.json')); FIM=2.5; TOTAL=pl['total']; FPS=30
os.makedirs('render',exist_ok=True)
def run(c): subprocess.run(c,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
# 1) fala cortada, sem pausas
lista=[]
for i,(ini,fim,_,_) in enumerate(pl['cortes']):
    f=f'render/s{i:02d}.mp4'; d=fim-ini
    run(['ffmpeg','-y','-ss',f'{ini:.3f}','-i','original.mp4','-t',f'{d:.3f}','-vf',f'fps={FPS},scale=1080:1920,setsar=1','-af',f'aresample=48000,afade=t=in:d=0.03,afade=t=out:st={max(0,d-0.04):.3f}:d=0.04',
         '-c:v','libx264','-preset','veryfast','-crf','14','-c:a','aac','-b:a','192k','-ac','1',f])
    lista.append(f"file '{os.path.basename(f)}'")
open('render/fala.txt','w').write('\n'.join(lista))
run(['ffmpeg','-y','-f','concat','-safe','0','-i','render/fala.txt','-c','copy','render/fala.mp4'])
# 2) painel da esquerda: cada imagem com zoom lento e entrada suave
mud=pl['mudancas']; clips=[]
for i,(t,img) in enumerate(mud):
    fim=mud[i+1][0] if i+1<len(mud) else TOTAL+FIM
    d=fim-t; n=int(round(d*FPS)); f=f'render/p{i:02d}.mp4'
    tela=img.startswith('telas/')
    base=f'render/b{i:02d}.png'
    im=Image.open(img).convert('RGB')
    if tela and im.width<im.height:   # celular: centraliza num fundo escuro 16:9
        bg=Image.new('RGB',(1920,1080),(20,18,16)); im.thumbnail((1920,1000)); bg.paste(im,((1920-im.width)//2,40)); im=bg
    im.resize((2112,1188)).save(base)
    run(['ffmpeg','-y','-loop','1','-framerate',str(FPS),'-t',f'{d:.3f}','-i',base,'-vf',
         f"zoompan=z='1+0.035*on/{max(n,1)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1056x594:fps={FPS},fade=t=in:st=0:d=0.3:color=0x141210,format=yuv420p",
         '-frames:v',str(n),'-c:v','libx264','-preset','veryfast','-crf','14',f])
    clips.append(f"file '{os.path.basename(f)}'")
open('render/painel.txt','w').write('\n'.join(clips))
run(['ffmpeg','-y','-f','concat','-safe','0','-i','render/painel.txt','-c','copy','render/painel.mp4'])
# 3) assinatura recortada
a=Image.open('cartelas/00-assinatura.png'); a.crop(a.getbbox()).save('render/assinatura.png')
# 4) composição 16:9
fc=(f"color=c=0x141210:s=1920x1080:r={FPS}:d={TOTAL+FIM:.3f}[bg];"
    f"[0:v]crop=720:960:180:270,scale=756:1008:flags=lanczos,tpad=stop_mode=clone:stop_duration={FIM}[cam];"
    f"[bg][cam]overlay=1128:36[v1];"
    f"[v1][1:v]overlay=36:243:shortest=0[v2];"
    f"[2:v]format=rgba,fade=t=in:st=0.4:d=0.4:alpha=1,fade=t=out:st=5.2:d=0.4:alpha=1[ass];"
    f"[v2][ass]overlay=1150:830:enable='between(t,0.4,5.6)'[v3];"
    f"[3:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1,setpts=PTS+{TOTAL:.3f}/TB[fimc];"
    f"[v3][fimc]overlay=0:0:enable='gte(t,{TOTAL:.3f})',format=yuv420p[v];"
    f"[0:a]highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur={FIM}[a]")
run(['ffmpeg','-y','-i','render/fala.mp4','-i','render/painel.mp4','-loop','1','-i','render/assinatura.png','-loop','1','-t',str(FIM),'-i','cartelas/08-fim.png',
     '-filter_complex',fc,'-map','[v]','-map','[a]','-t',f'{TOTAL+FIM:.3f}','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',
     'Video-Boas-vindas-Hub.mp4'])
print('ok')
