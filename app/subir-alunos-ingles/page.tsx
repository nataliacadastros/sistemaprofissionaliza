"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function dataBRparaISO(data?: string) {
  if (!data) return "";
  const partes = String(data).split("/");
  if (partes.length !== 3) return "";
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

function limparValor(valor: any) {
  if (valor === null || valor === undefined) return "";
  if (String(valor).toLowerCase() === "null") return "";
  return String(valor);
}

function pegarCPF(a: any) {
  return limparValor(a["CPF"]);
}

function baixarCSV(nomeArquivo: string, linhas: any[]) {
  if (linhas.length === 0) return;

  const headers = Object.keys(linhas[0]);

  const escapar = (valor: any) => {
    const texto = limparValor(valor).replace(/"/g, '""');
    return `"${texto}"`;
  };

  const csv =
    headers.map(escapar).join(";") +
    "\r\n" +
    linhas.map((linha) => headers.map((h) => escapar(linha[h])).join(";")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SubirAlunosInglesPage() {
  const [dados, setDados] = useState<any[]>([]);
  const [turmaIngles, setTurmaIngles] = useState("");
  const [dataFiltro, setDataFiltro] = useState(hojeISO());

  useEffect(() => {
    const turmaSalva = localStorage.getItem("turma_ingles_importacao");
    if (turmaSalva) setTurmaIngles(turmaSalva);

    async function buscar() {
      let todos: any[] = [];
      let inicio = 0;
      const tamanho = 1000;

      while (true) {
        const { data } = await supabase
          .from("backup alunos")
          .select("*")
          .range(inicio, inicio + tamanho - 1);

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < tamanho) break;

        inicio += tamanho;
      }

      setDados(todos);
    }

    buscar();
  }, []);

  function alterarTurma(valor: string) {
    const final = valor.toUpperCase();
    setTurmaIngles(final);
    localStorage.setItem("turma_ingles_importacao", final);
  }

  const alunosIngles = useMemo(() => {
    return dados.filter((a) => {
      const dataCadastro = dataBRparaISO(a["Data Cadastro"]);
      const curso = String(a.Curso || "").toUpperCase();

      return dataCadastro === dataFiltro && curso.includes("INGLÊS");
    });
  }, [dados, dataFiltro]);

  const dadosExcel = useMemo(() => {
    return alunosIngles.map((a) => {
      const nomeCompleto = limparValor(a.Aluno).trim();
      const partes = nomeCompleto.split(/\s+/, 2);

      const primeiroNome = partes[0]?.toUpperCase() || "";
      const sobrenome = nomeCompleto
        .replace(partes[0] || "", "")
        .trim()
        .toUpperCase();

      const userId = limparValor(a.ID).trim();

      return {
        username: userId,
        email: `${userId}@profissionalizaead.com.br`,
        firstname: primeiroNome,
        lastname: sobrenome,
        profile_field_telresp: limparValor(a["Tel. Resp"]),
        profile_field_telaluno: limparValor(a["Tel. Aluno"]),
        profile_field_CPF: pegarCPF(a),
        city: limparValor(a.Cidade).toUpperCase(),
        password: "futuro",
        course1: turmaIngles,
        profile_field_tipopg: "CARTÃO",
        profile_field_secretaria: "MGA",
      };
    });
  }, [alunosIngles, turmaIngles]);

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
      <div className="fixed left-0 top-0 z-50 flex h-[38px] w-full items-center justify-center gap-2 bg-[#edbe13]">
        {[
          ["📑 CADASTRO", "/cadastro"],
          ["🖥️ GERENCIAMENTO", "/"],
          ["📊 RELATÓRIOS", "/relatorios"],
          ["📤 SUBIR ALUNOS", "/subir-alunos"],
          ["📤 SUBIR ALUNOS DE INGLÊS", "/subir-alunos-ingles"],
        ].map(([tab, href]) => (
          <a
            key={tab}
            href={href}
            className={`rounded-md border px-5 py-1 text-xs font-bold ${
              tab.includes("INGLÊS")
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      <section className="px-8 pt-16">
        <h1 className="mb-5 text-xl font-black text-white">
          🇬🇧 SUBIR ALUNOS DE INGLÊS
        </h1>

        <div className="rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
          <Campo
            label="Turma de Inglês:"
            value={turmaIngles}
            placeholder="Ex: ING32"
            onChange={alterarTurma}
          />

          <Campo
            label="Filtrar Cadastro:"
            value={dataFiltro}
            type="date"
            onChange={setDataFiltro}
          />

          <div className="mt-4 rounded-md border border-cyan-900 bg-[#0b1f36] p-3 text-sm font-bold text-cyan-300">
            Total de alunos com INGLÊS nesta data: {alunosIngles.length}
          </div>
        </div>

        {dadosExcel.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">
              Pré-visualização
            </h2>

            <div className="overflow-auto rounded-lg border border-[#12375f]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c2743] text-cyan-300">
                  <tr>
                    {Object.keys(dadosExcel[0]).map((k) => (
                      <th key={k} className="whitespace-nowrap p-2">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dadosExcel.map((linha, i) => (
                    <tr key={i} className="border-t border-[#12375f]">
                      {Object.values(linha).map((v: any, j) => (
                        <td key={j} className="whitespace-nowrap p-2">
                          {limparValor(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                const [ano, mes, dia] = dataFiltro.split("-");
                baixarCSV(
                  `ALUNOS_INGLES_${dia}-${mes}-${ano}.csv`,
                  dadosExcel
                );
              }}
              className="mt-5 w-full rounded-md bg-green-700 px-6 py-3 text-sm font-black text-white hover:bg-green-600"
            >
              📥 BAIXAR PLANILHA DE ALUNOS DE INGLÊS
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: any) {
  return (
    <div className="mb-3 grid grid-cols-[230px_1fr] items-center gap-4">
      <label className="text-right text-sm font-black text-cyan-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-sm font-bold text-black outline-none"
      />
    </div>
  );
}
