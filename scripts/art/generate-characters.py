"""Original Evervale pixel masters. Run with Pillow; outputs are production PNGs."""
from PIL import Image, ImageDraw
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'public/assets/art'
OUT.mkdir(parents=True, exist_ok=True)
ink='#302d32'
def horse(coat, shade, light, mane, phase=0):
 im=Image.new('RGBA',(96,80)); d=ImageDraw.Draw(im)
 def p(points,c): d.polygon(points,fill=c)
 def r(box,c): d.rectangle(box,fill=c)
 # flowing tail, strong shoulder and croup; four independently stepped legs
 p([(23,32),(15,31),(10,37),(9,53),(4,59),(12,58),(18,49),(20,38)],ink)
 p([(17,34),(13,38),(12,51),(8,56),(14,51),(18,36)],mane)
 for x,offset in [(29,-1),(58,1),(23,1),(64,-1)]:
  step=offset*phase*3
  p([(x,43),(x+7,43),(x+5,55),(x+step+3,68),(x+step-2,70),(x+step-3,66),(x+1,54)],ink)
  p([(x+1,45),(x+5,45),(x+3,55),(x+step+1,65),(x+step-1,65),(x+2,53)],shade if x in [29,58] else coat)
  r((x+step-3,67,x+step+3,70),ink)
  if x==64:r((x+step-1,61,x+step+2,66),'#e8d6b5')
 p([(20,30),(27,25),(42,26),(51,28),(59,24),(65,10),(72,8),(78,14),(76,27),(71,38),(68,49),(60,52),(33,51),(23,47),(19,39)],ink)
 p([(23,31),(28,28),(43,29),(52,31),(61,27),(68,12),(72,12),(75,17),(73,28),(68,40),(66,47),(59,49),(32,48),(24,44),(22,38)],coat)
 p([(24,40),(33,44),(49,45),(58,41),(66,29),(69,34),(66,46),(59,49),(33,48),(25,44)],shade)
 p([(26,30),(34,29),(43,31),(41,34),(29,34),(24,38)],light)
 p([(58,33),(65,20),(69,17),(67,29),(63,37)],light)
 # ears, forehead, long muzzle and cheek
 p([(68,12),(66,2),(69,2),(73,8),(77,3),(80,4),(78,13),(85,18),(89,23),(89,29),(83,31),(76,26),(70,24)],ink)
 p([(70,11),(69,6),(73,10),(77,7),(76,14),(83,20),(86,24),(86,28),(82,28),(76,23),(72,23)],coat)
 p([(79,22),(86,24),(86,28),(82,28),(77,25)],shade)
 r((77,17,79,19),ink); r((78,17,78,17),'#fff0d1'); r((85,25,86,26),ink)
 p([(72,11),(76,13),(78,16),(76,19),(74,17)],'#efdfbf')
 p([(66,10),(71,9),(72,13),(68,19),(64,29),(60,31),(62,24)],mane)
 d.line([(68,13),(65,23),(62,28)],fill='#a47852',width=1)
 # teal quilted saddle cloth, leather saddle, girth, bridle/rein
 p([(34,28),(52,29),(56,39),(51,45),(35,44),(32,39)],'#243f3c')
 p([(35,30),(50,31),(53,39),(50,42),(36,41)],'#4e9181')
 d.line([(36,39),(50,40),(51,36)],fill='#acd0a5')
 for x in [38,42,46]:d.line([(x,32),(x+1,38)],fill='#367163')
 r((36,28,50,32),'#51392e');r((38,27,48,29),'#976744');r((49,26,52,30),'#c3955b')
 d.line([(46,33),(47,45),(51,45),(51,39)],fill='#d9b976',width=1)
 d.line([(74,15),(80,26),(87,24)],fill='#493829',width=2)
 d.line([(80,25),(65,34),(52,30)],fill='#d0a369',width=1)
 return im
colors=[('brown-quarter-horse','#a66b3e','#75452e','#cf965a','#47342c'),('gray-mustang','#b6baba','#798b90','#e0ded0','#545d68'),('dark-bay-friesian','#514344','#342f39','#806052','#292a32')]
sheet=Image.new('RGBA',(96*12,80))
for i,(name,*palette) in enumerate(colors):
 for f,phase in enumerate([0,1,0,-1]):
  im=horse(*palette,phase);sheet.paste(im,((i*4+f)*96,0))
  if f==0:im.save(OUT/f'horse-{name}.png')
sheet.save(OUT/'horses.png')

def rider(hair, hairlight, top, direction):
 im=Image.new('RGBA',(32,48));d=ImageDraw.Draw(im)
 def r(b,c):d.rectangle(b,fill=c)
 def p(pts,c):d.polygon(pts,fill=c)
 # hair behind shoulders
 p([(10,5),(20,5),(23,10),(23,26),(20,30),(8,26),(8,12)],ink)
 r((10,10,21,26),hair)
 # fitted trousers and tall boots
 r((11,30,20,43),ink);r((12,31,15,37),'#9a9e8e');r((17,31,19,37),'#c3c5ac')
 r((10,38,14,44),'#503f36');r((17,38,21,44),'#503f36');r((10,43,15,45),ink);r((17,43,22,45),ink)
 # layered jacket, shirt, cuffs, gold fastener
 p([(10,21),(14,19),(19,19),(23,23),(24,31),(21,33),(20,31),(11,32),(8,30),(8,24)],ink)
 p([(11,22),(14,21),(19,21),(21,23),(22,29),(19,30),(11,30),(10,28)],top)
 r((14,21,17,28),'#eddfba');r((11,30,20,31),'#654937');r((15,30,16,31),'#d9b76e')
 r((8,29,10,33),'#dca07c');r((21,29,23,33),'#efbe94')
 # soft face framed by layered hair
 p([(11,9),(19,8),(21,12),(20,18),(17,21),(12,19),(10,15)],'#e9b28b')
 r((12,12,19,16),'#f1c59e');r((12,17,13,18),'#cc8974');r((19,17,20,18),'#cc8974')
 p([(9,12),(10,6),(14,3),(20,5),(23,10),(21,15),(19,10),(16,9),(13,12)],hair)
 d.line([(11,8),(14,5),(19,6)],fill=hairlight,width=1)
 if direction==1:
  p([(10,8),(20,7),(22,11),(21,22),(18,26),(11,24),(10,16)],hair)
  d.line([(12,10),(12,21),(15,23)],fill=hairlight)
  r((14,23,19,24),'#5aa798')
 elif direction in [2,3]:
  r((18,13,19,14),ink);r((19,13,19,13),'#fff0cd');r((21,15,22,16),'#f1c59e')
  r((10,12,13,23),hair);r((11,11,11,21),hairlight)
 else:
  r((12,13,13,15),ink);r((18,13,19,15),ink);r((13,13,13,13),'#fff5d7');r((19,13,19,13),'#fff5d7');r((15,18,17,18),'#a76759')
 if direction==3:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 return im
sheet=Image.new('RGBA',(32*54,48))
for a,(name,hair,hl) in enumerate([('cream','#6b4535','#b98351'),('chestnut','#954b34','#d68b51'),('midnight','#343c50','#69788a')]):
 for o,(outfit,c) in enumerate([('meadow','#58846a'),('berry','#a45970'),('sky','#58889e')]):
  for direction in range(4):
   im=rider(hair,hl,c,direction);sheet.paste(im,(((a*3+o)*4+direction)*32,0))
   if direction==0:im.save(OUT/f'rider-{name}-{outfit}.png')
  # Seated side poses: bent knee, tall near boot and a hand forward on the reins.
  for side in range(2):
   im=rider(hair,hl,c,2);d=ImageDraw.Draw(im)
   d.rectangle((0,32,31,47), fill=(0,0,0,0))
   d.polygon([(11,31),(19,31),(24,34),(23,37),(20,37),(18,35),(12,35)], fill=ink)
   d.line([(13,32),(18,32),(22,35)], fill='#b7b9a1',width=2)
   d.polygon([(20,35),(24,35),(22,42),(24,43),(24,45),(18,45),(18,42)],fill='#503f36')
   d.line([(18,45),(24,45)],fill=ink)
   d.line([(21,26),(24,28),(28,27)],fill='#edbc94',width=2)
   if side: im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   sheet.paste(im,((36+(a*3+o)*2+side)*32,0))
sheet.save(OUT/'riders.png')
# Three seated farm cats: calico, blue-gray, cream tabby.
catSheet=Image.new('RGBA',(72,24))
for i,c in enumerate(['#dbab73','#819298','#e6d3ad']):
 im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im)
 d.polygon([(5,20),(5,13),(8,10),(7,3),(11,6),(16,5),(20,2),(20,14),(18,20)],fill=ink)
 d.polygon([(7,19),(7,13),(10,11),(9,6),(12,8),(16,7),(18,5),(18,15),(16,19)],fill=c)
 d.rectangle((10,14,16,20),fill='#ebd9b6');d.rectangle((10,10,11,11),fill='#29423a');d.rectangle((16,10,17,11),fill='#29423a');d.point((14,13),fill='#b16f69')
 d.line([(6,19),(2,18),(2,14),(3,12)],fill=c,width=2)
 d.rectangle((8,7,11,9),fill=['#85513c','#536974','#bc9161'][i]);d.line([(12,16),(12,20)],fill='#a98d72')
 catSheet.paste(im,(i*24,0))
catSheet.save(OUT/'cats.png')
