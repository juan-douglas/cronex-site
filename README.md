# CRONEX — site institucional

Site estático separado em HTML, CSS, JS e assets. Publicado como Cloudflare Worker
(static assets).

**No ar:** https://cronex.thecronexweb.workers.dev

## Estrutura

```
cronex-site/
├── index.html              markup apenas (~29 KB)
├── 404.html                página de erro (Cloudflare serve em rota inexistente)
├── css/
│   └── style.css           todo o CSS
├── js/
│   └── main.js             todo o JS (dados de contato no topo, const CONTATO)
├── assets/
│   ├── favicon.png         ícone da aba
│   └── img/
│       ├── marca-cronex.webp      logo do hero (800px)
│       ├── marca-cronex-sm.webp   logo do header (140px)
│       ├── og-cover.jpg           capa para link no WhatsApp/redes
│       └── selo-rodape.webp       lockup do rodapé
├── og-cover.jpg            cópia na raiz (as tags OG apontam para a URL absoluta /og-cover.jpg)
├── robots.txt
├── sitemap.xml
├── _headers                cabeçalhos do Cloudflare (charset UTF-8 nas páginas HTML)
├── wrangler.jsonc          config do deploy (Worker "cronex", serve ./dist)
├── dist/                   pasta publicada, gerada a partir da raiz (ver "Deploy")
├── limpa_fundo.py          utilitário de imagem
└── logo_final.py           pipeline da marca (ver "Logo")
```

`dist/` e `.wrangler/` são gerados — não precisam ser versionados.

## Como rodar localmente

Abrir o `index.html` direto no navegador funciona, mas o ideal é servir por HTTP
(evita bloqueio de caminhos relativos e cache confuso):

```bash
cd cronex-site
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Deploy

Publicado como **Cloudflare Worker** servindo arquivos estáticos, na conta cujo
subdomínio workers.dev é `thecronexweb`.

1. Autenticar (uma vez, em terminal comum — abre o navegador):

   ```bash
   npx wrangler login
   ```

2. Montar a pasta `dist/` com o que vai pro ar (tudo menos README, `.py`, config):

   ```bash
   # PowerShell, dentro de cronex-site/
   Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
   New-Item -ItemType Directory dist | Out-Null
   Copy-Item index.html,404.html,robots.txt,sitemap.xml,og-cover.jpg,_headers dist
   Copy-Item css,js,assets dist -Recurse
   ```

3. Publicar:

   ```bash
   npx wrangler deploy
   ```

A config está em `wrangler.jsonc` (`name: "cronex"`, `assets.directory: "./dist"`).
Sai em `https://cronex.thecronexweb.workers.dev`.

> Não usar API token em arquivo. Se precisar de token (CI), passar por variável de
> ambiente `CLOUDFLARE_API_TOKEN` e revogar depois.

### Trocar de URL

A URL do site aparece em: `index.html` (canonical, `og:url`, `og:image`,
`twitter:image`), `robots.txt` (linha `Sitemap:`) e `sitemap.xml` (`<loc>`).
Ao mudar de domínio, atualizar os quatro arquivos e refazer a `dist/`.

## O que mudou em relação ao arquivo único

- `<style>` inline → `css/style.css`, carregado no `<head>`.
- `<script>` inline → `js/main.js`, carregado no fim do `<body>` (mesma posição
  de antes, então a ordem de execução não muda). Contém o número real do
  WhatsApp e a URL do Google Apps Script do formulário.
- Imagens em base64 → arquivos reais em `assets/`. O logo aparecia duplicado no
  HTML (header e bloco giratório); agora é um único arquivo referenciado duas
  vezes, o que o navegador baixa uma vez só.
- `index.html` caiu de ~335 KB para ~29 KB.

## Histórico

### 2026-09 — modularização e publicação

- `index.html` reconvertido de arquivo único (~335 KB, tudo inline) para a
  estrutura modular atual (~29 KB). A reconversão partiu do arquivo único, que
  estava mais novo, preservando o WhatsApp real e a URL do Apps Script.
- Projeto reorganizado: pasta única `cronex-site/`, cópias duplicadas removidas.
- Repositório Git iniciado e publicado em
  https://github.com/juan-douglas/cronex-site (público).
- Deploy no Cloudflare como Worker de static assets (`wrangler.jsonc` + `dist/`),
  em `https://cronex.thecronexweb.workers.dev`. A URL antiga que aparecia nos
  metadados (`cronex.juan06douglas.workers.dev`) nunca existiu — corrigida em
  `index.html`, `robots.txt` e `sitemap.xml`.
- `404.html` adicionado (reaproveita `css/style.css`, `noindex`); o Cloudflare
  serve em rota inexistente via `not_found_handling` no `wrangler.jsonc`.
- `_headers` adicionado para servir as páginas HTML com
  `Content-Type: text/html; charset=utf-8`. Vale para `/` e `/index.html`; o
  `404.html` fica de fora porque é servido pelo handler de not-found, que não
  passa pelo `_headers` (o `<meta charset>` no HTML cobre esse caso).
- Card de compartilhamento (Open Graph / Twitter) conferido em produção:
  imagem 1200×630, tags corretas, acessível aos scrapers de Facebook, WhatsApp,
  Twitter, Slack e LinkedIn. Validado no Facebook Debugger e no opengraph.xyz.

## Logo

A marca vem do render em PNG com fundo preto. O pipeline aplicado:

1. Recorte no glifo, descartando os rastros horizontais e o reflexo do chão.
2. Fundo preto convertido em canal alfa (des-premultiplicado), então a marca
   fica transparente e os `drop-shadow` do CSS funcionam nas bordas certas.
3. Duas saídas: 800px para o bloco 3D do hero, 140px para o header.
4. `favicon.png` 96px e `og-cover.jpg` 1200x630 gerados da mesma fonte.

O script está em `logo_final.py` caso precise regerar com outro render.
