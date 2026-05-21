"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

const cursosTags = [
  "PREPARATÓRIO JOVEM BANCÁRIO",
  "PREPARATÓRIO AGRO",
  "JOVEM NO DIREITO",
  "INGLÊS",
  "PRÉ MILITAR",
  "ADMINISTRATIVO",
  "INFORMÁTICA",
  "PREPARATÓRIO ENCCEJA",
  "JOVEM NA AVIAÇÃO",
  "TECNOLOGIA",
];

const tagsIniciais: any = {
  tags: {},
  last_selection: {},
  turma_ingles_subir: "",
};

function limparValor(valor: any) {
  if (valor === null || valor === undefined) return "";
  if (String(valor).toLowerCase() === "null") return "";
  return String(valor);
}

function normalizarChave(chave: string) {
  return chave
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function pegarCPF(a: any) {
  if (!a) return "";
  const chaveCPF = Object.keys(a).find((chave) => normalizarChave(chave) === "CPF");
  if (!chaveCPF) return "";
  return limparValor(a[chaveCPF]);
}

export default function SubirAlunosPage() {
  const [modo, setModo] = useState("AUTOMÁTICO");
  const [dados, setDados] = useState<any[]>([]);
  const [dataFiltro, setDataFiltro] = useState("");
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [turmaIngles, setTurmaIngles] = useState("");
  const [dadosTags, setDadosTags] = useState<any>(tagsIniciais);
  const [dfFinal, setDfFinal] = useState<any[] | null>(null);

  const [manual, setManual] = useState({
    ids: "",
    nomes: "",
    celulares: "",
    documentos: "",
    cidades: "",
    cursos: "",
    pagamentos: "",
    vendedores: "",
    datas: "",
  });

  useEffect(() => {
    const salvo = localStorage.getItem("dados_tags_subir");
    if (salvo) {
      const obj = JSON.parse(salvo);
      setDadosTags(obj);
      setTurmaIngles(obj.turma_ingles_subir || "");
    }

    async function buscar() {
      let todos: any[] = [];
      let i = 0;

      while (true) {
        const { data } = await supabase
          .from("backup alunos")
          .select("*")
          .range(i, i + 999);

        if (!data || data.length === 0) break;

        todos = [...todos, ...data];

        if (data.length < 1000) break;
        i += 1000;
      }

      setDados(todos);
    }

    buscar();
  }, []);

  function salvarTags(novo: any) {
    setDadosTags(novo);
    localStorage.setItem("dados_tags_subir", JSON.stringify(novo));
  }

  function dataBRparaISO(data?: string) {
    if (!data) return "";
    const partes = String(data).split("/");
    if (partes.length !== 3) return "";
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  const autoFiltrado = useMemo(() => {
    if (!dataFiltro) return [];
    return dados.filter((a) => dataBRparaISO(a["Data Cadastro"]) === dataFiltro);
  }, [dados, dataFiltro]);

  const cidadesDisponiveis = useMemo(() => {
    return Array.from(new Set(autoFiltrado.map((a) => a.Cidade).filter(Boolean))).sort();
  }, [autoFiltrado]);

  const dfAutoReady = useMemo(() => {
    return autoFiltrado.filter((a) => cidadesSelecionadas.includes(a.Cidade));
  }, [autoFiltrado, cidadesSelecionadas]);

  function toggleCidade(cidade: string) {
    setCidadesSelecionadas((prev) =>
      prev.includes(cidade) ? prev.filter((c) => c !== cidade) : [...prev, cidade]
    );
  }

  function atualizarTag(curso: string, valor: string) {
    salvarTags({
      ...dadosTags,
      last_selection: {
        ...dadosTags.last_selection,
        [curso]: valor,
      },
    });
  }

  function adicionarTag(curso: string, valor: string) {
    if (!valor.trim()) return;

    const tag = valor.trim().toUpperCase();
    const listaAtual = dadosTags.tags?.[curso] || [];

    if (listaAtual.includes(tag)) return;

    salvarTags({
      ...dadosTags,
      tags: {
        ...dadosTags.tags,
        [curso]: [...listaAtual, tag],
      },
      last_selection: {
        ...dadosTags.last_selection,
        [curso]: tag,
      },
    });
  }

  function removerTag(curso: string) {
    const selecionada = dadosTags.last_selection?.[curso];
    if (!selecionada) return;

    const listaAtual = dadosTags.tags?.[curso] || [];

    salvarTags({
      ...dadosTags,
      tags: {
        ...dadosTags.tags,
        [curso]: listaAtual.filter((t: string) => t !== selecionada),
      },
      last_selection: {
        ...dadosTags.last_selection,
        [curso]: "",
      },
    });
  }

  function processarDados() {
    let rawList: any[] = [];

    if (modo === "MANUAL") {
      const ids = manual.ids.trim().split("\n");
      const nomes = manual.nomes.trim().split("\n");
      const celulares = manual.celulares.trim().split("\n");
      const documentos = manual.documentos.trim().split("\n");
      const cidades = manual.cidades.trim().split("\n");
      const cursos = manual.cursos.trim().split("\n");
      const pagamentos = manual.pagamentos.trim().split("\n");
      const vendedores = manual.vendedores.trim().split("\n");
      const datas = manual.datas.trim().split("\n");

      for (let i = 0; i < ids.length; i++) {
        rawList.push({
          User: ids[i] || "",
          Nome: nomes[i] || "",
          Cell: celulares[i] || "",
          Doc: documentos[i] || "",
          City: cidades[i] || "",
          Cour: cursos[i] || "",
          Pay: pagamentos[i] || "",
          Sell: vendedores[i] || "",
          Date: datas[i] || "",
        });
      }
    } else {
      rawList = dfAutoReady.map((r) => ({
        User: limparValor(r["ID"]),
        Nome: limparValor(r["Aluno"]),
        Cell: limparValor(r["Tel. Aluno"]),
        Doc: pegarCPF(r),
        City: limparValor(r["Cidade"]),
        Cour: limparValor(r["Curso"]),
        Pay: limparValor(r["Pagamento"]),
        Sell: limparValor(r["Vendedor"]),
        Date: limparValor(r["Data Matricula"] || r["Data Matrícula"]),
      }));
    }

    const processed = rawList.map((item) => {
      const cOrig = String(item.Cour || "").toUpperCase();
      const pOrig = String(item.Pay || "").toUpperCase();

      const encontrados: any[] = [];

      cursosTags.forEach((k) => {
        const tagSelecionada = dadosTags.last_selection?.[k];
        if (cOrig.includes(k) && tagSelecionada) {
          encontrados.push([cOrig.indexOf(k), tagSelecionada]);
        }
      });

      encontrados.sort((a, b) => a[0] - b[0]);

      const tagsFinais = encontrados.map((e) => e[1]);
      const cursoFinal = tagsFinais.length ? tagsFinais.join(",").toUpperCase() : cOrig;

      let pagamentoFinal = "PENDENTE";

      if (pOrig.includes("BOLETO") && !pOrig.includes("CARTÃO") && !pOrig.includes("LINK")) {
        pagamentoFinal = "BOLETO";
      } else if ((pOrig.includes("CARTÃO") || pOrig.includes("LINK")) && !pOrig.includes("BOLETO")) {
        pagamentoFinal = "CARTÃO";
      }

      const partesNome = String(item.Nome || "").trim().split(/\s+/, 2);
      const primeiroNome = partesNome[0]?.toUpperCase() || "";
      const sobrenome = String(item.Nome || "")
        .trim()
        .replace(partesNome[0] || "", "")
        .trim()
        .toUpperCase();

      let observacao = `${cursoFinal} | ${cOrig} | ${pOrig}`.toUpperCase();

      if (turmaIngles) {
        observacao = observacao.replace(
          "PLATAFORMAANTIGA",
          `PLATAFORMAANTIGA ${turmaIngles}`
        );
      }

      return {
        username: limparValor(item.User),
        email2: `${limparValor(item.User)}@profissionalizaead.com.br`,
        name: primeiroNome,
        lastname: sobrenome,
        cellphone2: limparValor(item.Cell),
        document: limparValor(item.Doc),
        city2: limparValor(item.City),
        courses: cursoFinal,
        payment: pagamentoFinal,
        observation: observacao,
        ouro: cOrig.includes("10 CURSOS") ? "1" : "0",
        password: "futuro",
        role: "1",
        secretary: "MGA",
        seller: limparValor(item.Sell),
        contract_date: limparValor(item.Date),
        active: "1",
      };
    });

    setDfFinal(processed);
  }

  function atualizarFormaPendente(username: string, forma: string) {
    setDfFinal((prev) =>
      (prev || []).map((item) =>
        item.username === username ? { ...item, payment: forma } : item
      )
    );
  }

  function baixarCidade(cidade: string) {
    if (!dfFinal) return;

    const dadosCidade = dfFinal.filter((d) => d.city2 === cidade);
    const ws = XLSX.utils.json_to_sheet(dadosCidade);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Alunos");
    XLSX.writeFile(wb, `${cidade}.xlsx`);
  }

  function limparTudo() {
    setDfFinal(null);
    setCidadesSelecionadas([]);
    setManual({
      ids: "",
      nomes: "",
      celulares: "",
      documentos: "",
      cidades: "",
      cursos: "",
      pagamentos: "",
      vendedores: "",
      datas: "",
    });
  }

  const pendentes = dfFinal?.filter((d) => d.payment === "PENDENTE") || [];
  const pronto = dfFinal && pendentes.length === 0;
  const cidadesDownload = Array.from(new Set((dfFinal || []).map((d) => d.city2)));

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
              tab === "📤 SUBIR ALUNOS"
                ? "border-cyan-300 bg-cyan-300 text-black shadow-[0_0_10px_rgba(0,242,255,.6)]"
                : "border-slate-700/30 bg-white/20 text-[#1f295a]"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      <section className="px-8 pt-16">
        <h1 className="mb-5 text-xl font-black text-white">📤 IMPORTAÇÃO EAD</h1>

        <div className="rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
          <div className="mb-5 flex items-center gap-8">
            <span className="text-xs font-black text-cyan-300">Método:</span>

            {["MANUAL", "AUTOMÁTICO"].map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 text-xs font-black">
                <input type="radio" checked={modo === m} onChange={() => setModo(m)} />
                {m}
              </label>
            ))}
          </div>

          <Campo
            label="Turma de Inglês desses alunos:"
            value={turmaIngles}
            placeholder="Ex: ING32"
            onChange={(v: string) => {
              const valor = v.toUpperCase();
              setTurmaIngles(valor);
              salvarTags({ ...dadosTags, turma_ingles_subir: valor });
            }}
          />

          {modo === "AUTOMÁTICO" ? (
            <div className="mt-5">
              <Campo
                label="Filtrar Cadastro (Coluna F):"
                value={dataFiltro}
                type="date"
                onChange={setDataFiltro}
              />

              {cidadesDisponiveis.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-black text-cyan-300">Cidades:</div>

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

                  <div className="mt-3 rounded-md border border-cyan-900 bg-[#0b1f36] p-3 text-sm font-bold text-cyan-300">
                    {dfAutoReady.length} alunos encontrados.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-5">
              <BlocoManual label="IDs" value={manual.ids} onChange={(v: string) => setManual({ ...manual, ids: v })} />
              <BlocoManual label="Nomes" value={manual.nomes} onChange={(v: string) => setManual({ ...manual, nomes: v })} />
              <BlocoManual label="Celulares" value={manual.celulares} onChange={(v: string) => setManual({ ...manual, celulares: v })} />
              <BlocoManual label="Documentos" value={manual.documentos} onChange={(v: string) => setManual({ ...manual, documentos: v })} />
              <BlocoManual label="Cidades" value={manual.cidades} onChange={(v: string) => setManual({ ...manual, cidades: v })} />
              <BlocoManual label="Cursos" value={manual.cursos} onChange={(v: string) => setManual({ ...manual, cursos: v })} />
              <BlocoManual label="Pagamentos" value={manual.pagamentos} onChange={(v: string) => setManual({ ...manual, pagamentos: v })} />
              <BlocoManual label="Vendedores" value={manual.vendedores} onChange={(v: string) => setManual({ ...manual, vendedores: v })} />
              <BlocoManual label="Datas" value={manual.datas} onChange={(v: string) => setManual({ ...manual, datas: v })} />
            </div>
          )}
        </div>

        <details className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
          <summary className="cursor-pointer text-sm font-black text-cyan-300">
            🛠️ CONFIGURAR TAGS
          </summary>

          <div className="mt-5 grid grid-cols-3 gap-5">
            {cursosTags.map((curso) => {
              const lista = dadosTags.tags?.[curso] || [];
              const atual = dadosTags.last_selection?.[curso] || "";

              return (
                <div key={curso} className="rounded-lg border border-[#12375f] bg-[#0b1f36] p-3">
                  <div className="mb-2 text-[10px] font-black text-cyan-300">{curso}</div>

                  <div className="flex gap-2">
                    <select
                      value={atual}
                      onChange={(e) => atualizarTag(curso, e.target.value)}
                      className="w-full rounded bg-white p-2 text-xs font-bold text-black"
                    >
                      <option value=""></option>
                      {lista.map((tag: string) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => removerTag(curso)}
                      className="rounded bg-red-900 px-3 text-xs font-bold text-red-100"
                    >
                      🗑️
                    </button>
                  </div>

                  <input
                    placeholder="Nova..."
                    onKeyDown={(e: any) => {
                      if (e.key === "Enter") {
                        adicionarTag(curso, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="mt-2 w-full rounded bg-white p-2 text-xs font-bold text-black"
                  />
                </div>
              );
            })}
          </div>
        </details>

        <button
          onClick={processarDados}
          className="mt-6 w-full rounded-md bg-cyan-400 px-6 py-3 text-sm font-black text-black hover:bg-cyan-300"
        >
          🚀 PROCESSAR DADOS
        </button>

        {dfFinal && dfFinal.length > 0 && (
          <div className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">
              👁️ PRÉ-VISUALIZAÇÃO GERAL ({dfFinal.length} ALUNOS)
            </h2>

            <div className="overflow-auto rounded-lg border border-[#12375f]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0c2743] text-cyan-300">
                  <tr>
                    {Object.keys(dfFinal[0]).map((k) => (
                      <th key={k} className="whitespace-nowrap p-2">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dfFinal.map((linha, i) => (
                    <tr key={i} className="border-t border-[#12375f]">
                      {Object.values(linha).map((v: any, j) => (
                        <td
                          key={j}
                          className={`whitespace-nowrap p-2 ${
                            Object.keys(linha)[j] === "document" && !limparValor(v)
                              ? "bg-red-950 text-red-300"
                              : ""
                          }`}
                        >
                          {limparValor(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pendentes.length > 0 && (
          <div className="mt-6 rounded-xl border border-yellow-600 bg-[#2b2507] p-5">
            <h2 className="mb-3 text-sm font-black text-yellow-300">
              ⚠️ Confirmação necessária
            </h2>

            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-yellow-300">
                    <th className="p-2">ID</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Texto Original</th>
                    <th className="p-2">Forma Final</th>
                  </tr>
                </thead>

                <tbody>
                  {pendentes.map((p) => (
                    <tr key={p.username} className="border-t border-yellow-900">
                      <td className="p-2">{p.username}</td>
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.observation}</td>
                      <td className="p-2">
                        <select
                          value={p.payment}
                          onChange={(e) => atualizarFormaPendente(p.username, e.target.value)}
                          className="rounded bg-white p-2 text-black"
                        >
                          <option value="PENDENTE">PENDENTE</option>
                          <option value="BOLETO">BOLETO</option>
                          <option value="CARTÃO">CARTÃO</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pronto && (
          <div className="mt-6 rounded-xl border border-[#12375f] bg-[#071b31] p-5 shadow-2xl">
            <h2 className="mb-4 text-sm font-black text-cyan-300">
              📄 PLANILHAS PRONTAS PARA DOWNLOAD
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {cidadesDownload.map((cidade: any) => (
                <button
                  key={cidade}
                  onClick={() => baixarCidade(cidade)}
                  className="rounded-md bg-green-700 px-4 py-3 text-xs font-black text-white hover:bg-green-600"
                >
                  📥 BAIXAR PLANILHA: {cidade}
                </button>
              ))}
            </div>

            <button
              onClick={limparTudo}
              className="mt-5 w-full rounded-md border border-cyan-800 px-4 py-3 text-xs font-black text-cyan-100"
            >
              ♻️ LIMPAR CAMPOS / CONCLUÍDO
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Campo({ label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div className="mb-3 grid grid-cols-[230px_1fr] items-center gap-4">
      <label className="text-right text-sm font-black text-cyan-300">{label}</label>

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

function BlocoManual({ label, value, onChange }: any) {
  return (
    <label>
      <div className="mb-1 text-xs font-black text-cyan-300">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="w-full rounded-md border border-[#1f5b91] bg-white p-3 text-xs font-bold text-black outline-none"
      />
    </label>
  );
}
