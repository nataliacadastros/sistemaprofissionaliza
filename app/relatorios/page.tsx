"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const Plot: any = dynamic(
  async () => {
    // @ts-ignore
    const mod = await import("react-plotly.js");
    return mod.default;
  },
  { ssr: false }
);

function pegarDataMatricula(a: any) {
  return (
    a["Data Matrícula"] ||
    a["Data Matricula"] ||
    a["Data Matr�cula"] ||
    ""
  );
}

function parseDataBR(data?: string) {
  if (!data) return null;
  const partes = String(data).split("/");
  if (partes.length !== 3) return null;
  const [d, m, a] = partes;
  return new Date(`${a}-${m}-${d}T00:00:00`);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calcularTotalPagoReal(texto: any) {
  if (!texto || String(texto).trim() === "") return 0;

  const linha = String(texto).toUpperCase();

  if (!linha.includes("PAGO") && !linha.includes("PAGA")) return 0;
  if (linha.includes("FICOU DE FAZER")) return 0;

  let total = 0;

  function parseValor(v: string) {
    return Number(v.replace(/\./g, "").replace(",", "."));
  }

  const cartaoTotal = [
    ...linha.matchAll(/(?:CARTÃO|LINK CARTÃO).*?PAGO\s*R?\$?\s*([\d\.,]+)/g),
  ];
  const valoresCartao: number[] = [];

  cartaoTotal.forEach((m) => {
    const valor = parseValor(m[1]);
    if (!isNaN(valor)) {
      total += valor;
      valoresCartao.push(valor);
    }
  });

  const cartaoParcelado = [
    ...linha.matchAll(/(?:CARTÃO|LINK CARTÃO).*?PAGO\s+(\d+)\s*X\s*([\d\.,]+)/g),
  ];

  cartaoParcelado.forEach((m) => {
    const qtd = Number(m[1]);
    const valor = parseValor(m[2]);
    if (!isNaN(qtd) && !isNaN(valor)) total += qtd * valor;
  });

  const primeira = [
    ...linha.matchAll(/PAGO\s+PRIMEIRA\s+PARCELA\s*R?\$?\s*([\d\.,]+)/g),
  ];

  primeira.forEach((m) => {
    const valor = parseValor(m[1]);
    if (!isNaN(valor)) total += valor;
  });

  const pagoAvulso = [
    ...linha.matchAll(/PAGO(?:\s+A\s+VISTA|\s+VIA\s+PIX|\s+DINHEIRO|\s+DÉBITO)?\s*R?\$?\s*([\d\.,]+)/g),
  ];

  pagoAvulso.forEach((m) => {
    const valor = parseValor(m[1]);
    if (!isNaN(valor) && !valoresCartao.includes(valor)) total += valor;
  });

  const taxa = [...linha.matchAll(/TAXA\s*R?\$?\s*([\d\.,]+).*?PAGA/g)];

  taxa.forEach((m) => {
    const valor = parseValor(m[1]);
    if (!isNaN(valor)) total += valor;
  });

  return total;
}

function tipoPagamento(txt: any) {
  const t = String(txt || "").toUpperCase();
  if (t.includes("CARTÃO") || t.includes("LINK CARTÃO")) return "CARTAO";
  if (t.includes("BOLETO")) return "BOLETO";
  return "OUTRO";
}

export default function Relatorios() {
  const router = useRouter();
  const [carregandoLogin, setCarregandoLogin] = useState(true);

  const [dados, setDados] = useState<any[]>([]);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  useEffect(() => {
    async function verificarLogin() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setCarregandoLogin(false);
    }

    verificarLogin();
  }, [router]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    if (carregandoLogin) return;

    const hoje = new Date();
    const seteDias = new Date();
    seteDias.setDate(hoje.getDate() - 7);

    setInicio(seteDias.toISOString().slice(0, 10));
    setFim(hoje.toISOString().slice(0, 10));

    async function buscar() {
      let todos: any[] = [];
      let i = 0;

      while (true) {
        const { data } = await supabase
          .from("backup alunos")
          .select("*")
          .range(i, i + 999);

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < 1000) break;
        i += 1000;
      }

      setDados(todos);
    }

    buscar();
  }, [carregandoLogin]);

  const filtrado = useMemo(() => {
    return dados.filter((a) => {
      const d = parseDataBR(pegarDataMatricula(a));
      if (!d) return false;

      if (inicio && d < new Date(`${inicio}T00:00:00`)) return false;
      if (fim && d > new Date(`${fim}T23:59:59`)) return false;

      return true;
    });
  }, [dados, inicio, fim]);

  const totalRecebido = filtrado.reduce(
    (acc, a) => acc + calcularTotalPagoReal(a.Pagamento),
    0
  );

  const ativos = filtrado.filter(
    (a) => String(a.STATUS).toUpperCase() === "ATIVO"
  ).length;

  const cancelados = filtrado.filter(
    (a) => String(a.STATUS).toUpperCase() === "CANCELADO"
  ).length;

  const tickets = filtrado.map((a) => ({
    valor: calcularTotalPagoReal(a.Pagamento),
    tipo: tipoPagamento(a.Pagamento),
  }));

  const media = (arr: any[]) => {
    const validos = arr.filter((x) => x.valor > 0);
    if (validos.length === 0) return 0;
    return validos.reduce((s, x) => s + x.valor, 0) / validos.length;
  };

  const tmGeral = media(tickets);
  const tmBoleto = media(tickets.filter((t) => t.tipo === "BOLETO"));
  const tmCartao = media(tickets.filter((t) => t.tipo === "CARTAO"));

  const porArea = {
    banc: filtrado.filter((a) =>
      String(a.Curso || "").toUpperCase().includes("BANCÁRIO")
    ).length,
    agro: filtrado.filter((a) =>
      String(a.Curso || "").toUpperCase().includes("AGRO")
    ).length,
    ing: filtrado.filter((a) =>
      String(a.Curso || "").toUpperCase().includes("INGLÊS")
    ).length,
    tec: filtrado.filter((a) =>
      /TECNOLOGIA|INFORMÁTICA/i.test(String(a.Curso || ""))
    ).length,
  };

  const cidades = Object.entries(
    filtrado.reduce((acc: any, a) => {
      const cidade = a.Cidade || "NÃO INFORMADO";
      acc[cidade] = acc[cidade] || { qtd: 0, vendedores: new Set() };
      acc[cidade].qtd += 1;
      acc[cidade].vendedores.add(String(a.Vendedor || "").split(" - ")[0]);
      return acc;
    }, {})
  )
    .map(([cidade, info]: any) => ({
      cidade,
      qtd: info.qtd,
      vendedores: Array.from(info.vendedores).filter(Boolean).join(", "),
    }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  const vendedores = Object.entries(
    filtrado.reduce((acc: any, a) => {
      const v = String(a.Vendedor || "NÃO INFORMADO").split(" - ")[0].trim();
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  const plotLayoutBase = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#e0e0e0" },
    margin: { t: 50, b: 50, l: 40, r: 20 },
  };

  if (carregandoLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        <div className="font-black">VERIFICANDO LOGIN...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2 md:h-[38px] md:justify-center">
        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/gerenciamento"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`shrink-0 rounded-md border px-5 py-2 text-xs font-bold md:py-1 ${
              tab.includes("RELATÓRIOS")
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}

        <button
          onClick={sair}
          className="shrink-0 rounded-md border border-red-700 bg-red-600 px-5 py-2 text-xs font-black text-white md:py-1"
        >
          SAIR
        </button>
      </div>

      <section className="px-4 pt-20 md:px-8 md:pt-16">
        <h1 className="mb-5 text-xl font-black text-white">
          📊 Como os contratos chegaram para nós neste período
        </h1>

        <div className="mb-6 rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">
          <div className="mb-2 text-xs font-black uppercase text-cyan-300">
            Filtrar Período — Data de Matrícula
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-sm font-bold text-black outline-none"
            />
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-sm font-bold text-black outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card cor="pink" title="MATRÍCULAS" value={filtrado.length} />
          <Card cor="green" title="ATIVOS" value={ativos} />
          <Card cor="red" title="CANCELADOS" value={cancelados} />
          <Card cor="blue" title="TOTAL RECEBIDO" value={formatarMoeda(totalRecebido)} />
          <Card
            cor="purple"
            title="TICKET MÉDIO"
            value={
              <>
                GERAL: {formatarMoeda(tmGeral)} <br />
                BOL: {formatarMoeda(tmBoleto)} <br />
                CAR: {formatarMoeda(tmCartao)}
              </>
            }
          />
          <Card
            cor="blue"
            title="POR ÁREA"
            value={
              <>
                BANC: {porArea.banc} | AGRO: {porArea.agro}
                <br />
                INGL: {porArea.ing} | TECN: {porArea.tec}
              </>
            }
          />
        </div>

        <div className="mt-5 rounded-xl border border-[#12375f] bg-[#071b31] p-3 shadow-2xl">
          <Plot
            data={[
              {
                y: ["STATUS"],
                x: [ativos],
                type: "bar",
                orientation: "h",
                marker: { color: "#2ecc71" },
                text: [`ATIVOS: ${ativos}`],
                textposition: "inside",
              },
              {
                y: ["STATUS"],
                x: [cancelados],
                type: "bar",
                orientation: "h",
                marker: { color: "#ff4b4b" },
                text: [`CANCELADOS: ${cancelados}`],
                textposition: "inside",
              },
            ]}
            layout={{
              barmode: "stack",
              showlegend: false,
              height: 70,
              margin: { t: 5, b: 5, l: 10, r: 10 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
              xaxis: { visible: false },
              yaxis: { visible: false },
              font: { color: "#e0e0e0" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%" }}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">
            <h2 className="mb-2 text-center text-sm font-black text-cyan-300">
              📍 CIDADES E VENDEDORES
            </h2>

            <Plot
              data={[
                {
                  x: cidades.map((c) => c.cidade),
                  y: cidades.map((c) => c.qtd),
                  type: "bar",
                  marker: { color: "#00f2ff" },
                  text: cidades.map((c) => `${c.qtd}<br>${c.vendedores}`),
                  textposition: "outside",
                },
              ]}
              layout={{
                ...plotLayoutBase,
                height: 430,
                xaxis: { showgrid: false },
                yaxis: { showgrid: false, showticklabels: false },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%" }}
            />
          </div>

          <div className="rounded-xl border border-[#12375f] bg-[#071b31] p-4 shadow-2xl">
            <h2 className="mb-2 text-center text-sm font-black text-purple-400">
              ⚡ PERFORMANCE DE VENDAS
            </h2>

            <Plot
              data={[
                {
                  x: vendedores.map((v: any) => v[0]),
                  y: vendedores.map((v: any) => v[1]),
                  type: "scatter",
                  mode: "lines+markers+text",
                  text: vendedores.map((v: any) => v[1]),
                  textposition: "top center",
                  line: { color: "#bc13fe", width: 4, shape: "spline" },
                  marker: {
                    size: 12,
                    color: "#ffffff",
                    line: { color: "#bc13fe", width: 3 },
                  },
                  fill: "tozeroy",
                  fillcolor: "rgba(188, 19, 254, 0.2)",
                },
              ]}
              layout={{
                ...plotLayoutBase,
                height: 430,
                xaxis: { showgrid: false },
                yaxis: {
                  showgrid: true,
                  gridcolor: "rgba(255,255,255,0.05)",
                  showticklabels: false,
                },
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value, cor }: any) {
  const cores: any = {
    pink: "border-pink-500 shadow-pink-500/30 text-pink-300",
    green: "border-green-500 shadow-green-500/30 text-green-300",
    red: "border-red-500 shadow-red-500/30 text-red-300",
    blue: "border-cyan-400 shadow-cyan-400/30 text-cyan-300",
    purple: "border-purple-500 shadow-purple-500/30 text-purple-300",
  };

  return (
    <div
      className={`min-h-[115px] rounded-xl border bg-[#071b31] p-4 text-center shadow-2xl ${cores[cor]}`}
    >
      <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {title}
      </div>

      <div className="text-xl font-black text-slate-100">{value}</div>
    </div>
  );
}
