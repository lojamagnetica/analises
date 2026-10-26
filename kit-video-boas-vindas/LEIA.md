# Kit de edição · vídeo de boas-vindas do Hub

Edição já decidida (cortes, cartelas, telas do Hub, assinatura, áudio). Falta só renderizar com o vídeo original em alta.

1. Baixar o original do Drive da Camilla (id `1hBd1BaZBKUpvUPzdrnvqYMHdN69qnRGq`, 161 MB) para esta pasta como `original.mp4`.
2. Conferir com `ffprobe`: deve ter ~202 s, a mesma gravação da versão do WhatsApp (os cortes de `plano.json` usam esses tempos).
3. `python3 render.py` (precisa de ffmpeg e Pillow). Sai `Video-Boas-vindas-Hub.mp4` em 1920x1080.
4. Enquadramento mais fechado na Camilla: `crop=720:960:180:270` (em 1080x1920). Conferir um quadro e ajustar se cortar a cabeça ou as mãos.

Não é código do Hub: pode apagar esta pasta depois do vídeo pronto.
