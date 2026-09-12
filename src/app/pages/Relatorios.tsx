import { TrendingUp, DollarSign, Calendar, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function Relatorios() {
  const statsData = [
    { title: 'Receita Mensal', value: 'R$ 12.450', icon: DollarSign, color: '#10B981', trend: '+12%' },
    { title: 'Agendamentos', value: '48', icon: Calendar, color: '#3296FA', trend: '+8%' },
    { title: 'Clientes Ativos', value: '5', icon: Users, color: '#FF6B00', trend: '+5%' },
    { title: 'Taxa de Retorno', value: '87%', icon: TrendingUp, color: '#9333EA', trend: '+3%' },
  ];

  const monthlyRevenue = [
    { month: 'Jan', value: 8500 },
    { month: 'Fev', value: 9200 },
    { month: 'Mar', value: 12450 },
  ];

  const servicesData = [
    { name: 'Banho e Tosa', value: 35, color: '#3296FA' },
    { name: 'Consulta', value: 25, color: '#FF6B00' },
    { name: 'Vacina', value: 20, color: '#9333EA' },
    { name: 'Outros', value: 20, color: '#10B981' },
  ];

  const topServices = [
    { name: 'Banho e Tosa', count: 24, revenue: 'R$ 2.280' },
    { name: 'Consulta Veterinária', count: 12, revenue: 'R$ 1.440' },
    { name: 'Vacina', count: 8, revenue: 'R$ 640' },
    { name: 'Tosa', count: 6, revenue: 'R$ 360' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#333333' }}>📊 Relatórios</h1>
        <p className="text-sm" style={{ color: '#666' }}>Relatório · Março 2026</p>
        <p className="mt-2 text-xs text-[#666]">Indicadores ilustrativos do protótipo original, independentes dos cadastros de demonstração.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 xl:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: stat.color + '20' }}
                >
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
                <span 
                  className="text-xs font-semibold px-2 py-1 rounded"
                  style={{ backgroundColor: '#10B981' + '20', color: '#10B981' }}
                >
                  {stat.trend}
                </span>
              </div>
              <p className="text-xs mb-1" style={{ color: '#666' }}>{stat.title}</p>
              <p className="text-xl font-bold" style={{ color: '#333333' }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="font-semibold mb-4" style={{ color: '#333333' }}>📈 Receita Mensal</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="month" stroke="#666" style={{ fontSize: '12px' }} />
            <YAxis stroke="#666" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => [`R$ ${value}`, 'Receita']}
            />
            <Bar dataKey="value" fill="#3296FA" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Services Distribution */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="font-semibold mb-4" style={{ color: '#333333' }}>🎯 Distribuição de Serviços</h2>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width="50%" height={150}>
            <PieChart>
              <Pie
                data={servicesData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {servicesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {servicesData.map((service, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: service.color }}
                />
                <span className="text-xs" style={{ color: '#666' }}>
                  {service.name} ({service.value}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold mb-4" style={{ color: '#333333' }}>🏆 Serviços Mais Realizados</h2>
        <div className="space-y-3">
          {topServices.map((service, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: '#F5F7FA' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: '#3296FA' }}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#333333' }}>
                    {service.name}
                  </p>
                  <p className="text-xs" style={{ color: '#666' }}>
                    {service.count} realizações
                  </p>
                </div>
              </div>
              <span className="font-semibold" style={{ color: '#10B981' }}>
                {service.revenue}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
