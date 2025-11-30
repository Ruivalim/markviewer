import {
	Chart,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	RadialLinearScale,
	Title,
	Tooltip,
	Legend,
	Filler,
	BarController,
	LineController,
	PieController,
	DoughnutController,
	RadarController,
	PolarAreaController,
	ScatterController,
	type ChartConfiguration,
	type ChartType
} from 'chart.js';

// Register all components we need (elements + controllers)
Chart.register(
	// Scales
	CategoryScale,
	LinearScale,
	RadialLinearScale,
	// Elements
	BarElement,
	LineElement,
	PointElement,
	ArcElement,
	// Controllers
	BarController,
	LineController,
	PieController,
	DoughnutController,
	RadarController,
	PolarAreaController,
	ScatterController,
	// Plugins
	Title,
	Tooltip,
	Legend,
	Filler
);

interface ChartDefinition {
	type: ChartType;
	data: {
		labels: string[];
		datasets: Array<{
			label?: string;
			data: number[];
			backgroundColor?: string | string[];
			borderColor?: string | string[];
			borderWidth?: number;
			fill?: boolean;
		}>;
	};
	options?: Record<string, unknown>;
}

// Default color palette (vibrant but professional)
const DEFAULT_COLORS = [
	'#06b6d4', // cyan-500
	'#10b981', // emerald-500
	'#8b5cf6', // violet-500
	'#f59e0b', // amber-500
	'#ef4444', // red-500
	'#ec4899', // pink-500
	'#3b82f6', // blue-500
	'#14b8a6' // teal-500
];

class ChartService {
	private charts = new Map<string, Chart>();

	/**
	 * Render a chart in the given container
	 */
	render(containerId: string, definition: string, theme: 'light' | 'dark'): void {
		const container = document.getElementById(containerId);
		if (!container) {
			console.error(`Chart container not found: ${containerId}`);
			return;
		}

		// Destroy existing chart if any
		this.destroy(containerId);
		container.innerHTML = '';

		// Ensure container has dimensions for Chart.js
		container.style.position = 'relative';
		container.style.minHeight = '300px';
		container.style.width = '100%';

		try {
			const config = JSON.parse(definition) as ChartDefinition;

			// Create canvas element
			const canvas = document.createElement('canvas');
			canvas.style.maxHeight = '400px';
			container.appendChild(canvas);

			// Theme-aware colors
			const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';
			const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

			// Apply default colors if not specified
			config.data.datasets = config.data.datasets.map((dataset, index) => ({
				...dataset,
				backgroundColor: dataset.backgroundColor || (config.type === 'line' ? 'transparent' : DEFAULT_COLORS),
				borderColor: dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
				borderWidth: dataset.borderWidth ?? 2
			}));

			// Build chart configuration
			const chartConfig: ChartConfiguration = {
				type: config.type,
				data: config.data,
				options: {
					responsive: true,
					maintainAspectRatio: true,
					animation: {
						duration: 300
					},
					plugins: {
						legend: {
							display: config.data.datasets.length > 1,
							labels: {
								color: textColor,
								font: {
									family: "'Inter', system-ui, sans-serif"
								}
							}
						},
						title: {
							display: false
						},
						tooltip: {
							backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
							titleColor: textColor,
							bodyColor: textColor,
							borderColor: gridColor,
							borderWidth: 1,
							cornerRadius: 6,
							padding: 10
						}
					},
					...this.getScalesConfig(config.type, textColor, gridColor),
					...config.options
				}
			};

			const chart = new Chart(canvas, chartConfig);
			this.charts.set(containerId, chart);
		} catch (error) {
			console.error('Chart render error:', error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			container.innerHTML = `<div class="chart-error">
				<strong>Chart Error</strong>
				<pre>${this.escapeHtml(errorMessage)}</pre>
			</div>`;
		}
	}

	/**
	 * Get scales configuration based on chart type
	 */
	private getScalesConfig(
		type: ChartType,
		textColor: string,
		gridColor: string
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	): { scales?: any } {
		// Pie and doughnut charts don't have scales
		if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
			return {};
		}

		// Radar chart has a different scale structure
		if (type === 'radar') {
			return {
				scales: {
					r: {
						ticks: { color: textColor },
						grid: { color: gridColor },
						pointLabels: { color: textColor }
					}
				}
			};
		}

		// Standard cartesian scales
		return {
			scales: {
				x: {
					ticks: {
						color: textColor,
						font: { family: "'Inter', system-ui, sans-serif" }
					},
					grid: {
						color: gridColor,
						drawBorder: false
					}
				},
				y: {
					ticks: {
						color: textColor,
						font: { family: "'Inter', system-ui, sans-serif" }
					},
					grid: {
						color: gridColor,
						drawBorder: false
					}
				}
			}
		};
	}

	/**
	 * Render a chart directly on a canvas element (for live preview)
	 */
	renderChart(canvas: HTMLCanvasElement, definition: ChartDefinition, theme: 'light' | 'dark' = 'light'): Chart | null {
		try {
			// Theme-aware colors
			const textColor = theme === 'dark' ? '#e2e8f0' : '#1e293b';
			const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

			// Apply default colors if not specified
			definition.data.datasets = definition.data.datasets.map((dataset, index) => ({
				...dataset,
				backgroundColor: dataset.backgroundColor || (definition.type === 'line' ? 'transparent' : DEFAULT_COLORS),
				borderColor: dataset.borderColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
				borderWidth: dataset.borderWidth ?? 2
			}));

			// Build chart configuration
			const chartConfig: ChartConfiguration = {
				type: definition.type,
				data: definition.data,
				options: {
					responsive: true,
					maintainAspectRatio: true,
					animation: {
						duration: 300
					},
					plugins: {
						legend: {
							display: definition.data.datasets.length > 1,
							labels: {
								color: textColor,
								font: {
									family: "'Inter', system-ui, sans-serif"
								}
							}
						},
						title: {
							display: false
						}
					},
					...this.getScalesConfig(definition.type, textColor, gridColor),
					...definition.options
				}
			};

			return new Chart(canvas, chartConfig);
		} catch (error) {
			console.error('Chart render error:', error);
			return null;
		}
	}

	/**
	 * Destroy a specific chart
	 */
	destroy(containerId: string): void {
		const chart = this.charts.get(containerId);
		if (chart) {
			chart.destroy();
			this.charts.delete(containerId);
		}
	}

	/**
	 * Destroy all charts
	 */
	destroyAll(): void {
		this.charts.forEach((chart) => chart.destroy());
		this.charts.clear();
	}

	/**
	 * Validate a chart definition
	 */
	validate(definition: string): { valid: boolean; error?: string } {
		try {
			const config = JSON.parse(definition) as ChartDefinition;

			if (!config.type) {
				return { valid: false, error: 'Missing "type" field' };
			}

			if (!config.data || !config.data.labels || !config.data.datasets) {
				return { valid: false, error: 'Missing "data.labels" or "data.datasets"' };
			}

			const validTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter'];
			if (!validTypes.includes(config.type)) {
				return { valid: false, error: `Invalid type "${config.type}". Valid types: ${validTypes.join(', ')}` };
			}

			return { valid: true };
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : 'Invalid JSON'
			};
		}
	}

	/**
	 * Escape HTML to prevent XSS
	 */
	private escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}
}

export const chartService = new ChartService();
