export const formatNpr = (value: number | string | null | undefined, options?: { compact?: boolean }) => {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
        return 'NPR 0';
    }

    if (options?.compact) {
        return new Intl.NumberFormat('en-NP', {
            style: 'currency',
            currency: 'NPR',
            notation: 'compact',
            maximumFractionDigits: 1
        }).format(numericValue);
    }

    return new Intl.NumberFormat('en-NP', {
        style: 'currency',
        currency: 'NPR',
        maximumFractionDigits: 2
    }).format(numericValue);
};
