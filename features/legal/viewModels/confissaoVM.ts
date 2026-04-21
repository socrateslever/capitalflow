import { LegalDocumentParams } from "../../../types";
import { formatMoney } from "../../../utils/formatters";
import { asArray, asNumber, asString } from "../../../utils/safe";

const CONFISSAO_FILL = "[PREENCHER]";

type ConfissaoInstallmentVM = {
    number: number;
    amount: number;
    dueDate: string;
    dueDateLabel: string;
};

const parseDateInput = (value: unknown): Date | null => {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const yyyymmdd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatConfissaoDateBR = (value: unknown, fallback = CONFISSAO_FILL): string => {
    const parsed = parseDateInput(value);
    return parsed ? parsed.toLocaleDateString("pt-BR") : fallback;
};

export const formatConfissaoDateLongBR = (value: unknown, fallback = CONFISSAO_FILL): string => {
    const parsed = parseDateInput(value);
    return parsed
        ? parsed.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
        : fallback;
};

const normalizeInstallments = (data: LegalDocumentParams): ConfissaoInstallmentVM[] =>
    asArray(data.installments)
        .map((inst: any, index: number) => ({
            number: asNumber(inst?.number, index + 1),
            amount: asNumber(inst?.amount),
            dueDate: asString(inst?.dueDate),
            dueDateLabel: formatConfissaoDateBR(inst?.dueDate),
        }))
        .filter((inst) => inst.amount > 0 || inst.dueDateLabel !== CONFISSAO_FILL);

export const buildConfissaoScenarioVM = (data: LegalDocumentParams) => {
    const installments = normalizeInstallments(data);
    const installmentsCount = installments.length;
    const isAgreement = !!data.isAgreement;
    const isRenegotiatedInstallmentPlan = isAgreement && installmentsCount > 1;
    const isRenegotiatedSinglePayment = isAgreement && installmentsCount <= 1;
    const totalDebtValue = asNumber(data.totalDebt || data.amount);
    const firstInstallment = installments[0];
    const lastInstallment = installments[installments.length - 1];
    const firstDueDate = formatConfissaoDateBR(firstInstallment?.dueDate);
    const firstDueDateLong = formatConfissaoDateLongBR(firstInstallment?.dueDate);
    const lastDueDate = formatConfissaoDateBR(lastInstallment?.dueDate);
    const lastDueDateLong = formatConfissaoDateLongBR(lastInstallment?.dueDate);
    const installmentValue = firstInstallment?.amount || totalDebtValue;

    const documentSubtitle = isRenegotiatedInstallmentPlan
        ? "TITULO EXECUTIVO EXTRAJUDICIAL - RENEGOCIACAO PARCELADA"
        : isRenegotiatedSinglePayment
            ? "TITULO EXECUTIVO EXTRAJUDICIAL - RENEGOCIACAO EM PAGAMENTO UNICO"
            : "TITULO EXECUTIVO EXTRAJUDICIAL - DIVIDA INTEGRAL";

    const objectLabel = isAgreement ? "divida renegociada" : "divida integral";

    const paymentDescription = isRenegotiatedInstallmentPlan
        ? `sera pago em ${installmentsCount} parcelas sucessivas de ${formatMoney(installmentValue)} cada, com vencimento inicial em ${firstDueDateLong} e vencimento final em ${lastDueDateLong}`
        : `sera pago em parcela unica, com vencimento definitivo em ${firstDueDate}`;

    const nonNovationClause = isAgreement
        ? "A presente composicao apenas reorganiza a forma de pagamento do debito confessado, sem novacao, permanecendo integros a origem, a liquidez, a certeza e a exigibilidade da obrigacao ate a quitacao integral."
        : "";

    return {
        installments,
        installmentsCount,
        isAgreement,
        isRenegotiatedInstallmentPlan,
        isRenegotiatedSinglePayment,
        isSinglePayment: !isRenegotiatedInstallmentPlan,
        totalDebtValue,
        firstInstallment,
        lastInstallment,
        firstDueDate,
        firstDueDateLong,
        lastDueDate,
        lastDueDateLong,
        installmentValue,
        installmentValueLabel: formatMoney(installmentValue),
        documentSubtitle,
        objectLabel,
        paymentDescription,
        nonNovationClause,
    };
};

export const buildConfissaoDividaVM = (data: LegalDocumentParams) => {
    return {
        creditorName: asString(data.creditorName, "CREDOR NAO IDENTIFICADO").toUpperCase(),
        creditorDoc: asString(data.creditorDoc, "N/A"),
        creditorAddress: asString(data.creditorAddress, "__________________"),
        debtorName: asString(data.debtorName, "DEVEDOR NAO IDENTIFICADO").toUpperCase(),
        debtorDoc: asString(data.debtorDoc, "N/A"),
        debtorPhone: asString(data.debtorPhone, "N/A"),
        debtorAddress: asString(data.debtorAddress, "Endereco nao informado"),
        totalDebt: formatMoney(asNumber(data.totalDebt || data.amount)),
        discount: formatMoney(asNumber(data.discount)),
        gracePeriod: asNumber(data.gracePeriod),
        downPayment: formatMoney(asNumber(data.downPayment)),
        originDescription: asString(data.originDescription, "Divida reconhecida"),
        installments: normalizeInstallments(data),
        city: asString(data.city, "Manaus").toUpperCase(),
        creditorNationality: asString(data.creditorNationality, "brasileiro(a)"),
        creditorMaritalStatus: asString(data.creditorMaritalStatus, "estado civil nao informado"),
        creditorProfession: asString(data.creditorProfession, "profissao nao informada"),
        creditorRG: asString(data.creditorRG, "N/A"),
        debtorNationality: asString(data.debtorNationality, "brasileiro(a)"),
        debtorMaritalStatus: asString(data.debtorMaritalStatus, "estado civil nao informado"),
        debtorProfession: asString(data.debtorProfession, "profissao nao informada"),
        debtorRG: asString(data.debtorRG, "N/A"),
        date: new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    };
};
