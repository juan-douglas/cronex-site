/* =========================================================
   CRONEX — comportamento
   Edite o bloco CONTATO abaixo com os seus dados reais.
   ========================================================= */
const CONTATO = {
  whatsapp: "5561999657097",           // DDI + DDD + número, só dígitos
  whatsappLabel: "(61) 99965-7097",
  email: "contato@cronex.com.br",

  // URL do app da Web do Google Apps Script (código em apps-script-cronex.gs).
  // Vazio = o formulário só abre o WhatsApp, sem gravar na planilha.
  planilha: "https://script.google.com/macros/s/AKfycbzOIz4YBfM6JsVgVgCPLHH3pW08NuGWgNZ4FqDYGWrqwJfGg8Y79v53pW_cXWB_0S23/exec"
};

const VERSAO = 'CRONEX site v10';
console.info(VERSAO + ' carregado');

const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---- ano e contatos ---- */
$('#ano').textContent = new Date().getFullYear();
const waBase = "https://wa.me/" + CONTATO.whatsapp;
const waMsg  = t => waBase + "?text=" + encodeURIComponent(t);
$('#waLine').href  = waMsg("Olá! Vim pelo site da CRONEX.");
$('#waText').textContent = CONTATO.whatsappLabel;
$('#mailLine').href = "mailto:" + CONTATO.email;
$('#mailText').textContent = CONTATO.email;
$('#heroWa').href = waMsg("Olá! Vim pelo site da CRONEX e quero falar sobre um projeto.");
$('#heroWa').target = '_blank';

/* ---- nav fixa ---- */
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('stuck', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---- menu mobile ---- */
const burger = $('#burger');
const toggleMenu = force => {
  const open = force ?? !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
};
burger.addEventListener('click', () => toggleMenu());
$$('#drawer a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

/* ---- luz que acompanha o ponteiro ---- */
if (!reduz && matchMedia('(pointer:fine)').matches) {
  document.body.classList.add('has-pointer');
  let mx = 50, my = 50, raf = null;
  addEventListener('pointermove', e => {
    mx = (e.clientX / innerWidth) * 100;
    my = (e.clientY / innerHeight) * 100;
    if (!raf) raf = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--mx', mx + '%');
      document.documentElement.style.setProperty('--my', my + '%');
      raf = null;
    });
  }, { passive: true });
}

/* ---- giro de 360 graus da marca ao passar o mouse ---- */
function girar(el, duracao) {
  if (!el || reduz || el.classList.contains('turning')) return;   // não reinicia no meio do giro
  if (duracao) el.style.setProperty('--turn', duracao);
  el.classList.add('turning');
  el.addEventListener('animationend', () => {
    el.classList.remove('turning');
    if (duracao) el.style.removeProperty('--turn');
  }, { once: true });
}
const markSpin = $('#markSpin'), brandMark = $('#brandMark');
[[$('.stage'), markSpin], [$('.brand'), brandMark]].forEach(([gatilho, alvo]) => {
  if (!gatilho || !alvo) return;
  gatilho.addEventListener('pointerenter', () => girar(alvo));
  gatilho.addEventListener('click', () => girar(alvo));   // toque no celular
});

/* ---- abertura: a marca dá uma volta sozinha ao carregar a página ---- */
addEventListener('load', () => {
  setTimeout(() => girar(brandMark, '1.1s'), 300);
  setTimeout(() => girar(markSpin, '1.7s'), 520);
});

/* ---- marca de vidro reage ao ponteiro ---- */
const mark = $('#markHold');
if (mark && !reduz && matchMedia('(pointer:fine)').matches) {
  let tick = null;
  addEventListener('pointermove', e => {
    if (tick) return;
    tick = requestAnimationFrame(() => {
      const x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      mark.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg) translateZ(0)`;
      tick = null;
    });
  }, { passive: true });
  addEventListener('pointerleave', () => mark.style.transform = '');
}

/* ---- soluções: lista controla a prévia ---- */
$$('#svcList .svc').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('#svcList .svc').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-expanded', 'false'); });
    btn.classList.add('on'); btn.setAttribute('aria-expanded', 'true');
    $$('#pvBody .pv-pane').forEach(p => p.classList.remove('on'));
    const pane = document.getElementById(btn.dataset.pv);
    if (pane) {
      pane.classList.add('on');
      // recomeça a animação das barras do painel de gestão
      $$('.pv-bars i', pane).forEach(b => { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; });
    }
  });
});

/* ---- segmentos ---- */
$$('#tabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('#tabs .tab').forEach(t => { t.classList.remove('on'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('on'); tab.setAttribute('aria-selected', 'true');
    $$('.seg-panel').forEach(p => p.classList.remove('on'));
    document.getElementById(tab.dataset.seg).classList.add('on');
  });
});

/* ---- dúvidas ---- */
$$('#faq .q').forEach(q => {
  const btn = q.querySelector('button'), ans = q.querySelector('.a');
  btn.addEventListener('click', () => {
    const open = q.classList.contains('open');
    $$('#faq .q').forEach(o => {
      o.classList.remove('open');
      o.querySelector('.a').style.maxHeight = null;
      o.querySelector('button').setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      q.classList.add('open');
      ans.style.maxHeight = ans.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ---- revelação ao rolar ---- */
const io = new IntersectionObserver(es => {
  es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach(el => io.observe(el));

/* ---- botões magnéticos ---- */
if (!reduz && matchMedia('(pointer:fine)').matches) {
  $$('.mag').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .16}px, ${(e.clientY - r.top - r.height / 2) * .22 - 3}px)`;
    });
    el.addEventListener('pointerleave', () => el.style.transform = '');
  });
}

/* ---- pacote escolhido preenche o formulário ---- */
$$('[data-pacote]').forEach(a => {
  a.addEventListener('click', () => {
    const sel = $('#pacote');
    [...sel.options].forEach(o => { if (o.value === a.dataset.pacote || o.text === a.dataset.pacote) sel.value = o.value; });
    sel.animate([{ boxShadow: '0 0 0 0 rgba(168,85,214,.7)' }, { boxShadow: '0 0 0 10px rgba(168,85,214,0)' }], { duration: 900 });
  });
});

/* ---- máscara simples de telefone ---- */
const tel = $('#telefone');
tel.addEventListener('input', () => {
  let d = tel.value.replace(/\D/g, '').slice(0, 11);
  tel.value = d.length > 10 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
            : d.length > 6  ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
            : d.length > 2  ? `(${d.slice(0,2)}) ${d.slice(2)}`
            : d;
});

/* ---- grava o lead na planilha (Google Apps Script) ---- */
function salvarLead(dados) {
  if (!CONTATO.planilha) return Promise.resolve();          // ainda não configurado
  return fetch(CONTATO.planilha, {
    method: 'POST',
    mode: 'no-cors',                                        // evita bloqueio de CORS
    body: new URLSearchParams(dados)                        // formato simples, sem preflight
  }).catch(() => {});                                       // falha na gravação não trava o contato
}

/* ---- formulário: valida, grava e monta a mensagem do WhatsApp ---- */
const form = $('#form'), status = $('#formStatus');
const marcarErro = (campo, msg) => {
  campo.classList.add('err'); campo.focus();
  status.textContent = msg; status.classList.add('bad'); status.classList.remove('ok');
};
$$('#form input, #form select').forEach(c => c.addEventListener('input', () => c.classList.remove('err')));

form.addEventListener('submit', e => {
  e.preventDefault();
  const c = e.target.elements;                       // acesso estável aos campos
  const nome = c.nome.value.trim();
  const fone = c.telefone.value.replace(/\D/g, '');
  const mail = c.email.value.trim();

  if (nome.length < 2)  return marcarErro(c.nome, 'Escreva seu nome para continuarmos.');
  if (fone.length < 10) return marcarErro(c.telefone, 'Informe o WhatsApp com DDD.');
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return marcarErro(c.email, 'Confira o e-mail digitado.');

  const dados = {
    data: new Date().toLocaleString('pt-BR'),
    nome,
    empresa: c.empresa.value.trim(),
    telefone: c.telefone.value.trim(),
    email: mail,
    segmento: c.segmento.value,
    pacote: c.pacote.value,
    mensagem: c.msg.value.trim(),
    origem: location.href
  };

  status.classList.remove('bad');
  status.textContent = 'Registrando seu contato...';

  const texto =
    `Olá, CRONEX! Meu nome é ${dados.nome}.\n` +
    (dados.empresa ? `Empresa: ${dados.empresa}\n` : '') +
    `WhatsApp: ${dados.telefone}\n` +
    (dados.email ? `E-mail: ${dados.email}\n` : '') +
    `Segmento: ${dados.segmento}\n` +
    `Pacote: ${dados.pacote}\n` +
    (dados.mensagem ? `\nO que preciso: ${dados.mensagem}` : '');

  salvarLead(dados).finally(() => {
    status.textContent = 'Contato registrado. Abrindo o WhatsApp...';
    status.classList.add('ok');
    window.open(waMsg(texto), '_blank', 'noopener');
    setTimeout(() => {
      form.reset();
      status.classList.remove('ok');
      status.textContent = 'Seus dados são registrados e o WhatsApp abre com a mensagem já escrita. Você só confirma o envio.';
    }, 4000);
  });
});

/* ---- rolagem animada com curva própria ---- */
const suavizar = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // aceleração e freio
let quadro = null;

function destacar(sec) {
  if (!sec || reduz) return;
  $$('.rv', sec).forEach(el => el.classList.add('in'));   // nada aparece pela metade ao chegar
  sec.classList.remove('chegou');
  void sec.offsetWidth;                                   // reinicia a animação
  sec.classList.add('chegou');
  clearTimeout(sec._t);
  sec._t = setTimeout(() => sec.classList.remove('chegou'), 1200);

  // chegou no orçamento: o cursor já espera no primeiro campo (só no computador,
  // para não abrir o teclado do celular sem a pessoa pedir)
  if (sec.id === 'contato' && matchMedia('(pointer:fine)').matches) {
    setTimeout(() => { const n = $('#nome'); if (n) n.focus({ preventScroll: true }); }, 420);
  }
}

/* ---- onde a seção deve encostar ----
   A barra é fixa e encolhe ao rolar, então a altura é medida no estado
   compacto: conteúdo da barra + 9px de padding em cima e embaixo.
   E a âncora é o CONTEÚDO da seção, não a borda dela: como cada seção tem
   até 140px de padding no topo, parar na borda gastava meia tela em vazio
   e empurrava o conteúdo para fora da viewport. */
const alturaNav = () => {
  const dentro = $('.nav-in');
  return dentro ? dentro.offsetHeight + 18 : (nav ? nav.offsetHeight : 68);
};

function ancoraDe(alvo) {
  if (alvo.id === 'topo') return 0;                       // o hero começa no zero
  const corpo = alvo.querySelector(':scope > .wrap') || alvo;
  const respiro = Math.round(Math.min(56, Math.max(24, innerHeight * 0.05)));
  const limite = document.documentElement.scrollHeight - innerHeight;
  const bruto = corpo.getBoundingClientRect().top + scrollY - alturaNav() - respiro;
  return Math.max(0, Math.min(bruto, limite));
}

function irPara(alvo) {
  const destino = ancoraDe(alvo);
  const inicio = scrollY, dist = destino - inicio;

  if (reduz || Math.abs(dist) < 6) { scrollTo(0, destino); destacar(alvo); return; }

  const tempo = Math.min(1150, Math.max(600, Math.abs(dist) * 0.55));   // percurso longo, viagem um pouco maior
  const t0 = performance.now();
  cancelAnimationFrame(quadro);

  const passo = agora => {
    const p = Math.min(1, (agora - t0) / tempo);
    scrollTo(0, inicio + dist * suavizar(p));
    if (p < 1) quadro = requestAnimationFrame(passo);
    else { quadro = null; destacar(alvo); }
  };
  quadro = requestAnimationFrame(passo);
}

// se a pessoa rolar no meio do caminho, a animação para na hora
const abortar = () => { if (quadro) { cancelAnimationFrame(quadro); quadro = null; } };
addEventListener('wheel', e => { if (Math.abs(e.deltaY) > 0) abortar(); }, { passive: true });
addEventListener('touchmove', abortar, { passive: true });
addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) abortar();
}, { passive: true });

$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const alvo = document.querySelector(id);
    if (!alvo) return;
    e.preventDefault();
    const doMenu = !!a.closest('#drawer');
    setTimeout(() => irPara(alvo), doMenu ? 260 : 0);   // espera o menu do celular fechar
  });
});

/* ---- link direto para uma seção (ex.: cronex.com.br/#pacotes) ----
   Sem isto o navegador usa o próprio salto e para na borda da seção. */
addEventListener('load', () => {
  const id = location.hash;
  if (id.length < 2) return;
  const alvo = document.querySelector(id);
  if (alvo) setTimeout(() => { scrollTo(0, ancoraDe(alvo)); destacar(alvo); }, 80);
});

/* ---- o menu mostra em que módulo você está ---- */
const linksNav = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
const espiao = new IntersectionObserver(es => {
  es.forEach(en => {
    const link = linksNav.get(en.target.id);
    if (link && en.isIntersecting) {
      linksNav.forEach(l => l.classList.remove('on'));
      link.classList.add('on');
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });
linksNav.forEach((_, id) => { const sec = document.getElementById(id); if (sec) espiao.observe(sec); });
