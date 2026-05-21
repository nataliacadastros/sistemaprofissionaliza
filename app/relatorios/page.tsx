"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";

const Plot: any = dynamic(
  async () => {
    // @ts-ignore
    const mod = await import("react-plotly.js");
    return mod.default;
  },
  { ssr: false }
);

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
  if (!texto) return 0;

  const linha = String(texto).toUpperCase();

  if (!linha.includes("PAGO") && !linha.includes("PAGA")) return 0;
  if (linha.includes("FICOU DE FAZER")) return 0;

  let total = 0;

  const valores = linha.match(/R?\$\s*([\d\.,]+)/g);

  if (valores) {
    valores.forEach((v: string) => {
      const num = parseFloat(
        v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
      );
      if (!isNaN(num)) total += num;
    });
  }

  return total;
}

function tipoPagamento(txt: any) {
  const t = String(txt || "").toUpperCase();
  if (t.includes("CARTÃO") || t.includes("LINK CARTÃO")) return "CARTAO";
  if (t.includes("BOLETO")) return "BOLETO";
  return "OUTRO";
}

export default function Relatorios() {
  const [dados, setDados] = useState<any[]>([]);
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  useEffect(() => {
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
  }, []);

  const filtrado = useMemo(() => {
    return dados.filter((a) => {
      const d = parseDataBR(a["Data Matricula"]);
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

  const ativos = filtrado.filter((a) => String(a.STATUS).toUpperCase() === "ATIVO").length;
  const cancelados = filtrado.filter((a) => String(a.STATUS).toUpperCase() === "CANCELADO").length;

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
    banc: filtrado.filter((a) => String(a.Curso || "").toUpperCase().includes("BANC")).length,
    agro: filtrado.filter((a) => String(a.Curso || "").toUpperCase().includes("AGRO")).length,
    ing: filtrado.filter((a) => String(a.Curso || "").toUpperCase().includes("INGL")).length,
    tec: filtrado.filter((a) =>
      /TECNOLOGIA|INFORMÁTICA/i.test(String(a.Curso || ""))
    ).length,
  };

  const cidades = Object.entries(
    filtrado.reduce((acc: any, a) => {
      const cidade = a.Cidade || "NÃO INFORMADO";
      acc[cidade] = (acc[cidade] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  const vendedores = Object.entries(
    filtrado.reduce((acc: any, a) => {
      const v = String(a.Vendedor || "").split(" - ")[0];
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
      {/* MENU */}
      <div className="fixed top-0 left-0 z-50 flex h-[38px] w-full items-center justify-center gap-2 bg-[#edbe13]">
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
            className={`rounded-md border px-5 py-1 text-xs font-bold ${
              tab.includes("RELATÓRIOS")
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      <section className="px-8 pt-16">
        <h1 className="mb-5 text-xl font-black text-white">
          📊 RELATÓRIOS
        </h1>

        {/* FILTRO */}
        <div className="mb-6 flex gap-4">
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="p-2 text-black" />
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="p-2 text-black" />
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-4 gap-4">
          <Card title="MATRÍCULAS" value={filtrado.length} />
          <Card title="ATIVOS" value={ativos} />
          <Card title="CANCELADOS" value={cancelados} />
          <Card title="TOTAL RECEBIDO" value={formatarMoeda(totalRecebido)} />
        </div>

        {/* GRÁFICOS */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          <Plot
            data={[{ x: cidades.map(c => c[0]), y: cidades.map(c => c[1]), type: "bar" }]}
            layout={{ title: "CIDADES", paper_bgcolor: "transparent" }}
          />

          <Plot
            data={[{ x: vendedores.map(v => v[0]), y: vendedores.map(v => v[1]), type: "scatter" }]}
            layout={{ title: "VENDEDORES", paper_bgcolor: "transparent" }}
          />
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="rounded-xl bg-[#071b31] p-4 text-center shadow">
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}
