"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

const CAMPOS = [
  ["STATUS", "Status"],
  ["ID", "ID"],
  ["Aluno", "Aluno"],
  ["SEC", "SEC"],
  ["TURMA", "Turma"],
  ["Cidade", "Cidade"],
  ["Curso", "Curso"],
  ["Pagamento", "Pagamento"],
  ["Vendedor", "Vendedor"],
  ["Tel. Resp", "Telefone responsável"],
  ["Tel. Aluno", "Telefone aluno"],
  ["CPF", "CPF"],
  ["Data Cadastro", "Data cadastro"],
  ["Data Matricula", "Data matrícula"],
  ["10 CURSOS?", "10 Cursos?"],
];

export default function AlunoPage() {
  const { id } = useParams();
  const router = useRouter();
  const alunoId = Array.isArray(id) ? id[0] : id;

  const [aluno, setAluno] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [recuperando, setRecuperando] = useState(false);

  const [undo, setUndo] = useState<any[]>([]);
  const [redo, setRedo] = useState<any[]>([]);
  const [inicioEdicao, setInicioEdicao] = useState<any>({});

  const [novaObs, setNovaObs] = useState("");
  const [historicoObs, setHistoricoObs] = useState<any[]>([]);
  const [historicoAlt, setHistoricoAlt] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("backup alunos")
        .select("*")
        .eq("ID", alunoId)
        .single();

      setAluno(data);
      setOriginal(data);

      carregarObservacoes();
      carregarAlteracoes();
    }

    if (alunoId) carregar();
  }, [alunoId]);

  async function carregarObservacoes() {
    const { data } = await supabase
      .from("historico_observacoes")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("criado_em", { ascending: false });

    setHistoricoObs(data || []);
  }

  async function carregarAlteracoes() {
    const { data } = await supabase
      .from("historico_alteracoes")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("criado_em", { ascending: false });

    setHistoricoAlt(data || []);
  }

  function alterar(campo: string, valor: string) {
    setAluno((prev: any) => ({ ...prev, [campo]: valor }));
  }

  function iniciarEdicao(campo: string) {
    setInicioEdicao((prev: any) => ({
      ...prev,
      [campo]: aluno?.[campo] || "",
    }));
  }

  function finalizarEdicao(campo: string, label: string) {
    const antigo = inicioEdicao[campo] || "";
    const novo = aluno?.[campo] || "";

    if (antigo !== novo) {
      setUndo((prev) => [
        ...prev,
        {
          campo,
          label,
          antigo,
          novo,
          quando: new Date().toLocaleString("pt-BR"),
        },
      ]);
      setRedo([]);
    }
  }

  function desfazer() {
    const ultima = undo[undo.length - 1];
    if (!ultima) return;

    setAluno((prev: any) => ({ ...prev, [ultima.campo]: ultima.antigo }));
    setUndo((prev) => prev.slice(0, -1));
    setRedo((prev) => [...prev, ultima]);
  }

  function refazer() {
    const ultima = redo[redo.length - 1];
    if (!ultima) return;

    setAluno((prev: any) => ({ ...prev, [ultima.campo]: ultima.novo }));
    setRedo((prev) => prev.slice(0, -1));
    setUndo((prev) => [...prev, ultima]);
  }

  async function salvar() {
    setSalvando(true);

    const update: any = {};
    const alteracoes: any[] = [];

    CAMPOS.forEach(([campo, label]) => {
      const antigo = original?.[campo] || "";
      const novo = aluno?.[campo] || "";

      update[campo] = novo;

      if (antigo !== novo) {
        alteracoes.push({
          aluno_id: alunoId,
          campo: label,
          valor_antigo: antigo,
          valor_novo: novo,
        });
      }
    });

    const { error } = await supabase
      .from("backup alunos")
      .update(update)
      .eq("ID", alunoId);

    if (!error && alteracoes.length > 0) {
      await supabase.from("historico_alteracoes").insert(alteracoes);
    }

    setSalvando(false);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    setOriginal(aluno);
    await carregarAlteracoes();

    alert("Alterações salvas com sucesso!");
  }

  async function excluirAluno() {
    const confirmar = confirm(
      "Tem certeza que deseja excluir este aluno do gerenciamento? Ele poderá ser recuperado depois."
    );

    if (!confirmar) return;

    setExcluindo(true);

    const { error } = await supabase
      .from("backup alunos")
      .update({
        Excluido: true,
        Excluido_em: new Date().toISOString(),
      })
      .eq("ID", alunoId);

    if (!error) {
      await supabase.from("historico_alteracoes").insert({
        aluno_id: alunoId,
        campo: "Exclusão",
        valor_antigo: "Aluno ativo no gerenciamento",
        valor_novo: "Aluno excluído do gerenciamento",
      });
    }

    setExcluindo(false);

    if (error) {
      alert("Erro ao excluir aluno: " + error.message);
      return;
    }

    alert("Aluno excluído do gerenciamento.");
    router.push("/");
  }

  async function recuperarAluno() {
    const confirmar = confirm("Deseja recuperar este aluno para o gerenciamento?");

    if (!confirmar) return;

    setRecuperando(true);

    const { error } = await supabase
      .from("backup alunos")
      .update({
        Excluido: false,
        Excluido_em: null,
      })
      .eq("ID", alunoId);

    if (!error) {
      await supabase.from("historico_alteracoes").insert({
        aluno_id: alunoId,
        campo: "Recuperação",
        valor_antigo: "Aluno excluído do gerenciamento",
        valor_novo: "Aluno ativo no gerenciamento",
      });
    }

    setRecuperando(false);

    if (error) {
      alert("Erro ao recuperar aluno: " + error.message);
      return;
    }

    setAluno((prev: any) => ({
      ...prev,
      Excluido: false,
      Excluido_em: null,
    }));

    await carregarAlteracoes();

    alert("Aluno recuperado com sucesso!");
  }

  async function salvarObservacao() {
    if (!novaObs.trim()) return;

    const { error } = await supabase.from("historico_observacoes").insert({
      aluno_id: alunoId,
      observacao: novaObs,
    });

    if (error) {
      alert("Erro ao salvar observação.");
      return;
    }

    setNovaObs("");
    carregarObservacoes();
  }

  if (!aluno) {
    return (
      <main className="min-h-screen bg-[#0b0e1e] p-8 text-white">
        Carregando perfil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] px-8 py-6 text-slate-200">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="rounded-md border border-cyan-800 px-4 py-2 text-xs font-bold text-cyan-100"
        >
          ⬅ VOLTAR
        </button>

        <div className="flex gap-3">
          <BotaoHistorico
            texto="↶ DESFAZER"
            onClick={desfazer}
            listaLocal={undo.slice(-5).reverse()}
            listaSalva={historicoAlt.slice(0, 5)}
            disabled={undo.length === 0}
          />

          <BotaoHistorico
            texto="↷ REFAZER"
            onClick={refazer}
            listaLocal={redo.slice(-5).reverse()}
            listaSalva={historicoAlt.slice(0, 5)}
            disabled={redo.length === 0}
          />

          <button
            onClick={salvar}
            disabled={salvando || aluno.Excluido}
            className="rounded-md bg-cyan-400 px-6 py-2 text-xs font-black text-black disabled:opacity-60"
          >
            {salvando ? "SALVANDO..." : "💾 SALVAR ALTERAÇÕES"}
          </button>
        </div>
      </div>

      {aluno.Excluido && (
        <div className="mb-5 rounded-xl border border-red-800 bg-red-950/40 p-4">
          <div className="text-sm font-black text-red-300">
            Este aluno está excluído do gerenciamento.
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Ele não deve aparecer na listagem principal, mas pode ser recuperado.
          </div>

          <button
            onClick={recuperarAluno}
            disabled={recuperando}
            className="mt-3 rounded-md bg-emerald-600 px-5 py-2 text-xs font-black text-white disabled:opacity-60"
          >
            {recuperando ? "RECUPERANDO..." : "♻ RECUPERAR ALUNO"}
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-[#1e3354] bg-[#0f1b2d] p-6 shadow-2xl">
        <div className="mb-6 rounded-xl border border-[#21395c] bg-[#162842] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">{aluno.Aluno}</h1>
              <p className="mt-2 text-sm font-bold text-emerald-300">
                {aluno.Curso || "SEM CURSO INFORMADO"}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-400">
                ID: {aluno.ID} • Cidade: {aluno.Cidade || "-"}
              </p>
            </div>

            {!aluno.Excluido && (
              <button
                onClick={excluirAluno}
                disabled={excluindo}
                className="rounded-md bg-red-700 px-5 py-2 text-xs font-black text-white disabled:opacity-60"
              >
                {excluindo ? "EXCLUINDO..." : "🗑 EXCLUIR ALUNO"}
              </button>
            )}
          </div>
        </div>

        <h3 className="mb-3 text-xs font-black uppercase text-slate-300">
          Dados principais
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {CAMPOS.map(([campo, label]) => (
            <Campo
              key={campo}
              label={label}
              value={aluno[campo]}
              disabled={aluno.Excluido}
              onChange={(v: string) => alterar(campo, v)}
              onFocus={() => iniciarEdicao(campo)}
              onBlur={() => finalizarEdicao(campo, label)}
            />
          ))}
        </div>

        <h3 className="mb-3 mt-6 text-xs font-black uppercase text-slate-300">
          Nova observação
        </h3>

        <textarea
          value={novaObs}
          onChange={(e) => setNovaObs(e.target.value)}
          rows={4}
          disabled={aluno.Excluido}
          className="w-full rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-sm font-bold text-black outline-none disabled:opacity-60"
        />

        <button
          onClick={salvarObservacao}
          disabled={aluno.Excluido}
          className="mt-3 rounded-md bg-green-700 px-5 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          SALVAR OBSERVAÇÃO
        </button>

        <h3 className="mb-3 mt-8 text-xs font-black uppercase text-slate-300">
          Histórico de observações
        </h3>

        <div className="space-y-2">
          {historicoObs.map((obs) => (
            <div
              key={obs.id}
              className="rounded-lg border border-[#12375f] bg-[#071b31] p-3"
            >
              <div className="mb-1 text-[10px] font-bold text-cyan-300">
                {new Date(obs.criado_em).toLocaleString("pt-BR")}
              </div>
              <div className="text-sm text-slate-100">{obs.observacao}</div>
            </div>
          ))}
        </div>

        <h3 className="mb-3 mt-8 text-xs font-black uppercase text-slate-300">
          Histórico de alterações salvas
        </h3>

        <div className="space-y-2">
          {historicoAlt.map((alt) => (
            <div
              key={alt.id}
              className="rounded-lg border border-[#12375f] bg-[#071b31] p-3"
            >
              <div className="mb-1 text-[10px] font-bold text-cyan-300">
                {new Date(alt.criado_em).toLocaleString("pt-BR")}
              </div>
              <div className="text-sm">
                <b>{alt.campo}</b>:{" "}
                <span className="text-red-300">{alt.valor_antigo || "-"}</span>{" "}
                →{" "}
                <span className="text-green-300">{alt.valor_novo || "-"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Campo({ label, value, onChange, onFocus, onBlur, disabled }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase text-cyan-300">
        {label}
      </span>
      <input
        value={value || ""}
        disabled={disabled}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#1f5b91] bg-white px-3 py-2 text-xs font-bold text-black outline-none disabled:opacity-60"
      />
    </label>
  );
}

function BotaoHistorico({
  texto,
  onClick,
  listaLocal,
  listaSalva,
  disabled,
}: any) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className="rounded-md border border-cyan-800 px-4 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40"
      >
        {texto}
      </button>

      <div className="pointer-events-none absolute right-0 top-10 z-50 hidden w-96 rounded-lg border border-[#12375f] bg-[#071b31] p-3 text-xs shadow-2xl group-hover:block">
        <div className="mb-2 font-black text-cyan-300">Alterações locais</div>

        {listaLocal.length === 0 ? (
          <div className="mb-3 text-slate-400">Nenhuma alteração local</div>
        ) : (
          listaLocal.map((item: any, index: number) => (
            <div key={index} className="mb-2 border-b border-[#12375f] pb-2">
              <div className="font-bold text-white">{item.label}</div>
              <div className="text-red-300">Antes: {item.antigo || "-"}</div>
              <div className="text-green-300">Depois: {item.novo || "-"}</div>
            </div>
          ))
        )}

        <div className="mb-2 mt-3 font-black text-cyan-300">
          Últimas alterações salvas
        </div>

        {listaSalva.length === 0 ? (
          <div className="text-slate-400">Nenhuma alteração salva</div>
        ) : (
          listaSalva.map((item: any, index: number) => (
            <div key={index} className="mb-2 border-b border-[#12375f] pb-2">
              <div className="font-bold text-white">{item.campo}</div>
              <div className="text-red-300">
                Antes: {item.valor_antigo || "-"}
              </div>
              <div className="text-green-300">
                Depois: {item.valor_novo || "-"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
