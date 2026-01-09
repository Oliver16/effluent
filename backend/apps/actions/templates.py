"""
Action templates for next best actions.

Maps insights/issues to actionable interventions with branching options.
Each action template specifies:
- When it applies (conditions on metrics/goals)
- What candidates are available (branching actions)
- How to compile into scenario changes
"""
from decimal import Decimal
from typing import Optional, Callable
from dataclasses import dataclass

from apps.goals.models import Goal, GoalType
from apps.metrics.models import MetricSnapshot


@dataclass
class ActionCandidate:
    """A single candidate action within an action template."""
    id: str
    name: str
    description: str
    change_type: str
    default_parameters: dict
    impact_estimate: str  # Human readable estimate


@dataclass
class ActionSuggestion:
    """A suggested action with computed parameters."""
    template_id: str
    name: str
    description: str
    severity: str  # critical, warning, info
    candidates: list[ActionCandidate]
    recommended_candidate_id: str
    context: dict  # Computed context for the suggestion


def get_goal_target(goals: list[Goal], goal_type: str, default: Decimal) -> Decimal:
    """Get target value for a goal type, with fallback default."""
    for goal in goals:
        if goal.goal_type == goal_type and goal.is_active:
            return goal.target_value
    return default


def check_liquidity_below_target(snapshot: MetricSnapshot, goals: list[Goal]) -> bool:
    """Check if liquidity is below emergency fund goal."""
    target = get_goal_target(goals, GoalType.EMERGENCY_FUND_MONTHS, Decimal('6'))
    return snapshot.liquidity_months < target


def check_dscr_below_target(snapshot: MetricSnapshot, goals: list[Goal]) -> bool:
    """Check if DSCR is below minimum target."""
    target = get_goal_target(goals, GoalType.MIN_DSCR, Decimal('1.25'))
    return snapshot.dscr < target


def check_savings_below_target(snapshot: MetricSnapshot, goals: list[Goal]) -> bool:
    """Check if savings rate is below minimum target."""
    target = get_goal_target(goals, GoalType.MIN_SAVINGS_RATE, Decimal('0.10'))
    return snapshot.savings_rate < target


def check_high_interest_debt(snapshot: MetricSnapshot, goals: list[Goal]) -> bool:
    """Check if there's significant high-interest debt."""
    return snapshot.high_interest_debt_ratio > Decimal('0.15')


# Rule registry for checking when actions apply
APPLIES_WHEN_RULES = {
    'liquidity_below_target': check_liquidity_below_target,
    'dscr_below_target': check_dscr_below_target,
    'savings_below_target': check_savings_below_target,
    'high_interest_debt': check_high_interest_debt,
}


# Action templates registry
ACTION_TEMPLATES = {
    'increase_liquidity': {
        'name': 'Build Emergency Fund',
        'description': 'Increase liquid savings to reach your emergency fund goal',
        'severity_map': {
            'liquidity_below_1': 'critical',
            'liquidity_below_3': 'warning',
            'liquidity_below_6': 'info',
        },
        'applies_when': 'liquidity_below_target',
        'candidates': [
            ActionCandidate(
                id='reduce_expenses',
                name='Reduce Monthly Expenses',
                description='Cut discretionary spending to boost savings rate',
                change_type='ADJUST_TOTAL_EXPENSES',
                default_parameters={'monthly_adjustment': '-300'},
                impact_estimate='Adds ~$300/mo to savings',
            ),
            ActionCandidate(
                id='side_income',
                name='Add Side Income',
                description='Start a side gig or freelance work',
                change_type='ADJUST_TOTAL_INCOME',
                default_parameters={'monthly_adjustment': '500', 'tax_treatment': '1099'},
                impact_estimate='Adds ~$300/mo after taxes',
            ),
            ActionCandidate(
                id='pause_retirement',
                name='Temporarily Reduce Retirement Contributions',
                description='Lower 401k contributions until emergency fund is built',
                change_type='MODIFY_401K',
                default_parameters={'percentage': 3},
                impact_estimate='Redirects retirement savings to liquid savings',
            ),
        ],
        'suggest': lambda snapshot, goals: _suggest_liquidity_action(snapshot, goals),
    },
    'improve_dscr': {
        'name': 'Improve Debt Coverage',
        'description': 'Increase your debt service coverage ratio for better financial stability',
        'severity_map': {
            'dscr_below_1': 'critical',
            'dscr_below_1.25': 'warning',
            'dscr_below_1.5': 'info',
        },
        'applies_when': 'dscr_below_target',
        'candidates': [
            ActionCandidate(
                id='payoff_debt',
                name='Accelerate Debt Payoff',
                description='Make extra payments on high-interest debt',
                change_type='PAYOFF_DEBT',
                default_parameters={'extra_monthly': '300'},
                impact_estimate='Reduces debt faster, improving DSCR over time',
            ),
            ActionCandidate(
                id='reduce_expenses',
                name='Reduce Monthly Expenses',
                description='Lower expenses to improve debt coverage',
                change_type='ADJUST_TOTAL_EXPENSES',
                default_parameters={'monthly_adjustment': '-400'},
                impact_estimate='Immediately improves DSCR',
            ),
            ActionCandidate(
                id='refinance',
                name='Refinance High-Interest Debt',
                description='Lower interest rates to reduce monthly payments',
                change_type='REFINANCE',
                default_parameters={'rate': 0.055, 'term_months': 360},
                impact_estimate='May lower monthly payments significantly',
            ),
        ],
        'suggest': lambda snapshot, goals: _suggest_dscr_action(snapshot, goals),
    },
    'increase_savings_rate': {
        'name': 'Boost Savings Rate',
        'description': 'Increase your monthly savings rate for long-term wealth building',
        'severity_map': {
            'savings_below_0': 'critical',
            'savings_below_10': 'warning',
            'savings_below_20': 'info',
        },
        'applies_when': 'savings_below_target',
        'candidates': [
            ActionCandidate(
                id='increase_401k',
                name='Increase 401(k) Contribution',
                description='Boost retirement savings (pre-tax)',
                change_type='MODIFY_401K',
                default_parameters={'percentage': 15},
                impact_estimate='Adds to savings with tax advantage',
            ),
            ActionCandidate(
                id='reduce_expenses',
                name='Reduce Monthly Expenses',
                description='Cut spending to increase savings',
                change_type='ADJUST_TOTAL_EXPENSES',
                default_parameters={'monthly_adjustment': '-500'},
                impact_estimate='Directly increases savings rate',
            ),
            ActionCandidate(
                id='auto_save',
                name='Set Up Automatic Savings',
                description='Automatically transfer to savings/investment account',
                change_type='SET_SAVINGS_TRANSFER',
                default_parameters={'amount': '500'},
                impact_estimate='Ensures consistent savings',
            ),
        ],
        'suggest': lambda snapshot, goals: _suggest_savings_action(snapshot, goals),
    },
    'reduce_high_interest_debt': {
        'name': 'Tackle High-Interest Debt',
        'description': 'Eliminate costly high-interest debt',
        'severity_map': {
            'high_ratio': 'critical',
            'moderate_ratio': 'warning',
        },
        'applies_when': 'high_interest_debt',
        'candidates': [
            ActionCandidate(
                id='avalanche_payoff',
                name='Avalanche Debt Payoff',
                description='Extra payments to highest-interest debt first',
                change_type='PAYOFF_DEBT',
                default_parameters={'extra_monthly': '500'},
                impact_estimate='Minimizes total interest paid',
            ),
            ActionCandidate(
                id='balance_transfer',
                name='Balance Transfer',
                description='Transfer high-interest balances to lower-rate card',
                change_type='REFINANCE',
                default_parameters={'rate': 0.0, 'term_months': 18},
                impact_estimate='0% APR for promotional period',
            ),
            ActionCandidate(
                id='consolidation',
                name='Debt Consolidation Loan',
                description='Consolidate into single lower-interest loan',
                change_type='REFINANCE',
                default_parameters={'rate': 0.08, 'term_months': 60},
                impact_estimate='Single payment at lower rate',
            ),
        ],
        'suggest': lambda snapshot, goals: _suggest_debt_action(snapshot, goals),
    },
}


def _suggest_liquidity_action(snapshot: MetricSnapshot, goals: list[Goal]) -> dict:
    """Suggest liquidity action based on current state."""
    target = get_goal_target(goals, GoalType.EMERGENCY_FUND_MONTHS, Decimal('6'))
    current = snapshot.liquidity_months
    gap_months = target - current
    monthly_expenses = snapshot.total_monthly_expenses

    # Estimate dollar gap
    dollar_gap = gap_months * monthly_expenses

    # Determine severity
    if current < 1:
        severity = 'critical'
    elif current < 3:
        severity = 'warning'
    else:
        severity = 'info'

    # Recommend based on savings rate
    if snapshot.savings_rate < Decimal('0.05'):
        recommended = 'reduce_expenses'
    elif snapshot.savings_rate > Decimal('0.20'):
        recommended = 'reduce_expenses'  # Already saving, optimize expenses
    else:
        recommended = 'side_income'

    return {
        'severity': severity,
        'recommended_candidate': recommended,
        'context': {
            'current_months': str(current),
            'target_months': str(target),
            'gap_months': str(gap_months),
            'dollar_gap': str(dollar_gap),
        }
    }


def _suggest_dscr_action(snapshot: MetricSnapshot, goals: list[Goal]) -> dict:
    """Suggest DSCR improvement action."""
    target = get_goal_target(goals, GoalType.MIN_DSCR, Decimal('1.25'))
    current = snapshot.dscr

    if current < 1:
        severity = 'critical'
        recommended = 'reduce_expenses'  # Immediate relief
    elif current < Decimal('1.25'):
        severity = 'warning'
        recommended = 'payoff_debt'
    else:
        severity = 'info'
        recommended = 'payoff_debt'

    return {
        'severity': severity,
        'recommended_candidate': recommended,
        'context': {
            'current_dscr': str(current),
            'target_dscr': str(target),
        }
    }


def _suggest_savings_action(snapshot: MetricSnapshot, goals: list[Goal]) -> dict:
    """Suggest savings rate improvement action."""
    target = get_goal_target(goals, GoalType.MIN_SAVINGS_RATE, Decimal('0.10'))
    current = snapshot.savings_rate

    if current < 0:
        severity = 'critical'
        recommended = 'reduce_expenses'
    elif current < Decimal('0.10'):
        severity = 'warning'
        recommended = 'increase_401k'  # Tax advantage
    else:
        severity = 'info'
        recommended = 'auto_save'

    return {
        'severity': severity,
        'recommended_candidate': recommended,
        'context': {
            'current_rate': str(current * 100),
            'target_rate': str(target * 100),
        }
    }


def _suggest_debt_action(snapshot: MetricSnapshot, goals: list[Goal]) -> dict:
    """Suggest high-interest debt action."""
    ratio = snapshot.high_interest_debt_ratio

    if ratio > Decimal('0.3'):
        severity = 'critical'
        recommended = 'avalanche_payoff'
    elif ratio > Decimal('0.15'):
        severity = 'warning'
        recommended = 'balance_transfer'
    else:
        severity = 'info'
        recommended = 'consolidation'

    return {
        'severity': severity,
        'recommended_candidate': recommended,
        'context': {
            'high_interest_ratio': str(ratio * 100),
        }
    }


def get_applicable_actions(
    snapshot: MetricSnapshot,
    goals: list[Goal]
) -> list[ActionSuggestion]:
    """
    Get all applicable actions for the current financial state.

    Args:
        snapshot: Current metric snapshot
        goals: User's active goals

    Returns:
        List of ActionSuggestion objects for applicable templates
    """
    suggestions = []

    for template_id, template in ACTION_TEMPLATES.items():
        rule_name = template['applies_when']
        rule_fn = APPLIES_WHEN_RULES.get(rule_name)

        if not rule_fn:
            continue

        if not rule_fn(snapshot, goals):
            continue

        # Get suggestion details
        suggest_fn = template.get('suggest')
        if suggest_fn:
            suggestion_details = suggest_fn(snapshot, goals)
        else:
            suggestion_details = {
                'severity': 'info',
                'recommended_candidate': template['candidates'][0].id if template['candidates'] else None,
                'context': {}
            }

        suggestions.append(ActionSuggestion(
            template_id=template_id,
            name=template['name'],
            description=template['description'],
            severity=suggestion_details.get('severity', 'info'),
            candidates=template['candidates'],
            recommended_candidate_id=suggestion_details.get('recommended_candidate'),
            context=suggestion_details.get('context', {}),
        ))

    # Sort by severity (critical first)
    severity_order = {'critical': 0, 'warning': 1, 'info': 2}
    suggestions.sort(key=lambda s: severity_order.get(s.severity, 3))

    return suggestions


def compile_action(
    template_id: str,
    candidate_id: str,
    parameters: Optional[dict] = None
) -> dict:
    """
    Compile an action into a scenario change specification.

    Args:
        template_id: The action template ID
        candidate_id: The selected candidate ID
        parameters: Optional parameter overrides

    Returns:
        Change specification for the decision builder
    """
    if template_id not in ACTION_TEMPLATES:
        raise ValueError(f"Unknown action template: {template_id}")

    template = ACTION_TEMPLATES[template_id]
    candidate = None

    for c in template['candidates']:
        if c.id == candidate_id:
            candidate = c
            break

    if not candidate:
        raise ValueError(f"Unknown candidate: {candidate_id}")

    # Merge default parameters with overrides
    final_params = {**candidate.default_parameters}
    if parameters:
        final_params.update(parameters)

    return {
        'change_type': candidate.change_type,
        'name': candidate.name,
        'parameters': final_params,
    }
