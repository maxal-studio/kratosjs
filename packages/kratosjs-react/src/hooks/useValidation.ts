import { useMemo } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { RHFValidationRules } from '../types';
import type { ValidationRule } from '@maxal_studio/kratosjs';
// Runtime engine is imported from the pure /dist/validation subpath (no server
// code), so it never drags Panel/MikroORM/Express into the browser bundle.
import { ValidationEngine } from '@maxal_studio/kratosjs/dist/validation';
import { evaluateCondition } from '../runtime/conditions';
import { useI18nContext } from '../i18n/I18nProvider';

/**
 * Validation rule with optional condition
 */
interface ValidationRuleWithCondition {
	rule: ValidationRule;
	condition?: boolean | string; // Serialized function string or boolean
}

/**
 * Hook to convert KratosJs validation rules to React Hook Form format.
 *
 * Rule semantics are NOT re-implemented here: after resolving each rule's
 * condition against the live form state, the surviving rules are handed to the
 * shared `ValidationEngine` — the SAME engine the backend runs — via a single
 * RHF `validate` function. This guarantees the client and server agree on every
 * rule and message. `required` is additionally mapped to RHF's native
 * `required` so the required-asterisk UI keeps working.
 *
 * @param rules Validation rules (strings, or objects with rule + condition)
 * @param operation Current operation ('create' | 'edit' | 'view')
 * @param fieldName Name of the field being validated (for cross-field rules and messages)
 * @returns React Hook Form validation object
 */
export function useValidation(
	rules: (ValidationRule | ValidationRuleWithCondition)[] = [],
	operation?: 'create' | 'edit' | 'view',
	fieldName = '',
): RHFValidationRules {
	const { control } = useFormContext();
	const formState = useWatch({ control }) || {};
	const { t } = useI18nContext();

	return useMemo(() => {
		const validation: RHFValidationRules = {};

		// Resolve conditions against the live form state, keeping only the
		// rule strings that currently apply.
		const activeRules: string[] = [];
		rules.forEach(ruleOrObj => {
			let rule: ValidationRule;
			let condition: boolean | string | undefined;

			if (typeof ruleOrObj === 'object' && ruleOrObj !== null && 'rule' in ruleOrObj) {
				rule = ruleOrObj.rule;
				condition = ruleOrObj.condition;
			} else {
				rule = ruleOrObj as ValidationRule;
			}

			if (condition !== undefined) {
				const shouldApply = evaluateCondition(condition, formState, operation);
				if (!shouldApply) return;
			}

			if (typeof rule === 'string') activeRules.push(rule);
		});

		// `required` → RHF native (drives the asterisk + empty-value enforcement).
		if (activeRules.includes('required')) {
			validation.required = t('core:validation.required_generic');
		}

		// Everything else is delegated to the shared engine. `required` is handled
		// natively above, so it's excluded here to avoid a duplicate message.
		const engineRules = activeRules.filter(r => r !== 'required');
		if (engineRules.length > 0) {
			validation.validate = {
				...((validation.validate as any) || {}),
				kratos: (value: any, formValues: any) => {
					const violations = ValidationEngine.validateValue(value, engineRules, {
						allValues: formValues || {},
						field: fieldName,
					});
					if (violations.length === 0) return true;
					const v = violations[0];
					// Render in the active locale when the rule provides an i18n key;
					// otherwise use the already-rendered message (overrides/inline).
					return v.messageKey ? t(`core:${v.messageKey}`, v.params) : v.message;
				},
			};
		}

		return validation;
	}, [rules, formState, operation, fieldName, t]);
}
