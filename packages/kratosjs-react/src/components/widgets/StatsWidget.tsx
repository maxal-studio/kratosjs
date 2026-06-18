import React from 'react';
import { WidgetShell } from './WidgetShell';

export interface StatsWidgetProps {
	widget: {
		name: string;
		label?: string;
		icon?: string;
		color?: string;
		format?: 'number' | 'currency' | 'percentage';
		currency?: string;
		precision?: number;
		suffix?: string;
		prefix?: string;
	};
	data: number | null;
}

export function StatsWidget({ widget, data }: StatsWidgetProps) {
	const formatValue = (value: number | null): string => {
		if (value === null || value === undefined) {
			return '—';
		}

		const { format, currency, precision = 0, prefix, suffix } = widget;

		let formatted: string;

		switch (format) {
			case 'currency':
				formatted = new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency: currency || 'USD',
					minimumFractionDigits: precision,
					maximumFractionDigits: precision,
				}).format(value);
				break;

			case 'percentage':
				formatted = `${value.toFixed(precision)}%`;
				break;

			case 'number':
			default:
				formatted = new Intl.NumberFormat(undefined, {
					minimumFractionDigits: precision,
					maximumFractionDigits: precision,
				}).format(value);
				break;
		}

		if (prefix && format !== 'currency') {
			formatted = `${prefix}${formatted}`;
		}

		if (suffix) {
			formatted = `${formatted} ${suffix}`;
		}

		return formatted;
	};

	return (
		<WidgetShell label={widget.label} icon={widget.icon} className={widget.color}>
			<div className="mt-auto">
				<p className="text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">
					{formatValue(data)}
				</p>
			</div>
		</WidgetShell>
	);
}
