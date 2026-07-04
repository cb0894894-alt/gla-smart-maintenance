export const modules = [
  { name: "Activos", value: "248", trend: "+12", status: "Operativos" },
  {
    name: "Órdenes de trabajo",
    value: "37",
    trend: "8 urgentes",
    status: "En curso",
  },
  {
    name: "Mantenimiento Preventivo",
    value: "92%",
    trend: "+6%",
    status: "Cumplimiento",
  },
  {
    name: "Inventario",
    value: "1,284",
    trend: "14 bajos",
    status: "Repuestos",
  },
  { name: "Historial", value: "4,912", trend: "180 mes", status: "Eventos" },
  {
    name: "Indicadores",
    value: "96.4%",
    trend: "MTBF ↑",
    status: "Disponibilidad",
  },
];

export const workOrders = [
  {
    id: "OT-1048",
    asset: "Compresor Atlas C7",
    owner: "Laura Méndez",
    priority: "Alta",
    eta: "Hoy 16:00",
  },
  {
    id: "OT-1049",
    asset: "Línea de envasado 2",
    owner: "Diego Torres",
    priority: "Media",
    eta: "Mañana 09:30",
  },
  {
    id: "OT-1050",
    asset: "Bomba hidráulica H-22",
    owner: "Ana Ruiz",
    priority: "Crítica",
    eta: "Hoy 12:15",
  },
];

export const inventory = [
  { sku: "FLT-220", name: "Filtro HEPA industrial", stock: 8, min: 12 },
  { sku: "BRG-018", name: "Rodamiento sellado", stock: 34, min: 20 },
  { sku: "SNS-TMP", name: "Sensor temperatura IoT", stock: 11, min: 10 },
];
