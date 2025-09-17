import React, { useState, useEffect } from 'react';
import { FileText, Filter, Download, Plus, Edit3, Trash2, Users } from 'lucide-react';
import { dbManager, STORES } from '../utils/database';
import { Process, ProcessGroup } from '../types/inventory';

export default function Reporting() {
  const [activeReport, setActiveReport] = useState('process-details');
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedProcessesForGroup, setSelectedProcessesForGroup] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [activeReport, selectedProcess, selectedGroup]);

  const loadData = async () => {
    try {
      const [processData, groupData] = await Promise.all([
        dbManager.getAll<Process>(STORES.PROCESSES),
        dbManager.getAll<ProcessGroup>(STORES.PROCESS_GROUPS)
      ]);
      setProcesses(processData);
      setProcessGroups(groupData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      switch (activeReport) {
        case 'process-details':
          data = await loadProcessDetails();
          break;
        case 'finished-goods':
          data = await dbManager.getAll(STORES.FINISHED_GOODS);
          break;
        case 'non-conforming':
          data = await dbManager.getAll(STORES.NON_CONFORMING);
          break;
        case 'rejected':
          data = await dbManager.getAll(STORES.REJECTED);
          break;
        case 'weight-loss':
          data = await dbManager.getAll(STORES.WEIGHT_LOSS);
          break;
      }

      // Filter by process or group
      if (selectedProcess !== 'all') {
        data = data.filter(item => item.processId === selectedProcess || item.id === selectedProcess);
      } else if (selectedGroup !== 'all') {
        const group = processGroups.find(g => g.id === selectedGroup);
        if (group) {
          data = data.filter(item => 
            group.processIds.includes(item.processId) || group.processIds.includes(item.id)
          );
        }
      }

      setReportData(data);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProcessDetails = async () => {
    const [processData, finishedGoods, nonConforming, rejected, weightLoss, processSummary] = await Promise.all([
      dbManager.getAll(STORES.PROCESSES),
      dbManager.getAll(STORES.FINISHED_GOODS),
      dbManager.getAll(STORES.NON_CONFORMING),
      dbManager.getAll(STORES.REJECTED),
      dbManager.getAll(STORES.WEIGHT_LOSS),
      dbManager.getAll(STORES.PROCESS_SUMMARY)
    ]);

    return processData.map(process => {
      const processFinished = finishedGoods.filter(item => item.processId === process.id);
      const processNonConforming = nonConforming.filter(item => item.processId === process.id);
      const processRejected = rejected.filter(item => item.processId === process.id);
      const processWeightLoss = weightLoss.filter(item => item.processId === process.id);
      const processSummaryData = processSummary.find(item => item.processId === process.id);

      const totalFinishedWeight = processFinished.reduce((sum, item) => sum + item.weight, 0);
      const totalNonConformingWeight = processNonConforming.reduce((sum, item) => sum + item.weight, 0);
      const totalRejectedWeight = processRejected.reduce((sum, item) => sum + item.weight, 0);
      const totalWeightLoss = processWeightLoss.reduce((sum, item) => sum + item.weight, 0);

      return {
        ...process,
        processName: process.name,
        finishedGoodsCount: processFinished.reduce((sum, item) => sum + item.number, 0),
        finishedGoodsWeight: totalFinishedWeight,
        nonConformingCount: processNonConforming.reduce((sum, item) => sum + item.number, 0),
        nonConformingWeight: totalNonConformingWeight,
        rejectedCount: processRejected.reduce((sum, item) => sum + item.number, 0),
        rejectedWeight: totalRejectedWeight,
        totalWeightLoss,
        remainingWeight: processSummaryData?.remainingWeight || 0,
        addedBackToStock: processSummaryData?.addRemainingToStock || false,
        efficiency: process.weightUsed > 0 ? ((totalFinishedWeight / process.weightUsed) * 100).toFixed(2) : '0',
        wastePercentage: process.weightUsed > 0 ? (((totalWeightLoss + totalRejectedWeight) / process.weightUsed) * 100).toFixed(2) : '0'
      };
    });
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedProcessesForGroup.length === 0) return;

    try {
      const newGroup: ProcessGroup = {
        id: crypto.randomUUID(),
        name: newGroupName.trim(),
        processIds: selectedProcessesForGroup,
        createdAt: new Date()
      };

      await dbManager.add(STORES.PROCESS_GROUPS, newGroup);
      await loadData();
      setShowGroupModal(false);
      setNewGroupName('');
      setSelectedProcessesForGroup([]);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<ProcessGroup>) => {
    try {
      const existingGroup = processGroups.find(g => g.id === groupId);
      if (!existingGroup) return;

      const updatedGroup = { ...existingGroup, ...updates };
      await dbManager.update(STORES.PROCESS_GROUPS, updatedGroup);
      await loadData();
      setEditingGroup(null);
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await dbManager.delete(STORES.PROCESS_GROUPS, groupId);
      await loadData();
      if (selectedGroup === groupId) {
        setSelectedGroup('all');
      }
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const exportReport = () => {
    const groupName = selectedGroup === 'all' 
      ? 'All Groups' 
      : processGroups.find(g => g.id === selectedGroup)?.name || 'Unknown Group';
    
    const processName = selectedProcess === 'all' 
      ? 'All Processes' 
      : processes.find(p => p.id === selectedProcess)?.name || 'Unknown Process';
    
    const csvContent = generateCSV(reportData, activeReport);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-${selectedGroup !== 'all' ? groupName : processName}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data: any[], reportType: string) => {
    if (data.length === 0) return 'No data available';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n');
    return `${headers}\n${rows}`;
  };

  const reports = [
    { id: 'process-details', label: 'Process Details', color: 'blue' },
    { id: 'finished-goods', label: 'Finished Goods', color: 'green' },
    { id: 'non-conforming', label: 'Non-Conforming', color: 'yellow' },
    { id: 'rejected', label: 'Rejected Items', color: 'red' },
    { id: 'weight-loss', label: 'Weight Loss', color: 'gray' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reporting</h2>
              <p className="text-gray-600">Comprehensive process and outcome reports</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Create Group</span>
            </button>
            <button
              onClick={exportReport}
              disabled={reportData.length === 0}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="flex flex-wrap gap-2 mb-6">
          {reports.map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                activeReport === report.id
                  ? `bg-${report.color}-600 text-white shadow-md`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {report.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setSelectedProcess('all');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Groups</option>
              {processGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <Users className="h-5 w-5 text-gray-400" />
            <select
              value={selectedProcess}
              onChange={(e) => {
                setSelectedProcess(e.target.value);
                setSelectedGroup('all');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Processes</option>
              {processes.map(process => (
                <option key={process.id} value={process.id}>
                  {process.name} (ID: {process.processId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Process Groups Management */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Process Groups</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processGroups.map(group => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                {editingGroup === group.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      defaultValue={group.name}
                      onBlur={(e) => updateGroup(group.id, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{group.name}</h4>
                      <p className="text-sm text-gray-600">{group.processIds.length} processes</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingGroup(group.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Report Data */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No data available</p>
              <p className="text-gray-400">Complete some processes to see reports</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(reportData[0]).map(key => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    {Object.values(item).map((value: any, valueIndex) => (
                      <td key={valueIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {value instanceof Date ? value.toLocaleDateString() : 
                         typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                         typeof value === 'number' ? value.toFixed(3) :
                         value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Process Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Processes
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {processes.map(process => (
                    <label key={process.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedProcessesForGroup.includes(process.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProcessesForGroup(prev => [...prev, process.id]);
                          } else {
                            setSelectedProcessesForGroup(prev => prev.filter(id => id !== process.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{process.name} ({process.processId})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setNewGroupName('');
                  setSelectedProcessesForGroup([]);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || selectedProcessesForGroup.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}