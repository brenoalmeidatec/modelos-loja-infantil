/* Motor da loja: produtos, carrinho, pedido por WhatsApp.
   Os 3 modelos e o painel usam este mesmo arquivo. */
(function () {
  "use strict";

  var RAIZ = (function () { try { return new URL("../", document.currentScript.src).href; } catch (e) { return ""; } })();
  function urlFoto(f) { return /^(data:|https?:|\/)/.test(f) ? f : RAIZ + f; }

  var K_PROD = "loja.produtos.v1", K_CFG = "loja.config.v1", K_CART = "loja.carrinho.v1";

  /* ---------- armazenamento seguro ---------- */
  function ler(k, padrao) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
  }
  function gravar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }

  /* ---------- produtos de exemplo ---------- */
  var EXEMPLOS = [
    { id: "ex1", nome: "Vestido Sol de Margaridas", preco: 89.9, categoria: "Vestidos", tamanhos: ["1", "2", "3", "4"], foto: "fotos/foto05.jpg", tipo: "vestido", cores: ["#F2C14E", "#6F8F5E"], destaque: true,
      descricao: "Algodão amarelo e macio, com saia rodada. Peça única, feita à mão em pequena quantidade." },
    { id: "ex2", nome: "Vestido Gola Bordada", preco: 94.9, categoria: "Vestidos", tamanhos: ["1", "2", "3"], foto: "fotos/foto04.jpg", tipo: "vestido", cores: ["#E9B8C4", "#FFF7EC"], destaque: true,
      descricao: "Gola branca com bordado delicado e acabamento em renda. Feito à mão, ponto por ponto." },
    { id: "ex3", nome: "Vestido Azul Margaridas", preco: 119.9, categoria: "Vestidos", tamanhos: ["2", "4", "6"], foto: "fotos/foto12.jpg", tipo: "vestido", cores: ["#7FA6C9", "#F6F1E5"], destaque: true,
      descricao: "Tule azul com margaridas e alças em babado. Leve, com bastante movimento." },
    { id: "ex4", nome: "Vestido Nuvem Branca", preco: 109.9, categoria: "Vestidos", tamanhos: ["1", "2", "3"], foto: "fotos/foto03.jpg", tipo: "vestido", cores: ["#DDE3EA", "#FFFFFF"], destaque: false,
      descricao: "Tule branco com alças de babado. Ideal para batizado, aniversário e fotos." },
    { id: "ex5", nome: "Vestido Girassol de Tule", preco: 124.9, categoria: "Vestidos", tamanhos: ["1", "2", "3", "4"], foto: "fotos/foto02.jpg", tipo: "vestido", cores: ["#F2C14E", "#FFF3C4"], destaque: false,
      descricao: "Tule amarelo com brilho e margaridas aplicadas na alça. Feito sob encomenda." },
    { id: "ex6", nome: "Vestido Princesa Pink", preco: 149.9, categoria: "Princesas", tamanhos: ["2", "4", "6"], foto: "fotos/foto09.jpg", tipo: "princesa", cores: ["#E26BC4", "#F7D8EE"], destaque: true,
      descricao: "Cetim rosa com florzinhas e borboletas aplicadas à mão, saia de tule volumosa." },
    { id: "ex7", nome: "Vestido Princesa Lilás", preco: 139.9, categoria: "Princesas", tamanhos: ["1", "2", "3", "4"], foto: "fotos/foto08.jpg", tipo: "princesa", cores: ["#B7A5D6", "#F4E9FA"], destaque: true,
      descricao: "Tule lilás com margaridas e alças de babado. Para aniversários e ocasiões especiais." },
    { id: "ex8", nome: "Vestido Rosa de Aniversário", preco: 129.9, categoria: "Princesas", tamanhos: ["1", "2", "3"], foto: "fotos/foto01.jpg", tipo: "princesa", cores: ["#E3A5AE", "#FBE9E4"], destaque: false,
      descricao: "Tule rosa com margaridas, perfeito para a festinha e para a foto do bolo." },
    { id: "ex9", nome: "Vestido Jardim Encantado", preco: 134.9, categoria: "Princesas", tamanhos: ["2", "4", "6"], foto: "fotos/foto06.jpg", tipo: "princesa", cores: ["#9C86C8", "#EDE6F7"], destaque: false,
      descricao: "Tule roxo com margaridas espalhadas, saia em camadas e alças em babado." },
    { id: "ex10", nome: "Conjunto Joãozinho", preco: 99.9, categoria: "Meninos", tamanhos: ["2", "4", "6", "8"], tipo: "menino", cores: ["#7FA6C9", "#C9A26B"], destaque: false,
      descricao: "Camisa de botões com bermuda de sarja. Foto real em breve." },
    { id: "ex11", nome: "Conjunto Pé de Milho", preco: 89.9, categoria: "Meninos", tamanhos: ["1", "2", "3", "4"], tipo: "menino", cores: ["#E8C766", "#7C8F5B"], destaque: false,
      descricao: "Camisa listrada e bermuda com bolsos. Foto real em breve." },
    { id: "ex12", nome: "Vestido Natal no Campo", preco: 109.9, categoria: "Natal", tamanhos: ["1", "2", "3", "4"], tipo: "natal", cores: ["#B63A32", "#FFF4E3"], destaque: false,
      descricao: "Vestido vermelho com pinheirinho aplicado e pompons. Foto real em breve." }
  ];

  /* ---------- estado ---------- */
  var cfgPadrao = window.LOJA_CONFIG_PADRAO || {};
  function config() { return Object.assign({}, cfgPadrao, ler(K_CFG, {})); }
  function produtos() { return ler(K_PROD, null) || EXEMPLOS.slice(); }
  function carrinho() { return ler(K_CART, []); }

  function brl(n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function achar(id) { return produtos().filter(function (p) { return p.id === id; })[0]; }

  /* ---------- arte das peças (quando ainda não há foto) ---------- */
  function arte(tipo, c1, c2) {
    var cab = '<path d="M100 30v-8c0-7 9-9 9-16" fill="none" stroke="#8a7f74" stroke-width="3" stroke-linecap="round"/><path d="M100 30L38 60h124z" fill="none" stroke="#8a7f74" stroke-width="3" stroke-linejoin="round"/>';
    var pt = 'fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round"';
    var g = "";
    if (tipo === "menino") {
      g = '<path d="M68 66L100 56l32 10 26 28-16 16-12-10v50H70v-50l-12 10-16-16z" fill="' + c1 + '"/>' +
        '<path d="M88 58l12 16 12-16-12-4z" fill="' + c2 + '"/><circle cx="100" cy="90" r="2.6" fill="' + c2 + '"/><circle cx="100" cy="108" r="2.6" fill="' + c2 + '"/><circle cx="100" cy="126" r="2.6" fill="' + c2 + '"/>' +
        '<path d="M70 150h60l8 66h-32l-6-36-6 36H62z" fill="' + c2 + '"/><path d="M76 160h48" ' + pt + '/><path d="M78 84l-14 12" ' + pt + '/>';
    } else if (tipo === "princesa") {
      g = '<path d="M72 126h56l44 90q-72 22-144 0z" fill="' + c2 + '"/>' +
        '<path d="M80 130h40l32 76q-52 14-104 0z" fill="' + c1 + '" fill-opacity=".55"/>' +
        '<path d="M74 66q26 18 52 0l4 60H70z" fill="' + c1 + '"/>' +
        '<circle cx="64" cy="74" r="15" fill="' + c2 + '"/><circle cx="136" cy="74" r="15" fill="' + c2 + '"/>' +
        '<path d="M70 126h60" stroke="' + c2 + '" stroke-width="6"/>' +
        '<path d="M84 100q16 9 32 0" ' + pt + '/><path d="M40 204q60 14 120 0" ' + pt + '/>' +
        '<path d="M168 100l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="' + c1 + '"/><path d="M30 130l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="' + c1 + '"/>';
    } else if (tipo === "natal") {
      g = '<path d="M72 64l10-2 4 26h28l4-26 10 2 4 56 30 88q-62 20-124 0l30-88z" fill="' + c1 + '"/>' +
        '<path d="M66 122h68v12H66z" fill="' + c2 + '"/>' +
        '<path d="M100 144l-20 34h40z" fill="#3E7B52"/><path d="M100 164l-26 36h52z" fill="#3E7B52"/><path d="M96 200h8v10h-8z" fill="#7a5238"/>' +
        '<circle cx="100" cy="142" r="4" fill="#F2C14E"/><circle cx="92" cy="186" r="3" fill="' + c2 + '"/><circle cx="108" cy="192" r="3" fill="' + c2 + '"/>' +
        '<path d="M38 208q62 22 124 0l4 10q-66 26-132 0z" fill="' + c2 + '"/><circle cx="76" cy="62" r="6" fill="' + c2 + '"/><circle cx="124" cy="62" r="6" fill="' + c2 + '"/>';
    } else {
      g = '<path d="M72 64l10-2 4 26h28l4-26 10 2 4 56 30 88q-62 20-124 0l30-88z" fill="' + c1 + '"/>' +
        '<path d="M66 120h68l2 14H64z" fill="' + c2 + '"/>' +
        '<path d="M38 206q62 22 124 0l4 12q-66 26-132 0z" fill="' + c2 + '"/>' +
        '<path d="M100 127l-20-10v22zM100 127l20-10v22z" fill="' + c2 + '"/><circle cx="100" cy="127" r="6" fill="' + c1 + '"/>' +
        '<path d="M78 156q22 10 44 0" ' + pt + '/><path d="M64 184q36 14 72 0" ' + pt + '/>';
    }
    return '<svg viewBox="0 0 200 240" role="img" aria-label="Ilustração da peça" xmlns="http://www.w3.org/2000/svg">' + cab + g + "</svg>";
  }
  function imagem(p) {
    if (p.foto) return '<img src="' + esc(urlFoto(p.foto)) + '" alt="' + esc(p.nome) + '" loading="lazy">';
    return arte(p.tipo, (p.cores || [])[0] || "#E9B8C4", (p.cores || [])[1] || "#FFF7EC");
  }

  /* coloca arte desenhada ou uma foto num elemento: data-arte="tipo|cor1|cor2" ou data-arte="foto:fotos/fotoXX.jpg" */
  function arteEl(el) {
    var v = el.getAttribute("data-arte");
    if (v.indexOf("foto:") === 0) { el.innerHTML = '<img src="' + esc(urlFoto(v.slice(5))) + '" alt="">'; return; }
    var a = v.split("|"); el.innerHTML = arte(a[0], a[1], a[2]);
  }

  /* ---------- carrinho ---------- */
  function salvarCarrinho(c) { gravar(K_CART, c); atualizarCarrinho(); }
  function adicionar(id, tam, qtd) {
    var c = carrinho(), it = c.filter(function (i) { return i.id === id && i.tam === tam; })[0];
    if (it) it.qtd += qtd || 1; else c.push({ id: id, tam: tam, qtd: qtd || 1 });
    salvarCarrinho(c);
  }
  function mudarQtd(id, tam, d) {
    var c = carrinho();
    c.forEach(function (i) { if (i.id === id && i.tam === tam) i.qtd += d; });
    salvarCarrinho(c.filter(function (i) { return i.qtd > 0; }));
  }
  function linhas() {
    return carrinho().map(function (i) { return { p: achar(i.id), i: i }; }).filter(function (l) { return l.p; });
  }
  function total() { return linhas().reduce(function (s, l) { return s + l.p.preco * l.i.qtd; }, 0); }
  function mensagem() {
    var cfg = config(), t = "Olá! Quero fazer um pedido na " + cfg.nome + ":\n\n";
    linhas().forEach(function (l) {
      t += "• " + l.i.qtd + "x " + l.p.nome + (l.i.tam ? " (tam. " + l.i.tam + ")" : "") + " — " + brl(l.p.preco * l.i.qtd) + "\n";
    });
    return t + "\nTotal: " + brl(total()) + "\n\nPode confirmar a disponibilidade e o frete?";
  }

  /* ---------- interface compartilhada (gaveta + detalhe) ---------- */
  var gaveta, dlg, atual = null, tamSel = null;

  function montarUI() {
    var cfg = config();
    gaveta = document.createElement("aside");
    gaveta.className = "gaveta"; gaveta.setAttribute("aria-label", "Carrinho"); gaveta.hidden = true;
    gaveta.innerHTML = '<div class="gaveta-fundo" data-fechar-carrinho></div>' +
      '<div class="gaveta-painel" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">' +
      '<header class="gaveta-topo"><h2 id="gaveta-titulo">Seu carrinho</h2><button class="gaveta-x" data-fechar-carrinho aria-label="Fechar carrinho">&times;</button></header>' +
      '<div class="gaveta-lista" data-lista></div>' +
      '<footer class="gaveta-pe"><div class="gaveta-total"><span>Total</span><strong data-total></strong></div>' +
      '<p class="gaveta-nota" data-nota></p>' +
      '<button class="gaveta-pedir" data-pedir>Pedir pelo WhatsApp</button>' +
      '<p class="gaveta-aviso" data-aviso role="status" hidden></p></footer></div>';
    document.body.appendChild(gaveta);

    dlg = document.createElement("dialog");
    dlg.className = "peca";
    dlg.innerHTML = '<form method="dialog" class="peca-fechar"><button aria-label="Fechar">&times;</button></form>' +
      '<div class="peca-corpo"><div class="peca-img" data-d-img></div><div class="peca-info">' +
      '<p class="peca-cat" data-d-cat></p><h2 data-d-nome></h2><p class="peca-preco" data-d-preco></p>' +
      '<p class="peca-desc" data-d-desc></p>' +
      '<fieldset class="peca-tams"><legend>Tamanho</legend><div data-d-tams></div></fieldset>' +
      '<button class="peca-add" data-d-add>Adicionar ao carrinho</button>' +
      '<p class="peca-msg" data-d-msg role="status"></p></div></div>';
    document.body.appendChild(dlg);

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-abrir-carrinho]")) { abrirCarrinho(); return; }
      if (t.closest("[data-fechar-carrinho]")) { fecharCarrinho(); return; }
      var ab = t.closest("[data-produto]");
      if (ab) { abrirPeca(ab.getAttribute("data-produto")); return; }
      var q = t.closest("[data-qtd]");
      if (q) { var p = q.getAttribute("data-qtd").split("|"); mudarQtd(p[0], p[1], Number(p[2])); return; }
      if (t.closest("[data-pedir]")) { pedir(); return; }
      var tb = t.closest("[data-tam]");
      if (tb) { tamSel = tb.getAttribute("data-tam"); marcarTam(); return; }
      if (t.closest("[data-d-add]")) { addDoDetalhe(); return; }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !gaveta.hidden) fecharCarrinho(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    window.addEventListener("storage", function () { atualizarCarrinho(); });
    atualizarCarrinho();
  }

  var ultimoFoco = null;
  function abrirCarrinho() {
    ultimoFoco = document.activeElement; atualizarCarrinho();
    gaveta.hidden = false; document.body.classList.add("sem-rolagem");
    gaveta.querySelector(".gaveta-x").focus();
  }
  function fecharCarrinho() {
    gaveta.hidden = true; document.body.classList.remove("sem-rolagem");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  function atualizarCarrinho() {
    var ls = linhas(), n = ls.reduce(function (s, l) { return s + l.i.qtd; }, 0);
    document.querySelectorAll("[data-carrinho-qtd]").forEach(function (el) { el.textContent = n; el.hidden = n === 0; });
    if (!gaveta) return;
    var lista = gaveta.querySelector("[data-lista]");
    if (!ls.length) {
      lista.innerHTML = '<div class="gaveta-vazio"><p>Seu carrinho está vazio.</p><p>Escolha uma peça e toque em “Adicionar ao carrinho”.</p></div>';
    } else {
      lista.innerHTML = ls.map(function (l) {
        var k = esc(l.p.id) + "|" + esc(l.i.tam);
        return '<div class="item"><div class="item-img">' + imagem(l.p) + '</div><div class="item-info"><strong>' + esc(l.p.nome) + '</strong>' +
          '<span>' + (l.i.tam ? "Tamanho " + esc(l.i.tam) + " · " : "") + brl(l.p.preco) + '</span>' +
          '<div class="item-qtd"><button data-qtd="' + k + '|-1" aria-label="Diminuir">−</button><b>' + l.i.qtd + '</b><button data-qtd="' + k + '|1" aria-label="Aumentar">+</button></div></div>' +
          '<strong class="item-sub">' + brl(l.p.preco * l.i.qtd) + '</strong></div>';
      }).join("");
    }
    gaveta.querySelector("[data-total]").textContent = brl(total());
    gaveta.querySelector("[data-nota]").textContent = config().frete || "";
    gaveta.querySelector("[data-pedir]").disabled = !ls.length;
  }

  function pedir() {
    var cfg = config(), msg = mensagem(), av = gaveta.querySelector("[data-aviso]");
    var num = String(cfg.whatsapp || "").replace(/\D/g, "");
    if (!num) {
      av.hidden = false;
      av.textContent = "Modelo de demonstração: o WhatsApp da loja ainda não foi cadastrado. Quando for cadastrado, este botão abre a conversa já com o pedido pronto.";
      return;
    }
    av.hidden = true;
    window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  }

  function abrirPeca(id) {
    var p = achar(id); if (!p) return;
    atual = p; tamSel = null;
    dlg.querySelector("[data-d-img]").innerHTML = imagem(p);
    dlg.querySelector("[data-d-cat]").textContent = p.categoria || "";
    dlg.querySelector("[data-d-nome]").textContent = p.nome;
    dlg.querySelector("[data-d-preco]").textContent = brl(p.preco);
    dlg.querySelector("[data-d-desc]").textContent = p.descricao || "";
    var ts = p.tamanhos || [];
    dlg.querySelector(".peca-tams").hidden = !ts.length;
    dlg.querySelector("[data-d-tams]").innerHTML = ts.map(function (t) { return '<button type="button" data-tam="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
    dlg.querySelector("[data-d-msg]").textContent = "";
    if (!dlg.open) dlg.showModal();
  }
  function marcarTam() {
    dlg.querySelectorAll("[data-tam]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tam") === tamSel)); });
  }
  function addDoDetalhe() {
    var msg = dlg.querySelector("[data-d-msg]");
    if ((atual.tamanhos || []).length && !tamSel) { msg.textContent = "Escolha um tamanho primeiro."; return; }
    adicionar(atual.id, tamSel || "", 1);
    dlg.close(); abrirCarrinho();
  }

  /* ---------- textos da loja ---------- */
  function aplicarConfig() {
    var cfg = config();
    document.querySelectorAll("[data-loja]").forEach(function (el) { el.textContent = cfg[el.getAttribute("data-loja")] || ""; });
    document.querySelectorAll("[data-loja-se]").forEach(function (el) { el.hidden = !cfg[el.getAttribute("data-loja-se")]; });
    document.querySelectorAll("[data-loja-insta]").forEach(function (el) {
      if (cfg.instagram) { el.href = "https://instagram.com/" + cfg.instagram.replace(/^@/, ""); }
    });
    document.title = cfg.nome + " · Roupinhas infantis feitas à mão";
  }

  /* ---------- vitrine ---------- */
  function categorias() {
    var vistas = [];
    produtos().forEach(function (p) { if (p.categoria && vistas.indexOf(p.categoria) < 0) vistas.push(p.categoria); });
    return vistas;
  }

  /* opts.card(p) -> html do cartão; opts.alvo -> seletor da grade; opts.filtros -> seletor dos botões */
  function vitrine(opts) {
    var alvo = document.querySelector(opts.alvo || "[data-grade]"), filtroAtual = "Todos";
    var barra = opts.filtros ? document.querySelector(opts.filtros) : null;
    function desenhar() {
      var lista = produtos().filter(function (p) { return filtroAtual === "Todos" || p.categoria === filtroAtual; });
      alvo.innerHTML = lista.length ? lista.map(function (p, i) { return opts.card(p, i); }).join("") : '<p class="vazio-grade">Nenhuma peça nesta categoria ainda.</p>';
    }
    if (barra) {
      barra.innerHTML = ["Todos"].concat(categorias()).map(function (c) {
        return '<button type="button" data-filtro="' + esc(c) + '" aria-pressed="' + (c === "Todos") + '">' + esc(c) + "</button>";
      }).join("");
      barra.addEventListener("click", function (e) {
        var b = e.target.closest("[data-filtro]"); if (!b) return;
        filtroAtual = b.getAttribute("data-filtro");
        barra.querySelectorAll("[data-filtro]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        desenhar();
      });
    }
    desenhar();
    document.addEventListener("click", function (e) {
      var c = e.target.closest("[data-ir-categoria]"); if (!c || !barra) return;
      var alvoCat = c.getAttribute("data-ir-categoria"), b = barra.querySelector('[data-filtro="' + alvoCat + '"]');
      if (b) b.click();
    });
  }

  function iniciar() { montarUI(); aplicarConfig(); }

  window.Loja = {
    EXEMPLOS: EXEMPLOS, K: { PROD: K_PROD, CFG: K_CFG, CART: K_CART },
    ler: ler, gravar: gravar, config: config, produtos: produtos, categorias: categorias,
    brl: brl, esc: esc, arte: arte, arteEl: arteEl, imagem: imagem, vitrine: vitrine, iniciar: iniciar
  };
})();
