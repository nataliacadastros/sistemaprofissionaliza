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
  if (!valor) return "";
  return String(valor);
}

function limparTelefone(valor: any) {
  return limparValor(valor).replace(/\D/g, "");
}

function montarNomeArquivo(datas: string[]) {
  if (datas.length === 1) {
    return `Contatos dia ${isoParaBR(datas[0]).replaceAll("/", "-")}.csv`;
  }
  return `Contatos dia VARIOS.csv`;
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const cabecalho = ["Nome", ",", "Telefone"];

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.join(";")) // 🔥 SEM ASPAS
    .join("\r\n");

  const blob = new Blob([conteudo], {
    type: "text/csv;charset=windows-1252;", // 🔥 padrão Excel BR
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

    async function buscar() {
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

      setDados(todos.filter((a) => a["Excluido"] !== true));
    }

    buscar();
  }, [carregandoLogin]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function adicionarData() {
    if (!dataAtual) return;

    if (!datasSelecionadas.includes(dataAtual)) {
      setDatasSelecionadas((prev) => [...prev, dataAtual]);
    }

    setDataAtual("");
  }

  const alunosFiltrados = useMemo(() => {
    return dados.filter((a) =>
      datasSelecionadas.includes(
        dataBRparaISO(a["Data Cadastro"] || "")
      )
    );
  }, [dados, datasSelecionadas]);

  const cidadesDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        alunosFiltrados.map((a) => a["Cidade"]).filter(Boolean)
      )
    );
  }, [alunosFiltrados]);

  const alunosPreview = useMemo(() => {
    let lista = alunosFiltrados;

    if (cidadesSelecionadas.length > 0) {
      lista = lista.filter((a) =>
        cidadesSelecionadas.includes(a["Cidade"])
      );
    }

    return lista;
  }, [alunosFiltrados, cidadesSelecionadas]);

  const linhas = useMemo(() => {
    const result: string[][] = [];

    alunosPreview.forEach((a) => {
      const nome = `${a["ID"]} ${a["Aluno"]}`.toUpperCase();

      const telResp = limparTelefone(a["Tel. Resp"]);
      const telAluno = limparTelefone(a["Tel. Aluno"]);

      if (telResp) result.push([nome, ",", telResp]);
      if (telAluno) result.push([nome, ",", telAluno]);
    });

    return result;
  }, [alunosPreview]);

  function baixar() {
    if (linhas.length === 0) return;
    baixarCSV(montarNomeArquivo(datasSelecionadas), linhas);
  }

  if (carregandoLogin) return <div>Carregando...</div>;

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-white">

      <button onClick={sair}>SAIR</button>

      <input
        type="date"
        value={dataAtual}
        onChange={(e) => setDataAtual(e.target.value)}
      />

      <button onClick={adicionarData}>Adicionar data</button>

      <div>
        {datasSelecionadas.map((d) => (
          <span key={d}>{isoParaBR(d)}</span>
        ))}
      </div>

      <div>
        {cidadesDisponiveis.map((c) => (
          <button
            key={c}
            onClick={() =>
              setCidadesSelecionadas((prev) =>
                prev.includes(c)
                  ? prev.filter((x) => x !== c)
                  : [...prev, c]
              )
            }
          >
            {c}
          </button>
        ))}
      </div>

      <button onClick={baixar}>BAIXAR CSV</button>

    </main>
  );
}
