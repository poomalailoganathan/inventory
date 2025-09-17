import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Trash2, Calculator, Edit3 } from 'lucide-react';
import { useInventoryData } from '../hooks/useIndexedDB';
import { dbManager, STORES } from '../utils/database';

export default function ProcessOutput() {
  const { processes, updateProcess, addRod } = useInventoryData();
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [outputs, setOutputs] = useState({
    finishedGoods: { number: '', height: '', heightUnit: 'mm', weightPerItem: '' },
    nonConforming: { number: '', height: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
    rejected: { number: '', reason: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
    weightLoss: { weight: '', weightLossPerRod: '' },
    leftover: { weight: '' }
  });
  const [editModes, setEditModes] = useState({
    totalWeightLoss: false,
    weightLossPerRod: false,
    leftoverWeight: false
  });
  const [addRemainingToStock, setAddRemainingToStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inProgressProcesses = processes.filter(p => p.status === 'in-progress');
  const selectedProcessData = processes.find(p => p.id === selectedProcess);

  // Auto-populate when process is selected
  React.useEffect(() => {
    if (selectedProcessData) {
      const heightInMm = selectedProcessData.lengthPerRod;
      const weightLossPerRod = selectedProcessData.wastagePerRod;
      
      setOutputs(prev => ({
        ...prev,
        finishedGoods: {
          number: selectedProcessData.numberOfRods.toString(),
          height: heightInMm.toString(),
          heightUnit: 'mm',
          weightPerItem: selectedProcessData.weightPerRod.toString()
        },
        weightLoss: {
          weight: (weightLossPerRod * selectedProcessData.numberOfRods).toString(),
          weightLossPerRod: weightLossPerRod.toString()
        }
      }));
    }
  }, [selectedProcessData]);

  // Auto-calculate weight loss when items change
  React.useEffect(() => {
    if (selectedProcessData && !editModes.totalWeightLoss) {
      const finishedCount = parseInt(outputs.finishedGoods.number) || 0;
      const nonConformingCount = parseInt(outputs.nonConforming.number) || 0;
      const rejectedCount = parseInt(outputs.rejected.number) || 0;
      const totalItems = finishedCount + nonConformingCount + rejectedCount;
      const weightLossPerRod = parseFloat(outputs.weightLoss.weightLossPerRod) || 0;
      
      setOutputs(prev => ({
        ...prev,
        weightLoss: {
          ...prev.weightLoss,
          weight: (weightLossPerRod * totalItems).toString()
        }
      }));
    }
  }, [outputs.finishedGoods.number, outputs.nonConforming.number, outputs.rejected.number, outputs.weightLoss.weightLossPerRod, editModes.totalWeightLoss, selectedProcessData]);

  // Auto-calculate leftover weight
  React.useEffect(() => {
    if (selectedProcessData && !editModes.leftoverWeight) {
      const finishedWeight = (parseInt(outputs.finishedGoods.number) || 0) * (parseFloat(outputs.finishedGoods.weightPerItem) || 0);
      const nonConformingWeight = (parseInt(outputs.nonConforming.number) || 0) * (parseFloat(outputs.nonConforming.weightPerItem) || 0);
      const rejectedWeight = (parseInt(outputs.rejected.number) || 0) * (parseFloat(outputs.rejected.weightPerItem) || 0);
      const weightLossWeight = parseFloat(outputs.weightLoss.weight) || 0;
      
      const totalUsed = finishedWeight + nonConformingWeight + rejectedWeight + weightLossWeight;
      const leftover = Math.max(0, selectedProcessData.weightUsed - totalUsed);
      
      setOutputs(prev => ({
        ...prev,
        leftover: {
          weight: leftover.toFixed(3)
        }
      }));
    }
  }, [outputs.finishedGoods, outputs.nonConforming, outputs.rejected, outputs.weightLoss.weight, selectedProcessData, editModes.leftoverWeight]);

  const convertHeight = (value: number, fromUnit: string, toUnit: string): number => {
    const toMm = (val: number, unit: string) => {
      switch (unit) {
        case 'cm': return val * 10;
        case 'm': return val * 1000;
        default: return val; // mm
      }
    };
    
    const fromMm = (val: number, unit: string) => {
      switch (unit) {
        case 'cm': return val / 10;
        case 'm': return val / 1000;
        default: return val; // mm
      }
    };
    
    const mmValue = toMm(value, fromUnit);
    return fromMm(mmValue, toUnit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcess) return;

    setIsSubmitting(true);
    try {
      const processId = selectedProcess;

      // Add finished goods
      if (outputs.finishedGoods.number) {
        const totalWeight = parseInt(outputs.finishedGoods.number) * parseFloat(outputs.finishedGoods.weightPerItem);
        const heightInMm = convertHeight(parseFloat(outputs.finishedGoods.height), outputs.finishedGoods.heightUnit, 'mm');
        
        await dbManager.add(STORES.FINISHED_GOODS, {
          id: crypto.randomUUID(),
          processId,
          number: parseInt(outputs.finishedGoods.number),
          height: heightInMm,
          weight: totalWeight,
          weightPerItem: parseFloat(outputs.finishedGoods.weightPerItem),
          createdAt: new Date()
        });
      }

      // Add non-conforming items
      if (outputs.nonConforming.number) {
        const totalWeight = parseInt(outputs.nonConforming.number) * parseFloat(outputs.nonConforming.weightPerItem);
        const heightInMm = convertHeight(parseFloat(outputs.nonConforming.height), outputs.nonConforming.heightUnit, 'mm');
        
        await dbManager.add(STORES.NON_CONFORMING, {
          id: crypto.randomUUID(),
          processId,
          number: parseInt(outputs.nonConforming.number),
          height: heightInMm,
          weight: totalWeight,
          weightPerItem: parseFloat(outputs.nonConforming.weightPerItem),
          includeInReport: outputs.nonConforming.includeInReport,
          createdAt: new Date()
        });
      }

      // Add rejected items
      if (outputs.rejected.number) {
        const totalWeight = parseInt(outputs.rejected.number) * parseFloat(outputs.rejected.weightPerItem);
        
        await dbManager.add(STORES.REJECTED, {
          id: crypto.randomUUID(),
          processId,
          number: parseInt(outputs.rejected.number),
          weight: totalWeight,
          weightPerItem: parseFloat(outputs.rejected.weightPerItem),
          reason: outputs.rejected.reason,
          includeInReport: outputs.rejected.includeInReport,
          createdAt: new Date()
        });
      }

      // Add weight loss
      if (outputs.weightLoss.weight) {
        await dbManager.add(STORES.WEIGHT_LOSS, {
          id: crypto.randomUUID(),
          processId,
          weight: parseFloat(outputs.weightLoss.weight),
          weightLossPerRod: parseFloat(outputs.weightLoss.weightLossPerRod),
          createdAt: new Date()
        });
      }

      // Add process summary
      const summary = calculateSummary();
      if (summary) {
        await dbManager.add(STORES.PROCESS_SUMMARY, {
          id: crypto.randomUUID(),
          processId,
          totalWeightUsed: summary.totalWeightUsed,
          totalWeightLoss: summary.totalWeightLoss,
          remainingWeight: summary.remainingWeight,
          weightLossPerRod: parseFloat(outputs.weightLoss.weightLossPerRod) || 0,
          addRemainingToStock,
          createdAt: new Date()
        });
      }

      // Add leftover material back to inventory if selected
      if (addRemainingToStock && outputs.leftover.weight && selectedProcessData) {
        await addRod({
          diameter: selectedProcessData.diameter,
          weight: parseFloat(outputs.leftover.weight)
        }, false);
      }

      // Update process status to completed
      await updateProcess(processId, { status: 'completed' });

      // Reset form
      setSelectedProcess('');
      setOutputs({
        finishedGoods: { number: '', height: '', heightUnit: 'mm', weightPerItem: '' },
        nonConforming: { number: '', height: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
        rejected: { number: '', reason: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
        weightLoss: { weight: '', weightLossPerRod: '' },
        leftover: { weight: '' }
      });
      setEditModes({ totalWeightLoss: false, weightLossPerRod: false, leftoverWeight: false });
      setAddRemainingToStock(false);

      // Show success feedback
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Process completed successfully!';
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to complete process:', error);
      alert('Failed to complete process. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSummary = () => {
    if (!selectedProcessData) return null;

    const finishedWeight = (parseInt(outputs.finishedGoods.number) || 0) * (parseFloat(outputs.finishedGoods.weightPerItem) || 0);
    const nonConformingWeight = (parseInt(outputs.nonConforming.number) || 0) * (parseFloat(outputs.nonConforming.weightPerItem) || 0);
    const rejectedWeight = (parseInt(outputs.rejected.number) || 0) * (parseFloat(outputs.rejected.weightPerItem) || 0);
    const weightLossWeight = parseFloat(outputs.weightLoss.weight) || 0;
    const leftoverWeight = parseFloat(outputs.leftover.weight) || 0;

    return {
      totalWeightUsed: selectedProcessData.weightUsed,
      totalWeightLoss: weightLossWeight,
      remainingWeight: leftoverWeight
    };
  };

  const handleProcessChange = (processId: string) => {
    setSelectedProcess(processId);
    setOutputs({
      finishedGoods: { number: '', height: '', heightUnit: 'mm', weightPerItem: '' },
      nonConforming: { number: '', height: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
      rejected: { number: '', reason: '', heightUnit: 'mm', weightPerItem: '', includeInReport: false },
      weightLoss: { weight: '', weightLossPerRod: '' },
      leftover: { weight: '' }
    });
    setEditModes({ totalWeightLoss: false, weightLossPerRod: false, leftoverWeight: false });
  };

  const updateOutput = (category: string, field: string, value: any) => {
    setOutputs(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const toggleEditMode = (field: string) => {
    setEditModes(prev => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev]
    }));
  };

  const summary = calculateSummary();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Process Output</h2>
            <p className="text-gray-600">Record the results of manufacturing processes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Process Selection */}
          <div>
            <label htmlFor="process" className="block text-sm font-semibold text-gray-700 mb-2">
              Select Process
            </label>
            <select
              id="process"
              required
              value={selectedProcess}
              onChange={(e) => handleProcessChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">Choose a process...</option>
              {inProgressProcesses.map(process => (
                <option key={process.id} value={process.id}>
                  {process.name} (ID: {process.processId})
                </option>
              ))}
            </select>
          </div>

          {/* Process Summary Display */}
          {selectedProcessData && summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="flex items-center space-x-2 font-semibold text-blue-800 mb-3">
                <Calculator className="h-5 w-5" />
                <span>Process Information</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600 font-medium">Material Used</p>
                  <p className="text-blue-800">{selectedProcessData.weightUsed} kg</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Number of Rods</p>
                  <p className="text-blue-800">{selectedProcessData.numberOfRods}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Length per Rod</p>
                  <p className="text-blue-800">{selectedProcessData.lengthPerRod} mm</p>
                </div>
                <div>
                  <p className="text-blue-600 font-medium">Weight per Rod</p>
                  <p className="text-blue-800">{selectedProcessData.weightPerRod} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Output Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Finished Goods */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <h3 className="flex items-center space-x-2 font-semibold text-green-800 mb-3">
                <CheckCircle className="h-5 w-5" />
                <span>Finished Goods</span>
              </h3>
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Number of items"
                  value={outputs.finishedGoods.number}
                  onChange={(e) => updateOutput('finishedGoods', 'number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Height"
                    value={outputs.finishedGoods.height}
                    onChange={(e) => updateOutput('finishedGoods', 'height', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={outputs.finishedGoods.heightUnit}
                    onChange={(e) => updateOutput('finishedGoods', 'heightUnit', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                  </select>
                </div>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Weight per item (kg)"
                  value={outputs.finishedGoods.weightPerItem}
                  onChange={(e) => updateOutput('finishedGoods', 'weightPerItem', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="bg-gray-100 px-3 py-2 rounded border">
                  <p className="text-sm text-gray-600">Total Weight: {((parseInt(outputs.finishedGoods.number) || 0) * (parseFloat(outputs.finishedGoods.weightPerItem) || 0)).toFixed(3)} kg</p>
                </div>
              </div>
            </div>

            {/* Non-Conforming Items */}
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h3 className="flex items-center space-x-2 font-semibold text-yellow-800 mb-3">
                <AlertTriangle className="h-5 w-5" />
                <span>Non-Conforming Items</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeNonConforming"
                    checked={outputs.nonConforming.includeInReport}
                    onChange={(e) => updateOutput('nonConforming', 'includeInReport', e.target.checked)}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <label htmlFor="includeNonConforming" className="text-sm text-yellow-800">
                    Include in report
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="Number of items"
                  value={outputs.nonConforming.number}
                  onChange={(e) => updateOutput('nonConforming', 'number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Height"
                    value={outputs.nonConforming.height}
                    onChange={(e) => updateOutput('nonConforming', 'height', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  />
                  <select
                    value={outputs.nonConforming.heightUnit}
                    onChange={(e) => updateOutput('nonConforming', 'heightUnit', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                  </select>
                </div>
                <input
                  type="number"
                  step="0.001"
                  placeholder="Weight per item (kg)"
                  value={outputs.nonConforming.weightPerItem}
                  onChange={(e) => updateOutput('nonConforming', 'weightPerItem', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
                <div className="bg-gray-100 px-3 py-2 rounded border">
                  <p className="text-sm text-gray-600">Total Weight: {((parseInt(outputs.nonConforming.number) || 0) * (parseFloat(outputs.nonConforming.weightPerItem) || 0)).toFixed(3)} kg</p>
                </div>
              </div>
            </div>

            {/* Rejected Items */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h3 className="flex items-center space-x-2 font-semibold text-red-800 mb-3">
                <XCircle className="h-5 w-5" />
                <span>Rejected Items</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeRejected"
                    checked={outputs.rejected.includeInReport}
                    onChange={(e) => updateOutput('rejected', 'includeInReport', e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="includeRejected" className="text-sm text-red-800">
                    Include in report
                  </label>
                </div>
                <input
                  type="number"
                  placeholder="Number of items"
                  value={outputs.rejected.number}
                  onChange={(e) => updateOutput('rejected', 'number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="number"
                  step="0.001"
                  placeholder="Weight per item (kg)"
                  value={outputs.rejected.weightPerItem}
                  onChange={(e) => updateOutput('rejected', 'weightPerItem', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                />
                <div className="bg-gray-100 px-3 py-2 rounded border">
                  <p className="text-sm text-gray-600">Total Weight: {((parseInt(outputs.rejected.number) || 0) * (parseFloat(outputs.rejected.weightPerItem) || 0)).toFixed(3)} kg</p>
                </div>
                <input
                  type="text"
                  placeholder="Reason for rejection"
                  value={outputs.rejected.reason}
                  onChange={(e) => updateOutput('rejected', 'reason', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Weight Loss */}
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="flex items-center space-x-2 font-semibold text-gray-800 mb-3">
                <Trash2 className="h-5 w-5" />
                <span>Weight Loss / End Bit</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Weight Loss per Rod:</label>
                  {editModes.weightLossPerRod ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.001"
                        value={outputs.weightLoss.weightLossPerRod}
                        onChange={(e) => updateOutput('weightLoss', 'weightLossPerRod', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => toggleEditMode('weightLossPerRod')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{outputs.weightLoss.weightLossPerRod} kg</span>
                      <button
                        type="button"
                        onClick={() => toggleEditMode('weightLossPerRod')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Total Weight Loss:</label>
                  {editModes.totalWeightLoss ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.001"
                        value={outputs.weightLoss.weight}
                        onChange={(e) => updateOutput('weightLoss', 'weight', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => toggleEditMode('totalWeightLoss')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{outputs.weightLoss.weight} kg</span>
                      <button
                        type="button"
                        onClick={() => toggleEditMode('totalWeightLoss')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Leftover Materials */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-800 mb-3">Leftover Materials</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-blue-700">Remaining Weight:</label>
                {editModes.leftoverWeight ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.001"
                      value={outputs.leftover.weight}
                      onChange={(e) => updateOutput('leftover', 'weight', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleEditMode('leftoverWeight')}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{outputs.leftover.weight} kg</span>
                    <button
                      type="button"
                      onClick={() => toggleEditMode('leftoverWeight')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="addToStock"
                  checked={addRemainingToStock}
                  onChange={(e) => setAddRemainingToStock(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="addToStock" className="text-sm text-blue-800">
                  Add remaining weight back to stock
                </label>
              </div>
            </div>
          </div>

          {/* Process Summary */}
          {summary && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Process Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Total Weight Used</p>
                  <p className="text-gray-800">{summary.totalWeightUsed} kg</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Total Weight Loss</p>
                  <p className="text-gray-800">{summary.totalWeightLoss.toFixed(3)} kg</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Weight Loss per Rod</p>
                  <p className="text-gray-800">{(parseFloat(outputs.weightLoss.weightLossPerRod) || 0).toFixed(3)} kg</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Remaining Weight</p>
                  <p className="text-gray-800">{summary.remainingWeight.toFixed(3)} kg</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !selectedProcess}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isSubmitting ? 'Recording...' : 'Complete Process'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}