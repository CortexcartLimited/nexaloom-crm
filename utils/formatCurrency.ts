export const formatCurrency = (amount: number, currencyCode: string = 'GBP'): string => {
    // Normalize currency code (default to GBP if invalid or missing)
    const code = currencyCode ? currencyCode.toUpperCase() : 'GBP';

    // Map commonly used currency symbols/names to ISO codes if necessary, 
    // though we expect ISO codes (GBP, USD, EUR, etc.) from the frontend.

    try {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch (err) {
        // Fallback if currency code is invalid
        console.warn(`Invalid currency code: ${code}, falling back to GBP`);
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    }
};
