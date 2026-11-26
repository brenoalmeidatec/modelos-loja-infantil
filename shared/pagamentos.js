/* Pagamento (Pix e cartão), envio e pedidos. MODO DEMONSTRAÇÃO:
   nenhum pagamento real é feito e nenhum dado de cartão é guardado.
   Na versão final, o pagamento passa pelo gateway escolhido (ex.: Mercado Pago). */
(function () {
  "use strict";
  var L = window.Loja;
  if (!L) return;

  var K = { PED: "loja.pedidos.v1", PAG: "loja.pagamento.v1", ENV: "loja.envio.v1" };
  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* biblioteca de QR Code (versão fixa). Se não carregar, o código "copia e cola" continua funcionando. */
  if (!window.qrcode) {
    var sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    sc.async = true; document.head.appendChild(sc);
  }

  /* ---------- configuração: pagamento e envio ---------- */
  var PAG_PADRAO = { gateway: "mercadopago", conectado: false, titular: "", tipoChave: "email", chavePix: "", cidade: "", pix: true, cartao: true, parcelasMax: 3 };
  var ENV_PADRAO = {
    cepOrigem: "", gratisAcima: 250,
    metodos: [
      { id: "retirada", nome: "Retirar na loja", prazo: "Combinar pelo WhatsApp", base: 0, tipo: "fixo", ativo: true, gratis: false },
      { id: "local", nome: "Entrega local", prazo: "1 a 2 dias úteis", base: 8, tipo: "fixo", ativo: true, gratis: true },
      { id: "pac", nome: "Correios PAC", prazo: "5 a 9 dias úteis", base: 22, tipo: "cep", dias: [5, 9], ativo: true, gratis: true },
      { id: "sedex", nome: "Correios SEDEX", prazo: "2 a 4 dias úteis", base: 38, tipo: "cep", dias: [2, 4], ativo: true, gratis: false }
    ]
  };
  function pagamento() { return Object.assign({}, PAG_PADRAO, L.ler(K.PAG, {})); }
  function envio() { var e = L.ler(K.ENV, null); return e && e.metodos ? Object.assign({}, ENV_PADRAO, e) : JSON.parse(JSON.stringify(ENV_PADRAO)); }

  /* ---------- frete (estimativa de demonstração) ---------- */
  function digito(c) { var d = String(c || "").replace(/\D/g, ""); return d ? Number(d.charAt(0)) : null; }
  function calcFrete(m, cep, subtotal) {
    var cfg = envio(), valor = Number(m.base) || 0, prazo = m.prazo;
    if (m.tipo === "cep") {
      var a = digito(cep), o = digito(cfg.cepOrigem), d = (a == null || o == null) ? 3 : Math.abs(a - o);
      valor = Math.max(Math.round(valor * (1 + 0.12 * d)) - 0.1, 0);
      var dias = m.dias || [5, 9];
      prazo = (dias[0] + Math.ceil(d / 2)) + " a " + (dias[1] + d) + " dias úteis";
    }
    var gratis = m.gratis && cfg.gratisAcima > 0 && subtotal >= cfg.gratisAcima;
    return { id: m.id, nome: m.nome, prazo: prazo, valor: gratis ? 0 : valor, gratis: gratis };
  }

  /* ---------- Pix (BR Code) ---------- */
  function tlv(id, v) { var n = String(v.length); return id + (n.length < 2 ? "0" + n : n) + v; }
  function limpa(s, max) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().trim().slice(0, max); }
  function crc16(str) {
    var c = 0xFFFF;
    for (var i = 0; i < str.length; i++) {
      c ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; }
    }
    return ("0000" + c.toString(16).toUpperCase()).slice(-4);
  }
  function normalizaChave(tipo, v) {
    v = String(v || "").trim();
    if (tipo === "cpf" || tipo === "cnpj") return v.replace(/\D/g, "");
    if (tipo === "telefone") { var d = v.replace(/\D/g, ""); return v.charAt(0) === "+" ? "+" + d : "+55" + d; }
    if (tipo === "email") return v.toLowerCase();
    return v;
  }
  function pixPayload(chave, nome, cidade, valor, txid) {
    var conta = tlv("00", "br.gov.bcb.pix") + tlv("01", chave);
    var p = tlv("00", "01") + tlv("01", "11") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986") +
      tlv("54", Number(valor).toFixed(2)) + tlv("58", "BR") + tlv("59", limpa(nome, 25) || "LOJA") + tlv("60", limpa(cidade, 15) || "BRASIL") +
      tlv("62", tlv("05", limpa(txid, 25).replace(/ /g, "") || "***")) + "6304";
    return p + crc16(p);
  }
  function qrSvg(texto) {
    if (!window.qrcode) return null;
    try {
      var q = window.qrcode(0, "M"); q.addData(texto); q.make();
      var n = q.getModuleCount(), m = 2, d = "";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
      var t = n + 2 * m;
      return '<svg viewBox="0 0 ' + t + " " + t + '" shape-rendering="crispEdges" role="img" aria-label="QR Code do Pix"><rect width="' + t + '" height="' + t + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
    } catch (e) { return null; }
  }
  function pixDaLoja(valor, txid) {
    var p = pagamento(), cfg = L.config(), demo = !p.chavePix;
    var chave = demo ? "demonstracao@example.com" : normalizaChave(p.tipoChave, p.chavePix);
    return { demo: demo, codigo: pixPayload(chave, p.titular || cfg.nome, p.cidade || cfg.cidade, valor, txid) };
  }

  /* ---------- pedidos ---------- */
  function pedidos() { return L.ler(K.PED, []); }
  function salvarPedidos(l) { return L.gravar(K.PED, l); }
  function proximoId(l) {
    var m = 1000;
    l.forEach(function (p) { var n = parseInt(String(p.id).replace(/\D/g, ""), 10); if (n > m) m = n; });
    return "#" + (m + 1);
  }
  function salvarPedido(ped) {
    var l = pedidos(), i = l.findIndex(function (x) { return x.id === ped.id; });
    if (i >= 0) l[i] = ped; else l.push(ped);
    salvarPedidos(l);
  }
  var PAGOS = ["pago", "enviado", "entregue"];
  function foiPago(p) { return PAGOS.indexOf(p.status) >= 0; }

  /* dados de exemplo para o cliente ver o painel cheio (nomes e contatos fictícios) */
  function semear() {
    var gente = [["Mariana Costa", "Salvador"], ["Patrícia Souza", "Feira de Santana"], ["Renata Lima", "Aratuípe"], ["Camila Rocha", "Nazaré"], ["Juliana Alves", "Salvador"],
      ["Fernanda Dias", "Valença"], ["Aline Barros", "Santo Antônio de Jesus"], ["Bianca Neves", "Salvador"], ["Letícia Moura", "Cruz das Almas"], ["Tatiane Freitas", "Itabuna"]];
    var s = 7, r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    var prods = L.produtos(), mets = envio().metodos.filter(function (m) { return m.ativo; });
    var base = pedidos().filter(function (p) { return !p.demo; }), out = [];
    for (var i = 0; i < 28; i++) {
      var g = gente[Math.floor(r() * gente.length)], gi = gente.indexOf(g);
      var itens = [], nit = 1 + Math.floor(r() * 3), sub = 0;
      for (var k = 0; k < nit; k++) {
        var p = prods[Math.floor(r() * prods.length)], q = 1 + (r() > .8 ? 1 : 0);
        itens.push({ id: p.id, nome: p.nome, tam: (p.tamanhos || [])[0] || "", qtd: q, preco: p.preco }); sub += p.preco * q;
      }
      var m = mets[Math.floor(r() * mets.length)], cep = String(40000000 + Math.floor(r() * 5000000)), f = calcFrete(m, cep, sub);
      var x = r(), st = x < .38 ? "pago" : x < .62 ? "enviado" : x < .82 ? "entregue" : x < .94 ? "aguardando pagamento" : "cancelado";
      var dias = 29 - Math.floor(i * 29 / 27), forma = r() > .35 ? "pix" : "cartao";
      out.push({
        id: "", demo: true, criado: new Date(Date.now() - dias * 864e5 - r() * 6e7).toISOString(),
        cliente: { nome: g[0], email: g[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ /g, ".") + "@example.com", tel: "7199900" + String(1000 + gi * 7), cep: cep, cidade: g[1], endereco: "Rua das Flores, " + (10 + gi * 3) },
        itens: itens, subtotal: sub, frete: f, total: sub + f.valor,
        pagamento: { forma: st === "aguardando pagamento" || st === "cancelado" ? null : forma, parcelas: forma === "cartao" ? 1 + Math.floor(r() * 3) : 1, status: st === "aguardando pagamento" ? "aguardando" : st === "cancelado" ? "cancelado" : "pago" },
        status: st, rastreio: st === "enviado" || st === "entregue" ? "BR" + (100000000 + Math.floor(r() * 899999999)) + "BR" : ""
      });
    }
    out.sort(function (a, b) { return a.criado < b.criado ? -1 : 1; });
    var tmp = base.slice();
    out.forEach(function (o) { o.id = proximoId(tmp); tmp.push(o); });
    salvarPedidos(tmp);
    return out.length;
  }
  function limparDemo() { salvarPedidos(pedidos().filter(function (p) { return !p.demo; })); }

  /* ====================== checkout (site) ====================== */
  var dlg, S = null;
  function novoEstado() { return { step: 1, cliente: {}, envio: null, pedidoId: null, criado: null, forma: null, pago: false }; }

  var CSS = [
    "dialog.fin{border:0;padding:0;width:min(940px,calc(100% - 24px));max-height:calc(100% - 24px);border-radius:calc(var(--raio,14px)*1.4);background:var(--surface,#fff);color:var(--ink,#222);box-shadow:0 30px 80px rgba(20,15,10,.35);overflow:auto}",
    "dialog.fin::backdrop{background:rgba(20,15,10,.5)}",
    ".fin-x{position:absolute;top:10px;right:10px;margin:0;z-index:2}.fin-x button{width:44px;height:44px;border-radius:50%;border:0;background:var(--surface,#fff);font-size:1.8rem;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,.15)}",
    ".fin-wrap{display:grid;grid-template-columns:1.4fr 1fr}",
    ".fin-main{padding:30px 30px 34px;display:grid;gap:16px;align-content:start}",
    ".fin-demo{margin:0;padding:10px 14px;border-radius:10px;background:#fff4d6;color:#5b4400;font-size:.86rem}",
    ".fin-passos{display:flex;gap:8px;list-style:none;margin:0;padding:0;font-size:.85rem;color:var(--muted,#666);flex-wrap:wrap}",
    ".fin-passos li{display:flex;align-items:center;gap:6px}.fin-passos b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--line,#ddd);font-size:.78rem}",
    ".fin-passos li.on{color:var(--ink,#222);font-weight:700}.fin-passos li.on b,.fin-passos li.ok b{background:var(--accent,#c0392b);border-color:var(--accent,#c0392b);color:var(--accent-ink,#fff)}",
    ".fin h3{margin:0;font:600 1.3rem var(--fonte-titulo,Georgia,serif)}",
    ".fin form{display:grid;gap:12px;grid-template-columns:1fr 1fr}.fin .l2{grid-column:1/-1}",
    ".fin label{display:grid;gap:5px;font-weight:600;font-size:.88rem}",
    ".fin input,.fin select{font:inherit;padding:11px 12px;border:1.5px solid var(--line,#ddd);border-radius:10px;min-height:46px;width:100%;background:#fff;color:#222}",
    ".fin .btn-p{grid-column:1/-1;min-height:52px;border:0;border-radius:999px;background:var(--accent,#c0392b);color:var(--accent-ink,#fff);font-weight:700;font-size:1rem}.fin .btn-p:hover{filter:brightness(1.07)}",
    ".fin .btn-s{min-height:46px;padding:0 18px;border-radius:999px;border:1.5px solid var(--line,#ddd);background:transparent;font-weight:700}",
    ".fin-erro{grid-column:1/-1;margin:0;color:#b3261e;font-size:.9rem;min-height:1.2em}",
    ".fin-opc{display:grid;gap:10px}.fin-opc label{grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:14px;border:1.5px solid var(--line,#ddd);border-radius:12px;font-weight:600;cursor:pointer}",
    ".fin-opc label:has(input:checked){border-color:var(--accent,#c0392b);background:rgba(0,0,0,.025)}.fin-opc input{width:20px;min-height:20px;accent-color:var(--accent,#c0392b)}",
    ".fin-opc small{display:block;font-weight:400;color:var(--muted,#666)}.fin-opc em{font-style:normal;font-variant-numeric:tabular-nums}.fin-opc .gr{color:#1f7a45}",
    ".fin-abas{display:flex;gap:8px}.fin-abas button{flex:1;min-height:46px;border-radius:999px;border:1.5px solid var(--line,#ddd);background:transparent;font-weight:700}.fin-abas button[aria-selected=true]{background:var(--ink,#222);color:var(--surface,#fff);border-color:var(--ink,#222)}",
    ".fin-pix{display:grid;gap:12px;justify-items:center;text-align:center}.fin-qr{width:min(240px,70%);aspect-ratio:1;border:1px solid var(--line,#ddd);border-radius:12px;padding:8px;background:#fff}.fin-qr svg{width:100%;height:100%}",
    ".fin-pix textarea{width:100%;min-height:74px;font:.78rem/1.3 ui-monospace,monospace;padding:10px;border:1.5px solid var(--line,#ddd);border-radius:10px;resize:none;background:#fff;color:#222}",
    ".fin-espera{display:flex;align-items:center;gap:8px;color:var(--muted,#666);font-size:.92rem}.fin-espera i{width:10px;height:10px;border-radius:50%;background:#e0a100;animation:finp 1.2s ease-in-out infinite}@keyframes finp{50%{opacity:.25}}",
    ".fin-ok{display:grid;gap:10px;justify-items:center;text-align:center;padding:10px 0}.fin-ok svg{width:72px;height:72px}",
    ".fin-resumo{background:rgba(0,0,0,.035);padding:30px 26px;display:grid;gap:12px;align-content:start}.fin-resumo h3{font-size:1.1rem}",
    ".fin-lin{display:flex;justify-content:space-between;gap:10px;font-size:.92rem}.fin-lin span:last-child{font-variant-numeric:tabular-nums;white-space:nowrap}",
    ".fin-tot{border-top:1px solid var(--line,#ddd);padding-top:10px;font-size:1.15rem;font-weight:700}",
    "@media(max-width:760px){.fin-wrap{grid-template-columns:1fr}.fin-main{padding:22px 18px}.fin form{grid-template-columns:1fr}.fin-resumo{order:-1;padding:18px}}"
  ].join("\n");

  function montarDialog() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    dlg = document.createElement("dialog"); dlg.className = "fin"; dlg.setAttribute("aria-label", "Finalizar compra");
    dlg.innerHTML = '<form method="dialog" class="fin-x"><button aria-label="Fechar">&times;</button></form>' +
      '<div class="fin-wrap"><div class="fin-main"><p class="fin-demo"><strong>Modo demonstração:</strong> nenhum pagamento é feito de verdade e nenhum dado de cartão é guardado.</p>' +
      '<ol class="fin-passos" data-passos></ol><div data-corpo></div></div><aside class="fin-resumo" data-resumo></aside></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      var t = e.target;
      if (t.closest("[data-aba]")) { S.forma = t.closest("[data-aba]").getAttribute("data-aba"); desenhar(); return; }
      if (t.closest("[data-copiar]")) { copiar(); return; }
      if (t.closest("[data-simular-pix]")) { pagar("pix"); return; }
      if (t.closest("[data-voltar]")) { S.step = Math.max(1, S.step - 1); desenhar(); return; }
      if (t.closest("[data-fim]")) { dlg.close(); }
    });
    dlg.addEventListener("submit", function (e) {
      var f = e.target; if (f.classList.contains("fin-x")) return;
      e.preventDefault();
      if (f.hasAttribute("data-f-dados")) dadosOk(f);
      else if (f.hasAttribute("data-f-envio")) envioOk(f);
      else if (f.hasAttribute("data-f-cartao")) cartaoOk(f);
    });
    dlg.addEventListener("input", function (e) {
      if (e.target.name === "cep") { var d = e.target.value.replace(/\D/g, "").slice(0, 8); e.target.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d; }
      if (e.target.name === "numero") { var n = e.target.value.replace(/\D/g, "").slice(0, 19); e.target.value = n.replace(/(.{4})/g, "$1 ").trim(); }
      if (e.target.name === "validade") { var v = e.target.value.replace(/\D/g, "").slice(0, 4); e.target.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v; }
      if (e.target.name === "cvv") e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
    });
    dlg.addEventListener("change", function (e) {
      if (e.target.name === "env") { S.envio = calcFrete(metodosAtivos().filter(function (m) { return m.id === e.target.value; })[0], S.cliente.cep, L.total()); resumo(); }
    });
  }

  function metodosAtivos() { return envio().metodos.filter(function (m) { return m.ativo; }); }
  function totalPedido() { return L.total() + (S.envio ? S.envio.valor : 0); }

  function passos() {
    var nomes = ["Dados", "Envio", "Pagamento"];
    $("[data-passos]", dlg).innerHTML = nomes.map(function (n, i) {
      var c = S.step === i + 1 ? "on" : (S.step > i + 1 ? "ok" : "");
      return '<li class="' + c + '"><b>' + (S.step > i + 1 ? "✓" : i + 1) + "</b>" + n + "</li>";
    }).join("");
  }
  function resumo() {
    var ls = S.step === 4 && S.fechado ? S.fechado.itens : L.linhas().map(function (l) { return { nome: l.p.nome, tam: l.i.tam, qtd: l.i.qtd, preco: l.p.preco }; });
    var sub = ls.reduce(function (s, i) { return s + i.preco * i.qtd; }, 0), env = S.envio;
    $("[data-resumo]", dlg).innerHTML = "<h3>Resumo do pedido</h3>" + ls.map(function (i) {
      return '<div class="fin-lin"><span>' + i.qtd + "x " + L.esc(i.nome) + (i.tam ? " (tam. " + L.esc(i.tam) + ")" : "") + "</span><span>" + L.brl(i.preco * i.qtd) + "</span></div>";
    }).join("") + '<div class="fin-lin"><span>Subtotal</span><span>' + L.brl(sub) + "</span></div>" +
      '<div class="fin-lin"><span>Envio' + (env ? " · " + L.esc(env.nome) : "") + "</span><span>" + (env ? (env.valor ? L.brl(env.valor) : "Grátis") : "a calcular") + "</span></div>" +
      '<div class="fin-lin fin-tot"><span>Total</span><span>' + L.brl(sub + (env ? env.valor : 0)) + "</span></div>";
  }

  function desenhar() {
    passos(); resumo();
    var c = $("[data-corpo]", dlg), v = S.cliente, pg = pagamento();
    if (S.step === 1) {
      c.innerHTML = "<h3>Seus dados</h3>" +
        '<form data-f-dados novalidate><label class="l2">Nome completo<input name="nome" autocomplete="name" required value="' + L.esc(v.nome || "") + '"></label>' +
        '<label>E-mail<input name="email" type="email" autocomplete="email" required value="' + L.esc(v.email || "") + '"></label>' +
        '<label>WhatsApp com DDD<input name="tel" inputmode="tel" autocomplete="tel" required value="' + L.esc(v.tel || "") + '"></label>' +
        '<label>CEP<input name="cep" inputmode="numeric" autocomplete="postal-code" required placeholder="00000-000" value="' + L.esc(v.cep || "") + '"></label>' +
        '<label>Cidade / UF<input name="cidade" autocomplete="address-level2" required value="' + L.esc(v.cidade || "") + '"></label>' +
        '<label class="l2">Endereço (rua, número, complemento)<input name="endereco" autocomplete="street-address" required value="' + L.esc(v.endereco || "") + '"></label>' +
        '<p class="fin-erro" data-erro role="alert"></p><button class="btn-p" type="submit">Continuar para o envio</button></form>';
    } else if (S.step === 2) {
      var sub = L.total(), ms = metodosAtivos().map(function (m) { return calcFrete(m, v.cep, sub); });
      if (!S.envio || !ms.some(function (m) { return m.id === S.envio.id; })) S.envio = ms[0];
      resumo();
      c.innerHTML = "<h3>Como você quer receber?</h3>" +
        '<form data-f-envio><div class="fin-opc l2">' + ms.map(function (m) {
          return '<label><input type="radio" name="env" value="' + L.esc(m.id) + '"' + (S.envio.id === m.id ? " checked" : "") + '><span>' + L.esc(m.nome) + "<small>" + L.esc(m.prazo) + "</small></span><em" + (m.valor ? "" : ' class="gr"') + ">" + (m.valor ? L.brl(m.valor) : "Grátis") + "</em></label>";
        }).join("") + '</div><p class="l2 fin-erro" style="color:var(--muted,#666)">Valores estimados na demonstração. Na versão final o frete é calculado pelo CEP e pelo peso (ex.: Melhor Envio / Correios).</p>' +
        '<button class="btn-s" type="button" data-voltar>Voltar</button><button class="btn-p" style="grid-column:auto" type="submit">Continuar para o pagamento</button></form>';
    } else if (S.step === 3) {
      var formas = []; if (pg.pix) formas.push("pix"); if (pg.cartao) formas.push("cartao");
      if (!formas.length) { c.innerHTML = "<h3>Pagamento</h3><p>Nenhuma forma de pagamento está ativa no momento. Fale com a loja pelo WhatsApp.</p>"; return; }
      if (!S.forma || formas.indexOf(S.forma) < 0) S.forma = formas[0];
      var tot = totalPedido(), h = "<h3>Pagamento</h3>" + '<div class="fin-abas" role="tablist">' + formas.map(function (f) {
        return '<button type="button" role="tab" data-aba="' + f + '" aria-selected="' + (S.forma === f) + '">' + (f === "pix" ? "Pix" : "Cartão de crédito") + "</button>";
      }).join("") + "</div>";
      if (S.forma === "pix") {
        var px = pixDaLoja(tot, "PED" + S.pedidoId.replace(/\D/g, "")), svg = qrSvg(px.codigo);
        h += '<div class="fin-pix"><p style="margin:0"><strong>' + L.brl(tot) + "</strong> · aponte a câmera do app do seu banco</p>" +
          '<div class="fin-qr">' + (svg || '<p style="padding:30px 8px;font-size:.85rem">QR Code indisponível agora. Use o código abaixo.</p>') + "</div>" +
          '<textarea readonly data-codigo aria-label="Pix copia e cola">' + L.esc(px.codigo) + '</textarea><button class="btn-s" type="button" data-copiar>Copiar código Pix</button>' +
          (px.demo ? '<p class="fin-demo" style="margin:0">Chave Pix de demonstração. A loja cadastra a chave dela no painel e o QR passa a pagar na conta dela.</p>' : "") +
          '<div class="fin-espera"><i></i>Aguardando o pagamento…</div>' +
          '<button class="btn-p" style="width:100%" type="button" data-simular-pix>Simular pagamento aprovado (demonstração)</button></div>';
      } else {
        var par = ""; for (var n = 1; n <= Math.max(1, Number(pg.parcelasMax) || 1); n++) par += '<option value="' + n + '">' + n + "x de " + L.brl(tot / n) + " sem juros</option>";
        h += '<form data-f-cartao novalidate autocomplete="off"><label class="l2">Número do cartão<input name="numero" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="off"></label>' +
          '<label class="l2">Nome impresso no cartão<input name="nomec" autocomplete="off"></label><label>Validade<input name="validade" inputmode="numeric" placeholder="MM/AA" autocomplete="off"></label>' +
          '<label>CVV<input name="cvv" inputmode="numeric" autocomplete="off"></label><label class="l2">Parcelas<select name="parcelas">' + par + "</select></label>" +
          '<p class="fin-erro" data-erro role="alert" style="color:var(--muted,#666)">Para testar use 4242 4242 4242 4242. Na versão final, estes campos ficam no ambiente seguro do gateway e a loja nunca vê o número do cartão.</p>' +
          '<button class="btn-p" type="submit">Pagar ' + L.brl(tot) + "</button></form>";
      }
      h += '<button class="btn-s" type="button" data-voltar style="justify-self:start">Voltar</button>';
      c.innerHTML = h;
    } else {
      var p = S.fechado;
      c.innerHTML = '<div class="fin-ok"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="34" fill="#1f9d55"/><path d="M21 37l10 10 20-22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "<h3>Pagamento aprovado!</h3><p style=\"margin:0\">Pedido <strong>" + L.esc(p.id) + "</strong> confirmado via " + (p.pagamento.forma === "pix" ? "Pix" : "cartão em " + p.pagamento.parcelas + "x") + ".</p>" +
        '<p style="margin:0;color:var(--muted,#666)">Avisaremos <strong>' + L.esc(p.cliente.nome.split(" ")[0]) + "</strong> pelo WhatsApp quando o pedido for enviado, com o código de rastreio.</p>" +
        '<button class="btn-p" style="width:100%" type="button" data-fim>Voltar para a loja</button></div>';
    }
    var foco = c.querySelector("input,button.btn-p"); if (foco && S.step < 4 && S.forma !== "pix") foco.focus({ preventScroll: true });
  }

  function dadosOk(f) {
    var d = {}; ["nome", "email", "tel", "cep", "cidade", "endereco"].forEach(function (k) { d[k] = f.elements[k].value.trim(); });
    var erro = f.querySelector("[data-erro]");
    if (d.nome.split(/\s+/).length < 2) return erro.textContent = "Digite o nome completo.", f.elements.nome.focus();
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return erro.textContent = "Digite um e-mail válido.", f.elements.email.focus();
    if (d.tel.replace(/\D/g, "").length < 10) return erro.textContent = "Digite o WhatsApp com DDD.", f.elements.tel.focus();
    if (d.cep.replace(/\D/g, "").length !== 8) return erro.textContent = "O CEP precisa ter 8 números.", f.elements.cep.focus();
    if (!d.cidade || !d.endereco) return erro.textContent = "Preencha cidade e endereço.";
    S.cliente = d; S.step = 2; desenhar();
  }
  function registrarPedido(extra) {
    var ls = L.linhas(), sub = L.total(), l = pedidos();
    if (!S.pedidoId) { S.pedidoId = proximoId(l); S.criado = new Date().toISOString(); }
    var ped = Object.assign({
      id: S.pedidoId, criado: S.criado, cliente: S.cliente,
      itens: ls.map(function (x) { return { id: x.p.id, nome: x.p.nome, tam: x.i.tam, qtd: x.i.qtd, preco: x.p.preco }; }),
      subtotal: sub, frete: S.envio, total: sub + S.envio.valor,
      pagamento: { forma: null, parcelas: 1, status: "aguardando" }, status: "aguardando pagamento", rastreio: ""
    }, extra || {});
    salvarPedido(ped); return ped;
  }
  function envioOk(f) {
    var id = f.elements.env.value;
    S.envio = calcFrete(metodosAtivos().filter(function (m) { return m.id === id; })[0], S.cliente.cep, L.total());
    registrarPedido(); S.step = 3; desenhar();
  }
  function pagar(forma, parcelas) {
    var ped = registrarPedido({ pagamento: { forma: forma, parcelas: parcelas || 1, status: "pago" }, status: "pago" });
    S.fechado = ped; S.pago = true; S.step = 4; L.limparCarrinho(); desenhar();
  }
  function cartaoOk(f) {
    var erro = f.querySelector("[data-erro]"), num = f.elements.numero.value.replace(/\D/g, "");
    function luhn(s) { var t = 0, alt = false; for (var i = s.length - 1; i >= 0; i--) { var n = Number(s.charAt(i)); if (alt) { n *= 2; if (n > 9) n -= 9; } t += n; alt = !alt; } return t % 10 === 0; }
    erro.style.color = "#b3261e";
    if (num.length < 13 || !luhn(num)) return erro.textContent = "Número de cartão inválido.", f.elements.numero.focus();
    if (!f.elements.nomec.value.trim()) return erro.textContent = "Digite o nome impresso no cartão.", f.elements.nomec.focus();
    var m = /^(\d\d)\/(\d\d)$/.exec(f.elements.validade.value);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return erro.textContent = "Validade inválida (MM/AA).", f.elements.validade.focus();
    if (f.elements.cvv.value.length < 3) return erro.textContent = "CVV inválido.", f.elements.cvv.focus();
    var parc = Number(f.elements.parcelas.value) || 1;
    f.reset(); /* o número do cartão nunca é guardado */
    pagar("cartao", parc);
  }
  function copiar() {
    var t = $("[data-codigo]", dlg), b = $("[data-copiar]", dlg);
    function ok() { b.textContent = "Código copiado ✓"; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, function () { t.select(); document.execCommand("copy"); ok(); });
    else { t.select(); document.execCommand("copy"); ok(); }
  }

  function abrir() {
    if (!L.linhas().length) return;
    if (!dlg) montarDialog();
    if (!S || S.pago) S = novoEstado();
    S.step = S.step === 4 ? 1 : S.step; S.fechado = null;
    desenhar(); if (!dlg.open) dlg.showModal();
  }

  window.LojaPagamentos = {
    K: K, abrir: abrir, pagamento: pagamento, envio: envio, PAG_PADRAO: PAG_PADRAO, ENV_PADRAO: ENV_PADRAO,
    pedidos: pedidos, salvarPedidos: salvarPedidos, foiPago: foiPago, PAGOS: PAGOS,
    calcFrete: calcFrete, pixPayload: pixPayload, qrSvg: qrSvg, normalizaChave: normalizaChave,
    semear: semear, limparDemo: limparDemo
  };
  if (L.K) { L.K.PED = K.PED; L.K.PAG = K.PAG; L.K.ENV = K.ENV; }
  /* se o carrinho já foi desenhado antes deste arquivo carregar, mostra o botão de finalizar */
  window.dispatchEvent(new Event("storage"));
})();
