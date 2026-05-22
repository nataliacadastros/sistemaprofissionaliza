"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

const BACKUP_KEY = "backup_cadastro_alunos";

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
}

export default function CadastroPage() {
  const router = useRouter();
  const [carregandoLogin, setCarregandoLogin] = useState(true);

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
    dataMatrícula: "",
  });

  const [checks, setChecks] = useState({
    ingles: false,
    bonus: false,
    confirmacao: false,
  });

  useEffect(() => {
    async function verificarLogin() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      // 🔥 CARREGA BACKUP
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        setLista(JSON.parse(backup));
      }

      setCarregandoLogin(false);
    }

    verificarLogin();
  }, [router]);

  // 🔥 SALVA AUTOMÁTICO
  useEffect(() => {
    if (lista.length > 0) {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(lista));
    } else {
      localStorage.removeItem(BACKUP_KEY);
    }
  }, [lista]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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
        "Data Matrícula": form.dataMatrícula,
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
      "Data Matrícula": a["Data Matrícula"],
    }));

    const { error } = await supabase.from("backup alunos").insert(dados);

    if (error) {
      alert("Erro ao enviar: " + error.message);
      return;
    }

    // 🔥 LIMPA BACKUP
    localStorage.removeItem(BACKUP_KEY);

    setLista([]);
    alert("Enviado com sucesso!");
  }

  if (carregandoLogin) {
    return <div>VERIFICANDO LOGIN...</div>;
  }

  return (
    <main>
      {/* resto da sua tela permanece exatamente igual */}
    </main>
  );
}
