import React, { useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useInventoryData } from '../hooks/useIndexedDB';

const generateProcessId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `PROC-${timestamp}-${random}`.toUpperCase();
};

export default function AddProcess() {
  const { diameters, bladeDiameters, addProcess, updateRodWeight, getAvailableWeight } = useInventoryData();
  const [formData, setFormData] = useState({
    name: '',
    processId: generateProcessId(),
    diameter: '',
    weightUsed: '',
    bladeDiameter: '',
    totalLength: '',
    numberOfRods: '',
    lengthPerRod: '',
    lengthUnit: 'mm' as 'mm' | 'cm' | 'm',
    weightPerRod: '',
    wastagePerRod: '',
    wastageUnit: 'g' as 'g' | 'kg'
  });
  const [customBladeDiameter, setCustomBladeDiameter] = useState('');
  const [showCustomBladeDiameter, setShowCustomBladeDiameter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableWeight = formData.diameter ? getAvailableWeight(parseFloat(formData.diameter)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(formData.weightUsed) > availableWeight) {
      alert('Insufficient weight available for this diameter');
      return;
    }

    setIsSubmitting(true);
    try {
      const bladeDiameterValue = showCustomBladeDiameter ? parseFloat(customBladeDiameter) : parseFloat(formData.bladeDiameter);
      
      // Create process
      await addProcess({
        name: formData.name,
        processId: formData.processId,
        diameter: parseFloat(formData.diameter),
        weightUsed: parseFloat(formData.weightUsed),
        bladeDiameter: bladeDiameterValue,
        totalLength: formData.totalLength ? parseFloat(formData.totalLength) : undefined,
        numberOfRods: parseInt(formData.numberOfRods),
        lengthPerRod: convertToMm(parseFloat(formData.lengthPerRod), formData.lengthUnit),
        lengthUnit: formData.lengthUnit,
        weightPerRod: parseFloat(formData.weightPerRod),
        wastagePerRod: convertWastageToKg(parseFloat(formData.wastagePerRod), formData.wastageUnit),
        wastageUnit: formData.wastageUnit
      });

      // Update inventory weight
      await updateRodWeight(parseFloat(formData.diameter), parseFloat(formData.weightUsed));

      setFormData({
        name: '',
        processId: generateProcessId(),
        diameter: '',
        weightUsed: '',
        bladeDiameter: '',
        totalLength: '',
        numberOfRods: '',
        lengthPerRod: '',
        lengthUnit: 'mm',
        weightPerRod: '',
        wastagePerRod: '',
        wastageUnit: 'g'
      });
      setCustomBladeDiameter('');
      setShowCustomBladeDiameter(false);
      
      // Show success feedback
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Process started successfully!';
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMessage);
      setTimeout(() => document.body.removeChild(successMessage), 3000);
    } catch (error) {
      console.error('Failed to start process:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertToMm = (value: number, unit: string): number => {
    switch (unit) {
      case 'cm': return value * 10;
      case 'm': return value * 1000;
      default: return value; // mm
    }
  };

  const convertWastageToKg = (value: number, unit: string): number => {
    return unit === 'g' ? value / 1000 : value;
  };

  const handleBladeDiameterChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomBladeDiameter(true);
      setFormData(prev => ({ ...prev, bladeDiameter: '' }));
    } else {
      setShowCustomBladeDiameter(false);
      setFormData(prev => ({ ...prev, bladeDiameter: value }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Settings className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Process</h2>
            <p className="text-gray-600">Initiate a new manufacturing process</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Process Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="processName" className="block text-sm font-semibold text-gray-700 mb-2">
                Process Name
              </label>
              <input
                type="text"
                id="processName"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., Cutting Operation"
              />
            </div>

            <div>
              <label htmlFor="processId" className="block text-sm font-semibold text-gray-700 mb-2">
                Process ID
              </label>
              <input
                type="text"
                id="processId"
                readOnly
                value={formData.processId}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated unique ID</p>
            </div>
          </div>

          {/* Material Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Selection</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="diameter" className="block text-sm font-semibold text-gray-700 mb-2">
                  Diameter (mm)
                </label>
                <div className="relative">
                  <select
                    id="diameter"
                    required
                    value={formData.diameter}
                    onChange={(e) => setFormData(prev => ({ ...prev, diameter: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 appearance-none"
                  >
                    <option value="">Select diameter...</option>
                    {diameters.map(diameter => (
                      <option key={diameter} value={diameter}>
                        {diameter}mm
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                {formData.diameter && (
                  <p className="text-sm text-gray-600 mt-1">
                    Available: {availableWeight.toFixed(2)} kg
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="weightUsed" className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight to Use (kg)
                </label>
                <input
                  type="number"
                  id="weightUsed"
                  step="0.01"
                  min="0"
                  max={availableWeight}
                  required
                  value={formData.weightUsed}
                  onChange={(e) => setFormData(prev => ({ ...prev, weightUsed: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter weight"
                />
              </div>

              <div>
                <label htmlFor="bladeDiameter" className="block text-sm font-semibold text-gray-700 mb-2">
                  Blade Diameter (mm)
                </label>
                <div className="relative">
                  <select
                    id="bladeDiameter"
                    required={!showCustomBladeDiameter}
                    value={showCustomBladeDiameter ? 'custom' : formData.bladeDiameter}
                    onChange={(e) => handleBladeDiameterChange(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 appearance-none"
                  >
                    <option value="">Select blade diameter...</option>
                    {bladeDiameters.map(diameter => (
                      <option key={diameter} value={diameter}>
                        {diameter}mm
                      </option>
                    ))}
                    <option value="custom">Add new diameter...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {showCustomBladeDiameter && (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={customBladeDiameter}
                    onChange={(e) => setCustomBladeDiameter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 mt-2"
                    placeholder="Enter new blade diameter"
                  />
                )}
              </div>

              <div>
                <label htmlFor="totalLength" className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Length (mm) - Optional
                </label>
                <input
                  type="number"
                  id="totalLength"
                  step="0.1"
                  min="0"
                  value={formData.totalLength}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalLength: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter total length"
                />
              </div>
            </div>
          </div>

          {/* Process Parameters */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Parameters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="numberOfRods" className="block text-sm font-semibold text-gray-700 mb-2">
                  Number of Rods
                </label>
                <input
                  type="number"
                  id="numberOfRods"
                  min="1"
                  required
                  value={formData.numberOfRods}
                  onChange={(e) => setFormData(prev => ({ ...prev, numberOfRods: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter number of rods"
                />
              </div>

              <div>
                <label htmlFor="lengthPerRod" className="block text-sm font-semibold text-gray-700 mb-2">
                  Length per Rod
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    id="lengthPerRod"
                    step="0.1"
                    min="0"
                    required
                    value={formData.lengthPerRod}
                    onChange={(e) => setFormData(prev => ({ ...prev, lengthPerRod: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter length per rod"
                  />
                  <select
                    value={formData.lengthUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, lengthUnit: e.target.value as 'mm' | 'cm' | 'm' }))}
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="weightPerRod" className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight per Rod (kg)
                </label>
                <input
                  type="number"
                  id="weightPerRod"
                  step="0.001"
                  min="0"
                  required
                  value={formData.weightPerRod}
                  onChange={(e) => setFormData(prev => ({ ...prev, weightPerRod: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter weight per rod"
                />
              </div>

              <div>
                <label htmlFor="wastagePerRod" className="block text-sm font-semibold text-gray-700 mb-2">
                  Wastage per Rod
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    id="wastagePerRod"
                    step="0.01"
                    min="0"
                    required
                    value={formData.wastagePerRod}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastagePerRod: e.target.value }))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter wastage per rod"
                  />
                  <select
                    value={formData.wastageUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, wastageUnit: e.target.value as 'g' | 'kg' }))}
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !formData.diameter || !formData.weightUsed}
              className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Settings className="h-4 w-4" />
              <span>{isSubmitting ? 'Starting...' : 'Start Process'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}