"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function dataBRparaISO(data?: string) {
  if (!data) return "";

  const limpa = String(data).trim();
  const partes = limpa.split("/");

  if (partes.length !== 3) return "";

  const [dia, mes, ano] = partes;
  return `${ano}-${mes}-${dia}`;
}

function isoParaBR(dataISO: string) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function limparValor(valor: any) {
  if (valor === null || valor === undefined) return "";
  if (String(valor).toLowerCase() === "null") return "";
  return String(valor);
}

function limparTelefone(valor: any) {
  return limparValor(valor).replace(/\D/g, "");
}

function montarNomeArquivo(datasSelecionadas: string[], cidadesSelecionadas: string[]) {
  const datasBR = datasSelecionadas.map((data) => isoParaBR(data).replaceAll("/", "-"));

  const parteData =
    datasBR.length === 1 ? datasBR[0] : datasBR.join("_");

  const parteCidade =
    cidadesSelecionadas.length === 0
      ? "TODAS_AS_CIDADES"
      : cidadesSelecionadas.join("_").replace(/[\\/:*?"<>|]/g, "-");

  return `Contatos dia ${parteData} ${parteCidade}.csv`;
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const cabecalho = ["Nome", ",", "Telefone"];

  const conteudo = [cabecalho, ...linhas]
    .map((linha) =>
      linha
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(",")
    )
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

function ordenarAlunos(a: any, b: any) {
  const ordemA = Number(a["Ordem"] || 0);
  const ordemB = Number(b["Ordem"] || 0);

  if (ordemA !== ordemB) return ordemA - ordemB;

  const idA = Number(a["ID"] || 0);
  const idB = Number(b["ID"] || 0);

  return idA - idB;
}

export default function CriarContatosPage() {
  const router = useRouter();

  const [carregandoLogin, setCarregandoLogin] = useState(true);
  const [dados, setDados] = useState<any[]>([]);
  const [dataAtual, setDataAtual] = useState("");
  const [datasSelecionadas, setDatasSelecionadas] = useState<string[]>([]);
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);

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

  useEffect(() => {
    if (carregandoLogin) return;

    async function buscarTodosAlunos() {
      let todos: any[] = [];
      let inicio = 0;
      const tamanho = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("backup alunos")
          .select("*")
          .range(inicio, inicio + tamanho - 1);

        if (error) {
          console.error("Erro Supabase:", error);
          break;
        }

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < tamanho) break;

        inicio += tamanho;
      }

      setDados(
        todos
          .filter((aluno) => aluno["ID"] && aluno["Aluno"] && aluno["Excluido"] !== true)
          .sort(ordenarAlunos)
      );
    }

    buscarTodosAlunos();
  }, [carregandoLogin]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function adicionarData() {
    if (!dataAtual) {
      alert("Selecione uma data.");
      return;
    }

    if (datasSelecionadas.includes(dataAtual)) {
      alert("Essa data já foi adicionada.");
      return;
    }

    setDatasSelecionadas((prev) => [...prev, dataAtual].sort());
    setDataAtual("");
    setCidadesSelecionadas([]);
  }

  function removerData(data: string) {
    setDatasSelecionadas((prev) => prev.filter((item) => item !== data));
    setCidadesSelecionadas([]);
  }

  function limparDatas() {
    setDatasSelecionadas([]);
    setCidadesSelecionadas([]);
  }

  const alunosFiltradosPorData = useMemo(() => {
    if (datasSelecionadas.length === 0) return [];

    return dados.filter((aluno) =>
      datasSelecionadas.includes(dataBRparaISO(aluno["Data Cadastro"]))
    );
  }, [dados, datasSelecionadas]);

  const cidadesDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        alunosFiltradosPorData
          .map((aluno) => limparValor(aluno["Cidade"]).toUpperCase())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [alunosFiltradosPorData]);

  const alunosPreview = useMemo(() => {
    let lista = alunosFiltradosPorData;

    if (cidadesSelecionadas.length > 0) {
      lista = lista.filter((aluno) =>
        cidadesSelecionadas.includes(limparValor(aluno["Cidade"]).toUpperCase())
      );
    }

    return [...lista].sort(ordenarAlunos);
  }, [alunosFiltradosPorData, cidadesSelecionadas]);

  const linhasContatos = useMemo(() => {
    const linhas: string[][] = [];

    alunosPreview.forEach((aluno) => {
      const id = limparValor(aluno["ID"]).trim();
      const nome = limparValor(aluno["Aluno"]).trim();
      const nomeFinal = `${id} ${nome}`.trim().toUpperCase();

      const telefoneResponsavel = limparTelefone(aluno["Tel. Resp"]);
      const telefoneAluno = limparTelefone(aluno["Tel. Aluno"]);

      if (telefoneResponsavel) {
        linhas.push([nomeFinal, ",", telefoneResponsavel]);
      }

      if (telefoneAluno) {
        linhas.push([nomeFinal, ",", telefoneAluno]);
      }
    });

    return linhas;
  }, [alunosPreview]);

  function toggleCidade(cidade: string) {
    setCidadesSelecionadas((prev) =>
      prev.includes(cidade)
        ? prev.filter((item) => item !== cidade)
        : [...prev, cidade]
    );
  }

  function selecionarTodasCidades() {
    setCidadesSelecionadas(cidadesDisponiveis);
  }

  function limparCidades() {
    setCidadesSelecionadas([]);
  }

  function baixarPlanilha() {
    if (datasSelecionadas.length === 0) {
      alert("Selecione pelo menos uma data.");
      return;
    }

    if (linhasContatos.length === 0) {
      alert("Nenhum contato encontrado para baixar.");
      return;
    }

    baixarCSV(
      montarNomeArquivo(datasSelecionadas, cidadesSelecionadas),
      linhasContatos
    );
  }

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
          ["📇 CRIAR CONTATOS", "/criar-contatos"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`shrink-0 rounded-md border px-5 py-2 text-xs font-bold md:py-1 ${
              tab.includes("CRIAR CONTATOS")
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
        <div className="mb-5 flex flex-col gap-2">
          <h1 className="text-xl font-black text-white">📇 CRIAR CONTATOS</h1>

          <p className="text-xs font-bold text-cyan-300">
            Gere uma planilha CSV com duas linhas por aluno: telefone do responsável e telefone do aluno.
          </p>
        </div>

        <div className="rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
          <div className="mb-2 text-xs font-black uppercase text-cyan-300">
            Selecionar data(s) de cadastro
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="date"
              value={dataAtual}
              onChange={(e) => setDataAtual(e.target.value)}
              className="rounded-md border border-[#1f5b91] bg-white px-4 py-2 text-sm font-bold text-black outline-none focus:border-cyan-400"
            />

            <button
              onClick={adicionarData}
              className="rounded-md bg-cyan-400 px-5 py-2 text-xs font-black text-black hover:bg-cyan-300"
            >
              ADICIONAR DATA
            </button>

            <button
              onClick={limparDatas}
              className="rounded-md border border-cyan-800 px-5 py-2 text-xs font-black text-cyan-100 hover:bg-[#0b2542]"
            >
              LIMPAR DATAS
            </button>
          </div>

          {datasSelecionadas.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-black uppercase text-slate-400">
                Datas selecionadas
              </div>

              <div className="flex flex-wrap gap-2">
                {datasSelecionadas.map((data) => (
                  <button
                    key={data}
                    onClick={() => removerData(data)}
                    title="Clique para remover"
                    className="rounded-md border border-cyan-700 bg-[#0b1f36] px-3 py-2 text-xs font-bold text-cyan-100 hover:border-red-500 hover:bg-red-950 hover:text-red-200"
                  >
                    {isoParaBR(data)} ✕
                  </button>
                ))}
              </div>
            </div>
          )}

          {cidadesDisponiveis.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-black uppercase text-cyan-300">
                Cidades
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={limparCidades}
                  className={`rounded-md border px-3 py-2 text-xs font-bold ${
                    cidadesSelecionadas.length === 0
                      ? "border-cyan-300 bg-cyan-300 text-black"
                      : "border-[#1f5b91] bg-[#0b1f36] text-cyan-100"
                  }`}
                >
                  Todas as cidades
                </button>

                <button
                  onClick={selecionarTodasCidades}
                  className="rounded-md border border-[#1f5b91] bg-[#0b1f36] px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-[#0b2542]"
                >
                  Selecionar todas
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {cidadesDisponiveis.map((cidade) => (
                  <button
                    key={cidade}
                    onClick={() => toggleCidade(cidade)}
                    className={`rounded-md border px-3 py-2 text-xs font-bold ${
                      cidadesSelecionadas.includes(cidade)
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-[#1f5b91] bg-[#0b1f36] text-cyan-100"
                    }`}
                  >
                    {cidade}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-cyan-900 bg-[#0b1f36] p-3">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Alunos encontrados
              </div>
              <div className="mt-1 text-xl font-black text-cyan-300">
                {alunosPreview.length}
              </div>
            </div>

            <div className="rounded-md border border-cyan-900 bg-[#0b1f36] p-3">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Linhas no CSV
              </div>
              <div className="mt-1 text-xl font-black text-cyan-300">
                {linhasContatos.length}
              </div>
            </div>

            <div className="rounded-md border border-cyan-900 bg-[#0b1f36] p-3">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Cidades selecionadas
              </div>
              <div className="mt-1 text-xl font-black text-cyan-300">
                {cidadesSelecionadas.length === 0
                  ? "Todas"
                  : cidadesSelecionadas.length}
              </div>
            </div>
          </div>

          <button
            onClick={baixarPlanilha}
            className="mt-5 w-full rounded-md bg-green-700 px-6 py-3 text-sm font-black text-white hover:bg-green-600"
          >
            📥 BAIXAR PLANILHA CSV
          </button>
        </div>

        {alunosPreview.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">
              Pré-visualização dos alunos
            </h2>

            <div className="overflow-x-auto rounded-lg border border-[#12375f]">
              <table className="min-w-[900px] w-full text-left text-xs">
                <thead className="bg-[#0c2743] text-cyan-300">
                  <tr>
                    <th className="p-2">Data cadastro</th>
                    <th className="p-2">ID</th>
                    <th className="p-2">Aluno</th>
                    <th className="p-2">Cidade</th>
                    <th className="p-2">Tel. responsável</th>
                    <th className="p-2">Tel. aluno</th>
                  </tr>
                </thead>

                <tbody>
                  {alunosPreview.map((aluno) => (
                    <tr key={aluno["ID"]} className="border-t border-[#12375f]">
                      <td className="whitespace-nowrap p-2">
                        {aluno["Data Cadastro"] || "-"}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        {aluno["ID"] || "-"}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        {aluno["Aluno"] || "-"}
                      </td>
                      <td className="whitespace-nowrap p-2 text-cyan-300">
                        {aluno["Cidade"] || "-"}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        {aluno["Tel. Resp"] || "-"}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        {aluno["Tel. Aluno"] || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mb-4 mt-6 text-sm font-black text-cyan-300">
              Pré-visualização do CSV
            </h2>

            <div className="overflow-x-auto rounded-lg border border-[#12375f]">
              <table className="min-w-[700px] w-full text-left text-xs">
                <thead className="bg-[#0c2743] text-cyan-300">
                  <tr>
                    <th className="p-2">Nome</th>
                    <th className="p-2">,</th>
                    <th className="p-2">Telefone</th>
                  </tr>
                </thead>

                <tbody>
                  {linhasContatos.map((linha, index) => (
                    <tr key={index} className="border-t border-[#12375f]">
                      <td className="whitespace-nowrap p-2">{linha[0]}</td>
                      <td className="whitespace-nowrap p-2">{linha[1]}</td>
                      <td className="whitespace-nowrap p-2">{linha[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
