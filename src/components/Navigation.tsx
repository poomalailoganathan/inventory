import React from 'react';
import { 
  Package, 
  Settings, 
  TrendingUp, 
  BarChart3, 
  FileText, 
  Import, 
  Factory 
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'overview', label: 'Inventory Overview', icon: Package },
  { id: 'input-goods', label: 'Input Goods', icon: TrendingUp },
  { id: 'add-process', label: 'Add Process', icon: Factory },
  { id: 'process-output', label: 'Process Output', icon: Settings },
  { id: 'reporting', label: 'Reporting', icon: BarChart3 },
  { id: 'import-export', label: 'Import/Export', icon: Import }
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Factory className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Metal Rod Inventory</h1>
        </div>
      </div>
      <div className="flex space-x-1 mt-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}