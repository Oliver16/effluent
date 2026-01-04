from decimal import Decimal

TAX_YEAR = 2026

# Standard Deductions
STANDARD_DEDUCTIONS = {
    'single': Decimal('15700'),
    'married_jointly': Decimal('31400'),
    'married_separately': Decimal('15700'),
    'head_of_household': Decimal('23550'),
    'qualifying_widow': Decimal('31400'),
}

# Federal Tax Brackets 2026 (projected)
FEDERAL_BRACKETS = {
    'single': [
        (Decimal('11925'), Decimal('0.10')),
        (Decimal('48475'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250500'), Decimal('0.32')),
        (Decimal('626350'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'married_jointly': [
        (Decimal('23850'), Decimal('0.10')),
        (Decimal('96950'), Decimal('0.12')),
        (Decimal('206700'), Decimal('0.22')),
        (Decimal('394600'), Decimal('0.24')),
        (Decimal('501050'), Decimal('0.32')),
        (Decimal('751600'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'married_separately': [
        (Decimal('11925'), Decimal('0.10')),
        (Decimal('48475'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250525'), Decimal('0.32')),
        (Decimal('375800'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
    'head_of_household': [
        (Decimal('17000'), Decimal('0.10')),
        (Decimal('64850'), Decimal('0.12')),
        (Decimal('103350'), Decimal('0.22')),
        (Decimal('197300'), Decimal('0.24')),
        (Decimal('250500'), Decimal('0.32')),
        (Decimal('626350'), Decimal('0.35')),
        (None, Decimal('0.37')),
    ],
}

# FICA
SOCIAL_SECURITY_RATE = Decimal('0.062')
SOCIAL_SECURITY_WAGE_BASE = Decimal('176100')
MEDICARE_RATE = Decimal('0.0145')
ADDITIONAL_MEDICARE_RATE = Decimal('0.009')
ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = Decimal('200000')
ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = Decimal('250000')

# Self-Employment
SE_TAX_RATE = Decimal('0.153')
SE_TAX_DEDUCTION = Decimal('0.5')

# Contribution Limits
CONTRIBUTION_LIMITS = {
    '401k_employee': Decimal('24500'),
    '401k_catchup': Decimal('8000'),
    '401k_total': Decimal('73500'),
    'ira': Decimal('7500'),
    'ira_catchup': Decimal('1000'),
    'hsa_individual': Decimal('4400'),
    'hsa_family': Decimal('8750'),
    'hsa_catchup': Decimal('1000'),
    'fsa_health': Decimal('3300'),
    'fsa_dependent': Decimal('5000'),
}

# State tax rates (simplified flat approximations)
STATE_TAX_RATES = {
    'AL': Decimal('0.05'), 'AZ': Decimal('0.025'), 'AR': Decimal('0.055'),
    'CA': Decimal('0.0725'), 'CO': Decimal('0.044'), 'CT': Decimal('0.055'),
    'DE': Decimal('0.066'), 'GA': Decimal('0.055'), 'HI': Decimal('0.0725'),
    'ID': Decimal('0.058'), 'IL': Decimal('0.0495'), 'IN': Decimal('0.0315'),
    'IA': Decimal('0.06'), 'KS': Decimal('0.057'), 'KY': Decimal('0.045'),
    'LA': Decimal('0.0425'), 'ME': Decimal('0.0715'), 'MD': Decimal('0.0575'),
    'MA': Decimal('0.05'), 'MI': Decimal('0.0425'), 'MN': Decimal('0.0785'),
    'MS': Decimal('0.05'), 'MO': Decimal('0.054'), 'MT': Decimal('0.0675'),
    'NE': Decimal('0.0684'), 'NJ': Decimal('0.0637'), 'NM': Decimal('0.059'),
    'NY': Decimal('0.0685'), 'NC': Decimal('0.0525'), 'ND': Decimal('0.029'),
    'OH': Decimal('0.04'), 'OK': Decimal('0.0475'), 'OR': Decimal('0.099'),
    'PA': Decimal('0.0307'), 'RI': Decimal('0.0599'), 'SC': Decimal('0.07'),
    'TN': Decimal('0'), 'UT': Decimal('0.0485'), 'VT': Decimal('0.0875'),
    'VA': Decimal('0.0575'), 'WV': Decimal('0.065'), 'WI': Decimal('0.0765'),
    'DC': Decimal('0.085'),
}

NO_INCOME_TAX_STATES = {'AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'}

PAY_PERIODS = {
    'weekly': 52,
    'biweekly': 26,
    'semimonthly': 24,
    'monthly': 12,
}
