import React from 'react';
import { Package, TrendingUp, Weight, BarChart3, History, ArrowUp, ArrowDown } from 'lucide-react';
import { useInventoryData } from '../hooks/useIndexedDB';

export default function InventoryOverview() {
  const { rods, getInventoryStats, getInventoryHistory, loading } = useInventoryData();
  const stats = getInventoryStats();
  const history = getInventoryHistory();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inventory Overview</h2>
            <p className="text-gray-600">Current stock levels and material breakdown</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rods</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalRods}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Weight</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalWeight.toFixed(2)} kg</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Weight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Diameters</p>
                <p className="text-3xl font-bold text-gray-900">{Object.keys(stats.diameterBreakdown).length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory by Diameter */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Inventory by Diameter</h3>
        
        {Object.keys(stats.diameterBreakdown).length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No inventory items</p>
            <p className="text-gray-400">Add rods using the Input Goods menu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(stats.diameterBreakdown)
              .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
              .map(([diameter, data]) => (
                <div key={diameter} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-800">Ø {diameter}mm</h4>
                    <div className="flex space-x-4 text-sm text-gray-600">
                      <span className="bg-green-100 px-2 py-1 rounded">{data.weight.toFixed(2)} kg</span>
                    </div>
                  </div>
                  
                  {/* Individual Rod Weights */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-3">
                    {rods
                      .filter(rod => rod.diameter === parseFloat(diameter))
                      .map(rod => (
                        <div key={rod.id} className="bg-white p-3 rounded border text-sm">
                          <p className="font-medium text-center">{rod.weight}kg</p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Inventory History */}
      <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <History className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Inventory History</h3>
        </div>
        
        {history.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No transaction history</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diameter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Process</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center space-x-1 ${transaction.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'in' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        <span className="text-sm font-medium">{transaction.type === 'in' ? 'IN' : 'OUT'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Ø {transaction.diameter}mm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.weight} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.length ? `${transaction.length} mm` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.processName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}