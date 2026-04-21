import { LegalDocumentParams } from "../../../types";
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { buildConfissaoDividaVM, buildConfissaoScenarioVM, formatConfissaoDateBR } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string, signatures: any[] = []) => {
    const vm = buildConfissaoDividaVM(data);
    const scenario = buildConfissaoScenarioVM(data);

    const normalizeRole = (value: string | null | undefined) => {
        const role = String(value || "").trim().toUpperCase();
        if (role === "DEVEDOR" || role === "DEBTOR") return "DEBTOR";
        if (role === "CREDOR" || role === "CREDITOR") return "CREDITOR";
        if (role.startsWith("TESTEMUNHA_")) return role.replace("TESTEMUNHA_", "WITNESS_");
        if (role.startsWith("WITNESS_")) return role;
        if (role === "AVALISTA" || role === "GUARANTOR") return "AVALISTA";
        return role;
    };

    const findSig = (role: string) => (signatures || []).find((s) => normalizeRole(s.role || s.papel) === normalizeRole(role));
    const multa = Number(data.multaPercentual ?? 10);
    const juros = Number(data.jurosMensal ?? 1);
    const totalDebt = Number(data.totalDebt || data.amount || 0);
    const valorExtenso = numberToWordsBRL(totalDebt);

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
                <b style="text-transform: uppercase; font-size: 11pt; display: block; margin-bottom: 2px;">${name}</b>
                <span style="font-size: 9pt; color: #444; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${displayRole}</span><br/>
                <small style="font-size: 8pt; color: #666;">DOC: ${doc || "N/A"}</small>
            </div>
        `;
    };

    const defaultContent = `
        <p class="indent"><strong>CREDOR(A):</strong> <b>${vm.creditorName}</b>, ${vm.creditorNationality}, ${vm.creditorMaritalStatus}, ${vm.creditorProfession}, portador(a) do RG n. <b>${vm.creditorRG}</b> e inscrito(a) no CPF/CNPJ sob o n. <b>${vm.creditorDoc}</b>, residente e domiciliado(a) em <b>${vm.creditorAddress}</b>.</p>
        <p class="indent"><strong>DEVEDOR(A):</strong> <b>${vm.debtorName}</b>, ${vm.debtorNationality}, ${vm.debtorMaritalStatus}, ${vm.debtorProfession}, portador(a) do RG n. <b>${vm.debtorRG}</b> e inscrito(a) no CPF/CNPJ sob o n. <b>${vm.debtorDoc}</b>, residente e domiciliado(a) em <b>${vm.debtorAddress}</b>.</p>

        <p class="indent" style="margin-top: 30px;">As partes acima identificadas celebram o presente instrumento para reconhecer, consolidar e formalizar a obrigacao descrita nas clausulas seguintes.</p>

        <p class="indent"><strong>CLAUSULA PRIMEIRA - DO RECONHECIMENTO DA DIVIDA:</strong> O(A) DEVEDOR(A) reconhece, de forma expressa, irrevogavel e irretratavel, ser devedor(a) do valor liquido, certo e exigivel de <b>${formatMoney(totalDebt)} (${valorExtenso})</b>, correspondente a ${scenario.objectLabel} decorrente de ${vm.originDescription}.</p>

        <p class="indent"><strong>CLAUSULA SEGUNDA - DA FORMA DE PAGAMENTO:</strong> O debito confessado ${scenario.paymentDescription}.</p>

        <p class="indent"><strong>CLAUSULA TERCEIRA - DA MORA E DO VENCIMENTO ANTECIPADO:</strong> O inadimplemento de qualquer obrigacao prevista neste instrumento, especialmente o nao pagamento no vencimento ajustado, constituira o(a) DEVEDOR(A) em mora automatica e importara no vencimento antecipado do saldo exigivel, independentemente de aviso ou interpelacao.</p>

        <p class="indent"><strong>CLAUSULA QUARTA - DOS ENCARGOS DE INADIMPLEMENTO:</strong> Verificada a mora, incidirao multa moratoria de ${multa}% sobre o valor inadimplido e juros de mora de ${juros}% ao mes, calculados pro rata die, sem prejuizo das despesas necessarias a cobranca.</p>

        ${scenario.isAgreement ? `<p class="indent"><strong>CLAUSULA QUINTA - DA AUSENCIA DE NOVACAO:</strong> ${scenario.nonNovationClause}</p>` : ""}

        <p class="indent"><strong>CLAUSULA ${scenario.isAgreement ? "SEXTA" : "QUINTA"} - DA EFICACIA EXECUTIVA:</strong> O presente instrumento constitui titulo executivo extrajudicial, nos termos do art. 784, inciso III, do Codigo de Processo Civil, autorizando a imediata execucao do debito em caso de descumprimento.</p>

        <p class="indent"><strong>CLAUSULA ${scenario.isAgreement ? "SETIMA" : "SEXTA"} - DO FORO:</strong> Fica eleito o foro da Comarca de <b>${vm.city}</b>, com renuncia a qualquer outro, por mais privilegiado que seja, para dirimir controversias oriundas deste instrumento.</p>

        <p style="margin-top: 40px; text-align: right;"><b>${vm.city}, ${formatConfissaoDateBR(data.contractDate || new Date().toISOString())}</b></p>
    `;

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; background: #f0f0f0; font-family: 'Times New Roman', Times, serif; }
            .abnt-page {
                width: 210mm;
                min-height: 297mm;
                padding: 3cm 2cm 2cm 3cm;
                background: #fff;
                margin: 0 auto;
                box-sizing: border-box;
                position: relative;
                color: #000;
                font-size: 12pt;
                line-height: 1.5;
                text-align: justify;
            }
            .centered { text-align: center; }
            .indent { text-indent: 1.5cm; margin-bottom: 1em; }
            h1 { font-size: 14pt; margin: 0; text-transform: uppercase; font-weight: bold; }
            .signatures-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 50px;
                margin-top: 60px;
            }
            @media print {
                body { background: #fff; }
                .abnt-page { border: none; box-shadow: none; margin: 0; padding: 3cm 2cm 2cm 3cm !important; }
            }
        </style>
    </head>
    <body title="DOC-${docId || "PENDENTE"}">
        <div class="abnt-page">
            <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                <h1>Instrumento Particular de Confissao de Divida</h1>
                <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">${scenario.documentSubtitle}</p>
            </div>

            <div class="content">
                ${data.customContent ? data.customContent : defaultContent}
            </div>

            <div class="signatures-grid">
                ${renderSignatureBlock("CREDOR", vm.creditorName, vm.creditorDoc)}
                ${renderSignatureBlock("DEVEDOR", vm.debtorName, vm.debtorDoc)}
                ${renderSignatureBlock("WITNESS_1", data.witnesses?.[0]?.name || "Testemunha 1", (data.witnesses?.[0] as any)?.document || (data.witnesses?.[0] as any)?.documento || "")}
                ${renderSignatureBlock("WITNESS_2", data.witnesses?.[1]?.name || "Testemunha 2", (data.witnesses?.[1] as any)?.document || (data.witnesses?.[1] as any)?.documento || "")}
            </div>

            <div style="position: absolute; bottom: 1.5cm; width: calc(100% - 5cm); border-top: 0.5pt solid #eee; padding-top: 15px; font-family: sans-serif; font-size: 7pt; color: #888; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="flex: 1;">
                    <strong>CapitalFlow Forensic Compliance:</strong><br/>
                    ID DOC: <code style="color: #444;">${docId || "S/N"}</code> | HASH INTEGRIDADE: <code style="color: #444; font-weight: bold;">${hash?.toUpperCase() || "AGUARDANDO_ASSINATURA"}</code><br/>
                    Certificado de integridade digital conforme MP 2.200-2/2001. Validade juridica plena.
                </div>
                <div style="text-align: right; margin-left: 20px; white-space: nowrap;">
                    Pagina 1 de 1
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
