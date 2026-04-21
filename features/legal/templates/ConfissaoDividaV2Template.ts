import { LegalDocumentParams } from "../../../types";
import { numberToWordsBRL } from "../../../utils/formatters";
import { buildConfissaoDividaVM, buildConfissaoScenarioVM, formatConfissaoDateBR } from "../viewModels/confissaoVM";

const FILL = "[PREENCHER]";

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return FILL;
  const text = String(value).trim();
  return text.length > 0 ? text : FILL;
};

const safePercent = (value: unknown, fallback?: number): string => {
  if (value === null || value === undefined || value === "") {
    return fallback !== undefined ? String(fallback) : FILL;
  }
  return String(value);
};

const safeRole = (sig: any): string => sig?.role || sig?.papel || "";
const normalizeRole = (value: string | null | undefined) => {
  const role = String(value || "").trim().toUpperCase();
  if (role === "DEVEDOR" || role === "DEBTOR") return "DEBTOR";
  if (role === "CREDOR" || role === "CREDITOR") return "CREDITOR";
  if (role.startsWith("TESTEMUNHA_")) return role.replace("TESTEMUNHA_", "WITNESS_");
  if (role.startsWith("WITNESS_")) return role;
  if (role === "AVALISTA" || role === "GUARANTOR") return "AVALISTA";
  return role;
};

export const generateConfissaoDividaV2HTML = (
  data: LegalDocumentParams,
  docId?: string,
  hash?: string,
  signatures: any[] = []
) => {
  const vm = buildConfissaoDividaVM(data);
  const scenario = buildConfissaoScenarioVM(data);

  const findSig = (role: string) =>
    (signatures || []).find((s) => normalizeRole(safeRole(s)) === normalizeRole(role));

  const renderSignatureBlock = (role: string, name: string, doc: string) => {
    const sig = findSig(role);
    const displayRole = role.replace("DEBTOR", "DEVEDOR").replace("CREDITOR", "CREDOR").replace("WITNESS", "TESTEMUNHA").replace("_", " ");

    return `
      <div style="text-align: center; border-top: 1.5pt solid #000; padding-top: 10px; position: relative; page-break-inside: avoid; margin-top: 60px; min-height: 80px;">
        ${sig ? `
            <div style="position: absolute; top: -85px; left: 50%; transform: translateX(-50%); width: 90%; z-index: 10; pointer-events: none; display: flex; flex-direction: column; align-items: center;">
                ${sig.assinatura_imagem ? `
                    <img src="${sig.assinatura_imagem}" style="max-height: 70px; max-width: 100%; object-fit: contain; margin-bottom: -15px; filter: contrast(150%) brightness(90%);" />
                ` : ""}
                <div style="border: 1px solid #059669; color: #059669; padding: 6px 10px; font-family: sans-serif; font-size: 6pt; font-weight: bold; background: rgba(236, 253, 245, 0.95); border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.3; text-align: center; border-left: 4px solid #059669;">
                    <span style="font-size: 7pt;">ASSINATURA DIGITAL VALIDA</span><br/>
                    <span style="opacity: 0.8;">MP 2.200-2/2001 | DATA: ${new Date(sig.signed_at).toLocaleString("pt-BR")}</span><br/>
                    <span style="opacity: 0.8;">IP: ${sig.ip_origem} | HASH: ${sig.assinatura_hash?.substring(0, 12).toUpperCase()}</span>
                </div>
            </div>
        ` : ""}
        <b style="text-transform: uppercase; font-size: 11pt; display: block; margin-bottom: 2px;">${safeText(name)}</b>
        <span style="font-size: 9pt; color: #444; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${displayRole}</span><br/>
        <small style="font-size: 8pt; color: #666;">DOC: ${safeText(doc)}</small>
      </div>
    `;
  };

  const totalDebtNumber = Number(data.totalDebt || data.amount || 0);
  const valorExtenso = totalDebtNumber > 0 ? numberToWordsBRL(totalDebtNumber) : FILL;
  const multa = safePercent(data.multaPercentual, 10);
  const juros = safePercent(data.jurosMensal, 1);
  const honorarios = safePercent(data.honorariosPercentual);

  let clauseNumber = 5;
  const extraClauses: string[] = [];

  if (scenario.isAgreement) {
    extraClauses.push(`
      <h2>CLAUSULA ${clauseNumber} - DA AUSENCIA DE NOVACAO</h2>
      <p>${scenario.nonNovationClause}</p>
    `);
    clauseNumber += 1;
  }

  if (data.incluirGarantia) {
    extraClauses.push(`
      <h2>CLAUSULA ${clauseNumber} - DA GARANTIA</h2>
      <p>Para assegurar o cumprimento da obrigacao, o DEVEDOR oferece a seguinte garantia:</p>
      <p>Tipo: ${safeText(data.tipoGarantia)}<br/>
      Descricao: ${safeText(data.descricaoGarantia)}</p>
      <p>A garantia podera ser executada em caso de inadimplemento, independentemente de notificacao adicional.</p>
    `);
    clauseNumber += 1;
  }

  if (data.incluirAvalista) {
    extraClauses.push(`
      <h2>CLAUSULA ${clauseNumber} - DO AVALISTA</h2>
      <p>O AVALISTA abaixo identificado assume responsabilidade solidaria pelo pagamento integral da divida confessada.</p>
      <p>AVALISTA: ${safeText(data.avalistaNome)}<br/>
      CPF: ${safeText(data.avalistaCPF)}<br/>
      ENDERECO: ${safeText(data.avalistaEndereco)}</p>
    `);
    clauseNumber += 1;
  }

  if (data.incluirPenhoraAutomatica) {
    extraClauses.push(`
      <h2>CLAUSULA ${clauseNumber} - DA RESPONSABILIDADE PATRIMONIAL</h2>
      <p>O DEVEDOR declara ciencia de que responde pelo cumprimento da obrigacao com seus bens presentes e futuros, facultando ao CREDOR adotar as medidas judiciais cabiveis para satisfacao do credito.</p>
    `);
    clauseNumber += 1;
  }

  const foroClauseNumber = clauseNumber;
  const notaPromissoriaDescricao = scenario.isRenegotiatedInstallmentPlan
    ? `em ${scenario.installmentsCount} parcelas sucessivas`
    : `em parcela unica com vencimento em ${scenario.firstDueDate}`;

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 2.5cm; }
      body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; font-size: 11pt; padding: 0; margin: 0; }
      .container { max-width: 800px; margin: auto; }
      .header-box { text-align: center; border: 2px solid #000; padding: 20px; margin-bottom: 30px; }
      h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
      h2 { font-size: 11pt; margin: 25px 0 15px 0; text-transform: uppercase; font-weight: bold; }
      .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; page-break-inside: avoid; }
      .nota-promissoria { margin-top: 100px; border: 4px double #000; padding: 30px; page-break-before: always; }
      .np-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      .np-title { font-size: 18pt; font-weight: bold; }
      .np-value { font-size: 16pt; font-weight: bold; border: 1px solid #000; padding: 5px 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-box">
        <h1>INSTRUMENTO PARTICULAR DE CONFISSAO DE DIVIDA</h1>
        <p style="margin: 12px 0 0 0; font-weight: bold;">${scenario.documentSubtitle}</p>
      </div>

      ${
        data.customContent
          ? `<div style="margin-bottom: 40px;">${data.customContent}</div>`
          : `
        <p><strong>PARTES</strong></p>
        <p><strong>CREDOR:</strong> ${safeText(vm.creditorName)}, ${safeText(vm.creditorNationality)}, ${safeText(vm.creditorMaritalStatus)}, ${safeText(vm.creditorProfession)}, portador do RG n. ${safeText(vm.creditorRG)} e CPF n. ${safeText(vm.creditorDoc)}, residente e domiciliado na ${safeText(vm.creditorAddress)}.</p>
        <p><strong>DEVEDOR:</strong> ${safeText(vm.debtorName)}, ${safeText(vm.debtorNationality)}, ${safeText(vm.debtorMaritalStatus)}, ${safeText(vm.debtorProfession)}, portador do RG n. ${safeText(vm.debtorRG)} e CPF n. ${safeText(vm.debtorDoc)}, residente e domiciliado na ${safeText(vm.debtorAddress)}.</p>

        <h2>CLAUSULA 1 - DO RECONHECIMENTO DA DIVIDA</h2>
        <p>O DEVEDOR declara e reconhece, de forma irrevogavel e irretratavel, possuir divida liquida, certa e exigivel perante o CREDOR, no valor total de <strong>${safeText(vm.totalDebt)} (${valorExtenso})</strong>, decorrente de ${safeText(vm.originDescription)}.</p>
        <p><strong>PARAGRAFO UNICO:</strong> O presente instrumento constitui titulo executivo extrajudicial, nos termos do artigo 784, inciso III, do Codigo de Processo Civil.</p>

        <h2>CLAUSULA 2 - DA FORMA DE PAGAMENTO</h2>
        <p>O debito confessado ${scenario.paymentDescription}.</p>
        <p><strong>PAGAMENTO:</strong> O pagamento devera ser efetuado diretamente ao CREDOR, servindo o comprovante de transferencia, deposito ou meio equivalente como recibo da parcela ou da quitacao integral.</p>

        <h2>CLAUSULA 3 - DOS ENCARGOS POR ATRASO</h2>
        <p>O atraso no cumprimento de qualquer obrigacao prevista neste instrumento acarretara multa moratoria de ${multa}% sobre o valor inadimplido, juros de mora de ${juros}% ao mes e vencimento antecipado do saldo exigivel.</p>
        ${honorarios !== FILL ? `<p><strong>PARAGRAFO UNICO:</strong> Em caso de cobranca judicial, poderao ser exigidos honorarios advocaticios de ${honorarios}%.</p>` : ""}

        <h2>CLAUSULA 4 - DA EXIGIBILIDADE IMEDIATA</h2>
        <p>Configurado o inadimplemento, o CREDOR podera promover imediatamente a cobranca extrajudicial e judicial do debito, inclusive execucao do presente titulo, independentemente de aviso ou interpelacao.</p>

        ${extraClauses.join("\n")}

        <h2>CLAUSULA ${foroClauseNumber} - DO FORO</h2>
        <p>As partes elegem o foro da Comarca de ${safeText(vm.city)} para dirimir quaisquer duvidas oriundas deste instrumento, com renuncia a qualquer outro, por mais privilegiado que seja.</p>

        <p style="margin-top: 30px;">${safeText(vm.city)}, ${formatConfissaoDateBR(data.contractDate || new Date().toISOString())}.</p>
      `
      }

      <div class="signatures-grid">
        ${renderSignatureBlock("CREDOR", safeText(vm.creditorName), safeText(vm.creditorDoc))}
        ${renderSignatureBlock("DEVEDOR", safeText(vm.debtorName), safeText(vm.debtorDoc))}
        ${data.incluirAvalista ? renderSignatureBlock("AVALISTA", safeText(data.avalistaNome), safeText(data.avalistaCPF)) : ""}
      </div>

      <p style="margin-top: 40px;">TESTEMUNHAS:</p>
      <div class="signatures-grid">
        ${renderSignatureBlock("TESTEMUNHA_1", safeText(data.witnesses?.[0]?.name), safeText((data.witnesses?.[0] as any)?.document || (data.witnesses?.[0] as any)?.documento))}
        ${renderSignatureBlock("TESTEMUNHA_2", safeText(data.witnesses?.[1]?.name), safeText((data.witnesses?.[1] as any)?.document || (data.witnesses?.[1] as any)?.documento))}
      </div>

      <div style="margin-top: 80px; padding-top: 15px; border-top: 0.5pt solid #eee; font-family: sans-serif; font-size: 7pt; color: #888; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="flex: 1;">
            <strong>CapitalFlow Forensic Compliance:</strong><br/>
            ID DOC: <code style="color: #444;">${docId || "S/N"}</code> | HASH INTEGRIDADE: <code style="color: #444; font-weight: bold;">${hash?.toUpperCase() || "AGUARDANDO_ASSINATURA"}</code><br/>
            Certificado de integridade digital conforme MP 2.200-2/2001. Validade juridica plena.
        </div>
        <div style="text-align: right; margin-left: 20px; white-space: nowrap;">
            Pagina 1 de 1
        </div>
      </div>

      <div class="nota-promissoria">
        <div class="np-header">
          <div class="np-title">NOTA PROMISSORIA</div>
          <div class="np-value">${safeText(vm.totalDebt)}</div>
        </div>

        <p>Valor: <strong>${safeText(vm.totalDebt)} (${valorExtenso})</strong></p>
        <p>Na data de vencimento ajustada, pagarei incondicionalmente a <strong>${safeText(vm.creditorName)}</strong>, CPF n. ${safeText(vm.creditorDoc)}, a quantia acima descrita ${notaPromissoriaDescricao}.</p>
        <p>Emitente (Devedor): <strong>${safeText(vm.debtorName)}</strong><br/>
        CPF: ${safeText(vm.debtorDoc)}</p>
        <p>Local: ${safeText(vm.city)}<br/>
        Data: ${formatConfissaoDateBR(data.contractDate || new Date().toISOString())}</p>

        <div style="margin-top: 40px; border-top: 1px solid #000; width: 60%; text-align: center; padding-top: 5px;">
          Assinatura do Devedor
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};
