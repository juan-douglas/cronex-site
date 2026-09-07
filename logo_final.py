from PIL import Image
import numpy as np, os

SRC = "/mnt/user-data/uploads/ChatGPT_Image_1_de_set__de_2026__22_02_40.png"
OUT = "/home/claude/cronex-site"

im = Image.open(SRC).convert("RGB")
rgb = np.asarray(im).astype(np.float32)
lum = rgb.max(axis=2)

# 1. recorta o glifo, ignorando rastros horizontais e reflexo do chão
m = lum > 170
xs = np.where(m.sum(0) > 30)[0]
ys = np.where(m.sum(1) > 30)[0]
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
W, H = x1 - x0, y1 - y0
x0 = max(0, x0 - int(W * .05)); x1 = min(rgb.shape[1] - 1, x1 + int(W * .05))
y0 = max(0, y0 - int(H * .05)); y1 = min(rgb.shape[0] - 1, y1 + int(H * .015))
c, cl = rgb[y0:y1, x0:x1], lum[y0:y1, x0:x1]

# 2. fundo preto -> canal alfa, des-premultiplicando a cor
a = cl.copy(); a[a < 10] = 0
straight = np.clip(c * 255.0 / np.maximum(cl, 1.0)[..., None], 0, 255)
brand = straight[cl > 140].mean(0)
t = np.clip((a - 30) / 60.0, 0, 1)[..., None]      # tira ruído das áreas quase transparentes
straight = straight * t + brand * (1 - t)
logo = Image.fromarray(np.dstack([np.clip(straight, 0, 255), a]).astype(np.uint8), "RGBA")


def rs(w):
    return logo.resize((w, round(logo.height * w / logo.width)), Image.LANCZOS)


# 3. marca grande (bloco 3D do hero)
big = rs(800)
big.save(f"{OUT}/assets/img/marca-cronex.webp", "WEBP",
         quality=82, alpha_quality=60, method=6)

# 4. marca pequena (header, 38px em telas 2x/3x)
small = rs(140)
small.save(f"{OUT}/assets/img/marca-cronex-sm.webp", "WEBP",
           quality=88, alpha_quality=80, method=6)

# 5. favicon
fav = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
s = logo.copy(); s.thumbnail((96, 96), Image.LANCZOS)
fav.paste(s, ((96 - s.width) // 2, (96 - s.height) // 2), s)
fav.save(f"{OUT}/assets/favicon.png", "PNG", optimize=True)

# 6. capa Open Graph 1200x630
og = Image.new("RGB", (1200, 630), (7, 6, 11))
o = logo.copy(); o.thumbnail((820, 460), Image.LANCZOS)
og.paste(o, ((1200 - o.width) // 2, (630 - o.height) // 2), o)
og.save(f"{OUT}/assets/img/og-cover.jpg", "JPEG", quality=88, optimize=True, progressive=True)

for f in ["assets/img/marca-cronex.webp", "assets/img/marca-cronex-sm.webp",
          "assets/favicon.png", "assets/img/og-cover.jpg"]:
    p = f"{OUT}/{f}"
    print(f, Image.open(p).size, os.path.getsize(p) // 1024, "KB")
