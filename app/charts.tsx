"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART } from "./ui";

const tooltipStyle = {
  background: "#09090b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
  color: "#e4e4e7",
};

export function InvestidoFaturamentoChart({
  data,
}: {
  data: { label: string; investido: number; faturamento: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#18181b" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART.text }} />
        <Bar dataKey="investido" name="Investido" fill={CHART.red} radius={[4, 4, 0, 0]} />
        <Bar dataKey="faturamento" name="Faturamento" fill={CHART.green} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
        <XAxis type="number" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke={CHART.axis}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#18181b" }} />
        <Bar dataKey="value" fill={CHART.green} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
