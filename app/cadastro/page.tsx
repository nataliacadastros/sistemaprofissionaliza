"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const cursos: Record<string, string> = {
  "00": "COLÉGIO COMBO",
  "1": "PREPARATÓRIO JOVEM BANCÁRIO",
  "2": "10 CURSOS PROFISSIONALIZANTES",
  "3": "PREPARATÓRIO AGRO",
  "4": "INGLÊS",
  "5": "JOVEM NO DIREITO",
  "6": "PRÉ MILITAR",
  "7": "PREPARATÓRIO ENCCEJA",
  "8": "JOVEM NA AVIAÇÃO",
  "9": "INFORMÁTICA",
  "10": "ADMINISTRAÇÃO",
  "11": "TECNOLOGIA",
};

const TEXTO_INGLES =
  "Após pagamento link cartão, avisar Natália para liberação In-glês";
const TEXTO_BONUS =
  "Caso pague via link cartão, avisar Natália para liberação curso bônus a escolha";
const TEXTO_CONFIRMACAO = "AGUARDANDO CONFIRMAÇÃO DA MATRÍCULA";

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
}

export default function CadastroPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: "",
    aluno: "",
    telResp: "",
    telAluno: "",
    cpf: "",
    cidade: "",
    curso: "",
    pagamento: "",
    vendedor: "",
    dataMatricula: "",
  });

  const [checks, setChecks] = useState({
    ingles: false,
    bonus: false,
    confirmacao: false,
  });

  function limparTextosCheckbox(pagamento: string) {
    return pagamento
      .split("|")
      .map((p) => p.trim())
      .filter(
        (p) =>
          p &&
          p !== TEXTO_INGLES &&
          p !== TEXTO_BONUS &&
          p !== TEXTO_CONFIRMACAO
      )
      .join(" | ");
  }

  function montarPagamento(base: string, novosChecks: any) {
    let partes = limparTextosCheckbox(base);

    if (novosChecks.ingles) partes += ` | ${TEXTO_INGLES}`;
    if (novosChecks.bonus) partes += ` | ${TEXTO_BONUS}`;
    if (novosChecks.confirmacao) partes += ` | ${TEXTO_CONFIRMACAO}`;

    return partes.replace(/^\s*\|\s*/, "").toUpperCase();
  }

  function alterarCheckbox(campo: string, valor: boolean) {
    const novosChecks = { ...checks, [campo]: valor };
    setChecks(novosChecks);

    setForm((prev) => ({
      ...prev,
      pagamento: montarPagamento(prev.pagamento, novosChecks),
    }));
  }

  function atualizar(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor.toUpperCase() }));
  }

  function transformarCurso() {
    const entrada = form.curso.trim();
    const match = entrada.match(/(\d+)$/);

    if (match) {
      const codigo = match[1];
      const nome = cursos[codigo];

      if (nome) {
        const base = entrada.slice(0, match.index).trim().replace(/\+$/, "").trim();

        setForm((prev) => ({
          ...prev,
          curso: base ? `${base} + ${nome}`.toUpperCase() : nome,
        }));
      }
    }
  }

  function formatarCpf() {
    const nums = form.cpf.replace(/\D/g, "");

    if (nums.length === 11) {
      setForm((prev) => ({
        ...prev,
        cpf: `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(
          6,
          9
        )}-${nums.slice(9)}`,
      }));
    }
  }

  function salvarAluno() {
    if (!form.aluno.trim()) {
      alert("Preencha pelo menos o nome do aluno.");
      return;
    }

    setLista((prev) => [
      ...prev,
      {
        ID: form.id.toUpperCase(),
        Aluno: form.aluno.toUpperCase(),
        "Tel. Resp": form.telResp,
        "Tel. Aluno": form.telAluno,
        CPF: form.cpf,
        Cidade: form.cidade.toUpperCase(),
        Curso: form.curso.toUpperCase(),
        Pagamento: form.pagamento.toUpperCase(),
        Vendedor: form.vendedor.toUpperCase(),
        "Data Matricula": form.dataMatricula,
      },
    ]);

    setForm((prev) => ({
      ...prev,
      id: "",
      aluno: "",
      telResp: "",
      telAluno: "",
      cpf: "",
      curso: "",
      pagamento: "",
    }));

    setChecks({
      ingles: false,
      bonus: false,
      confirmacao: false,
    });
  }

  function removerDaPrevia(index: number) {
    setLista((prev) => prev.filter((_, i) => i !== index));
  }

  async function enviarSupabase() {
    if (lista.length === 0) {
      alert("Nenhum aluno na lista de pré-visualização.");
      return;
    }

    const { data } = await supabase
      .from("backup alunos")
      .select("Ordem")
      .order("Ordem", { ascending: false })
      .limit(1);

    const ultimaOrdem = Number(data?.[0]?.Ordem || 0);

    const dados = lista.map((a, index) => ({
      Ordem: ultimaOrdem + index + 1,
      STATUS: "ATIVO",
      SEC: "MGA",
      TURMA: "A DEFINIR",
      "10 CURSOS?": a.Curso.includes("10 CURSOS") ? "SIM" : "NÃO",
      "INGLÊS?": a.Curso.includes("INGLÊS") ? "A DEFINIR" : "NÃO",
      "Data Cadastro": hojeBR(),
      ID: a.ID,
      Aluno: a.Aluno,
      "Tel. Resp": a["Tel. Resp"],
      "Tel. Aluno": a["Tel. Aluno"],
      CPF: a.CPF,
      Cidade: a.Cidade,
      Curso: a.Curso,
      Pagamento: a.Pagamento,
      Vendedor: a.Vendedor,
      "Data Matricula": a["Data Matricula"],
    }));

    const { error } = await supabase.from("backup alunos").insert(dados);

    if (error) {
      alert("Erro ao enviar: " + error.message);
      return;
    }

    setLista([]);
    setForm({
      id: "",
      aluno: "",
      telResp: "",
      telAluno: "",
      cpf: "",
      cidade: "",
      curso: "",
      pagamento: "",
      vendedor: "",
      dataMatricula: "",
    });
    setChecks({
      ingles: false,
      bonus: false,
      confirmacao: false,
    });

    alert("Enviado com sucesso!");
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] text-slate-200">
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
              tab.includes("CADASTRO")
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      <section className="mx-auto max-w-6xl px-8 pt-16">
        <div className="rounded-2xl border border-[#12375f] bg-[#071b31] p-8 shadow-2xl">
          <Campo label="ID:" value={form.id} onChange={(v: string) => atualizar("id", v)} />
          <Campo label="ALUNO:" value={form.aluno} onChange={(v: string) => atualizar("aluno", v)} />
          <Campo label="TEL. RESPONSÁVEL:" value={form.telResp} onChange={(v: string) => atualizar("telResp", v)} />
          <Campo label="TEL. ALUNO:" value={form.telAluno} onChange={(v: string) => atualizar("telAluno", v)} />
          <Campo label="CPF RESPONSÁVEL:" value={form.cpf} onChange={(v: string) => atualizar("cpf", v)} onBlur={formatarCpf} />
          <Campo label="CIDADE:" value={form.cidade} onChange={(v: string) => atualizar("cidade", v)} />

          <Campo
            label="CURSO CONTRATADO:"
            value={form.curso}
            onChange={(v: string) => atualizar("curso", v)}
            onBlur={transformarCurso}
            onEnter={transformarCurso}
          />

          <Campo label="FORMA DE PAGAMENTO:" value={form.pagamento} onChange={(v: string) => atualizar("pagamento", v)} />
          <Campo label="VENDEDOR:" value={form.vendedor} onChange={(v: string) => atualizar("vendedor", v)} />
          <Campo label="DATA DA MATRÍCULA:" value={form.dataMatricula} onChange={(v: string) => atualizar("dataMatricula", v)} />

          <div className="mt-5 grid grid-cols-[230px_1fr] items-center gap-4">
            <div></div>

            <div className="flex items-center justify-center gap-8">
              <Check label="LIB. IN-GLÊS" checked={checks.ingles} onChange={(v: boolean) => alterarCheckbox("ingles", v)} />
              <Check label="CURSO BÔNUS" checked={checks.bonus} onChange={(v: boolean) => alterarCheckbox("bonus", v)} />
              <Check label="CONFIRMAÇÃO" checked={checks.confirmacao} onChange={(v: boolean) => alterarCheckbox("confirmacao", v)} />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4">
            <button onClick={salvarAluno} className="rounded-md bg-cyan-400 px-6 py-3 font-black text-black">
              💾 SALVAR ALUNO
            </button>
            <button onClick={enviarSupabase} className="rounded-md bg-green-700 px-6 py-3 font-black text-white">
              📤 ENVIAR PARA O BANCO
            </button>
          </div>
        </div>

        {lista.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
            <h2 className="mb-3 text-sm font-black text-cyan-300">
              📋 PRÉ-VISUALIZAÇÃO ({lista.length} ALUNOS)
            </h2>

            <div className="overflow-auto rounded-lg border border-[#12375f]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c2743] text-cyan-300">
                  <tr>
                    {Object.keys(lista[0]).map((k) => (
                      <th key={k} className="whitespace-nowrap p-2">
                        {k}
                      </th>
                    ))}
                    <th className="p-2 text-center">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {lista.map((a, i) => (
                    <tr key={i} className="border-t border-[#12375f]">
                      {Object.values(a).map((v: any, j) => (
                        <td key={j} className="whitespace-nowrap p-2">
                          {v}
                        </td>
                      ))}

                      <td className="p-2 text-center">
                        <button
                          onClick={() => removerDaPrevia(i)}
                          className="rounded bg-red-900 px-2 py-1 text-[10px] font-bold text-red-200"
                        >
                          REMOVER
                        </button>
                      </td>
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

function Campo({ label, value, onChange, onBlur, onEnter }: any) {
  return (
    <div className="mb-3 grid grid-cols-[230px_1fr] items-center gap-4">
      <label className="text-right text-sm font-black text-cyan-300">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        className="rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-cyan-400"
      />
    </div>
  );
}

function Check({ label, checked, onChange }: any) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-black text-green-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}