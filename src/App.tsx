import React, { useState } from 'react';
import Navigation from './components/Navigation';
import InventoryOverview from './components/InventoryOverview';
import InputGoods from './components/InputGoods';
import AddProcess from './components/AddProcess';
import ProcessOutput from './components/ProcessOutput';
import Reporting from './components/Reporting';
import ImportExport from './components/ImportExport';

function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'overview':
        return <InventoryOverview />;
      case 'input-goods':
        return <InputGoods />;
      case 'add-process':
        return <AddProcess />;
      case 'process-output':
        return <ProcessOutput />;
      case 'reporting':
        return <Reporting />;
      case 'import-export':
        return <ImportExport />;
      default:
        return <InventoryOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="py-8">
        {renderActiveComponent()}
      </main>
    </div>
  );
}

export default App;