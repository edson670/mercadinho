import { useQuery } from '@tanstack/react-query';
import { getSalesChart, getSummary, getTopProducts, type ChartPeriod } from './dashboard.api';

const KEY = 'dashboard';

export function useSummary() {
  return useQuery({ queryKey: [KEY, 'summary'], queryFn: getSummary });
}

export function useSalesChart(period: ChartPeriod) {
  return useQuery({ queryKey: [KEY, 'sales-chart', period], queryFn: () => getSalesChart(period) });
}

export function useTopProducts() {
  return useQuery({ queryKey: [KEY, 'top-products'], queryFn: getTopProducts });
}
