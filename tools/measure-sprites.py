#!/usr/bin/env python3
# 캐릭터 풀캔버스 PNG의 알파(투명) 바운딩박스 → 씬 내 위치(%) 자동 측정.
#  PEOPLE_FILES의 box[left,top,w,h] / ox(중심x) / oy(발끝y) 산출용.
#  사용:  python3 tools/measure-sprites.py
import os
from PIL import Image

CHARS = ['jeonghun','eunseo','sujin','yeongsu','miyeon','dongho','jonghyeok','hayeong','jaehyeok','minsu']
BASE = 'assets/images/village'

print(f"{'char':10} {'box=[left, top, w, h]%':30} {'ox(중심x)':9} {'oy(발끝y)':9}  크기")
print('-'*72)
for c in CHARS:
    p = os.path.join(BASE, c + '.png')
    if not os.path.exists(p):
        print(f'{c:10} (파일 없음)')
        continue
    im = Image.open(p).convert('RGBA')
    W, H = im.size
    bbox = im.getchannel('A').getbbox()   # 알파 > 0 영역
    if not bbox:
        print(f'{c:10} (빈 이미지)')
        continue
    l, t, r, b = bbox
    left = l / W * 100; top = t / H * 100
    width = (r - l) / W * 100; height = (b - t) / H * 100
    ox = (l + r) / 2 / W * 100      # 중심 x
    oy = b / H * 100               # 발끝 = 알파 하단
    box = f'[{left:.1f},{top:.1f},{width:.1f},{height:.1f}]'
    print(f'{c:10} {box:30} {ox:8.1f} {oy:8.1f}   {W}x{H}')
