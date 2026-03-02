export const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

export const CorpColors = {
  KICONEX: 'font-bold text-blue-400',
  INTARCON: 'font-bold text-blue-800',
  GENAQ: 'font-bold text-purple-900',
  KEYTER: 'font-bold text-green-600',
}

export const getConsistentColor = (index) => COLORS[index % COLORS.length];