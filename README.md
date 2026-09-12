# CRONEX — site institucional

Site estático separado em HTML, CSS, JS e assets. Publicado como Cloudflare Worker
(static assets).

**No ar:** https://cronex.thecronexweb.workers.dev

## Estrutura

```
cronex-site/
├── index.html              markup apenas (~29 KB)
├── 404.html                página de erro (Cloudflare serve em rota inexistente)
├── privacidade.html        política de privacidade (link no rodapé, LGPD)
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
├── apps-script-cronex.gs   backend da planilha de leads (ver "Planilha de leads")
├── dist/                   pasta publicada, gerada a partir da raiz (ver "Deploy")
└── scripts/                utilitários de imagem — não vão pro ar
    ├── limpa_fundo.py      tira o véu violeta do recorte da marca
    └── logo_final.py       pipeline da marca (ver "Logo")
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

2. Montar a pasta `dist/` com o que vai pro ar (tudo menos README, `scripts/`,
   config):

   ```bash
   # PowerShell, dentro de cronex-site/
   Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
   New-Item -ItemType Directory dist | Out-Null
   Copy-Item index.html,privacidade.html,404.html,robots.txt,sitemap.xml,og-cover.jpg,_headers dist
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

### 2026-09 — planilha de leads

- Backend em `apps-script-cronex.gs` (Web App do Google Apps Script) ligado a
  uma planilha do Google Sheets. O `main.js` (`enviarPlanilha`) faz `POST` para
  a URL `/exec`; ver seção "Planilha de leads" para o detalhe.
- **Aba Leads** — cada envio do formulário vira uma linha (histórico).
- **Aba Contatos** — uma linha por pessoa, deduplicada por telefone, com ID fixo
  `CRX-0001`, `primeiro_contato`/`ultimo_contato` e `qtd_contatos`.
- **CTA do hero** ("Falar no WhatsApp" → **"Falar com a CRONEX"**) deixou de
  abrir o `wa.me` direto e passou a levar ao formulário, para registrar o lead
  antes do WhatsApp. O link "WhatsApp rápido" da seção de contato segue direto.
- **Aba Cliques WhatsApp** — registra cada clique nesse link rápido (`data_hora`,
  `pagina`, `dispositivo`; sem nome nem telefone, que o site não tem).
- `VERSAO` no `main.js`: v8 (URL da planilha) → v12 (log de cliques).
- Deploys do Cloudflare desta fase feitos com `CLOUDFLARE_API_TOKEN` temporário
  (o `wrangler login` não persiste nesta máquina); `git push` do terminal do
  usuário funciona normalmente.

## Planilha de leads

O formulário de contato grava cada envio numa planilha do Google Sheets, via um
Web App do Google Apps Script. O código do backend está em
`apps-script-cronex.gs`.

Fluxo: `js/main.js` (`enviarPlanilha`) faz `POST` para a URL `/exec` do Web App.
O script grava em três abas conforme o campo `tipo`:

- **Leads** (envio do formulário) — histórico, uma linha por envio:
  `recebido_em`, `data_cliente`, `nome`, `empresa`, `telefone`, `email`,
  `segmento`, `pacote`, `mensagem`, `origem`.
- **Contatos** (envio do formulário) — uma linha por pessoa (deduplicada por
  telefone, ou e-mail se não houver telefone): `id` (`CRX-0001`, sequencial e
  fixo), `nome`, `empresa`, `telefone`, `email`, `segmento`, `pacote_interesse`,
  `primeiro_contato`, `ultimo_contato`, `qtd_contatos`, `origem`. A cada envio:
  telefone novo → cria linha com o próximo ID; telefone já visto → atualiza
  `ultimo_contato`, soma +1 em `qtd_contatos` e refresca os campos preenchidos.
- **Cliques WhatsApp** (`tipo=clique_wpp`) — um registro por clique no link
  "WhatsApp rápido" da seção de contato: `data_hora`, `data_cliente`, `botao`,
  `pagina`, `dispositivo`. Sem nome nem telefone — o link só abre o WhatsApp,
  o site não tem esses dados. O CTA principal do hero passa pelo formulário
  (registra lead completo), então só o link rápido cai aqui.

A função `reconstruirContatos()` (rodar pelo editor, uso único) recria a aba
**Contatos** a partir de todo o histórico de **Leads** — reatribui os IDs.

### Instalar / recriar

1. Criar uma planilha em <https://sheets.new> (ex.: "CRONEX — Leads").
2. Nela: **Extensões → Apps Script**.
3. Apagar o conteúdo de `Código.gs` e colar o de `apps-script-cronex.gs`. Salvar.
4. **Implantar → Nova implantação** → tipo **App da Web**:
   - *Executar como*: **Eu**
   - *Quem pode acessar*: **Qualquer pessoa**
   - Implantar → autorizar o acesso na primeira vez.
5. Copiar a **URL do app da Web** (termina em `/exec`).
6. Colar essa URL em `CONTATO.planilha` no `js/main.js`, refazer a `dist/` e dar
   deploy (ver "Deploy").

### Testar

- Abrir a URL `/exec` no navegador → deve responder um JSON `{"ok":true,...}`.
- Enviar o formulário no site → conferir a linha nova na aba **Leads**.

### Exportar para o sistema de gestão

O `cronex-sistema` puxa a aba **Leads** desta planilha. Para ligar:

1. No editor do Apps Script: **Configurações do projeto** (engrenagem) →
   **Propriedades do script** → **Adicionar propriedade**.

   | Propriedade | Valor |
   |---|---|
   | `SEGREDO_EXPORTACAO` | algo longo e aleatório |

   Sem isso a exportação fica desligada — de propósito: **qualquer pessoa com a
   URL `/exec` leria a base de leads inteira**.

   > O segredo mora nas Propriedades, e não numa linha do `.gs`, porque colar
   > uma versão nova do arquivo por cima apagaria o valor e derrubaria a
   > importação **em silêncio**. Assim o arquivo pode ser colado e versionado
   > sem carregar segredo nenhum.

2. **Implantar → Gerenciar implantações → editar (lápis) → Nova versão →
   Implantar** (mantém a mesma URL).

3. No sistema: **Configurações → Planilhas**, cole a URL `/exec` e o **mesmo**
   valor do segredo. Clique em **Testar conexão** — deve dizer quantas linhas
   tem a aba.

4. **Importar leads agora** traz o que ainda não existe. A deduplicação é por
   telefone (só os dígitos) ou, na falta dele, por e-mail — importar duas vezes
   não duplica nada.

Testar direto no navegador:
`…/exec?acao=exportar&segredo=SEU_SEGREDO` → deve devolver a lista em JSON.
Sem o segredo correto responde `{"erro":"segredo invalido"}`.

### Proteção da escrita

O `doPost` é público: a URL está no JavaScript do site e qualquer um pode
chamá-la. Três camadas no `apps-script-cronex.gs`, em ordem de importância:

| Camada | O que faz |
|---|---|
| `texto_()` | valor que começa com `=` `+` `-` `@` é gravado como **texto**. Sem isso, um `=IMPORTXML(...)` no campo nome entrega a base de contatos a quem enviou, no instante em que você abre a planilha |
| `limitado_()` | teto de 5 gravações por remetente e 100 no total, a cada 10 min |
| `SEGREDO_ENVIO` | filtro opcional. **Não é autenticação**: a chave viaja no JavaScript do site e é visível no navegador |

Duas funções para rodar pelo editor (selecionar o nome → **Executar** → ler em
**Execuções**):

- `conferirInstalacao()` — diz se as propriedades estão no lugar e prova que a
  neutralização de fórmula funciona. Rode **antes** de implantar.
- `procurarFormulas()` — varre as três abas atrás de célula que o Sheets esteja
  tratando como fórmula. Rode **uma vez** depois de implantar, para conferir o
  que já estava gravado. Qualquer fórmula numa coluna de dado de cliente é
  suspeita: apague a célula, veja para onde ela apontava e trate como incidente.

**Se for ligar o `SEGREDO_ENVIO`, a ordem importa.** Publique o site primeiro
com `CONTATO.chave` preenchido (o script antigo ignora o parâmetro a mais) e só
depois crie a propriedade no Apps Script. Ao contrário, o formulário para de
gravar sem dar erro nenhum.

### Ao alterar o script

Cada mudança no `.gs` só vale depois de **Implantar → Gerenciar implantações →
editar (lápis) → Versão: Nova versão → Implantar**. Isso mantém a mesma URL.
Criar uma implantação *nova* gera outra URL (e aí tem que atualizar o `main.js`).

O erro clássico `ReferenceError: window is not defined` significa que sobrou
código de navegador (o `main.js`) colado no editor — o Apps Script roda no
servidor, não tem `window`. Deixar só o conteúdo de `apps-script-cronex.gs`.

## Logo

A marca vem do render em PNG com fundo preto. O pipeline aplicado:

1. Recorte no glifo, descartando os rastros horizontais e o reflexo do chão.
2. Fundo preto convertido em canal alfa (des-premultiplicado), então a marca
   fica transparente e os `drop-shadow` do CSS funcionam nas bordas certas.
3. Duas saídas: 800px para o bloco 3D do hero, 140px para o header.
4. `favicon.png` 96px e `og-cover.jpg` 1200x630 gerados da mesma fonte.

O script está em `scripts/logo_final.py` caso precise regerar com outro
render. Os dois `.py` de `scripts/` são utilitários de uso pontual, rodados
a partir da pasta-mãe `CRONEX/`; não fazem parte do site e não entram na
`dist/`.
