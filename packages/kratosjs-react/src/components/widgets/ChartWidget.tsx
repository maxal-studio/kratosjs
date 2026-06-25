import React, { useMemo } from 'react';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	ChartOptions,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { cn } from '../../utils/classNames';
import { WidgetShell } from './WidgetShell';
import { translate } from '../../i18n/activeLocale';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export interface ChartWidgetProps {
	widget: {
		name: string;
		label?: string;
		icon?: string;
		color?: string;
		chartType: 'line' | 'bar' | 'pie';
		showLegend?: boolean;
	};
	data: Array<{ label: string; value: number }> | null;
}

function readThemeColor(cssVar: string, fallback: string): string {
	if (typeof document === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
	return value || fallback;
}

function getThemeColors() {
	const fallbackAccent = '59, 130, 246';
	const defaultPalette = ['#2563eb', '#059669', '#d97706', '#dc2626', '#52525b'];
	const defaultPaletteSoft = ['#dbeafe', '#d1fae5', '#fef3c7', '#fee2e2', '#f3f4f6'];

	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return {
			accent: `rgb(${fallbackAccent})`,
			accentSoft: `rgba(${fallbackAccent}, 0.35)`,
			accentFaint: `rgba(${fallbackAccent}, 0.12)`,
			grid: 'rgba(148, 163, 184, 0.2)',
			tick: 'rgba(148, 163, 184, 0.85)',
			tooltipBg: 'rgba(15, 23, 42, 0.92)',
			palette: defaultPalette,
			paletteSoft: defaultPaletteSoft,
		};
	}

	const accent = readThemeColor('--kratos-accent', '#2563eb');
	const fgMuted = readThemeColor('--kratos-fg-muted', '#9ca3af');
	const surface = readThemeColor('--kratos-surface', '#151517');

	const palette = [
		readThemeColor('--kratos-accent', '#2563eb'),
		readThemeColor('--kratos-success', '#059669'),
		readThemeColor('--kratos-warning', '#d97706'),
		readThemeColor('--kratos-danger', '#dc2626'),
		readThemeColor('--kratos-fg-secondary', '#52525b'),
	];

	const paletteSoft = [
		readThemeColor('--kratos-accent-soft', '#dbeafe'),
		readThemeColor('--kratos-success-soft', '#d1fae5'),
		readThemeColor('--kratos-warning-soft', '#fef3c7'),
		readThemeColor('--kratos-danger-soft', '#fee2e2'),
		readThemeColor('--kratos-muted', '#f3f4f6'),
	];

	return {
		accent,
		accentSoft: readThemeColor('--kratos-accent-soft', '#dbeafe'),
		accentFaint: readThemeColor('--kratos-accent-soft', '#dbeafe'),
		grid: fgMuted,
		tick: fgMuted,
		tooltipBg: surface,
		palette,
		paletteSoft,
	};
}

function colorForIndex(theme: ReturnType<typeof getThemeColors>, index: number, soft = false): string {
	const colors = soft ? theme.paletteSoft : theme.palette;
	return colors[index % colors.length] ?? colors[0];
}

/** Prefer stable semantic colors for common labels (e.g. admin/editor roles). */
function colorForLabel(theme: ReturnType<typeof getThemeColors>, label: string, index: number, soft = false): string {
	const semanticIndex: Record<string, number> = {
		admin: 3,
		editor: 0,
		active: 1,
		inactive: 4,
		published: 1,
		draft: 4,
	};
	const mapped = semanticIndex[label.toLowerCase()];
	return colorForIndex(theme, mapped ?? index, soft);
}

export function ChartWidget({ widget, data }: ChartWidgetProps) {
	const theme = useMemo(() => getThemeColors(), []);

	const chartData = useMemo(() => {
		if (!data || data.length === 0) {
			return { labels: [], datasets: [] };
		}

		if (widget.chartType === 'pie') {
			return {
				labels: data.map(item => item.label),
				datasets: [
					{
						data: data.map(item => item.value),
						backgroundColor: data.map((item, index) => colorForLabel(theme, item.label, index)),
						borderColor: 'transparent',
						borderWidth: 0,
					},
				],
			};
		}

		if (widget.chartType === 'bar') {
			return {
				labels: data.map(item => item.label),
				datasets: [
					{
						label: widget.label || translate('core:widget.data_label'),
						data: data.map(item => item.value),
						backgroundColor: data.map((item, index) => colorForLabel(theme, item.label, index, true)),
						borderColor: data.map((item, index) => colorForLabel(theme, item.label, index)),
						borderWidth: 2,
						borderRadius: 6,
					},
				],
			};
		}

		return {
			labels: data.map(item => item.label),
			datasets: [
				{
					label: widget.label || translate('core:widget.data_label'),
					data: data.map(item => item.value),
					backgroundColor: theme.accentFaint,
					borderColor: theme.accent,
					borderWidth: 2,
					fill: true,
					tension: 0.35,
					pointRadius: 3,
					pointHoverRadius: 4,
					pointBackgroundColor: theme.accent,
				},
			],
		};
	}, [data, widget.label, widget.chartType, theme]);

	const options: ChartOptions<'line' | 'bar' | 'pie'> = useMemo(() => {
		const showLegend = widget.showLegend ?? false;

		if (widget.chartType === 'pie') {
			return {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: showLegend,
						position: 'bottom',
						labels: {
							padding: 12,
							usePointStyle: true,
							boxWidth: 8,
							color: theme.tick,
							font: { size: 11 },
						},
					},
					tooltip: {
						backgroundColor: theme.tooltipBg,
						titleColor: theme.tick,
						bodyColor: theme.tick,
						borderColor: theme.grid,
						borderWidth: 1,
						padding: 10,
					},
				},
			};
		}

		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: showLegend, labels: { color: theme.tick, boxWidth: 8 } },
				tooltip: {
					backgroundColor: theme.tooltipBg,
					titleColor: theme.tick,
					bodyColor: theme.tick,
					borderColor: theme.grid,
					borderWidth: 1,
					padding: 10,
					displayColors: false,
				},
			},
			scales: {
				x: {
					display: false,
					grid: { display: false },
					ticks: { display: false },
				},
				y: {
					beginAtZero: true,
					grid: { color: `${theme.grid}33` },
					ticks: { color: theme.tick, maxTicksLimit: 4, font: { size: 10 } },
					border: { display: false },
				},
			},
		};
	}, [widget.chartType, widget.showLegend, theme]);

	const ChartComponent = widget.chartType === 'line' ? Line : widget.chartType === 'bar' ? Bar : Pie;

	if (!data || data.length === 0) {
		return (
			<WidgetShell label={widget.label} icon={widget.icon} className={widget.color}>
				<div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 bg-base/40 px-3 py-6">
					<p className="text-sm text-fg-muted">{translate('core:state.no_data')}</p>
				</div>
			</WidgetShell>
		);
	}

	return (
		<WidgetShell label={widget.label} icon={widget.icon} className={cn('min-h-[11rem]', widget.color)}>
			<div className="min-h-[7.5rem] flex-1">
				<ChartComponent data={chartData} options={options as any} />
			</div>
		</WidgetShell>
	);
}
