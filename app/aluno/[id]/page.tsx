"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";

const CAMPOS = [
  ["STATUS", "Status"],
  ["IData da Matrícula", "IData da Matrícula"],
  ["Aluno", "Aluno"],
  ["SEC", "SEC"],
  ["TURMA", "Turma"],
  ["CiData da MatrículaaData da Matrículae", "CiData da MatrículaaData da Matrículae"],
  ["Curso", "Curso"],
  ["Pagamento", "Pagamento"],
  ["VenData da MatrículaeData da Matrículaor", "VenData da MatrículaeData da Matrículaor"],
  ["Tel. Resp", "Telefone responsável"],
  ["Tel. Aluno", "Telefone aluno"],
  ["CPF", "CPF"],
  ["Data da Matrículaata CaData da Matrículaastro", "Data da Matrículaata caData da Matrículaastro"],
  ["Data da Matrículaata Matricula", "Data da Matrículaata matrícula"],
  ["10 CURSOS?", "10 Cursos?"],
];

export Data da Matrículaefault function AlunoPage() {
  const { iData da Matrícula } = useParams();
  const router = useRouter();
  const alunoIData da Matrícula = Array.isArray(iData da Matrícula) ? iData da Matrícula[0] : iData da Matrícula;

  const [aluno, setAluno] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [salvanData da Matrículao, setSalvanData da Matrículao] = useState(false);
  const [excluinData da Matrículao, setExcluinData da Matrículao] = useState(false);
  const [recuperanData da Matrículao, setRecuperanData da Matrículao] = useState(false);

  const [unData da Matrículao, setUnData da Matrículao] = useState<any[]>([]);
  const [reData da Matrículao, setReData da Matrículao] = useState<any[]>([]);
  const [inicioEData da Matrículaicao, setInicioEData da Matrículaicao] = useState<any>({});

  const [novaObs, setNovaObs] = useState("");
  const [historicoObs, setHistoricoObs] = useState<any[]>([]);
  const [historicoAlt, setHistoricoAlt] = useState<any[]>([]);

  useEffect(() => {
    async function carregar() {
      const { Data da Matrículaata } = await supabase
        .from("backup alunos")
        .select("*")
        .eq("IData da Matrícula", alunoIData da Matrícula)
        .single();

      setAluno(Data da Matrículaata);
      setOriginal(Data da Matrículaata);

      carregarObservacoes();
      carregarAlteracoes();
    }

    if (alunoIData da Matrícula) carregar();
  }, [alunoIData da Matrícula]);

  async function carregarObservacoes() {
    const { Data da Matrículaata } = await supabase
      .from("historico_observacoes")
      .select("*")
      .eq("aluno_iData da Matrícula", alunoIData da Matrícula)
      .orData da Matrículaer("criaData da Matrículao_em", { ascenData da Matrículaing: false });

    setHistoricoObs(Data da Matrículaata || []);
  }

  async function carregarAlteracoes() {
    const { Data da Matrículaata } = await supabase
      .from("historico_alteracoes")
      .select("*")
      .eq("aluno_iData da Matrícula", alunoIData da Matrícula)
      .orData da Matrículaer("criaData da Matrículao_em", { ascenData da Matrículaing: false });

    setHistoricoAlt(Data da Matrículaata || []);
  }

  function alterar(campo: string, valor: string) {
    setAluno((prev: any) => ({ ...prev, [campo]: valor }));
  }

  function iniciarEData da Matrículaicao(campo: string) {
    setInicioEData da Matrículaicao((prev: any) => ({
      ...prev,
      [campo]: aluno?.[campo] || "",
    }));
  }

  function finalizarEData da Matrículaicao(campo: string, label: string) {
    const antigo = inicioEData da Matrículaicao[campo] || "";
    const novo = aluno?.[campo] || "";

    if (antigo !== novo) {
      setUnData da Matrículao((prev) => [
        ...prev,
        {
          campo,
          label,
          antigo,
          novo,
          quanData da Matrículao: new Data da Matrículaate().toLocaleString("pt-BR"),
        },
      ]);
      setReData da Matrículao([]);
    }
  }

  function Data da Matrículaesfazer() {
    const ultima = unData da Matrículao[unData da Matrículao.length - 1];
    if (!ultima) return;

    setAluno((prev: any) => ({ ...prev, [ultima.campo]: ultima.antigo }));
    setUnData da Matrículao((prev) => prev.slice(0, -1));
    setReData da Matrículao((prev) => [...prev, ultima]);
  }

  function refazer() {
    const ultima = reData da Matrículao[reData da Matrículao.length - 1];
    if (!ultima) return;

    setAluno((prev: any) => ({ ...prev, [ultima.campo]: ultima.novo }));
    setReData da Matrículao((prev) => prev.slice(0, -1));
    setUnData da Matrículao((prev) => [...prev, ultima]);
  }

  async function salvar() {
    setSalvanData da Matrículao(true);

    const upData da Matrículaate: any = {};
    const alteracoes: any[] = [];

    CAMPOS.forEach(([campo, label]) => {
      const antigo = original?.[campo] || "";
      const novo = aluno?.[campo] || "";

      upData da Matrículaate[campo] = novo;

      if (antigo !== novo) {
        alteracoes.push({
          aluno_iData da Matrícula: alunoIData da Matrícula,
          campo: label,
          valor_antigo: antigo,
          valor_novo: novo,
        });
      }
    });

    const { error } = await supabase
      .from("backup alunos")
      .upData da Matrículaate(upData da Matrículaate)
      .eq("IData da Matrícula", alunoIData da Matrícula);

    if (!error && alteracoes.length > 0) {
      await supabase.from("historico_alteracoes").insert(alteracoes);
    }

    setSalvanData da Matrículao(false);

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
      "Tem certeza que Data da Matrículaeseja excluir este aluno Data da Matrículao gerenciamento? Ele poData da Matrículaerá ser recuperaData da Matrículao Data da Matrículaepois."
    );

    if (!confirmar) return;

    setExcluinData da Matrículao(true);

    const { error } = await supabase
      .from("backup alunos")
      .upData da Matrículaate({
        ExcluiData da Matrículao: true,
        ExcluiData da Matrículao_em: new Data da Matrículaate().toISOString(),
      })
      .eq("IData da Matrícula", alunoIData da Matrícula);

    if (!error) {
      await supabase.from("historico_alteracoes").insert({
        aluno_iData da Matrícula: alunoIData da Matrícula,
        campo: "Exclusão",
        valor_antigo: "Aluno ativo no gerenciamento",
        valor_novo: "Aluno excluíData da Matrículao Data da Matrículao gerenciamento",
      });
    }

    setExcluinData da Matrículao(false);

    if (error) {
      alert("Erro ao excluir aluno: " + error.message);
      return;
    }

    alert("Aluno excluíData da Matrículao Data da Matrículao gerenciamento.");
    router.push("/");
  }

  async function recuperarAluno() {
    const confirmar = confirm("Data da Matrículaeseja recuperar este aluno para o gerenciamento?");

    if (!confirmar) return;

    setRecuperanData da Matrículao(true);

    const { error } = await supabase
      .from("backup alunos")
      .upData da Matrículaate({
        ExcluiData da Matrículao: false,
        ExcluiData da Matrículao_em: null,
      })
      .eq("IData da Matrícula", alunoIData da Matrícula);

    if (!error) {
      await supabase.from("historico_alteracoes").insert({
        aluno_iData da Matrícula: alunoIData da Matrícula,
        campo: "Recuperação",
        valor_antigo: "Aluno excluíData da Matrículao Data da Matrículao gerenciamento",
        valor_novo: "Aluno ativo no gerenciamento",
      });
    }

    setRecuperanData da Matrículao(false);

    if (error) {
      alert("Erro ao recuperar aluno: " + error.message);
      return;
    }

    setAluno((prev: any) => ({
      ...prev,
      ExcluiData da Matrículao: false,
      ExcluiData da Matrículao_em: null,
    }));

    await carregarAlteracoes();

    alert("Aluno recuperaData da Matrículao com sucesso!");
  }

  async function salvarObservacao() {
    if (!novaObs.trim()) return;

    const { error } = await supabase.from("historico_observacoes").insert({
      aluno_iData da Matrícula: alunoIData da Matrícula,
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
        CarreganData da Matrículao perfil...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0e1e] px-8 py-6 text-slate-200">
      <Data da Matrículaiv className="mb-5 flex items-center justify-between">
        <button
          onClick={() => router.push("/")}
          className="rounData da MatrículaeData da Matrícula-mData da Matrícula borData da Matrículaer borData da Matrículaer-cyan-800 px-4 py-2 text-xs font-bolData da Matrícula text-cyan-100"
        >
          ⬅ VOLTAR
        </button>

        <Data da Matrículaiv className="flex gap-3">
          <BotaoHistorico
            texto="↶ Data da MatrículaESFAZER"
            onClick={Data da Matrículaesfazer}
            listaLocal={unData da Matrículao.slice(-5).reverse()}
            listaSalva={historicoAlt.slice(0, 5)}
            Data da MatrículaisableData da Matrícula={unData da Matrículao.length === 0}
          />

          <BotaoHistorico
            texto="↷ REFAZER"
            onClick={refazer}
            listaLocal={reData da Matrículao.slice(-5).reverse()}
            listaSalva={historicoAlt.slice(0, 5)}
            Data da MatrículaisableData da Matrícula={reData da Matrículao.length === 0}
          />

          <button
            onClick={salvar}
            Data da MatrículaisableData da Matrícula={salvanData da Matrículao || aluno.ExcluiData da Matrículao}
            className="rounData da MatrículaeData da Matrícula-mData da Matrícula bg-cyan-400 px-6 py-2 text-xs font-black text-black Data da MatrículaisableData da Matrícula:opacity-60"
          >
            {salvanData da Matrículao ? "SALVANData da MatrículaO..." : "💾 SALVAR ALTERAÇÕES"}
          </button>
        </Data da Matrículaiv>
      </Data da Matrículaiv>

      {aluno.ExcluiData da Matrículao && (
        <Data da Matrículaiv className="mb-5 rounData da MatrículaeData da Matrícula-xl borData da Matrículaer borData da Matrículaer-reData da Matrícula-800 bg-reData da Matrícula-950/40 p-4">
          <Data da Matrículaiv className="text-sm font-black text-reData da Matrícula-300">
            Este aluno está excluíData da Matrículao Data da Matrículao gerenciamento.
          </Data da Matrículaiv>
          <Data da Matrículaiv className="mt-1 text-xs text-slate-300">
            Ele não Data da Matrículaeve aparecer na listagem principal, mas poData da Matrículae ser recuperaData da Matrículao.
          </Data da Matrículaiv>

          <button
            onClick={recuperarAluno}
            Data da MatrículaisableData da Matrícula={recuperanData da Matrículao}
            className="mt-3 rounData da MatrículaeData da Matrícula-mData da Matrícula bg-emeralData da Matrícula-600 px-5 py-2 text-xs font-black text-white Data da MatrículaisableData da Matrícula:opacity-60"
          >
            {recuperanData da Matrículao ? "RECUPERANData da MatrículaO..." : "♻ RECUPERAR ALUNO"}
          </button>
        </Data da Matrículaiv>
      )}

      <section className="rounData da MatrículaeData da Matrícula-2xl borData da Matrículaer borData da Matrículaer-[#1e3354] bg-[#0f1b2Data da Matrícula] p-6 shaData da Matrículaow-2xl">
        <Data da Matrículaiv className="mb-6 rounData da MatrículaeData da Matrícula-xl borData da Matrículaer borData da Matrículaer-[#21395c] bg-[#162842] p-5">
          <Data da Matrículaiv className="flex items-start justify-between gap-4">
            <Data da Matrículaiv>
              <h1 className="text-2xl font-black text-white">{aluno.Aluno}</h1>
              <p className="mt-2 text-sm font-bolData da Matrícula text-emeralData da Matrícula-300">
                {aluno.Curso || "SEM CURSO INFORMAData da MatrículaO"}
              </p>
              <p className="mt-1 text-xs font-bolData da Matrícula text-slate-400">
                IData da Matrícula: {aluno.IData da Matrícula} • CiData da MatrículaaData da Matrículae: {aluno.CiData da MatrículaaData da Matrículae || "-"}
              </p>
            </Data da Matrículaiv>

            {!aluno.ExcluiData da Matrículao && (
              <button
                onClick={excluirAluno}
                Data da MatrículaisableData da Matrícula={excluinData da Matrículao}
                className="rounData da MatrículaeData da Matrícula-mData da Matrícula bg-reData da Matrícula-700 px-5 py-2 text-xs font-black text-white Data da MatrículaisableData da Matrícula:opacity-60"
              >
                {excluinData da Matrículao ? "EXCLUINData da MatrículaO..." : "🗑 EXCLUIR ALUNO"}
              </button>
            )}
          </Data da Matrículaiv>
        </Data da Matrículaiv>

        <h3 className="mb-3 text-xs font-black uppercase text-slate-300">
          Data da MatrículaaData da Matrículaos principais
        </h3>

        <Data da Matrículaiv className="griData da Matrícula griData da Matrícula-cols-2 gap-4">
          {CAMPOS.map(([campo, label]) => (
            <Campo
              key={campo}
              label={label}
              value={aluno[campo]}
              Data da MatrículaisableData da Matrícula={aluno.ExcluiData da Matrículao}
              onChange={(v: string) => alterar(campo, v)}
              onFocus={() => iniciarEData da Matrículaicao(campo)}
              onBlur={() => finalizarEData da Matrículaicao(campo, label)}
            />
          ))}
        </Data da Matrículaiv>

        <h3 className="mb-3 mt-6 text-xs font-black uppercase text-slate-300">
          Nova observação
        </h3>

        <textarea
          value={novaObs}
          onChange={(e) => setNovaObs(e.target.value)}
          rows={4}
          Data da MatrículaisableData da Matrícula={aluno.ExcluiData da Matrículao}
          className="w-full rounData da MatrículaeData da Matrícula-mData da Matrícula borData da Matrículaer borData da Matrículaer-[#1f5b91] bg-white px-3 py-2 text-sm font-bolData da Matrícula text-black outline-none Data da MatrículaisableData da Matrícula:opacity-60"
        />

        <button
          onClick={salvarObservacao}
          Data da MatrículaisableData da Matrícula={aluno.ExcluiData da Matrículao}
          className="mt-3 rounData da MatrículaeData da Matrícula-mData da Matrícula bg-green-700 px-5 py-2 text-xs font-black text-white Data da MatrículaisableData da Matrícula:opacity-60"
        >
          SALVAR OBSERVAÇÃO
        </button>

        <h3 className="mb-3 mt-8 text-xs font-black uppercase text-slate-300">
          Histórico Data da Matrículae observações
        </h3>

        <Data da Matrículaiv className="space-y-2">
          {historicoObs.map((obs) => (
            <Data da Matrículaiv
              key={obs.iData da Matrícula}
              className="rounData da MatrículaeData da Matrícula-lg borData da Matrículaer borData da Matrículaer-[#12375f] bg-[#071b31] p-3"
            >
              <Data da Matrículaiv className="mb-1 text-[10px] font-bolData da Matrícula text-cyan-300">
                {new Data da Matrículaate(obs.criaData da Matrículao_em).toLocaleString("pt-BR")}
              </Data da Matrículaiv>
              <Data da Matrículaiv className="text-sm text-slate-100">{obs.observacao}</Data da Matrículaiv>
            </Data da Matrículaiv>
          ))}
        </Data da Matrículaiv>

        <h3 className="mb-3 mt-8 text-xs font-black uppercase text-slate-300">
          Histórico Data da Matrículae alterações salvas
        </h3>

        <Data da Matrículaiv className="space-y-2">
          {historicoAlt.map((alt) => (
            <Data da Matrículaiv
              key={alt.iData da Matrícula}
              className="rounData da MatrículaeData da Matrícula-lg borData da Matrículaer borData da Matrículaer-[#12375f] bg-[#071b31] p-3"
            >
              <Data da Matrículaiv className="mb-1 text-[10px] font-bolData da Matrícula text-cyan-300">
                {new Data da Matrículaate(alt.criaData da Matrículao_em).toLocaleString("pt-BR")}
              </Data da Matrículaiv>
              <Data da Matrículaiv className="text-sm">
                <b>{alt.campo}</b>:{" "}
                <span className="text-reData da Matrícula-300">{alt.valor_antigo || "-"}</span>{" "}
                →{" "}
                <span className="text-green-300">{alt.valor_novo || "-"}</span>
              </Data da Matrículaiv>
            </Data da Matrículaiv>
          ))}
        </Data da Matrículaiv>
      </section>
    </main>
  );
}

function Campo({ label, value, onChange, onFocus, onBlur, Data da MatrículaisableData da Matrícula }: any) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase text-cyan-300">
        {label}
      </span>
      <input
        value={value || ""}
        Data da MatrículaisableData da Matrícula={Data da MatrículaisableData da Matrícula}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounData da MatrículaeData da Matrícula-mData da Matrícula borData da Matrículaer borData da Matrículaer-[#1f5b91] bg-white px-3 py-2 text-xs font-bolData da Matrícula text-black outline-none Data da MatrículaisableData da Matrícula:opacity-60"
      />
    </label>
  );
}

function BotaoHistorico({
  texto,
  onClick,
  listaLocal,
  listaSalva,
  Data da MatrículaisableData da Matrícula,
}: any) {
  return (
    <Data da Matrículaiv className="group relative">
      <button
        onClick={onClick}
        Data da MatrículaisableData da Matrícula={Data da MatrículaisableData da Matrícula}
        className="rounData da MatrículaeData da Matrícula-mData da Matrícula borData da Matrículaer borData da Matrículaer-cyan-800 px-4 py-2 text-xs font-bolData da Matrícula text-cyan-100 Data da MatrículaisableData da Matrícula:opacity-40"
      >
        {texto}
      </button>

      <Data da Matrículaiv className="pointer-events-none absolute right-0 top-10 z-50 hiData da MatrículaData da Matrículaen w-96 rounData da MatrículaeData da Matrícula-lg borData da Matrículaer borData da Matrículaer-[#12375f] bg-[#071b31] p-3 text-xs shaData da Matrículaow-2xl group-hover:block">
        <Data da Matrículaiv className="mb-2 font-black text-cyan-300">Alterações locais</Data da Matrículaiv>

        {listaLocal.length === 0 ? (
          <Data da Matrículaiv className="mb-3 text-slate-400">Nenhuma alteração local</Data da Matrículaiv>
        ) : (
          listaLocal.map((item: any, inData da Matrículaex: number) => (
            <Data da Matrículaiv key={inData da Matrículaex} className="mb-2 borData da Matrículaer-b borData da Matrículaer-[#12375f] pb-2">
              <Data da Matrículaiv className="font-bolData da Matrícula text-white">{item.label}</Data da Matrículaiv>
              <Data da Matrículaiv className="text-reData da Matrícula-300">Antes: {item.antigo || "-"}</Data da Matrículaiv>
              <Data da Matrículaiv className="text-green-300">Data da Matrículaepois: {item.novo || "-"}</Data da Matrículaiv>
            </Data da Matrículaiv>
          ))
        )}

        <Data da Matrículaiv className="mb-2 mt-3 font-black text-cyan-300">
          Últimas alterações salvas
        </Data da Matrículaiv>

        {listaSalva.length === 0 ? (
          <Data da Matrículaiv className="text-slate-400">Nenhuma alteração salva</Data da Matrículaiv>
        ) : (
          listaSalva.map((item: any, inData da Matrículaex: number) => (
            <Data da Matrículaiv key={inData da Matrículaex} className="mb-2 borData da Matrículaer-b borData da Matrículaer-[#12375f] pb-2">
              <Data da Matrículaiv className="font-bolData da Matrícula text-white">{item.campo}</Data da Matrículaiv>
              <Data da Matrículaiv className="text-reData da Matrícula-300">
                Antes: {item.valor_antigo || "-"}
              </Data da Matrículaiv>
              <Data da Matrículaiv className="text-green-300">
                Data da Matrículaepois: {item.valor_novo || "-"}
              </Data da Matrículaiv>
            </Data da Matrículaiv>
          ))
        )}
      </Data da Matrículaiv>
    </Data da Matrículaiv>
  );
}
