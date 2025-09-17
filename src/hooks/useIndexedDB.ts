import { useState, useEffect } from 'react';
import { dbManager, STORES } from '../utils/database';
import { Rod, Process, InventoryStats, ProcessSummary, InventoryTransaction } from '../types/inventory';

export function useInventoryData() {
  const [rods, setRods] = useState<Rod[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [diameters, setDiameters] = useState<number[]>([]);
  const [bladeDiameters, setBladeDiameters] = useState<number[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      await dbManager.init();
      const [rodsData, processesData, diametersData, bladeDiametersData, historyData] = await Promise.all([
        dbManager.getAll<Rod>(STORES.RODS),
        dbManager.getAll<Process>(STORES.PROCESSES),
        dbManager.getAll<{diameter: number}>(STORES.DIAMETERS),
        dbManager.getAll<{diameter: number}>(STORES.BLADE_DIAMETERS),
        dbManager.getAll<InventoryTransaction>(STORES.INVENTORY_HISTORY)
      ]);
      setRods(rodsData);
      setProcesses(processesData);
      setDiameters(diametersData.map(d => d.diameter).sort((a, b) => a - b));
      setBladeDiameters(bladeDiametersData.map(d => d.diameter).sort((a, b) => a - b));
      setInventoryHistory(historyData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addRod = async (rod: Omit<Rod, 'id' | 'createdAt'>, addDiameter = true) => {
    const newRod: Rod = {
      ...rod,
      id: crypto.randomUUID(),
      createdAt: new Date()
    };
    
    try {
      await dbManager.add(STORES.RODS, newRod);
      setRods(prev => [...prev, newRod]);
      
      // Add to history
      const historyEntry: InventoryTransaction = {
        id: crypto.randomUUID(),
        date: new Date(),
        diameter: rod.diameter,
        weight: rod.weight,
        length: rod.totalLength,
        type: 'in'
      };
      await dbManager.add(STORES.INVENTORY_HISTORY, historyEntry);
      setInventoryHistory(prev => [historyEntry, ...prev]);
      
      // Add diameter if it doesn't exist
      if (addDiameter && !diameters.includes(rod.diameter)) {
        await dbManager.add(STORES.DIAMETERS, { diameter: rod.diameter });
        setDiameters(prev => [...prev, rod.diameter].sort((a, b) => a - b));
      }
      
      return newRod;
    } catch (error) {
      console.error('Failed to add rod:', error);
      throw error;
    }
  };

  const addProcess = async (process: Omit<Process, 'id' | 'createdAt' | 'status'>, addBladeDiameter = true) => {
    const newProcess: Process = {
      ...process,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      status: 'in-progress'
    };
    
    try {
      await dbManager.add(STORES.PROCESSES, newProcess);
      setProcesses(prev => [...prev, newProcess]);
      
      // Add to history for material usage
      const historyEntry: InventoryTransaction = {
        id: crypto.randomUUID(),
        date: new Date(),
        diameter: process.diameter,
        weight: process.weightUsed,
        type: 'out',
        processId: newProcess.id,
        processName: process.name
      };
      await dbManager.add(STORES.INVENTORY_HISTORY, historyEntry);
      setInventoryHistory(prev => [historyEntry, ...prev]);
      
      // Add blade diameter if it doesn't exist
      if (addBladeDiameter && !bladeDiameters.includes(process.bladeDiameter)) {
        await dbManager.add(STORES.BLADE_DIAMETERS, { diameter: process.bladeDiameter });
        setBladeDiameters(prev => [...prev, process.bladeDiameter].sort((a, b) => a - b));
      }
      
      return newProcess;
    } catch (error) {
      console.error('Failed to add process:', error);
      throw error;
    }
  };

  const updateProcess = async (processId: string, updates: Partial<Process>) => {
    try {
      const existingProcess = processes.find(p => p.id === processId);
      if (!existingProcess) throw new Error('Process not found');
      
      const updatedProcess = { ...existingProcess, ...updates };
      await dbManager.update(STORES.PROCESSES, updatedProcess);
      setProcesses(prev => prev.map(p => p.id === processId ? updatedProcess : p));
    } catch (error) {
      console.error('Failed to update process:', error);
      throw error;
    }
  };

  const updateRodWeight = async (diameter: number, weightToRemove: number) => {
    try {
      const rodsOfDiameter = rods.filter(rod => rod.diameter === diameter);
      let remainingWeight = weightToRemove;
      
      for (const rod of rodsOfDiameter) {
        if (remainingWeight <= 0) break;
        
        if (rod.weight <= remainingWeight) {
          await dbManager.delete(STORES.RODS, rod.id);
          remainingWeight -= rod.weight;
        } else {
          const updatedRod = { ...rod, weight: rod.weight - remainingWeight };
          await dbManager.update(STORES.RODS, updatedRod);
          remainingWeight = 0;
        }
      }
      
      await loadData(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to update rod weight:', error);
      throw error;
    }
  };

  const getInventoryStats = (): InventoryStats => {
    const diameterBreakdown: Record<number, { weight: number }> = {};
    
    rods.forEach(rod => {
      if (!diameterBreakdown[rod.diameter]) {
        diameterBreakdown[rod.diameter] = { weight: 0 };
      }
      diameterBreakdown[rod.diameter].weight += rod.weight;
    });

    const getAvailableWeight = (diameter: number): number => {
      return rods.filter(rod => rod.diameter === diameter).reduce((sum, rod) => sum + rod.weight, 0);
    };

    return {
      totalRods: rods.length,
      totalWeight: rods.reduce((sum, rod) => sum + rod.weight, 0),
      diameterBreakdown
    };
  };

  const getInventoryHistory = (): InventoryTransaction[] => {
    return inventoryHistory;
  };

  return {
    rods,
    processes,
    diameters,
    bladeDiameters,
    loading,
    addRod,
    addProcess,
    updateProcess,
    updateRodWeight,
    getInventoryStats,
    getInventoryHistory,
    getAvailableWeight: (diameter: number) => rods.filter(rod => rod.diameter === diameter).reduce((sum, rod) => sum + rod.weight, 0),
    refreshData: loadData
  };
}