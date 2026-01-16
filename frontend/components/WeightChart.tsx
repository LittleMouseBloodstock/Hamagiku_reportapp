'use client';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface WeightChartProps {
    color?: string;
    dataPoints?: number[];
    labels?: string[];
}

export default function WeightChart({
    color = '#1a3c34',
    dataPoints = [468, 472, 478, 482],
    labels = ['10月', '11月', '12月', '1月']
}: WeightChartProps) {
    const data = {
        labels,
        datasets: [{
            label: 'Weight (kg)',
            data: dataPoints,
            borderColor: color,
            backgroundColor: color,
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.1
        }]
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: {
                min: 450,
                max: 500,
                grid: {
                    display: true,
                    color: '#e0e0e0',
                    tickBorderDash: [5, 5]
                }
            },
            x: {
                grid: { display: false }
            }
        },
        animation: { duration: 0 } // Disable animation for PDF consistency
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Line data={data} options={options} />
        </div>
    );
}
