"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx-js-style";

function formatarTelefone(valor: any) {
  if (valor === null || valor === undefined)
    return "-";

  let texto = String(valor).trim();

  if (
    !texto ||
    texto.toLowerCase() === "null"
  ) {
    return "-";
  }

  if (/e\+/i.test(texto)) {
    const numero = Number(
      texto.replace(",", ".")
    );

    if (!Number.isNaN(numero)) {
      texto = numero.toFixed(0);
    }
  }

  return texto;
}

function capitalizarNome(nome: string) {
  return String(nome || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      (p) =>
        p.charAt(0).toUpperCase() +
        p.slice(1)
    )
    .join(" ");
}

export default function BaixarPersonalizadoPage() {
  const router = useRouter();

  const [ids, setIds] = useState("");

  const [carregando, setCarregando] =
    useState(false);

  useEffect(() => {
    async function verificarLogin() {
      const { data } =
        await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
      }
    }

    verificarLogin();
  }, [router]);

  async function baixarInformacoes() {
    const idsLista = ids
      .split("\n")
      .map((id) => id.trim())
      .filter(Boolean);

    if (idsLista.length === 0) {
      alert("Informe os IDs.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase
      .from("backup alunos")
      .select("*")
      .in("ID", idsLista);

    setCarregando(false);

    if (error) {
      alert(
        "Erro ao buscar alunos."
      );

      console.error(error);

      return;
    }

    if (!data || data.length === 0) {
      alert(
        "Nenhum aluno encontrado."
      );

      return;
    }

    const dados = idsLista
      .map((id) =>
        data.find(
          (a) =>
            String(a["ID"]) ===
            String(id)
        )
      )
      .filter(Boolean)
      .map((a: any) => {
        const rawStatus = String(a["Status"] || a["STATUS"] || "").trim();
        const statusTratado = rawStatus.toUpperCase() === "CANCELADO" ? "INATIVO" : (rawStatus || "-");

        return {
          ID: a["ID"] || "",

          "NOME COMPLETO":
            capitalizarNome(
              a["Aluno"] || ""
            ),

          "STATUS": statusTratado,

          "TELEFONE RESPONSÁVEL":
            formatarTelefone(
              a["Tel. Resp"]
            ),

          "TELEFONE ALUNO":
            formatarTelefone(
              a["Tel. Aluno"]
            ),
        };
      });

    const ws =
      XLSX.utils.json_to_sheet(dados);

    // Largura das colunas na ordem exata: ID, NOME COMPLETO, STATUS, TEL. RESPONSÁVEL, TEL. ALUNO
    ws["!cols"] = [
      { wch: 15 },
      { wch: 45 },
      { wch: 18 },
      { wch: 25 },
      { wch: 25 },
    ];

    Object.keys(dados[0]).forEach(
      (_, index) => {
        const cell =
          XLSX.utils.encode_col(index) + "1";

        if (ws[cell]) {
          ws[cell].s = {
            font: {
              bold: true,
              color: {
                rgb: "FFFFFF",
              },
            },

            fill: {
              fgColor: {
                rgb: "0C2743",
              },
            },

            alignment: {
              horizontal: "center",
            },
          };
        }
      }
    );

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Alunos"
    );

    XLSX.writeFile(
      wb,
      "ALUNOS_PERSONALIZADO.xlsx"
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] p-6 text-white">

      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center justify-between">

          <h1 className="text-2xl font-black text-cyan-300">
            BAIXAR PERSONALIZADO
          </h1>

          <button
            onClick={() =>
              router.push(
                "/gerenciamento"
              )
            }
            className="rounded-md bg-cyan-500 px-4 py-2 text-xs font-black text-black"
          >
            VOLTAR
          </button>

        </div>

        <div className="rounded-2xl border border-[#12375f] bg-[#071b31] p-6 shadow-2xl">

          <div className="mb-3 text-xs font-black uppercase text-cyan-300">
            Cole os IDs abaixo
          </div>

          <textarea
            value={ids}
            onChange={(e) =>
              setIds(e.target.value)
            }
            placeholder={`221808\n221809\n221810`}
            className="min-h-[350px] w-full rounded-md border border-[#1f5b91] bg-white p-4 text-sm font-bold text-black outline-none"
          />

          <button
            onClick={
              baixarInformacoes
            }
            disabled={carregando}
            className="mt-4 w-full rounded-md bg-green-700 px-4 py-3 text-sm font-black text-white hover:bg-green-600 disabled:opacity-50"
          >
            {carregando
              ? "GERANDO PLANILHA..."
              : "BAIXAR INFORMAÇÕES"}
          </button>

        </div>

      </div>

    </main>
  );
}
