import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { generateNotaPromissoriaHTML } from "./NotaPromissoriaTemplate";
import { buildConfissaoScenarioVM, formatConfissaoDateBR } from "../viewModels/confissaoVM";

const CONFISSAO_FILL = "[PREENCHER]";

const renderConfissaoHeader = (subtitle: string) => `
    <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
        <h1 class="uppercase" style="margin: 0; font-size: 14pt; letter-spacing: 1px;">Instrumento Particular de Confissao de Divida</h1>
        <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">${subtitle}</p>
    </div>
`;

const renderConfissaoStyle = () => `
    <style>
        .abnt-document b, .abnt-document strong { font-weight: bold; }
        .abnt-document .centered { text-align: center; }
        .abnt-document .uppercase { text-transform: uppercase; }
        .abnt-document .indent { text-indent: 1.5cm; margin-bottom: 1em; }
    </style>
`;

const renderConfissaoBase = (content: string) => `
    <div class="abnt-document" style="text-align: justify; box-sizing: border-box; position: relative; width: 100%;">
        ${renderConfissaoStyle()}
        ${content}
    </div>
`;

const renderWitnessBlocks = (data: any) => `
    <div style="margin-top: 45px; page-break-inside: avoid;">
        <p style="margin: 0 0 18px 0; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px;">Testemunhas</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div style="text-align: center; border-top: 1pt solid #000; padding-top: 8px;">
                <b class="uppercase" style="font-size: 10pt;">${data.witnesses?.[0]?.name || "Testemunha 01"}</b><br/>
                <span style="font-size: 8pt;">CPF: ${data.witnesses?.[0]?.document || data.witnesses?.[0]?.documento || CONFISSAO_FILL}</span><br/>
                <span style="font-size: 8pt;">TESTEMUNHA</span>
            </div>
            <div style="text-align: center; border-top: 1pt solid #000; padding-top: 8px;">
                <b class="uppercase" style="font-size: 10pt;">${data.witnesses?.[1]?.name || "Testemunha 02"}</b><br/>
                <span style="font-size: 8pt;">CPF: ${data.witnesses?.[1]?.document || data.witnesses?.[1]?.documento || CONFISSAO_FILL}</span><br/>
                <span style="font-size: 8pt;">TESTEMUNHA</span>
            </div>
        </div>
    </div>
`;

export const DocumentTemplates = {
    confissaoDividaParcelado: (data: any) => {
        const scenario = buildConfissaoScenarioVM(data);
        const totalDebt = Number(data.totalDebt || data.amount || 0);
        const subtitle = data.isAgreement
            ? "TITULO EXECUTIVO EXTRAJUDICIAL - RENEGOCIACAO PARCELADA"
            : "TITULO EXECUTIVO EXTRAJUDICIAL - PAGAMENTO PARCELADO";

        return renderConfissaoBase(`
            ${renderConfissaoHeader(subtitle)}

            <p class="indent"><strong>CREDOR(A):</strong> <b>${String(data.creditorName || "").toUpperCase()}</b>, CPF/CNPJ n. <b>${data.creditorDoc || CONFISSAO_FILL}</b>, residente e domiciliado(a) em <b>${data.creditorAddress || CONFISSAO_FILL}</b>.</p>
            <p class="indent"><strong>DEVEDOR(A):</strong> <b>${String(data.debtorName || "").toUpperCase()}</b>, CPF/CNPJ n. <b>${data.debtorDoc || CONFISSAO_FILL}</b>, residente e domiciliado(a) em <b>${data.debtorAddress || CONFISSAO_FILL}</b>.</p>

            <p class="indent"><strong>CLAUSULA PRIMEIRA - DO RECONHECIMENTO DA DIVIDA:</strong> O(A) DEVEDOR(A), de forma irrevogavel e irretratavel, reconhece e confessa ser devedor(a) do valor liquido, certo e exigivel de <b>${formatMoney(totalDebt)}</b> (<b>${numberToWordsBRL(totalDebt)}</b>), referente a ${data.originDescription || "obrigacao anteriormente assumida"}.</p>

            <p class="indent"><strong>CLAUSULA SEGUNDA - DA FORMA DE PAGAMENTO:</strong> O debito confessado ${scenario.paymentDescription}, obrigando-se o(a) DEVEDOR(A) ao pagamento integral de cada parcela em seus respectivos vencimentos.</p>

            <p class="indent"><strong>CLAUSULA TERCEIRA - DA MORA E DO VENCIMENTO ANTECIPADO:</strong> O inadimplemento de qualquer parcela, no respectivo vencimento, implicara de pleno direito no vencimento antecipado das parcelas vincendas e do saldo remanescente, independentemente de notificacao judicial ou extrajudicial.</p>

            ${data.clauses?.multa !== false ? `<p class="indent"><strong>CLAUSULA QUARTA - DOS ENCARGOS DE INADIMPLEMENTO:</strong> Em caso de atraso, incidirao multa moratoria de 10% (dez por cento) sobre o saldo inadimplido e juros de mora de 1% (um por cento) ao mes, calculados pro rata die ate o efetivo pagamento.</p>` : ""}
            ${data.isAgreement ? `<p class="indent"><strong>CLAUSULA QUINTA - DA AUSENCIA DE NOVACAO:</strong> A presente renegociacao apenas recompoe a forma de pagamento da divida confessada, sem novacao, permanecendo higidos a origem do debito e os demais direitos do CREDOR ate a quitacao integral.</p>` : ""}
            <p class="indent"><strong>CLAUSULA ${data.isAgreement ? "SEXTA" : "QUINTA"} - DA EFICACIA EXECUTIVA:</strong> Este instrumento constitui titulo executivo extrajudicial, na forma do art. 784, inciso III, do Codigo de Processo Civil.</p>
            ${data.clauses?.foro !== false ? `<p class="indent"><strong>CLAUSULA ${data.isAgreement ? "SETIMA" : "SEXTA"} - DO FORO:</strong> Fica eleito o foro da Comarca de <b>${String(data.city || "Manaus").toUpperCase()} (${String(data.state || "AM").toUpperCase()})</b>, com renuncia a qualquer outro, por mais privilegiado que seja.</p>` : ""}

            <p style="margin-top: 40px; text-align: right;"><b>${String(data.city || "Manaus").toUpperCase()} (${String(data.state || "AM").toUpperCase()})</b>, em <b>${new Date().toLocaleDateString("pt-BR")}</b>.</p>

            <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; page-break-inside: avoid;">
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 5px;">
                    <b class="uppercase" style="font-size: 10pt;">${data.debtorName}</b><br/><span style="font-size: 8pt;">DEVEDOR(A)</span>
                </div>
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 5px;">
                    <b class="uppercase" style="font-size: 10pt;">${data.creditorName}</b><br/><span style="font-size: 8pt;">CREDOR(A)</span>
                </div>
            </div>

            ${renderWitnessBlocks(data)}
        `);
    },

    confissaoDividaUnico: (data: any) => {
        const scenario = buildConfissaoScenarioVM(data);
        const totalDebt = Number(data.totalDebt || data.amount || 0);
        const dueDate = formatConfissaoDateBR(data.installments?.[0]?.dueDate || scenario.firstDueDate);
        const subtitle = data.isAgreement
            ? "TITULO EXECUTIVO EXTRAJUDICIAL - RENEGOCIACAO EM PAGAMENTO UNICO"
            : "TITULO EXECUTIVO EXTRAJUDICIAL - DIVIDA INTEGRAL";

        return renderConfissaoBase(`
            ${renderConfissaoHeader(subtitle)}

            <p class="indent"><strong>CREDOR(A):</strong> <b>${String(data.creditorName || "").toUpperCase()}</b>, CPF/CNPJ n. <b>${data.creditorDoc || CONFISSAO_FILL}</b>.</p>
            <p class="indent"><strong>DEVEDOR(A):</strong> <b>${String(data.debtorName || "").toUpperCase()}</b>, CPF/CNPJ n. <b>${data.debtorDoc || CONFISSAO_FILL}</b>.</p>

            <p class="indent"><strong>CLAUSULA PRIMEIRA - DO RECONHECIMENTO DA DIVIDA:</strong> O(A) DEVEDOR(A) reconhece e confessa dever ao(à) CREDOR(A) a quantia liquida, certa e exigivel de <b>${formatMoney(totalDebt)}</b> (<b>${numberToWordsBRL(totalDebt)}</b>), referente a ${data.originDescription || "obrigacao anteriormente assumida"}.</p>

            <p class="indent"><strong>CLAUSULA SEGUNDA - DO PAGAMENTO:</strong> O valor confessado sera pago em parcela unica, no montante de <b>${formatMoney(totalDebt)}</b>, com vencimento definitivo e improrrogavel em <b>${dueDate}</b>.</p>

            <p class="indent"><strong>CLAUSULA TERCEIRA - DA MORA E DO VENCIMENTO ANTECIPADO:</strong> O nao pagamento na data aprazada constituira o(a) DEVEDOR(A) em mora automatica, tornando imediatamente exigivel o debito integral, independentemente de notificacao.</p>

            ${data.clauses?.multa !== false ? `<p class="indent"><strong>CLAUSULA QUARTA - DOS ENCARGOS DE INADIMPLEMENTO:</strong> Em caso de atraso, incidirao multa moratoria de 10% (dez por cento) e juros de mora de 1% (um por cento) ao mes ate a data do efetivo pagamento.</p>` : ""}
            ${data.isAgreement ? `<p class="indent"><strong>CLAUSULA QUINTA - DA AUSENCIA DE NOVACAO:</strong> A presente composicao reorganiza apenas a forma de pagamento da divida reconhecida, sem novacao, permanecendo integros os direitos do CREDOR ate a quitacao integral.</p>` : ""}
            <p class="indent"><strong>CLAUSULA ${data.isAgreement ? "SEXTA" : "QUINTA"} - DA EFICACIA EXECUTIVA:</strong> Este titulo possui eficacia executiva extrajudicial, nos termos do art. 784, inciso III, do Codigo de Processo Civil.</p>

            <p style="margin-top: 100px; text-align: right;"><b>${String(data.city || "Manaus").toUpperCase()} (${String(data.state || "AM").toUpperCase()})</b>, em <b>${new Date().toLocaleDateString("pt-BR")}</b>.</p>

            <div style="margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b class="uppercase">${data.debtorName}</b><br/>DEVEDOR(A)
                </div>
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b class="uppercase">${data.creditorName}</b><br/>CREDOR(A)
                </div>
            </div>

            ${renderWitnessBlocks(data)}
        `);
    },

    confissaoDivida: (data: any) => {
        const scenario = buildConfissaoScenarioVM(data);
        return scenario.isRenegotiatedInstallmentPlan
            ? DocumentTemplates.confissaoDividaParcelado(data)
            : DocumentTemplates.confissaoDividaUnico(data);
    },

    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #000; max-width: 800px; margin: auto;">
            <h2 style="text-align: center; text-transform: uppercase;">Notificacao Extrajudicial</h2>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            <p><strong>A/C Sr(a). ${data.debtorName}</strong><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            <p style="margin-top: 30px;">Pela presente notificacao, informamos que consta em aberto o debito referente ao contrato <strong>${data.loanId.substring(0, 8)}</strong>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}, no valor total atualizado de <strong>${formatMoney(data.totalDue)}</strong>.</p>
            <p>Solicitamos a regularizacao do pagamento em ate 48 horas para evitar a adocao de medidas judiciais cabiveis e registro em orgaos de protecao ao credito.</p>
            <p style="margin-top: 50px; text-align: center;">Atenciosamente,<br/><strong>${data.creditorName}</strong></p>
        </div>
    `,

    quitacao: (data: any) => `
        <div style="font-family: serif; padding: 50px; line-height: 1.8; color: #000; max-width: 850px; margin: auto; border: 1px solid #ccc;">
            <h1 style="text-align: center; text-transform: uppercase;">Termo de Quitacao</h1>
            <p>Pelo presente instrumento, eu, <strong>${data.creditorName}</strong>, inscrito(a) no CPF/CNPJ sob o n. ${data.creditorDoc}, declaro para os devidos fins que recebi de <strong>${data.debtorName}</strong>, CPF/CNPJ n. ${data.debtorDoc}, a importancia de <strong>${formatMoney(data.totalPaid)}</strong>, referente a liquidacao integral do contrato <strong>${data.loanId.substring(0, 8)}</strong>.</p>
            <p>Com o recebimento desta quantia, dou ao devedor plena, geral e irrevogavel quitacao de toda e qualquer obrigacao referente ao citado contrato, nada mais tendo a reclamar em tempo algum.</p>
            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            <div style="margin-top: 60px; text-align: center; border-top: 1px solid #000; width: 60%; margin: auto; padding-top: 10px;">
                <strong>${data.creditorName}</strong><br/>Credor
            </div>
        </div>
    `,

    notaPromissoria: (data: any) => generateNotaPromissoriaHTML(data as any)
};
