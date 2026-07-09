// Categorias pre-definidas. Usuario pode adicionar/editar/remover (guardadas no store).
// icone = nome do MaterialCommunityIcons

export const CATEGORIAS_PADRAO = [
  // despesas
  { id: 'moradia',    nome: 'Moradia',      icone: 'home-outline',          cor: '#ff8fab', tipo: 'despesa' },
  { id: 'mercado',    nome: 'Mercado',      icone: 'cart-outline',          cor: '#b6f000', tipo: 'despesa' },
  { id: 'combustivel',nome: 'Combustível',  icone: 'gas-station-outline',   cor: '#ff5e5e', tipo: 'despesa' },
  { id: 'alimentacao',nome: 'Alimentação',  icone: 'silverware-fork-knife', cor: '#ffb02e', tipo: 'despesa' },
  { id: 'assinaturas',nome: 'Assinaturas',  icone: 'credit-card-outline',   cor: '#577590', tipo: 'despesa' },
  { id: 'academia',   nome: 'Academia',     icone: 'dumbbell',              cor: '#4ea8ff', tipo: 'despesa' },
  { id: 'lazer',      nome: 'Lazer',        icone: 'gamepad-variant-outline',cor: '#c77dff', tipo: 'despesa' },
  { id: 'transporte', nome: 'Transporte',   icone: 'bus',                   cor: '#2ec4b6', tipo: 'despesa' },
  { id: 'saude',      nome: 'Saúde',        icone: 'heart-pulse',           cor: '#f9c74f', tipo: 'despesa' },
  { id: 'educacao',   nome: 'Educação',     icone: 'school-outline',        cor: '#90be6d', tipo: 'despesa' },
  { id: 'carro',      nome: 'Carro',        icone: 'car-outline',           cor: '#f3722c', tipo: 'despesa' },
  { id: 'outros',     nome: 'Outros',       icone: 'dots-horizontal',       cor: '#8a928a', tipo: 'despesa' },
  // receitas
  { id: 'salario',    nome: 'Salário',      icone: 'cash-multiple',         cor: '#b6f000', tipo: 'receita' },
  { id: 'freela',     nome: 'Freela',       icone: 'laptop',                cor: '#48cae4', tipo: 'receita' },
  { id: 'investimento_rend', nome: 'Rendimentos', icone: 'chart-line',      cor: '#43aa8b', tipo: 'receita' },
  { id: 'outros_rec', nome: 'Outros',       icone: 'plus-circle-outline',   cor: '#9d4edd', tipo: 'receita' },
];

export const ICONES_DISPONIVEIS = [
  'cart-outline', 'gas-station-outline', 'dumbbell', 'gamepad-variant-outline',
  'silverware-fork-knife', 'bus', 'home-outline', 'heart-pulse', 'school-outline',
  'credit-card-outline', 'car-outline', 'cash-multiple', 'laptop', 'chart-line',
  'airplane', 'gift-outline', 'paw', 'baby-carriage', 'tshirt-crew-outline',
  'coffee-outline', 'beer-outline', 'pill', 'wrench-outline', 'cellphone',
  'movie-outline', 'music', 'book-outline', 'piggy-bank-outline', 'dots-horizontal',
];
