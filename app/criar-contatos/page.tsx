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

function montarNomeArquivo(datas: string[], cidades: string[]) {
  const datasBR = datas.map((d) =>
    isoParaBR(d).replaceAll("/", "-")
  );

  const parteData =
    datasBR.length === 1 ? datasBR[0] : datasBR.join("_");

  const parteCidade =
    cidades.length === 0
      ? "TODAS_AS_CIDADES"
      : cidades.join("_");

  return `Contatos dia ${parteData} ${parteCidade}.csv`;
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const cabecalho = ["Nome", ",", "Telefone"];

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.join(";")) // 🔥 padrão correto
    .join("\r\n");

  const blob = new Blob([conteudo], {
    type: "text/csv;charset=windows-1252;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = nomeArquivo;
  a.click();

  URL.revokeObjectURL(url);
}

function ordenar(a: any, b: any) {
  return Number(a["ID"] || 0) - Number(b["ID"] || 0);
}

export default function CriarContatosPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
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
          (a) =>
            a["ID"] && a["Aluno"] && a["Excluido"] !== true
        )
      );

      setCarregando(false);
    }

    init();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function addData() {
    if (!dataAtual) return;

    if (!datas.includes(dataAtual)) {
      setDatas((prev) => [...prev, dataAtual]);
    }

    setDataAtual("");
    setCidadesSel([]);
  }

  const filtrados = useMemo(() => {
    return dados.filter((a) =>
      datas.includes(dataBRparaISO(a["Data Cadastro"]))
    );
  }, [dados, datas]);

  const cidades = useMemo(() => {
    return Array.from(
      new Set(
        filtrados
          .map((a) => limparValor(a["Cidade"]))
          .filter(Boolean)
      )
    );
  }, [filtrados]);

  const preview = useMemo(() => {
    let lista = filtrados;

    if (cidadesSel.length > 0) {
      lista = lista.filter((a) =>
        cidadesSel.includes(a["Cidade"])
      );
    }

    return lista.sort(ordenar);
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

  function baixar() {
    if (linhas.length === 0) return;
    baixarCSV(montarNomeArquivo(datas, cidadesSel), linhas);
  }

  if (carregando) return <div>Carregando...</div>;

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">

      {/* MENU */}
      <div className="fixed top-0 w-full bg-[#edbe13] flex gap-2 p-2 z-50">
        <a href="/cadastro">CADASTRO</a>
        <a href="/gerenciamento">GERENCIAMENTO</a>
        <a href="/relatorios">RELATÓRIOS</a>
        <a href="/subir-alunos">SUBIR</a>
        <a href="/subir-alunos-ingles">INGLÊS</a>
        <a href="/criar-contatos">CONTATOS</a>

        <button onClick={sair}>SAIR</button>
      </div>

      <section className="pt-20 p-4">

        <h1>CRIAR CONTATOS</h1>

        <input
          type="date"
          value={dataAtual}
          onChange={(e) => setDataAtual(e.target.value)}
        />

        <button onClick={addData}>Adicionar</button>

        <div>
          {datas.map((d) => (
            <span key={d}>{isoParaBR(d)} </span>
          ))}
        </div>

        <div>
          {cidades.map((c) => (
            <button
              key={c}
              onClick={() =>
                setCidadesSel((prev) =>
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

        <div>
          <h3>Preview CSV</h3>
          {linhas.map((l, i) => (
            <div key={i}>
              {l[0]} | {l[1]} | {l[2]}
            </div>
          ))}
        </div>

      </section>
    </main>
  );
}
