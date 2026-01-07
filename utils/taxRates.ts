export const taxRules: Record<string, { rate: number; label: string }> = {
    'United Kingdom': { rate: 20, label: 'VAT' },
    'Germany': { rate: 19, label: 'VAT' },
    'France': { rate: 20, label: 'VAT' },
    'India': { rate: 18, label: 'GST' }, // Average service rate
    'United States': { rate: 0, label: 'Sales Tax' }, // Usually 0 for exports/digital services
    'Australia': { rate: 10, label: 'GST' },
    'Canada': { rate: 5, label: 'GST' },
    'Default': { rate: 0, label: 'Tax' }
};