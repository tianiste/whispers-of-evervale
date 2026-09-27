"""Original Sunmeadow pixel artwork. Requires Pillow; no runtime dependency.
Run with Python from any directory. Source pixels are enlarged exactly 2x.
"""
from pathlib import Path
import random
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[2] / 'public/assets/art'
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(101)

def save(im, name):
    im.resize((im.width * 2, im.height * 2), Image.Resampling.NEAREST).save(OUT / f'environment-{name}.png')

def grass(d, x, y, c):
    d.line([(x - 2, y - 2), (x, y), (x, y - 4)], fill=c)
    d.point((x + 2, y - 2), fill=c)

def flowers(d, x, y, c):
    d.line((x, y, x, y - 5), fill='#3b6647')
    d.rectangle((x - 2, y - 6, x + 2, y - 4), fill=c)
    d.rectangle((x - 1, y - 7, x + 1, y - 3), fill=c)
    d.point((x, y - 5), fill='#f4d991')

im = Image.new('RGB', (900, 550), '#728a50'); d = ImageDraw.Draw(im)
# Broad meadow variations sit below small clusters, without a visible tile grid.
for _ in range(800):
    x, y = rng.randrange(900), rng.randrange(550); rx, ry = rng.randrange(8, 35), rng.randrange(3, 12)
    d.ellipse((x-rx,y-ry,x+rx,y+ry), fill=rng.choice(['#748c51','#788f53','#6f874e','#6d854e']))
for _ in range(11000):
    x, y = rng.randrange(900), rng.randrange(550)
    grass(d,x,y,rng.choice(['#80975b','#637d49','#8d9e62','#70894f']))
paths = [[(100,135),(135,140),(180,165),(230,195),(280,245),(345,275),(410,285),(490,325)],
         [(350,140),(460,135),(575,160),(650,210),(750,215),(750,300),(670,390),(585,465),(465,470),(460,390),(490,325)],
         [(650,210),(700,175),(740,150)],[(410,285),(400,250)],[(345,275),(350,140)]]
mask = Image.new('L',im.size); md = ImageDraw.Draw(mask)
for color, width in [('#526c41',28),('#ad9767',24),('#c4ad79',20)]:
    for points in paths:
        d.line(points,fill=color,width=width,joint='curve')
        for x,y in points:d.ellipse((x-width//2,y-width//2,x+width//2,y+width//2),fill=color)
for points in paths:
    md.line(points,fill=255,width=19,joint='curve')
for _ in range(6000):
    x,y=rng.randrange(900),rng.randrange(550)
    if mask.getpixel((x,y)):
        d.line((x,y,x+rng.randrange(1,4),y),fill=rng.choice(['#b59c6e','#cfb987','#bea574']))
# A quiet pond outside the ridden route, with reeds and water lilies.
d.ellipse((44,315,164,391),fill='#4d6949'); d.ellipse((49,318,157,387),fill='#a59a66')
d.ellipse((54,322,153,382),fill='#385f61'); d.ellipse((59,326,150,377),fill='#4a7c79')
for _ in range(90):
    x,y=rng.randrange(62,147),rng.randrange(330,373)
    if im.getpixel((x,y))==(74,124,121):d.line((x,y,x+rng.randrange(2,9),y),fill=rng.choice(['#669994','#518785','#77a79a']))
for x,y in [(74,349),(117,366),(137,339)]:
    d.ellipse((x-4,y-2,x+4,y+2),fill='#769454'); flowers(d,x,y,'#e3c5b1')
for x in range(56,150,6):
    y=379+rng.randrange(-4,4); d.line((x,y,x-2,y-9),fill='#556e3f'); d.line((x+2,y,x+3,y-11),fill='#879752')
# Flower borders and small naturally spaced stones.
for cx,cy in [(267,194),(265,308),(618,315),(660,424),(166,220),(780,147),(428,202),(386,514),(812,448)]:
    for _ in range(24):
        x,y=cx+rng.randrange(-23,24),cy+rng.randrange(-12,13)
        if not mask.getpixel((x,y)):flowers(d,x,y,rng.choice(['#ead59a','#d9b4a8','#b9b3cf','#e5e0bd']))
for _ in range(120):
    x,y=rng.randrange(900),rng.randrange(550)
    if not mask.getpixel((x,y)):
        d.rectangle((x,y,x+3,y+1),fill='#606e56');d.line((x,y-1,x+2,y-1),fill='#a9ab86')
# Paddock fences remain open at the stable approach and main travel lanes.
def fence(x1,y1,x2,y2):
    d.line((x1,y1+2,x2,y2+2),fill='#526840',width=5)
    for yy in (-5,-1):d.line((x1,y1+yy,x2,y2+yy),fill='#684e36',width=3); d.line((x1,y1+yy-1,x2,y2+yy-1),fill='#c4a16b')
    steps=max(abs(x2-x1),abs(y2-y1))//14
    for i in range(steps+1):
        x=round(x1+(x2-x1)*i/max(steps,1));y=round(y1+(y2-y1)*i/max(steps,1))
        d.rectangle((x-1,y-9,x+2,y+3),fill='#745437');d.line((x-1,y-9,x-1,y+2),fill='#d9b879');d.point((x,y-8),fill='#f0ce90')
fence(278,207,311,207);fence(445,207,540,207);fence(540,207,540,240)
fence(295,338,387,338);fence(520,349,571,349);fence(571,349,590,315)
# Cobble aprons, only below building entrances.
for cx,cy,w in [(400,252,60),(182,148,34),(110,123,39)]:
    for yy in range(cy-4,cy+7,4):
        for xx in range(cx-w//2,cx+w//2,7):
            d.rectangle((xx+(yy%8)//2,yy,xx+5+(yy%8)//2,yy+2),fill=rng.choice(['#b5aa82','#aaa17b','#c5b790']))
save(im,'ground')

# Timber buildings: deep eaves, individual shingles, beams and lit windows.
def building(name,w,h,roof,stable=False):
    im=Image.new('RGBA',(w,h));d=ImageDraw.Draw(im)
    d.ellipse((6,h-14,w-2,h-1),fill='#344c3b70')
    left,right=10,w-11; top=39;bottom=h-10
    d.rectangle((left,top,right,bottom),fill='#59432f')
    d.rectangle((left+3,top+1,right-3,bottom-3),fill='#b79a69' if not stable else '#976d47')
    for y in range(top+3,bottom-2,5):
        d.line((left+3,y,right-3,y),fill='#94774e' if not stable else '#775237')
        d.line((left+4,y+1,right-4,y+1),fill='#c2a676' if not stable else '#b38755')
    for x in [left+3,right-5,w//2]:d.rectangle((x,top,x+2,bottom),fill='#644a32')
    d.rectangle((left,bottom-4,right,bottom),fill='#686958')
    # Warm panes with deep teal shutters.
    for x in ([22,w-36] if stable else [18,w-30]):
        d.rectangle((x-3,top+8,x+14,top+25),fill='#395753');d.rectangle((x,top+9,x+10,top+22),fill='#443d30')
        d.rectangle((x+1,top+10,x+9,top+21),fill='#e5b968');d.line((x+1,top+10,x+8,top+10),fill='#f4d692')
        d.line((x+5,top+9,x+5,top+22),fill='#755133');d.line((x,top+16,x+10,top+16),fill='#755133')
        d.rectangle((x-2,top+24,x+13,top+26),fill='#d7b881')
        for fx in range(x-1,x+13,3):flowers(d,fx,top+28,'#d9b4a8')
    dw=27 if stable else 15;dx=w//2-dw//2
    d.rectangle((dx-2,bottom-31,dx+dw+2,bottom),fill='#473b2d');d.rectangle((dx,bottom-29,dx+dw,bottom-2),fill='#785139')
    for x in range(dx+2,dx+dw,4):d.line((x,bottom-28,x,bottom-3),fill='#aa7d4f')
    d.line((dx,bottom-27,dx+dw,bottom-3),fill='#d0aa70',width=2)
    if stable:d.line((dx+dw,bottom-27,dx,bottom-3),fill='#d0aa70',width=2)
    d.rectangle((dx+dw-3,bottom-15,dx+dw-2,bottom-13),fill='#ecc778')
    # Broad roof perspective with overlapping courses, authored pixel by pixel.
    poly=[(5,43),(14,16),(w-19,10),(w-3,43)]
    d.polygon(poly,fill='#3c4439');d.polygon([(7,39),(16,17),(w-20,12),(w-5,39)],fill=roof[0])
    for y in range(17,39,5):
        inset=max(0,(30-y)//3)
        d.line((14+inset,y,w-14-inset,y),fill=roof[1])
        for x in range(16+inset+(y%2)*4,w-17-inset,9):d.line((x,y,x-1,y+3),fill=roof[2])
    d.line((14,15,w-20,10),fill=roof[1],width=2);d.rectangle((6,40,w-4,44),fill='#493d2c');d.line((7,40,w-5,40),fill='#d1ad75')
    d.rectangle((w-29,3,w-20,18),fill='#857f67');d.line((w-29,7,w-21,7),fill='#b6aa89');d.rectangle((w-31,2,w-18,5),fill='#b7ae8d')
    if stable:
        d.rectangle((w//2-21,44,w//2+21,52),fill='#d2b480');d.rectangle((w//2-19,45,w//2+19,51),fill='#3f6760')
        d.arc((w//2-4,44,w//2+4,52),0,180,fill='#e8d1a0',width=2)
    save(im,name)
building('stable',150,102,['#41625b','#69867a','#2d4a48'],True)
building('bakery',82,90,['#9a614b','#c48a64','#714e3d'])
building('hall',91,98,['#4a6a62','#799584','#34534d'])

# Layered oak canopy, bark, twisting roots and scattered leaf highlights.
im=Image.new('RGBA',(100,114));d=ImageDraw.Draw(im)
d.ellipse((9,94,92,112),fill='#294b3560')
d.polygon([(37,103),(45,84),(42,52),(57,51),(57,84),(64,102),(74,108),(54,103),(47,109),(41,104),(29,109)],fill='#4c4130')
d.polygon([(44,100),(49,77),(47,54),(55,56),(52,83),(58,102),(49,98)],fill='#97724a')
d.line((46,80,29,59),fill='#624c32',width=7);d.line((53,73,73,50),fill='#624c32',width=7)
d.line((49,59,51,91),fill='#bd945c',width=2)
for cx,cy,rx,ry in [(27,61,23,18),(72,61,24,20),(47,69,28,18),(18,44,17,18),(77,39,21,23),(50,25,31,23),(43,45,38,27)]:
    d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill='#34553b')
    d.ellipse((cx-rx+2,cy-ry,cx+rx-2,cy+ry-6),fill='#496c42')
    d.ellipse((cx-rx+3,cy-ry,cx+rx-6,cy+ry-11),fill='#648348')
for _ in range(550):
    x,y=rng.randrange(7,91),rng.randrange(6,80)
    if im.getpixel((x,y))[:3] in [(100,131,72),(73,108,66)]:
        d.line((x,y,x+2,y),fill=rng.choice(['#78964f','#8ea45e','#597c43','#a4b16b']))
save(im,'oak')
# Pixel-soft light mask; inexpensive additive sprite shared by windows/Echo.
im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
for r in range(31,0,-1):d.ellipse((32-r,32-r,32+r,32+r),fill=(242,202,126,round(27*(1-r/32)**2)))
save(im,'glow')
assert Image.open(OUT/'environment-ground.png').size == (1800,1100)
assert all(Image.open(OUT/f'environment-{name}.png').mode=='RGBA' for name in ['stable','bakery','hall','oak','glow'])
print('Generated seven original environment textures.')
# Small prop sheet: a wayfinding board, hay and barrel group, garden crate.
im=Image.new('RGBA',(120,44));d=ImageDraw.Draw(im)
d.rectangle((15,18,18,40),fill='#684c34');d.line((15,19,15,39),fill='#bc945d')
d.polygon([(1,9),(27,9),(32,14),(27,19),(1,19)],fill='#513e2e');d.polygon([(3,10),(26,10),(29,14),(26,17),(3,17)],fill='#b69460')
d.line((7,13,21,13),fill='#405d51',width=2)
for x,y in [(48,23),(62,28)]:
    d.rectangle((x,y,x+16,y+10),fill='#b58d45');d.line((x,y,x+15,y),fill='#e1bd69')
    for yy in range(y+2,y+9,2):d.line((x+1,yy,x+15,yy),fill='#d1a655')
    d.line((x+4,y,x+4,y+10),fill='#725d39');d.line((x+12,y,x+12,y+10),fill='#725d39')
d.rounded_rectangle((45,8,60,29),radius=3,fill='#785535');d.ellipse((45,7,60,12),fill='#b48d57')
for y in [13,25]:d.rectangle((45,y,60,y+2),fill='#56655a');d.line((46,y,59,y),fill='#91a18b')
d.rectangle((89,26,113,39),fill='#79583b');d.line((90,27,112,27),fill='#d3ad71');d.line((90,32,112,32),fill='#b08552')
for x in [93,100,108]:flowers(d,x,27,'#d4b2cb');grass(d,x+1,25,'#476b44')
save(im,'props')
