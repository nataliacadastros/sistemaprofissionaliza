"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";

function converterDataBR(data?: string) {
  if (!data) return 0;
  const partes = String(data).split("/");
  if (partes.length !== 3) return 0;
  const [dia, mes, ano] = partes;
  return new Date(`${ano}-${mes}-${dia}`).getTime();
}

function isoParaBR(dataISO: string) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function ordenarAlunos(a: any, b: any) {
  const ordemA = Number(a["Ordem"] || 0);
  const ordemB = Number(b["Ordem"] || 0);
  if (ordemA !== ordemB) return ordemB - ordemA;

  const dataA = converterDataBR(a["Data Cadastro"]);
  const dataB = converterDataBR(b["Data Cadastro"]);
  if (dataA !== dataB) return dataB - dataA;

  return Number(b["ID"] || 0) - Number(a["ID"] || 0);
}

export default function GerenciamentoPage() {
  const router = useRouter();

  const [carregandoLogin, setCarregandoLogin] = useState(true);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarDownload, setMostrarDownload] = useState(false);
  const [dataDownload, setDataDownload] = useState("");
  const [cidadeDownload, setCidadeDownload] = useState("TODAS");
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false);

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

      setAlunos(todos.filter((a) => a.ID && a.Aluno));
    }

    buscarTodosAlunos();
  }, [carregandoLogin]);

  const filtrados = useMemo(() => {
    const termo = pesquisa.toLowerCase();

    return alunos
      .filter((a) => {
        const excluido = a.Excluido === true;

        if (mostrarExcluidos) {
          if (!excluido) return false;
        } else {
          if (excluido) return false;
        }

        if (!termo) return true;

        return Object.values(a).some((v) =>
          String(v || "").toLowerCase().includes(termo)
        );
      })
      .sort(ordenarAlunos);
  }, [alunos, pesquisa, mostrarExcluidos]);

  const cidadesDisponiveis = useMemo(() => {
    if (!dataDownload) return [];

    const dataBR = isoParaBR(dataDownload);

    return Array.from(
      new Set(
        alunos
          .filter((a) => a["Data Cadastro"] === dataBR)
          .map((a) => a.Cidade)
          .filter(Boolean)
      )
    ).sort();
  }, [alunos, dataDownload]);

  function baixarAlunosPorData() {
    if (!dataDownload) return alert("Selecione uma data.");

    const dataBR = isoParaBR(dataDownload);

    let lista = alunos.filter(
      (a) =>
        a["Data Cadastro"] === dataBR &&
        a.Excluido !== true
    );

    if (cidadeDownload !== "TODAS") {
      lista = lista.filter((a) => a.Cidade === cidadeDownload);
    }

    lista = lista.sort(ordenarAlunos).reverse();

    const colunas = Object.keys(lista[0]).filter(
      (c) => c !== "Ordem"
    );

    const linhas = lista.map((a) =>
      colunas.map((c) => String(a[c] ?? ""))
    );

    const ws = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);

    // TECNOLOGIA vermelho
    lista.forEach((aluno, i) => {
      if (String(aluno.Curso).includes("TECNOLOGIA")) {
        const linha = i + 2;
        const col = colunas.indexOf("Curso");

        const cel = XLSX.utils.encode_cell({ r: linha - 1, c: col });

        if (ws[cel]) {
          ws[cel].s = {
            font: { color: { rgb: "FF0000" }, bold: true },
          };
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alunos");

    XLSX.writeFile(
      wb,
      `ALUNOS_${dataBR}_${cidadeDownload}.xlsx`
    );
  }

  if (carregandoLogin) return <div>Carregando...</div>;

  return (
    <main>
      <button onClick={() => setMostrarDownload(!mostrarDownload)}>
        Baixar alunos
      </button>

      {mostrarDownload && (
        <>
          <input
            type="date"
            value={dataDownload}
            onChange={(e) => {
              setDataDownload(e.target.value);
              setCidadeDownload("TODAS");
            }}
          />

          <select
            value={cidadeDownload}
            onChange={(e) => setCidadeDownload(e.target.value)}
          >
            <option value="TODAS">Todas</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <button onClick={baixarAlunosPorData}>
            BAIXAR
          </button>
        </>
      )}

      {/* SUA TABELA CONTINUA IGUAL */}
    </main>
  );
}
