"""
Remove o retangulo de neblina violeta que sobrou no recorte da marca CRONEX.

O render original era neon sobre fundo preto. A conversao anterior transformou
o preto em alfa, mas a luz ambiente do render (L entre 25 e 45) virou um veu de
alfa ~25 cobrindo TODO o quadro. Sobre o fundo quase preto do site, esse veu
aparece como um retangulo roxo.

Aqui o alfa e reconstruido a partir da luminancia da composicao original sobre
preto, com um joelho suave: abaixo de LO some, acima de HI fica solido.
"""
from PIL import Image
import numpy as np

LO, HI, GAMMA = 46.0, 125.0, 0.9
FADE_BASE = 0.10   # dissolve a reflexao do chao nos ultimos 10% da altura
PENA = 0.02        # penugem nas outras tres bordas


def limpar(origem, destino, qualidade=80):
    im = Image.open(origem).convert("RGBA")
    a = np.array(im).astype(np.float64)

    # composicao original sobre preto
    C = a[..., :3] * (a[..., 3:4] / 255.0)
    L = C.max(axis=2)

    alfa = np.clip((L - LO) / (HI - LO), 0.0, 1.0) ** GAMMA

    h, w = alfa.shape
    # dissolve a base
    n = max(1, int(h * FADE_BASE))
    alfa[h - n:] *= np.linspace(1.0, 0.0, n)[:, None]
    # penugem nas bordas restantes
    p = max(1, int(min(h, w) * PENA))
    alfa[:p] *= np.linspace(0.0, 1.0, p)[:, None]
    alfa[:, :p] *= np.linspace(0.0, 1.0, p)[None, :]
    alfa[:, w - p:] *= np.linspace(1.0, 0.0, p)[None, :]

    # cor de volta ao espaco nao premultiplicado
    seguro = np.maximum(alfa, 1e-3)[..., None]
    rgb = np.clip(C / seguro, 0, 255)

    saida = np.dstack([rgb, alfa * 255.0]).astype(np.uint8)
    Image.fromarray(saida, "RGBA").save(destino, quality=qualidade, method=6)
    return (alfa == 0).mean()


if __name__ == "__main__":
    base = "cronex-site/assets/img/"
    for arq in ["marca-cronex.webp", "marca-cronex-sm.webp"]:
        zerado = limpar(base + arq, base + arq)
        print(f"{arq}: {zerado*100:.1f}% do quadro agora e totalmente transparente")
