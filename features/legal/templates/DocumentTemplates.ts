
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { generateNotaPromissoriaHTML } from "./NotaPromissoriaTemplate";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA (PADRÃO ABNT RIGOROSO 3,3,2,2)
    confissaoDivida: (data: any) => `
        <div class="abnt-document" style="
            text-align: justify; 
            box-sizing: border-box;
            position: relative;
            width: 100%;
        ">
            <style>
                .abnt-document b, .abnt-document strong { font-weight: bold; }
                .abnt-document .centered { text-align: center; }
                .abnt-document .uppercase { text-transform: uppercase; }
                .abnt-document .indent { text-indent: 1.5cm; margin-bottom: 1em; }
                .abnt-document table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1.5pt solid #000; }
                .abnt-document th, .abnt-document td { border: 1pt solid #000; padding: 10px; text-align: center; font-size: 11pt; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .abnt-document { border: none !important; box-shadow: none !important; width: 210mm; height: 297mm; }
                }
            </style>

            <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                <h1 class="uppercase" style="margin: 0; font-size: 14pt; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h1>
                <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CPC/2015</p>
            </div>
            
            <p class="indent"><strong>QUADRO DE QUALIFICAÇÃO DAS PARTES:</strong></p>
            
            <p class="indent"><strong>CREDOR(A):</strong> <b>${data.creditorName.toUpperCase()}</b>, regularmente inscrito(a) no CPF/CNPJ sob o nº <b>${data.creditorDoc}</b>, residente e domiciliado(a) em <b>${data.creditorAddress}</b>.</p>
            
            <p class="indent"><strong>DEVEDOR(A):</strong> <b>${data.debtorName.toUpperCase()}</b>, regularmente inscrito(a) no CPF/CNPJ sob o nº <b>${data.debtorDoc}</b>, residente e domiciliado(a) em <b>${data.debtorAddress || 'Endereço não informado'}</b>.</p>

            <p class="indent" style="margin-top: 30px;">As partes acima identificadas, de comum acordo, celebram este Instrumento Particular de Confissão de Dívida, o qual se regerá pelas seguintes cláusulas e condições:</p>

            <p class="indent"><strong>CLÁUSULA PRIMEIRA - DO OBJETO E RECONHECIMENTO:</strong> O(A) <strong>DEVEDOR(A)</strong> reconhece e confessa ser devedor(a) ao <strong>CREDOR</strong> da quantia líquida, certa e exigível de <b>${formatMoney(data.amount)}</b> (<b>${numberToWordsBRL(data.amount)}</b>), referente a obrigações anteriormente assumidas.</p>
            
            <p class="indent"><strong>CLÁUSULA SEGUNDA - DA FORMA DE PAGAMENTO:</strong> O montante confessado será pago conforme o cronograma abaixo estipulado:</p>
            
            ${data.installments && data.installments.length > 0 ? `
                <table>
                    <thead>
                        <tr style="background: #efefef;">
                            <th>Parcela</th>
                            <th>Vencimento</th>
                            <th>Valor Nominal (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.installments.map((inst: any, idx: number) => `
                            <tr>
                                <td><b>Parcela ${(inst.number || idx + 1).toString().padStart(2, '0')}</b></td>
                                <td><b>${new Date(inst.dueDate).toLocaleDateString('pt-BR')}</b></td>
                                <td><b>${formatMoney(inst.amount)}</b></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `<p class="centered" style="font-style: italic;">Cronograma de pagamento conforme anexo.</p>`}

            <p class="indent"><strong>CLÁUSULA TERCEIRA - DO VENCIMENTO ANTECIPADO:</strong> O atraso superior a 05 (cinco) dias no pagamento de qualquer das parcelas implicará no <strong>VENCIMENTO ANTECIPADO</strong> de toda a dívida remanescente, de pleno direito, independentemente de aviso ou notificação, podendo o <strong>CREDOR</strong> ingressar imediatamente com a execução forçada.</p>

            ${data.clauses?.penhora ? `
                <p class="indent"><strong>CLÁUSULA QUARTA - DA PENHORA E GARANTIAS:</strong> Para garantia da execução, o(a) DEVEDOR(A) autoriza desde já a penhora eletrônica de seus ativos financeiros (SISBAJUD) e a indisponibilidade de bens imóveis e veículos em seu nome (RENAJUD/CNIB).</p>
            ` : ''}

            ${data.clauses?.avalista ? `
                <p class="indent"><strong>CLÁUSULA QUINTA - DA SOLIDARIEDADE:</strong> Terceiros garantidores figuram neste ato como devedores solidários, renunciando ao benefício de ordem e ao direito de exoneração da fiança, respondendo com todo o seu patrimônio presente e futuro.</p>
            ` : ''}

            ${data.clauses?.multa ? `
                <p class="indent"><strong>CLÁUSULA SEXTA - DOS ENCARGOS MORATÓRIOS:</strong> Em caso de mora, incidirá sobre o valor total do débito: (i) Multa moratória convencional de <b>10% (dez por cento)</b>; (ii) Juros de mora de <b>1% (um por cento) ao mês</b>; (iii) Honorários advocatícios fixados em <b>20% (vinte por cento)</b> sobre o total da execução.</p>
            ` : ''}

            <p class="indent"><strong>CLÁUSULA SÉTIMA - DA EFICÁCIA EXECUTIVA:</strong> Este instrumento constitui título executivo extrajudicial, conforme previsto no <b>Artigo 784, inciso III, do Código de Processo Civil</b>.</p>

            ${data.clauses?.foro ? `
                <p class="indent"><strong>CLÁUSULA OITAVA - DO FORO:</strong> Fica eleito o foro da Comarca de <b>${data.city.toUpperCase()} (${data.state.toUpperCase()})</b> para dirimir quaisquer controvérsias decorrentes deste instrumento.</p>
            ` : ''}

            <p style="margin-top: 50px; text-align: right;"><b>${data.city.toUpperCase()} (${data.state.toUpperCase()})</b>, em <b>${new Date().toLocaleDateString('pt-BR')}</b>.</p>

            <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid;">
                <div style="text-align: center; border-top: 1.5pt solid #000; padding-top: 10px;">
                    <b class="uppercase" style="font-size: 11pt;">${data.debtorName}</b><br/>
                    <span style="font-size: 9pt; color: #444;">DEVEDOR(A)</span><br/>
                    <small style="font-size: 8pt; color: #666;">CPF/CNPJ: ${data.debtorDoc}</small>
                </div>
                <div style="text-align: center; border-top: 1.5pt solid #000; padding-top: 10px;">
                    <b class="uppercase" style="font-size: 11pt;">${data.creditorName}</b><br/>
                    <span style="font-size: 9pt; color: #444;">CREDOR(A)</span><br/>
                    <small style="font-size: 8pt; color: #666;">CPF/CNPJ: ${data.creditorDoc}</small>
                </div>
            </div>
            
            <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; page-break-inside: avoid;">
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b style="font-size: 10pt;">${data.witnesses?.[0]?.name || '_________________________'}</b><br/>
                    <span style="font-size: 9pt; color: #444;">TESTEMUNHA 01</span><br/>
                    ${((data.witnesses?.[0] as any)?.document || (data.witnesses?.[0] as any)?.documento) ? `<small style="font-size: 8pt; color: #666;">CPF: ${(data.witnesses?.[0] as any).document || (data.witnesses?.[0] as any).documento}</small>` : ''}
                </div>
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b style="font-size: 10pt;">${data.witnesses?.[1]?.name || '_________________________'}</b><br/>
                    <span style="font-size: 9pt; color: #444;">TESTEMUNHA 02</span><br/>
                    ${((data.witnesses?.[1] as any)?.document || (data.witnesses?.[1] as any)?.documento) ? `<small style="font-size: 8pt; color: #666;">CPF: ${(data.witnesses?.[1] as any).document || (data.witnesses?.[1] as any).documento}</small>` : ''}
                </div>
            </div>

            <div style="margin-top: 80px; padding-top: 15px; border-top: 0.5pt solid #eee; font-family: sans-serif; font-size: 7pt; color: #888; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="flex: 1;">
                    <strong>CERTIFICAÇÃO DIGITAL:</strong> Este documento foi gerado eletronicamente pelo sistema CapitalFlow.<br/>
                    A integridade do conteúdo é garantida pelo Hash SHA-256: <code style="color: #444; font-weight: bold;">${data.hashSHA256?.toUpperCase() || 'AGUARDANDO_ASSINATURA'}</code>
                </div>
                <div style="text-align: right; margin-left: 20px; white-space: nowrap;">
                    Página 1 de 1
                </div>
            </div>
        </div>
    `,

    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #000; max-width: 800px; margin: auto;">
            <h2 style="text-align: center; text-transform: uppercase;">Notificação Extrajudicial</h2>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <p><strong>A/C Sr(a). ${data.debtorName}</strong><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            
            <p style="margin-top: 30px;">Pela presente notificação, informamos que consta em aberto o débito referente ao contrato <strong>${data.loanId.substring(0,8)}</strong>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}, no valor total atualizado de <strong>${formatMoney(data.totalDue)}</strong>.</p>
            
            <p>Solicitamos a regularização do pagamento em até 48 horas para evitar a adoção de medidas judiciais cabíveis e registro em órgãos de proteção ao crédito.</p>
            
            <p style="margin-top: 50px; text-align: center;">Atenciosamente,<br/><strong>${data.creditorName}</strong></p>
        </div>
    `,

    quitacao: (data: any) => `
        <div style="font-family: serif; padding: 50px; line-height: 1.8; color: #000; max-width: 850px; margin: auto; border: 1px solid #ccc;">
            <h1 style="text-align: center; text-transform: uppercase;">Termo de Quitação</h1>
            
            <p>Pelo presente instrumento, eu, <strong>${data.creditorName}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, declaro para os devidos fins que recebi de <strong>${data.debtorName}</strong>, CPF/CNPJ nº ${data.debtorDoc}, a importância de <strong>${formatMoney(data.totalPaid)}</strong>, referente à liquidação integral do contrato <strong>${data.loanId.substring(0,8)}</strong>.</p>
            
            <p>Com o recebimento desta quantia, dou ao devedor plena, geral e irrevogável quitação de toda e qualquer obrigação referente ao citado contrato, nada mais tendo a reclamar em tempo algum.</p>
            
            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <div style="margin-top: 60px; text-align: center; border-top: 1px solid #000; width: 60%; margin: auto; padding-top: 10px;">
                <strong>${data.creditorName}</strong><br/>Credor
            </div>
        </div>
    `,

    notaPromissoria: (data: any) => generateNotaPromissoriaHTML(data as any)
};
