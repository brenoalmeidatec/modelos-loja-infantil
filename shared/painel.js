/* Painel da loja: visão geral, pedidos, clientes (CRM), pagamentos e envio. DEMONSTRAÇÃO (dados no navegador). */
(function () {
  "use strict";
  var L = window.Loja, P = window.LojaPagamentos;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = L.esc, brl = L.brl;

  function aviso(t) { var m = $("#msg"); m.textContent = t; m.classList.add("on"); clearTimeout(aviso.t); aviso.t = setTimeout(function () { m.classList.remove("on"); }, 2800); }
  function data(iso) { return new Date(iso).toLocaleDateString("pt-BR"); }
  function dia(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  var ROTULO = { "aguardando pagamento": "Aguardando pagamento", pago: "Pago", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" };
  var STATUS = Object.keys(ROTULO);
  function selo(st) { return '<span class="selo s-' + st.replace(/\W/g, "") + '">' + esc(ROTULO[st] || st) + "</span>"; }
  function forma(p) { var f = p.pagamento && p.pagamento.forma; return f === "pix" ? "Pix" : f === "cartao" ? "Cartão " + p.pagamento.parcelas + "x" : "—"; }

  /* ---------- login (demonstração) ---------- */
  function login() {
    var ok = false; try { ok = sessionStorage.getItem("loja.admin.ok") === "1"; } catch (e) {}
    $("#login").hidden = ok; $("#painel").hidden = !ok;
    if (ok) iniciarAbas();
  }
  $("#f-login").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("#l-senha").value === (L.config().adminSenha || "demo123")) {
      try { sessionStorage.setItem("loja.admin.ok", "1"); } catch (x) {}
      $("#l-erro").textContent = ""; login();
    } else { $("#l-erro").textContent = "Senha incorreta."; $("#l-senha").select(); }
  });
  $("#b-sair").addEventListener("click", function () { try { sessionStorage.removeItem("loja.admin.ok"); } catch (e) {} $("#l-senha").value = ""; login(); });

  /* ---------- abas ---------- */
  var ABAS = ["visao", "pedidos", "clientes", "produtos", "pagamentos", "envio", "loja"], pronto = false;
  function aba(nome) {
    if (ABAS.indexOf(nome) < 0) nome = "visao";
    $$("[data-aba]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-aba") === nome)); });
    $$("[data-pane]").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== nome; });
    if (nome === "visao") visao(); if (nome === "pedidos") pedidosTab(); if (nome === "clientes") clientes();
    if (nome === "pagamentos") pagamentosTab(); if (nome === "envio") envioTab();
    if (location.hash !== "#" + nome) history.replaceState(null, "", "#" + nome);
  }
  function iniciarAbas() {
    if (!pronto) { pronto = true; $$("[data-aba]").forEach(function (b) { b.addEventListener("click", function () { aba(b.getAttribute("data-aba")); }); }); }
    aba(location.hash.slice(1));
  }

  /* ---------- visão geral ---------- */
  var periodo = 30;
  function visao() {
    var todos = P.pedidos(), el = $("#visao-corpo");
    if (!todos.length) {
      el.innerHTML = '<div class="vazio-grande"><h3>Ainda não há pedidos</h3><p>Quando um cliente comprar no site, os números aparecem aqui. Para o cliente ver como o painel fica com movimento, carregue dados de exemplo.</p><button class="primario" id="b-semear">Carregar dados de exemplo</button></div>';
      $("#b-semear").addEventListener("click", function () { P.semear(); aviso("Dados de exemplo carregados."); visao(); }); return;
    }
    var ini = new Date(); ini.setHours(0, 0, 0, 0); ini.setDate(ini.getDate() - (periodo - 1));
    var ps = todos.filter(function (p) { return new Date(p.criado) >= ini; });
    var pagos = ps.filter(P.foiPago), fat = pagos.reduce(function (s, p) { return s + p.total; }, 0);
    var aguard = ps.filter(function (p) { return p.status === "aguardando pagamento"; });
    var emails = {}; pagos.forEach(function (p) { emails[(p.cliente.email || p.cliente.tel).toLowerCase()] = 1; });
    var kp = [["Faturamento", brl(fat)], ["Pedidos pagos", pagos.length], ["Ticket médio", brl(pagos.length ? fat / pagos.length : 0)],
      ["Aguardando pagamento", aguard.length + " · " + brl(aguard.reduce(function (s, p) { return s + p.total; }, 0))], ["Clientes que compraram", Object.keys(emails).length]];

    /* vendas por dia */
    var dias = [], mapa = {};
    for (var i = 0; i < periodo; i++) { var d = new Date(ini); d.setDate(d.getDate() + i); var o = { d: d, v: 0 }; dias.push(o); mapa[dia(d)] = o; }
    pagos.forEach(function (p) { var o = mapa[dia(new Date(p.criado))]; if (o) o.v += p.total; });
    var max = Math.max.apply(null, dias.map(function (x) { return x.v; })) || 1, W = 640, H = 170, bw = W / periodo;
    var barras = dias.map(function (x, k) {
      var h = Math.round(x.v / max * (H - 24)), t = x.d.toLocaleDateString("pt-BR") + ": " + brl(x.v);
      return '<rect x="' + (k * bw + bw * .12).toFixed(1) + '" y="' + (H - h) + '" width="' + (bw * .76).toFixed(1) + '" height="' + h + '" rx="2" fill="var(--accent)"><title>' + t + "</title></rect>";
    }).join("");

    /* produtos mais vendidos */
    var cont = {}; pagos.forEach(function (p) { p.itens.forEach(function (it) { cont[it.nome] = (cont[it.nome] || 0) + it.qtd; }); });
    var top = Object.keys(cont).map(function (k) { return [k, cont[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5), mx = top.length ? top[0][1] : 1;
    var porSt = {}; ps.forEach(function (p) { porSt[p.status] = (porSt[p.status] || 0) + 1; });

    el.innerHTML = '<div class="kpis">' + kp.map(function (k) { return '<div class="kpi"><span>' + k[0] + "</span><strong>" + k[1] + "</strong></div>"; }).join("") + "</div>" +
      '<div class="duas"><section class="cartao"><h3>Vendas por dia</h3><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Gráfico de vendas por dia" preserveAspectRatio="none">' + barras + "</svg>" +
      '<div class="eixo"><span>' + dias[0].d.toLocaleDateString("pt-BR") + "</span><span>hoje</span></div></section>" +
      '<section class="cartao"><h3>Mais vendidos</h3>' + (top.length ? top.map(function (t) {
        return '<div class="rank"><span>' + esc(t[0]) + "</span><b>" + t[1] + '</b><i style="width:' + Math.round(t[1] / mx * 100) + '%"></i></div>';
      }).join("") : "<p class=dica>Sem vendas no período.</p>") + "</section></div>" +
      '<div class="duas"><section class="cartao"><h3>Pedidos por situação</h3><div class="chips">' + STATUS.map(function (s) { return selo(s) + " <b>" + (porSt[s] || 0) + "</b>"; }).join(" ") + "</div></section>" +
      '<section class="cartao"><h3>Últimos pedidos</h3>' + ps.slice(-5).reverse().map(function (p) {
        return '<div class="rank2"><span><strong>' + esc(p.id) + "</strong> " + esc(p.cliente.nome) + "</span><span>" + brl(p.total) + " " + selo(p.status) + "</span></div>";
      }).join("") + "</section></div>";
  }
  $("#periodo").addEventListener("change", function (e) { periodo = Number(e.target.value); visao(); });

  /* ---------- pedidos ---------- */
  function pedidosTab() {
    var q = $("#ped-busca").value.trim().toLowerCase(), fs = $("#ped-status").value;
    var l = P.pedidos().filter(function (p) {
      return (!fs || p.status === fs) && (!q || (p.id + " " + p.cliente.nome + " " + p.cliente.email).toLowerCase().indexOf(q) >= 0);
    }).reverse();
    $("#ped-lista").innerHTML = l.length ? l.map(function (p) {
      return "<tr><td><strong>" + esc(p.id) + "</strong>" + (p.demo ? ' <small class="demo-tag">exemplo</small>' : "") + "</td><td>" + data(p.criado) + "</td><td>" + esc(p.cliente.nome) + "<br><small>" + esc(p.cliente.cidade) + "</small></td>" +
        '<td class="num">' + brl(p.total) + "</td><td>" + forma(p) + "</td><td>" + selo(p.status) + '</td><td><button data-ver="' + esc(p.id) + '">Abrir</button></td></tr>';
    }).join("") : '<tr><td colspan="7">Nenhum pedido encontrado.</td></tr>';
  }
  $("#ped-busca").addEventListener("input", pedidosTab); $("#ped-status").addEventListener("change", pedidosTab);
  $("#ped-lista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ver]"); if (!b) return;
    var p = P.pedidos().filter(function (x) { return x.id === b.getAttribute("data-ver"); })[0]; if (!p) return;
    var d = $("#dlg-ped");
    d.innerHTML = '<form method="dialog" class="x"><button aria-label="Fechar">&times;</button></form><h3>Pedido ' + esc(p.id) + " " + selo(p.status) + "</h3>" +
      "<p><strong>" + esc(p.cliente.nome) + "</strong><br>" + esc(p.cliente.email) + " · " + esc(p.cliente.tel) + "<br>" + esc(p.cliente.endereco) + ", " + esc(p.cliente.cidade) + " · CEP " + esc(p.cliente.cep) + "</p>" +
      "<ul>" + p.itens.map(function (i) { return "<li>" + i.qtd + "x " + esc(i.nome) + (i.tam ? " (tam. " + esc(i.tam) + ")" : "") + " — " + brl(i.preco * i.qtd) + "</li>"; }).join("") + "</ul>" +
      "<p>Subtotal " + brl(p.subtotal) + " · Envio (" + esc(p.frete.nome) + ") " + (p.frete.valor ? brl(p.frete.valor) : "grátis") + " · <strong>Total " + brl(p.total) + "</strong><br>Pagamento: " + forma(p) + "</p>" +
      '<form id="f-ped" class="grade2"><label>Situação<select id="pd-st">' + STATUS.map(function (s) { return '<option value="' + s + '"' + (s === p.status ? " selected" : "") + ">" + ROTULO[s] + "</option>"; }).join("") + "</select></label>" +
      '<label>Código de rastreio<input id="pd-rastreio" value="' + esc(p.rastreio || "") + '" placeholder="Ex.: BR123456789BR"></label>' +
      '<div class="acoes largo"><button class="primario" type="submit">Salvar</button></div></form>';
    d.showModal();
    $("#f-ped").addEventListener("submit", function (ev) {
      ev.preventDefault(); var l = P.pedidos(), i = l.findIndex(function (x) { return x.id === p.id; });
      l[i].status = $("#pd-st").value; l[i].rastreio = $("#pd-rastreio").value.trim();
      if (l[i].status === "pago" && l[i].pagamento) l[i].pagamento.status = "pago";
      P.salvarPedidos(l); d.close(); aviso("Pedido atualizado."); pedidosTab();
    });
  });
  $("#dlg-ped").addEventListener("click", function (e) { if (e.target === this) this.close(); });

  /* ---------- clientes (CRM) ---------- */
  function agregarClientes() {
    var m = {};
    P.pedidos().forEach(function (p) {
      var k = (p.cliente.email || p.cliente.tel).toLowerCase(), c = m[k] || (m[k] = { nome: p.cliente.nome, email: p.cliente.email, tel: p.cliente.tel, cidade: p.cliente.cidade, pedidos: 0, total: 0, ultimo: p.criado, tentativas: 0 });
      c.tentativas++; if (p.criado >= c.ultimo) { c.ultimo = p.criado; c.nome = p.cliente.nome; }
      if (P.foiPago(p)) { c.pedidos++; c.total += p.total; }
    });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.total - a.total || (a.ultimo < b.ultimo ? 1 : -1); });
  }
  function clientes() {
    var q = $("#cli-busca").value.trim().toLowerCase(), f = $("#cli-filtro").value;
    var l = agregarClientes().filter(function (c) {
      return (f === "" || (f === "comprou" ? c.pedidos > 0 : c.pedidos === 0)) && (!q || (c.nome + c.email + c.tel).toLowerCase().indexOf(q) >= 0);
    });
    $("#cli-qtd").textContent = l.length;
    $("#cli-lista").innerHTML = l.length ? l.map(function (c) {
      var wa = "https://wa.me/55" + c.tel.replace(/\D/g, "").replace(/^55/, "");
      return "<tr><td><strong>" + esc(c.nome) + "</strong><br><small>" + esc(c.cidade) + "</small></td><td>" + esc(c.email) + '<br><a href="' + wa + '" target="_blank" rel="noopener">' + esc(c.tel) + "</a></td>" +
        '<td class="num">' + c.pedidos + '</td><td class="num">' + brl(c.total) + "</td><td>" + data(c.ultimo) + "</td><td>" +
        (c.pedidos ? '<span class="selo s-pago">Comprou</span>' : '<span class="selo s-aguardandopagamento">Não finalizou</span>') + "</td></tr>";
    }).join("") : '<tr><td colspan="6">Nenhum cliente ainda.</td></tr>';
  }
  $("#cli-busca").addEventListener("input", clientes); $("#cli-filtro").addEventListener("change", clientes);
  $("#b-csv").addEventListener("click", function () {
    var linhas = [["Nome", "E-mail", "WhatsApp", "Cidade", "Pedidos pagos", "Total gasto", "Último contato"]].concat(agregarClientes().map(function (c) {
      return [c.nome, c.email, c.tel, c.cidade, c.pedidos, c.total.toFixed(2).replace(".", ","), data(c.ultimo)];
    }));
    var csv = "﻿" + linhas.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(";"); }).join("\r\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "clientes.csv"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* ---------- pagamentos ---------- */
  var GATEWAYS = [
    { id: "mercadopago", nome: "Mercado Pago", rec: true, txt: "Pix e cartão em parcelas, conta de recebimento própria e vínculo por autorização (o cliente entra na própria conta, sem passar senha pelo site). Costuma ser o mais familiar para quem compra e para quem vende." },
    { id: "pagarme", nome: "Pagar.me", txt: "Foco em lojas que querem mais controle (antifraude, split, relatórios). Cadastro mais burocrático." },
    { id: "stripe", nome: "Stripe", txt: "Excelente para desenvolvedores e boa documentação. Verificar disponibilidade e taxas de Pix para o perfil da loja." },
    { id: "pagbank", nome: "PagBank", txt: "Conhecido por maquininha e conta digital. Boa opção se a loja já usa o ecossistema." }
  ];
  function pagamentosTab() {
    var p = P.pagamento(), cfg = L.config();
    $("#gw-lista").innerHTML = GATEWAYS.map(function (g) {
      return '<label class="gw"><input type="radio" name="gw" value="' + g.id + '"' + (p.gateway === g.id ? " checked" : "") + "><span><strong>" + g.nome + "</strong>" + (g.rec ? ' <small class="rec">sugestão</small>' : "") + "<br><small>" + g.txt + "</small></span></label>";
    }).join("");
    $("#pg-titular").value = p.titular || cfg.nome || ""; $("#pg-tipo").value = p.tipoChave; $("#pg-chave").value = p.chavePix;
    $("#pg-cidade").value = p.cidade || cfg.cidade || ""; $("#pg-pix").checked = !!p.pix; $("#pg-cartao").checked = !!p.cartao; $("#pg-parc").value = p.parcelasMax;
    estadoConta(); previaPix();
  }
  function estadoConta() {
    var p = P.pagamento(), g = GATEWAYS.filter(function (x) { return x.id === p.gateway; })[0] || GATEWAYS[0];
    $("#conta-estado").innerHTML = p.conectado ? '<span class="selo s-pago">Conta vinculada</span> ' + esc(g.nome) + " · " + esc(p.titular || "titular") : '<span class="selo s-aguardandopagamento">Nenhuma conta vinculada</span>';
    $("#b-vincular").textContent = p.conectado ? "Desvincular conta" : "Vincular conta do " + g.nome + " (demonstração)";
  }
  function previaPix() {
    var chave = P.normalizaChave($("#pg-tipo").value, $("#pg-chave").value), box = $("#pix-previa");
    if (!chave) { box.innerHTML = "<p class=dica>Digite a chave Pix para ver o QR Code de teste (R$ 1,00).</p>"; return; }
    var cod = P.pixPayload(chave, $("#pg-titular").value || "LOJA", $("#pg-cidade").value || "BRASIL", 1, "TESTE"), svg = P.qrSvg(cod);
    box.innerHTML = '<div class="qr">' + (svg || "<p class=dica>QR indisponível (sem internet para carregar a biblioteca).</p>") + '</div><textarea readonly rows="3" aria-label="Pix copia e cola">' + esc(cod) + "</textarea>";
  }
  ["#pg-tipo", "#pg-chave", "#pg-titular", "#pg-cidade"].forEach(function (s) { $(s).addEventListener("input", previaPix); });
  $("#gw-lista").addEventListener("change", function (e) { if (e.target.name === "gw") { var p = P.pagamento(); p.gateway = e.target.value; L.gravar(P.K.PAG, p); estadoConta(); } });
  $("#b-vincular").addEventListener("click", function () {
    var p = P.pagamento(); p.conectado = !p.conectado; L.gravar(P.K.PAG, p); estadoConta();
    aviso(p.conectado ? "Conta vinculada (simulação). Na versão final abre o login do gateway." : "Conta desvinculada.");
  });
  $("#f-pag").addEventListener("submit", function (e) {
    e.preventDefault(); var p = P.pagamento(), gw = $('input[name="gw"]:checked');
    p.gateway = gw ? gw.value : p.gateway; p.titular = $("#pg-titular").value.trim(); p.tipoChave = $("#pg-tipo").value;
    p.chavePix = $("#pg-chave").value.trim(); p.cidade = $("#pg-cidade").value.trim(); p.pix = $("#pg-pix").checked; p.cartao = $("#pg-cartao").checked;
    p.parcelasMax = Math.min(12, Math.max(1, Number($("#pg-parc").value) || 1));
    if (p.pix && !p.chavePix) { aviso("Salvo. Sem chave Pix, o site mostra um QR de demonstração."); }
    else aviso("Pagamentos salvos.");
    L.gravar(P.K.PAG, p); estadoConta();
  });

  /* ---------- envio ---------- */
  function envioTab() {
    var e = P.envio();
    $("#en-cep").value = e.cepOrigem || ""; $("#en-gratis").value = String(e.gratisAcima).replace(".", ",");
    $("#en-lista").innerHTML = e.metodos.map(function (m, i) {
      return '<tr><td><input data-k="nome" data-i="' + i + '" value="' + esc(m.nome) + '"></td><td><input data-k="prazo" data-i="' + i + '" value="' + esc(m.prazo) + '"></td>' +
        '<td><input data-k="base" data-i="' + i + '" inputmode="decimal" value="' + String(m.base).replace(".", ",") + '" style="max-width:100px"></td>' +
        '<td><input type="checkbox" data-k="gratis" data-i="' + i + '"' + (m.gratis ? " checked" : "") + ' aria-label="Frete grátis acima do valor"></td>' +
        '<td><input type="checkbox" data-k="ativo" data-i="' + i + '"' + (m.ativo ? " checked" : "") + ' aria-label="Ativo"></td></tr>';
    }).join("");
  }
  $("#f-env").addEventListener("submit", function (ev) {
    ev.preventDefault(); var e = P.envio();
    e.cepOrigem = $("#en-cep").value.trim(); e.gratisAcima = Number(String($("#en-gratis").value).replace(/\./g, "").replace(",", ".")) || 0;
    $$("#en-lista [data-k]").forEach(function (i) {
      var m = e.metodos[Number(i.getAttribute("data-i"))], k = i.getAttribute("data-k");
      if (k === "gratis" || k === "ativo") m[k] = i.checked; else if (k === "base") m.base = Number(String(i.value).replace(",", ".")) || 0; else m[k] = i.value.trim();
    });
    L.gravar(P.K.ENV, e); aviso("Opções de envio salvas.");
  });

  /* ---------- exemplos / loja ---------- */
  $("#b-semear2").addEventListener("click", function () { var n = P.semear(); aviso(n + " pedidos de exemplo criados."); });
  $("#b-limpar-demo").addEventListener("click", function () { if (confirm("Remover só os pedidos de exemplo? Pedidos reais ficam.")) { P.limparDemo(); aviso("Pedidos de exemplo removidos."); } });

  window.Painel = { aviso: aviso, login: login };
  login();
})();
