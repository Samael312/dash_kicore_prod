export const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'
];

export const CorpColors = {
  KICONEX: '#658eb9',   
  INTARCON: '#0086be',  
  GENAQ: '#0c0091',     
  KEYTER: '#5aaf32',    
}
export const getOrgColor = (orgName) => {
  if (!orgName) return '#94a3b8';
  const upper = orgName.toUpperCase();
  for (const [key, color] of Object.entries(CorpColors)) {
    if (upper.includes(key)) return color;
  }
  return '#94a3b8';
};
export const getConsistentColor = (index) => COLORS[index % COLORS.length];