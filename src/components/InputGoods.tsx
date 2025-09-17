import React, { useState } from 'react';
import { Plus, Package, ChevronDown } from 'lucide-react';
import { useInventoryData } from '../hooks/useIndexedDB';

export default function InputGoods() {
  const { addRod, diameters } = useInventoryData();
  const [formData, setFormData] = useState({
    diameter: '',
    weight: '',
    totalLength: ''
  });
  const [customDiameter, setCustomDiameter] = useState('');
  const [showCustomDiameter, setShowCustomDiameter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const diameterValue = showCustomDiameter ? parseFloat(customDiameter) : parseFloat(formData.diameter);
      
      await addRod({
        diameter: diameterValue,
        weight: parseFloat(formData.weight),
        totalLength: formData.totalLength ? parseFloat(formData.totalLength) : undefined
      });

      setFormData({ diameter: '', weight: '', totalLength: '' });
      setCustomDiameter('');
      setShowCustomDiameter(false);
      
      // Show success feedback
      const successMessage = document.createElement('div');
      successMessage.textContent = 'Rod added successfully!';
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to add rod:', error);
      alert(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDiameterChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDiameter(true);
      setFormData(prev => ({ ...prev, diameter: '' }));
    } else {
      setShowCustomDiameter(false);
      setFormData(prev => ({ ...prev, diameter: value }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Input Goods</h2>
            <p className="text-gray-600">Add new metal rods to inventory</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="diameter" className="block text-sm font-semibold text-gray-700 mb-2">
                Diameter (mm)
              </label>
              <div className="relative">
                <select
                  id="diameter"
                  required={!showCustomDiameter}
                  value={showCustomDiameter ? 'custom' : formData.diameter}
                  onChange={(e) => handleDiameterChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none"
                >
                  <option value="">Select diameter...</option>
                  {diameters.map(diameter => (
                    <option key={diameter} value={diameter}>
                      {diameter}mm
                    </option>
                  ))}
                  <option value="custom">Add new diameter...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {showCustomDiameter && (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={customDiameter}
                  onChange={(e) => setCustomDiameter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 mt-2"
                  placeholder="Enter new diameter"
                />
              )}
            </div>

            <div>
              <label htmlFor="weight" className="block text-sm font-semibold text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                id="weight"
                step="0.01"
                min="0"
                required
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter weight"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="totalLength" className="block text-sm font-semibold text-gray-700 mb-2">
                Total Length (mm) - Optional
              </label>
              <input
                type="number"
                id="totalLength"
                step="0.1"
                min="0"
                value={formData.totalLength}
                onChange={(e) => handleInputChange('totalLength', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter total length (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || (!formData.diameter && !customDiameter) || !formData.weight}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Adding...' : 'Add Rod'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}