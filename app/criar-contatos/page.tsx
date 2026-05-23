"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function dataBRparaISO(data?: string) {
  if (!data) return "";
  const partes = String(data).trim().split("/");
  if (partes.length !== 3) return "";
  const [dia, mes, ano] = partes;
  return `${ano}-${mes}-${dia}`;
}

function isoParaBR(dataISO: string) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function limparTelefone(valor: any) {
  return String(valor || "").replace(/\D/g, "");
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const cabecalho = ["Nome", ",", "Telefone"];

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.join(";"))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + conteudo], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = nomeArquivo;
  a.click();

  URL.revokeObjectURL(url);
}

export default function CriarContatosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any[]>([]);
  const [dataAtual, setDataAtual] = useState("");
  const [datas, setDatas] = useState<string[]>([]);
  const [cidadesSel, setCidadesSel] = useState<string[]>([]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      let todos: any[] = [];
      let inicio = 0;

      while (true) {
        const { data } = await supabase
          .from("backup alunos")
          .select("*")
          .range(inicio, inicio + 999);

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < 1000) break;
        inicio += 1000;
      }

      setDados(
        todos.filter(
          (a) => a["ID"] && a["Aluno"] && a["Excluido"] !== true
        )
      );

      setLoading(false);
    }

    init();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function adicionarData() {
    if (!dataAtual) return;

    if (!datas.includes(dataAtual)) {
      setDatas((prev) => [...prev, dataAtual]);
    }

    setDataAtual("");
    setCidadesSel([]);
  }

  function removerData(data: string) {
    setDatas((prev) => prev.filter((d) => d !== data));
  }

  // 🔥 ORDENAÇÃO POR ORDEM (CRESCENTE)
  const filtrados = useMemo(() => {
    return dados
      .filter((a) =>
        datas.includes(dataBRparaISO(a["Data Cadastro"]))
      )
      .sort((a, b) => {
        const ordemA = Number(a["Ordem"] ?? 999999);
        const ordemB = Number(b["Ordem"] ?? 999999);
        return ordemA - ordemB;
      });
  }, [dados, datas]);

  const cidades = useMemo(() => {
    return Array.from(
      new Set(filtrados.map((a) => a["Cidade"]).filter(Boolean))
    ).sort();
  }, [filtrados]);

  const preview = useMemo(() => {
    if (cidadesSel.length === 0) return filtrados;

    return filtrados.filter((a) =>
      cidadesSel.includes(a["Cidade"])
    );
  }, [filtrados, cidadesSel]);

  const linhas = useMemo(() => {
    const arr: string[][] = [];

    preview.forEach((a) => {
      const nome = `${a["ID"]} ${a["Aluno"]}`.toUpperCase();

      const resp = limparTelefone(a["Tel. Resp"]);
      const aluno = limparTelefone(a["Tel. Aluno"]);

      if (resp) arr.push([nome, ",", resp]);
      if (aluno) arr.push([nome, ",", aluno]);
    });

    return arr;
  }, [preview]);

  function toggleCidade(cidade: string) {
    setCidadesSel((prev) =>
      prev.includes(cidade)
        ? prev.filter((c) => c !== cidade)
        : [...prev, cidade]
    );
  }

  function baixar() {
    if (!linhas.length) return;
    baixarCSV("contatos.csv", linhas);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0e1e] text-cyan-300">
        VERIFICANDO LOGIN...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* MENU */}
      <div className="fixed left-0 top-0 z-50 flex h-[58px] w-full items-center gap-2 overflow-x-auto bg-[#edbe13] px-2 md:h-[38px] md:justify-center">
        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/gerenciamento"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
          ["📇 CRIAR CONTATOS", "/criar-contatos"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`shrink-0 rounded-md border px-5 py-2 text-xs font-bold ${
              tab.includes("CRIAR CONTATOS")
                ? "border-cyan-300 bg-cyan-300 text-black"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}

        <button
          onClick={sair}
          className="rounded-md bg-red-600 px-4 py-2 text-white font-bold"
        >
          SAIR
        </button>
      </div>

      {/* CONTEÚDO */}
      <section className="px-6 pt-24">

        <h1 className="text-xl font-black mb-4">📇 CRIAR CONTATOS</h1>

        <div className="bg-[#071b31] p-5 rounded-xl border border-[#12375f]">

          <div className="flex gap-2 mb-4">
            <input
              type="date"
              value={dataAtual}
              onChange={(e) => setDataAtual(e.target.value)}
              className="px-3 py-2 text-black"
            />

            <button
              onClick={adicionarData}
              className="bg-cyan-400 px-4 py-2 font-bold"
            >
              ADICIONAR
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {datas.map((d) => (
              <button
                key={d}
                onClick={() => removerData(d)}
                className="bg-[#0b2542] px-3 py-1 rounded"
              >
                {isoParaBR(d)} ✕
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCidadesSel([])}
              className="bg-cyan-300 px-3 py-1 rounded text-black"
            >
              Todas
            </button>

            {cidades.map((c) => (
              <button
                key={c}
                onClick={() => toggleCidade(c)}
                className={`px-3 py-1 rounded ${
                  cidadesSel.includes(c)
                    ? "bg-cyan-400 text-black"
                    : "bg-[#0b2542]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-4 mb-4 text-sm">
            <div>Alunos: {preview.length}</div>
            <div>Linhas CSV: {linhas.length}</div>
          </div>

          <button
            onClick={baixar}
            className="w-full bg-green-700 py-3 font-black"
          >
            📥 BAIXAR CSV
          </button>

        </div>

      </section>
    </main>
  );
}
